// Firebase cloud sync for Escritorio Aero — FIRESTORE-FIRST, NO localStorage writes
//
// Arquitectura radicalmente simplificada:
// 1. Firestore es la ÚNICA fuente de verdad.
// 2. Store en memoria (`store`) populado por onSnapshot.
// 3. Escrituras (AeroCloud.set/remove) van DIRECTAMENTE a Firestore por-campo
//    (ref.set({ls:{key:value}}, {merge:true})) — sin debounce, sin dirty flag,
//    sin beacon, sin hook de localStorage, sin nada.
// 4. localStorage SOLO como cache read-only de emergencia: lo puebla el handler
//    de snapshot, se lee al arrancar para no parpadear. Ni React ni ningún
//    componente escribe a localStorage.
// 5. Componentes usan `window.useLocal(key, initial)` que lee/escribe vía AeroCloud.

// --- Stamp de versión visible SIEMPRE en pantalla (fuera del IIFE para que se ejecute
//     incluso si el IIFE crashea). Sirve para confirmar que el navegador cargó esta
//     versión y no una cacheada. ---
const AERO_VERSION = 'v2026-04-22a';
function aeroMountVersionStamp() {
  if (!document.body) { setTimeout(aeroMountVersionStamp, 30); return; }
  if (document.getElementById('aero-version-stamp')) return;
  const tag = document.createElement('div');
  tag.id = 'aero-version-stamp';
  tag.textContent = AERO_VERSION;
  tag.style.cssText = 'position:fixed;bottom:4px;left:4px;background:rgba(0,0,0,0.55);color:#fff;font:10px ui-monospace,monospace;padding:2px 6px;border-radius:3px;z-index:1000001;pointer-events:none;user-select:none';
  document.body.appendChild(tag);
}
aeroMountVersionStamp();

// --- Banner de error fatal (si el IIFE crashea, mostramos el error en pantalla) ---
function aeroShowFatal(msg) {
  const mount = () => {
    if (!document.body) { setTimeout(mount, 30); return; }
    let el = document.getElementById('aero-fatal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'aero-fatal';
      el.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#900;color:#fff;padding:10px 14px;font:12px system-ui,sans-serif;z-index:1000002;line-height:1.4;white-space:pre-wrap;box-shadow:0 2px 12px rgba(0,0,0,0.4)';
      document.body.appendChild(el);
    }
    el.textContent = '☠ Error fatal en firebase-config.js (' + AERO_VERSION + '):\n' + msg;
  };
  mount();
}
window.addEventListener('error', (e) => {
  if (e.filename && e.filename.includes('firebase-config.js')) {
    aeroShowFatal((e.message || 'unknown') + ' @' + e.lineno + ':' + e.colno);
  }
});

try {
(function(){
  const firebaseConfig = {
    apiKey: "AIzaSyAyWsxwImGp3eqaSngjpp6QF6uAxYqxLyw",
    authDomain: "escritorio-aero.firebaseapp.com",
    projectId: "escritorio-aero",
    storageBucket: "escritorio-aero.firebasestorage.app",
    messagingSenderId: "364878493045",
    appId: "1:364878493045:web:9d1491d8ff0bf1b4098f3c"
  };

  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  const FieldValue = firebase.firestore.FieldValue;

  const clientId = 'c_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now();
  const CACHE_KEY = '__aero_cache_v2';
  const PENDING_KEY = '__aero_pending_v2';

  let currentUser = null;
  let cloudUnsub = null;
  let driveToken = null;
  let initialSyncDone = false;
  let initialSyncTimeoutWarned = false;
  let lastPushErr = null;
  let pendingWrites = 0;         // nº de writes en vuelo (para el chip)
  // Estado del modal diag — declarado AQUÍ (no más abajo) para evitar TDZ:
  // log() puede dispararse en boot → llama updateDiagIfOpen() → necesita diagOpen.
  let diagOpen = false;
  let diagTimer = null;

  // --- Store en memoria: { key: parsedValue } ---
  const store = {};
  // --- Subscribers: { key: Set<(value) => void> } ---
  const subscribers = new Map();
  // --- Writes en flight: claves que escribí local pero aún no confirmadas por server.
  //     Al llegar un snapshot, estas claves NO se sobrescriben (preserva la write optimista).
  const pending = new Set();
  // --- Writes pendientes persistidas (sobreviven a refresh / suspend de iOS) ---
  //     Si un push inicia pero el Promise no resuelve (tab muere, red cae, etc),
  //     la key queda aquí → al rearrancar, se reintenta.
  let persistedPending = {};
  try { persistedPending = JSON.parse(localStorage.getItem(PENDING_KEY) || '{}'); } catch {}
  function savePersistedPending() {
    try {
      if (Object.keys(persistedPending).length === 0) localStorage.removeItem(PENDING_KEY);
      else localStorage.setItem(PENDING_KEY, JSON.stringify(persistedPending));
    } catch {}
  }
  // --- Queue de writes mientras no hay user loggeado ---
  const offlineQueue = [];

  // --- Replay persistedPending: writes que iniciaron pero nunca confirmaron
  //     (ej. tab cerrada antes de que el await terminase, iOS suspendió la red).
  //     - Los marcamos en `pending` (para que el snapshot NO los sobrescriba)
  //     - Incrementamos `pendingWrites` (el `finally` de pushField lo balanceará)
  //     - Encolamos en offlineQueue para enviar tras login + primer snapshot
  Object.entries(persistedPending).forEach(([k, entry]) => {
    if (!entry) return;
    pending.add(k);
    pendingWrites++;
    if (entry.op === 'remove') {
      offlineQueue.push({ op: 'remove', key: k });
    } else if ('value' in entry) {
      // Cargamos también al store: si la UI pregunta antes del login, ve el valor pendiente.
      store[k] = entry.value;
      offlineQueue.push({ op: 'set', key: k, value: entry.value });
    }
  });

  // --- Cargar cache de arranque (no parpadea antes del primer snapshot) ---
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      Object.entries(cached).forEach(([k, v]) => { store[k] = v; });
    }
  } catch {}

  // --- Migración one-time: cargar claves legacy de localStorage directo al store ---
  // Si el usuario vino de la versión vieja (hook de localStorage), sus datos están en
  // localStorage como claves individuales (fp_tasks, cal_events, etc). Los cargamos al
  // store en memoria para que la UI no parpadee y para poder pushearlos al cloud al
  // primer snapshot (si faltan allí).
  if (localStorage.getItem('__aero_migrated_v2') !== '1') {
    let legacy = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || k.startsWith('__') || k === CACHE_KEY) continue;
      if (k in store) continue;   // cache_v2 ya lo tiene
      try {
        const raw = localStorage.getItem(k);
        if (raw === null) continue;
        store[k] = JSON.parse(raw);
        legacy++;
      } catch {}
    }
    if (legacy > 0) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(store)); } catch {} }
    // Flag se marca SOLO al completar el first snapshot con éxito (más abajo).
  }

  // --- Log circular para diag ---
  const DIAG_LOG_MAX = 60;
  const diagLog = [];
  function log(msg) {
    const line = new Date().toLocaleTimeString('es-ES') + ' · ' + msg;
    diagLog.push(line);
    while (diagLog.length > DIAG_LOG_MAX) diagLog.shift();
    try { console.log('[cloud]', msg); } catch {}
    updateDiagIfOpen();
  }

  log('boot: ' + Object.keys(store).length + ' claves desde cache' +
      (pendingWrites > 0 ? ', ' + pendingWrites + ' writes pendientes para reintentar' : ''));

  // ============================================================
  //                    API PÚBLICA: window.AeroCloud
  // ============================================================

  function get(key) {
    return key in store ? store[key] : undefined;
  }

  function set(key, value) {
    // Store en memoria + notificar subscribers + push a Firestore.
    store[key] = value;
    saveCache();
    notify(key, value);
    pendingWrites++;
    pending.add(key);
    persistedPending[key] = { op: 'set', value };
    savePersistedPending();
    setChip('↑', '#ffaa00');
    log('set ' + key + ' (pending=' + pendingWrites + ')');
    pushField(key, value);
  }

  function remove(key) {
    delete store[key];
    saveCache();
    notify(key, undefined);
    pendingWrites++;
    pending.add(key);
    persistedPending[key] = { op: 'remove' };
    savePersistedPending();
    setChip('↑', '#ffaa00');
    log('remove ' + key + ' (pending=' + pendingWrites + ')');
    deleteField(key);
  }

  function subscribe(key, fn) {
    if (!subscribers.has(key)) subscribers.set(key, new Set());
    subscribers.get(key).add(fn);
    return () => { subscribers.get(key)?.delete(fn); };
  }

  function notify(key, value) {
    const subs = subscribers.get(key);
    if (!subs) return;
    subs.forEach(fn => { try { fn(value); } catch (e) { log('subscriber err ' + key + ': ' + e); } });
  }

  function saveCache() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(store)); } catch {}
  }

  // ============================================================
  //            ESCRITURAS A FIRESTORE (por-campo, merge)
  // ============================================================

  async function pushField(key, value) {
    if (!currentUser) {
      log('push ' + key + ': sin user, encolado');
      // Ya está en persistedPending vía set(). Solo registramos en cola en memoria.
      offlineQueue.push({ op: 'set', key, value });
      return;
    }
    let ok = false;
    try {
      const ref = db.collection('users').doc(currentUser.uid).collection('data').doc('store');
      // set con merge en objeto anidado actualiza SOLO ese campo, sin tocar los demás.
      // Usamos Date.now() en vez de serverTimestamp() para evitar edge-cases de Firestore
      // con sentinels en merges anidados (que en algunos casos no completan el Promise).
      await ref.set({
        ls: { [key]: JSON.stringify(value) },
        ts: Date.now(),
        clientId,
      }, { merge: true });
      ok = true;
      lastPushErr = null;
      hideErr();
      log('✓ push ' + key + ' OK');
    } catch (e) {
      lastPushErr = key + ': ' + (e?.code || e?.message || e);
      log('✗ push ' + key + ': ' + lastPushErr);
      setChip('⚠', '#e66');
      showErr(lastPushErr);
    } finally {
      pending.delete(key);
      pendingWrites = Math.max(0, pendingWrites - 1);
      if (ok) {
        delete persistedPending[key];
        savePersistedPending();
      }
      if (pendingWrites === 0 && !lastPushErr) setChip('☁', '#4a8');
    }
  }

  async function deleteField(key) {
    if (!currentUser) {
      log('remove ' + key + ': sin user, encolado');
      offlineQueue.push({ op: 'remove', key });
      return;
    }
    let ok = false;
    try {
      const ref = db.collection('users').doc(currentUser.uid).collection('data').doc('store');
      await ref.set({
        ls: { [key]: FieldValue.delete() },
        ts: Date.now(),
        clientId,
      }, { merge: true });
      ok = true;
      lastPushErr = null;
      hideErr();
      log('✓ remove ' + key + ' OK');
    } catch (e) {
      // Si el documento no existe aún, update falla. Ignorable (no hay nada que borrar).
      if (e?.code === 'not-found') { ok = true; log('remove ' + key + ': doc no existe, ok'); }
      else {
        lastPushErr = 'remove ' + key + ': ' + (e?.code || e?.message || e);
        log('✗ ' + lastPushErr);
        setChip('⚠', '#e66');
        showErr(lastPushErr);
      }
    } finally {
      pending.delete(key);
      pendingWrites = Math.max(0, pendingWrites - 1);
      if (ok) {
        delete persistedPending[key];
        savePersistedPending();
      }
      if (pendingWrites === 0 && !lastPushErr) setChip('☁', '#4a8');
    }
  }

  // Al loggearse, drenar la cola offline
  async function flushOfflineQueue() {
    if (!offlineQueue.length) return;
    log('flush offline queue: ' + offlineQueue.length + ' ops');
    const ops = offlineQueue.splice(0, offlineQueue.length);
    for (const o of ops) {
      if (o.op === 'set') await pushField(o.key, o.value);
      else await deleteField(o.key);
    }
  }

  // ============================================================
  //                    LECTURA: onSnapshot
  // ============================================================

  function subscribeToCloud() {
    if (!currentUser) return;
    log('subscribeToCloud: users/' + currentUser.uid + '/data/store');
    const ref = db.collection('users').doc(currentUser.uid).collection('data').doc('store');

    // Guarda de 10s
    setTimeout(() => {
      if (!initialSyncDone && currentUser && !initialSyncTimeoutWarned) {
        initialSyncTimeoutWarned = true;
        log('⚠ sin primer snapshot tras 10s');
        setChip('⚠ offline', '#e66');
      }
    }, 10000);

    cloudUnsub = ref.onSnapshot({ includeMetadataChanges: false }, (snap) => {
      const isFirst = !initialSyncDone;
      if (isFirst) {
        initialSyncDone = true;
        log('✓ primer snapshot (exists=' + snap.exists + ')');
        hideOverlay();
        setChip('☁', '#4a8');
      }
      const migrating = localStorage.getItem('__aero_migrated_v2') !== '1';
      const cloudLs = (snap.exists && snap.data().ls) || {};
      const data = snap.exists ? snap.data() : {};

      // Aplica diferencias cloud → store
      const allKeys = new Set([...Object.keys(store), ...Object.keys(cloudLs)]);
      let updated = 0, removed = 0, pushedLegacy = 0;
      allKeys.forEach(key => {
        // No sobreescribimos claves con write pendiente (write optimista local)
        if (pending.has(key)) return;
        const cloudRaw = cloudLs[key];
        if (cloudRaw === undefined) {
          // La clave no está en el cloud. Dos casos:
          // (a) Estamos migrando Y la clave está en store (legacy) → PUSH (no borrar)
          // (b) Caso normal → borrar del store (otro dispositivo la eliminó)
          if (key in store) {
            if (migrating && isFirst) {
              pendingWrites++;
              pending.add(key);
              setChip('↑', '#ffaa00');
              pushField(key, store[key]);
              pushedLegacy++;
            } else {
              delete store[key];
              notify(key, undefined);
              removed++;
            }
          }
        } else {
          let parsed;
          try { parsed = JSON.parse(cloudRaw); }
          catch { parsed = cloudRaw; }
          const prev = store[key];
          if (JSON.stringify(prev) !== JSON.stringify(parsed)) {
            store[key] = parsed;
            notify(key, parsed);
            updated++;
          }
        }
      });
      if (migrating && isFirst) {
        try { localStorage.setItem('__aero_migrated_v2', '1'); } catch {}
        if (pushedLegacy > 0) log('migrate: pusheadas ' + pushedLegacy + ' claves legacy al cloud');
      }
      saveCache();
      if (updated || removed || pushedLegacy) log('remote: ' + updated + '↑ ' + removed + '✗ ' + pushedLegacy + '→☁ (from ' + (data.clientId || '?').slice(0,14) + ')');
      flushOfflineQueue();
    }, (err) => {
      log('⚠ snapshot error: ' + (err?.code || err?.message || err));
      if (err && err.code === 'permission-denied') {
        setLoginStatus('Este escritorio es privado.');
        driveToken = null;
        auth.signOut();
        return;
      }
      setChip('⚠', '#e66');
    });
  }

  // ============================================================
  //                    AUTH
  // ============================================================

  auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    if (cloudUnsub) { cloudUnsub(); cloudUnsub = null; }
    initialSyncDone = false;
    initialSyncTimeoutWarned = false;
    if (!user) {
      log('auth: signed out');
      showOverlay();
      setChip('☁', '');
      return;
    }
    log('auth: signed in as ' + (user.email || user.uid));
    setChip('↓', '#ffaa00');
    subscribeToCloud();
  });

  // ============================================================
  //                    UI (overlay + chip + diag)
  // ============================================================

  const overlay = document.createElement('div');
  overlay.id = 'cloud-login';
  overlay.innerHTML = `
    <div class="cloud-login-card">
      <div class="cloud-login-header">
        <div class="cloud-login-title">Escritorio Aero</div>
        <div class="cloud-login-sub">Inicia sesión con Google para sincronizar</div>
      </div>
      <button id="cloud-login-btn" class="cloud-login-btn">
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Iniciar sesión con Google
      </button>
      <div id="cloud-login-status" class="cloud-login-status"></div>
    </div>
  `;

  const chip = document.createElement('div');
  chip.id = 'cloud-chip';
  chip.innerHTML = `<span id="cloud-chip-status">☁</span>`;

  // --- Banner de error visible (rojo, arriba) ---
  const errBanner = document.createElement('div');
  errBanner.id = 'cloud-err-banner';
  errBanner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#c33;color:#fff;padding:8px 14px;font-family:system-ui,sans-serif;font-size:12px;z-index:1000000;display:none;align-items:center;justify-content:space-between;gap:10px;box-shadow:0 2px 8px rgba(0,0,0,0.3);line-height:1.4';
  errBanner.innerHTML = '<span id="cloud-err-msg" style="flex:1"></span><button id="cloud-err-close" style="background:rgba(0,0,0,0.3);border:none;color:#fff;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:11px;flex-shrink:0">✕</button>';

  function showOverlay() { overlay.style.display = 'flex'; }
  function hideOverlay() { overlay.style.display = 'none'; }
  function setChip(text, color) {
    const el = chip.querySelector('#cloud-chip-status');
    if (el) el.textContent = text;
    chip.style.background = color || '';
  }
  function setLoginStatus(msg) {
    const el = overlay.querySelector('#cloud-login-status');
    if (el) el.textContent = msg || '';
  }
  function showErr(msg) {
    if (!errBanner.parentNode) return;  // antes de DOMContentLoaded
    errBanner.style.display = 'flex';
    const el = errBanner.querySelector('#cloud-err-msg');
    if (el) el.textContent = '⚠ Sync falló: ' + msg + ' — pulsa 🔧 diag arriba para investigar.';
  }
  function hideErr() {
    errBanner.style.display = 'none';
  }

  // --- Diagnóstico visible ---
  const diagBtn = document.createElement('div');
  diagBtn.id = 'cloud-diag-btn';
  diagBtn.textContent = '🔧 diag';
  diagBtn.style.cssText = 'position:fixed;top:8px;right:60px;padding:6px 10px;background:rgba(0,0,0,0.65);color:#fff;font-family:system-ui,sans-serif;font-size:11px;border-radius:6px;cursor:pointer;z-index:999999;user-select:none;-webkit-user-select:none;touch-action:manipulation;';

  const diagModal = document.createElement('div');
  diagModal.id = 'cloud-diag-modal';
  diagModal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:999998;display:none;align-items:center;justify-content:center;padding:20px;';
  diagModal.innerHTML = `
    <div style="background:#1a1a2a;color:#fff;border-radius:12px;padding:16px;max-width:560px;width:100%;max-height:85vh;overflow:auto;font-family:system-ui,sans-serif;font-size:12px;line-height:1.5">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <h3 style="margin:0;font-size:15px">🔧 Diagnóstico de sync</h3>
        <button id="diag-close" style="padding:4px 10px;background:#333;border:none;color:#fff;border-radius:4px;cursor:pointer">✕</button>
      </div>
      <div id="diag-state" style="background:#0a0a15;padding:10px;border-radius:6px;white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:11px;margin-bottom:10px"></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
        <button id="diag-test-write" style="flex:1;min-width:110px;padding:8px;background:#a73;border:none;color:#fff;border-radius:6px;cursor:pointer;font-weight:600">✎ Test write</button>
        <button id="diag-dump" style="flex:1;min-width:110px;padding:8px;background:#73a;border:none;color:#fff;border-radius:6px;cursor:pointer;font-weight:600">📋 dump store</button>
        <button id="diag-signout" style="flex:1;min-width:110px;padding:8px;background:#a33;border:none;color:#fff;border-radius:6px;cursor:pointer;font-weight:600">↪ Sign out</button>
      </div>
      <div style="font-size:10px;opacity:0.7;margin-bottom:4px">Log en vivo (últimos ${DIAG_LOG_MAX}):</div>
      <div id="diag-log" style="background:#0a0a15;padding:8px;border-radius:6px;white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:10px;max-height:260px;overflow:auto;line-height:1.4"></div>
    </div>
  `;

  // diagOpen / diagTimer ya declarados arriba (cerca del top) para evitar TDZ.
  function showDiag() {
    diagOpen = true;
    diagModal.style.display = 'flex';
    updateDiagIfOpen();
    if (diagTimer) clearInterval(diagTimer);
    diagTimer = setInterval(() => { if (diagOpen) updateDiagIfOpen(); }, 1000);
  }
  function hideDiag() {
    diagOpen = false;
    diagModal.style.display = 'none';
    if (diagTimer) { clearInterval(diagTimer); diagTimer = null; }
  }
  function updateDiagIfOpen() {
    if (!diagOpen) return;
    const state = [
      `user: ${currentUser?.email || '(no login)'}`,
      `uid: ${currentUser?.uid || '-'}`,
      `clientId: ${clientId}`,
      `initialSyncDone: ${initialSyncDone}`,
      `pendingWrites: ${pendingWrites}`,
      `pending keys: ${[...pending].join(', ') || '(ninguna)'}`,
      `store keys: ${Object.keys(store).length}`,
      `subscribers: ${[...subscribers.entries()].map(([k,s]) => k+'×'+s.size).join(', ') || '(ninguno)'}`,
      `offline queue: ${offlineQueue.length}`,
      `navigator.online: ${navigator.onLine}`,
      `UA: ${navigator.userAgent.slice(0,90)}`,
      `lastPushErr: ${lastPushErr || '(ninguno)'}`,
    ].join('\n');
    const stateEl = diagModal.querySelector('#diag-state');
    const logEl = diagModal.querySelector('#diag-log');
    if (stateEl) stateEl.textContent = state;
    if (logEl) { logEl.textContent = diagLog.join('\n'); logEl.scrollTop = logEl.scrollHeight; }
  }

  // Bind listeners UNA vez (los elementos ya existen en memoria desde createElement)
  overlay.querySelector('#cloud-login-btn').addEventListener('click', signIn);
  errBanner.querySelector('#cloud-err-close').addEventListener('click', hideErr);
  diagBtn.addEventListener('click', showDiag);
  diagModal.querySelector('#diag-close').addEventListener('click', hideDiag);
  diagModal.addEventListener('click', (e) => { if (e.target === diagModal) hideDiag(); });
  diagModal.querySelector('#diag-test-write').addEventListener('click', () => {
    const k = 'aero_test_' + Date.now();
    log('✎ test write: ' + k + ' → AeroCloud.set');
    set(k, { t: Date.now(), ua: navigator.userAgent.slice(0,30) });
    setTimeout(() => remove(k), 3000);  // limpieza
  });
  diagModal.querySelector('#diag-dump').addEventListener('click', () => {
    log('📋 dump store:');
    Object.entries(store).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([k, v]) => {
      const s = JSON.stringify(v);
      const preview = s.length > 40 ? s.slice(0,40) + '…' : s;
      log('  ' + k + ' (' + s.length + 'b): ' + preview);
    });
    log('📋 total: ' + Object.keys(store).length + ' claves');
  });
  diagModal.querySelector('#diag-signout').addEventListener('click', () => {
    if (confirm('¿Cerrar sesión? La caché local no se toca.')) auth.signOut();
  });
  chip.addEventListener('click', () => {
    if (!currentUser) return;
    if (confirm('¿Cerrar sesión? La caché local no se toca.')) auth.signOut();
  });

  // Mount UI: si body ya existe, append YA. Si no, esperar a DOMContentLoaded.
  function mountAeroUI() {
    if (!document.body) { setTimeout(mountAeroUI, 30); return; }
    if (!overlay.parentNode) document.body.appendChild(overlay);
    if (!chip.parentNode) document.body.appendChild(chip);
    if (!diagBtn.parentNode) document.body.appendChild(diagBtn);
    if (!diagModal.parentNode) document.body.appendChild(diagModal);
    if (!errBanner.parentNode) document.body.appendChild(errBanner);
    log('UI montada en body');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAeroUI);
  } else {
    mountAeroUI();
  }

  function signIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    setLoginStatus('Abriendo ventana de Google…');
    auth.signInWithPopup(provider).then(result => {
      const credential = firebase.auth.GoogleAuthProvider.credentialFromResult(result);
      if (credential && credential.accessToken) driveToken = credential.accessToken;
    }).catch(err => {
      setLoginStatus('Error: ' + err.message);
    });
  }

  // ============================================================
  //                    DRIVE BACKUP (semanal)
  // ============================================================
  const DRIVE_BACKUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

  async function backupToDrive() {
    const token = driveToken;
    if (!token) return { ok: false, reason: 'no-token' };
    const payload = JSON.stringify({ ts: Date.now(), uid: currentUser && currentUser.uid, store });
    const filename = `escritorio-aero-backup-${new Date().toISOString().slice(0,10)}.json`;
    const boundary = '-------aero' + Math.random().toString(36).slice(2);
    const body =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify({ name: filename, mimeType: 'application/json' }) + `\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      payload + `\r\n` +
      `--${boundary}--`;
    try {
      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body
      });
      if (!res.ok) return { ok: false, reason: 'http-' + res.status };
      const json = await res.json();
      try { localStorage.setItem('__last_drive_backup', String(Date.now())); } catch {}
      return { ok: true, id: json.id, name: filename };
    } catch (err) {
      return { ok: false, reason: 'exception' };
    }
  }

  function maybeWeeklyBackup() {
    const last = parseInt(localStorage.getItem('__last_drive_backup') || '0', 10);
    if (Date.now() - last > DRIVE_BACKUP_INTERVAL_MS) backupToDrive();
  }
  setTimeout(maybeWeeklyBackup, 8000);

  // ============================================================
  //                  API PÚBLICA
  // ============================================================
  window.AeroCloud = {
    get, set, remove, subscribe,
    backupToDrive,
    signOut: () => auth.signOut(),
    get user() { return currentUser; },
    showDiag,
    // Export/Import helpers
    getAll() { return { ...store }; },
    setMany(obj) { Object.entries(obj).forEach(([k, v]) => set(k, v)); },
    diag: () => ({
      user: currentUser?.email,
      clientId,
      initialSyncDone,
      pendingWrites,
      storeKeys: Object.keys(store),
      online: navigator.onLine,
    }),
  };
})();
} catch (err) {
  aeroShowFatal((err && (err.stack || err.message || err)) + '');
  console.error('[cloud] FATAL', err);
}
