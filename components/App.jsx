// Main App — coordinates windows, desktop, sidebar, taskbar, tweaks

const { useState: aS, useEffect: aE, useMemo: aM } = React;

// Tweak defaults read from DOM block
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "wallpaper": "bliss",
  "font": "segoe",
  "dark": false,
  "blur": 18,
  "particles": true
}/*EDITMODE-END*/;

// Default quick links (inline SVG for authentic Vista gadget icons)
const DEFAULT_LINKS = [
  { name: 'YouTube Subs', url: 'https://www.youtube.com/feed/subscriptions',
    svg: `<svg viewBox="0 0 40 40"><defs><linearGradient id="ytg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6060"/><stop offset="0.5" stop-color="#c01010"/><stop offset="1" stop-color="#600808"/></linearGradient></defs><rect x="3" y="8" width="34" height="24" rx="5" fill="url(#ytg)" stroke="rgba(0,0,0,0.4)"/><rect x="3" y="8" width="34" height="9" fill="rgba(255,255,255,0.4)" rx="5"/><polygon points="16,14 16,26 27,20" fill="#fff"/></svg>` },
  { name: 'Twitter/X', url: 'https://twitter.com',
    svg: `<svg viewBox="0 0 40 40"><defs><linearGradient id="xg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a6a6a"/><stop offset="0.5" stop-color="#1a1a1a"/><stop offset="1" stop-color="#000"/></linearGradient></defs><rect x="4" y="4" width="32" height="32" rx="6" fill="url(#xg)" stroke="rgba(0,0,0,0.5)"/><rect x="4" y="4" width="32" height="12" fill="rgba(255,255,255,0.25)" rx="6"/><text x="20" y="27" font-family="Arial" font-size="22" font-weight="900" fill="#fff" text-anchor="middle">𝕏</text></svg>` },
  { name: 'Gmail', url: 'https://mail.google.com',
    svg: `<svg viewBox="0 0 40 40"><defs><linearGradient id="gmg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#c8d4e4"/></linearGradient></defs><rect x="4" y="10" width="32" height="22" rx="3" fill="url(#gmg)" stroke="rgba(0,0,0,0.45)"/><path d="M 4 12 L 20 24 L 36 12" stroke="#d44" stroke-width="1.5" fill="none"/><path d="M 4 12 L 20 22 L 36 12 L 36 16 L 20 26 L 4 16 Z" fill="#d44"/></svg>` },
  { name: 'Google News', url: 'https://news.google.com',
    svg: `<svg viewBox="0 0 40 40"><defs><linearGradient id="gng" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#aad4ff"/><stop offset="0.5" stop-color="#3d7ed8"/><stop offset="1" stop-color="#0a2a58"/></linearGradient></defs><rect x="4" y="6" width="32" height="28" rx="3" fill="url(#gng)" stroke="rgba(0,0,0,0.5)"/><rect x="4" y="6" width="32" height="10" fill="rgba(255,255,255,0.35)" rx="3"/><g fill="#fff"><rect x="8" y="18" width="10" height="8"/><rect x="20" y="18" width="12" height="1.5"/><rect x="20" y="21" width="12" height="1.5"/><rect x="20" y="24" width="10" height="1.5"/><rect x="8" y="28" width="24" height="1.5"/><rect x="8" y="30" width="20" height="1.5"/></g></svg>` },
  { name: 'GitHub', url: 'https://github.com',
    svg: `<svg viewBox="0 0 40 40"><defs><radialGradient id="ghg" cx="0.35" cy="0.35" r="0.7"><stop offset="0" stop-color="#6a6a6a"/><stop offset="1" stop-color="#1a1a1a"/></radialGradient></defs><circle cx="20" cy="20" r="16" fill="url(#ghg)" stroke="rgba(0,0,0,0.5)"/><path d="M 20 9 C 14 9 10 13 10 19 C 10 24 13 27 17 28 C 17 27 17 26 17 26 C 14 27 13 25 13 25 C 13 24 12 23 12 23 C 11 23 12 23 12 23 C 13 23 14 24 14 24 C 15 26 17 25 17 25 C 17 24 18 24 18 24 C 16 23 14 22 14 19 C 14 18 14 17 15 16 C 15 16 14 15 15 13 C 15 13 16 13 18 14 C 19 14 20 14 21 14 C 22 14 23 14 24 14 C 26 13 27 13 27 13 C 28 15 27 16 27 16 C 27 17 28 18 28 19 C 28 22 26 23 24 24 C 24 24 25 25 25 26 C 25 27 25 28 25 28 C 29 27 32 24 32 19 C 32 13 27 9 20 9 Z" fill="#fff"/></svg>` },
  { name: 'WhatsApp', url: 'https://web.whatsapp.com',
    svg: `<svg viewBox="0 0 40 40"><defs><radialGradient id="wag" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#b8f090"/><stop offset="0.6" stop-color="#2aa028"/><stop offset="1" stop-color="#0d4a0c"/></radialGradient></defs><circle cx="20" cy="20" r="16" fill="url(#wag)" stroke="rgba(0,0,0,0.5)"/><path d="M 13 26 L 14.5 22 C 13.5 21 13 19.5 13 18 C 13 14 16.5 11 20.5 11 C 24.5 11 28 14 28 18 C 28 22 24.5 25 20.5 25 C 19 25 17.5 24.5 16.5 24 Z" fill="#fff"/></svg>` },
  { name: 'Reddit', url: 'https://reddit.com',
    svg: `<svg viewBox="0 0 40 40"><defs><radialGradient id="rdg" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#ffc090"/><stop offset="0.6" stop-color="#ff4500"/><stop offset="1" stop-color="#6a1a00"/></radialGradient></defs><circle cx="20" cy="20" r="16" fill="url(#rdg)" stroke="rgba(0,0,0,0.5)"/><circle cx="20" cy="22" r="10" fill="#fff"/><circle cx="16" cy="22" r="1.5" fill="#333"/><circle cx="24" cy="22" r="1.5" fill="#333"/><path d="M 16 25 Q 20 28 24 25" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/><circle cx="20" cy="13" r="2" fill="#fff"/></svg>` },
  { name: 'Spotify', url: 'https://open.spotify.com',
    svg: `<svg viewBox="0 0 40 40"><defs><radialGradient id="spg" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#b8f090"/><stop offset="0.6" stop-color="#1aa050"/><stop offset="1" stop-color="#0d4a1c"/></radialGradient></defs><circle cx="20" cy="20" r="16" fill="url(#spg)" stroke="rgba(0,0,0,0.5)"/><g stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"><path d="M 12 15 Q 20 13 28 17"/><path d="M 13 20 Q 20 18 27 22"/><path d="M 14 24 Q 20 23 26 26"/></g></svg>` },
];

// App registry
const APP_REGISTRY = {
  fp:         { title: 'Tareas de FP',     comp: 'TareasFPApp',   w: 560, h: 440 },
  horario:    { title: 'Horario',          comp: 'HorarioApp',    w: 720, h: 480 },
  diario:     { title: 'Diario personal',  comp: 'DiarioApp',     w: 640, h: 460 },
  habitos:    { title: 'Hábitos',          comp: 'HabitosApp',    w: 720, h: 440, needsHabits: true },
  calendar:   { title: 'Calendario',       comp: 'CalendarioApp', w: 720, h: 500 },
  finanzas:   { title: 'Finanzas',         comp: 'FinanzasApp',   w: 680, h: 560 },
  medico:     { title: 'Historial médico', comp: 'MedicoApp',     w: 620, h: 480 },
  anime:      { title: 'Anime',            comp: 'AnimesApp',     w: 560, h: 460 },
  pelis:      { title: 'Películas',        comp: 'PelisApp',      w: 560, h: 460 },
  series:     { title: 'Series',           comp: 'SeriesApp',     w: 560, h: 460 },
  juegos:     { title: 'Juegos',           comp: 'JuegosApp',     w: 560, h: 460 },
  proyectos:  { title: 'Proyectos',        comp: 'ProyectosApp',  w: 600, h: 460 },
  recursos:   { title: 'Recursos',         comp: 'RecursosApp',   w: 560, h: 500 },
};

const DESKTOP_ICON_ORDER = ['fp','horario','diario','calendar','finanzas','medico','proyectos','habitos','anime','pelis','series','juegos','recursos'];

function App() {
  // tweaks vía useLocal → sincroniza entre dispositivos como cualquier otra clave.
  // Merge con defaults para tolerar objetos antiguos a los que les falten campos.
  const [tweaksSaved, setTweaks] = window.useLocal('tweaks', TWEAK_DEFAULTS);
  const tweaks = aM(() => ({...TWEAK_DEFAULTS, ...(tweaksSaved || {})}), [tweaksSaved]);
  const [tweaksVisible, setTweaksVisible] = aS(false);
  const isTouch = aM(() => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches, []);
  const [windows, setWindows] = aS([]);
  const [focusedId, setFocusedId] = aS(null);
  const [selectedIcon, setSelectedIcon] = aS(null);
  const [zTop, setZTop] = aS(100);
  const [clock, setClock] = aS(new Date());

  // Shared state needed by multiple windows/gadgets
  const [habits, setHabits] = window.useLocal('habits', []);
  const [links] = window.useLocal('quicklinks', DEFAULT_LINKS);

  // Limpieza one-time: purga la clave 'photos' en el cloud (legacy "Foto del día").
  // El flag vive en localStorage local (no sincroniza) — cada dispositivo lo marca una vez.
  aE(() => {
    if (localStorage.getItem('__photos_purged') === '1') return;
    if (window.AeroCloud?.get('photos') !== undefined) {
      window.AeroCloud.remove('photos');
    }
    try { localStorage.setItem('__photos_purged', '1'); } catch {}
  }, []);

  // Clock tick
  aE(() => { const t = setInterval(()=>setClock(new Date()), 30000); return () => clearInterval(t); }, []);

  // Aplicar tweaks al DOM (ya persisten vía useLocal)
  aE(() => {
    document.body.className = `font-${tweaks.font} ${tweaks.dark?'dark':''}`;
    document.documentElement.style.setProperty('--blur', tweaks.blur + 'px');
  }, [tweaks]);

  // Edit mode host integration
  aE(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksVisible(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksVisible(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({type:'__edit_mode_available'}, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const applyTweak = (patch) => {
    const next = {...tweaks, ...patch};
    setTweaks(next);
    window.parent.postMessage({type:'__edit_mode_set_keys', edits: patch}, '*');
  };

  const openApp = (key) => {
    const existing = windows.find(w => w.key === key);
    if (existing) {
      setWindows(windows.map(w => w.key === key ? {...w, minimized: false, z: zTop+1} : w));
      setFocusedId(existing.id);
      setZTop(zTop+1);
      return;
    }
    const def = APP_REGISTRY[key];
    const id = Date.now() + Math.random();
    const x = 140 + (windows.length * 24) % 200;
    const y = 40 + (windows.length * 24) % 150;
    setWindows([...windows, {
      id, key, title: def.title, comp: def.comp,
      x, y, w: def.w, h: def.h, z: zTop+1, minimized: false,
      icon: window.Icons[key]
    }]);
    setFocusedId(id);
    setZTop(zTop+1);
  };

  const closeWindow = (id) => {
    setWindows(windows.filter(w => w.id !== id));
    if (focusedId === id) setFocusedId(null);
  };
  const focusWindow = (id) => {
    if (focusedId === id) return;
    setWindows(windows.map(w => w.id === id ? {...w, z: zTop+1} : w));
    setFocusedId(id);
    setZTop(zTop+1);
  };
  const minimizeWindow = (id) => {
    setWindows(windows.map(w => w.id === id ? {...w, minimized: true} : w));
  };
  const focusToggle = (id) => {
    const w = windows.find(x=>x.id===id);
    if (!w) return;
    if (w.minimized) {
      setWindows(windows.map(x=>x.id===id?{...x, minimized:false, z:zTop+1}:x));
      setFocusedId(id); setZTop(zTop+1);
    } else if (focusedId === id) {
      minimizeWindow(id);
      setFocusedId(null);
    } else {
      focusWindow(id);
    }
  };
  const moveWindow = (id, x, y) => setWindows(ws => ws.map(w => w.id===id ? {...w,x,y} : w));
  const resizeWindow = (id, w, h) => setWindows(ws => ws.map(x => x.id===id ? {...x,w,h} : x));

  const renderAppContent = (win) => {
    const { comp } = win;
    if (comp === 'HabitosApp') return <window.Apps2.HabitosApp habits={habits} setHabits={setHabits} />;
    // Apps in window.Apps
    if (window.Apps[comp]) { const C = window.Apps[comp]; return <C/>; }
    if (window.Apps2[comp]) { const C = window.Apps2[comp]; return <C/>; }
    return <div>?</div>;
  };

  // Export/Import — ahora vía AeroCloud (Firestore es la fuente de verdad)
  const onExport = () => {
    const data = window.AeroCloud ? window.AeroCloud.getAll() : {};
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `aero-backup-${window.todayKey()}.json`; a.click();
    URL.revokeObjectURL(url);
  };
  const onImport = (text) => {
    const ALLOWED_KEYS = new Set(['habits','cal_events','cal_festivos','quicklinks','tweaks','animes','pelis','proyectos','recursos','fp_tasks','fp_modulos','diario','finanzas','medico','clock_city','horario','series','juegos']);
    try {
      if (text.length > 10 * 1024 * 1024) throw new Error('Archivo demasiado grande (>10MB)');
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Formato inválido');
      const skipped = [];
      let imported = 0;
      Object.entries(data).forEach(([k,v]) => {
        if (!ALLOWED_KEYS.has(k)) { skipped.push(k); return; }
        // El backup antiguo guardaba strings (JSON.stringify). El nuevo guarda objetos.
        // Aceptamos ambos formatos: si es string que parsea, usamos el parseado; si es object, directo.
        let parsed;
        if (typeof v === 'string') {
          try { parsed = JSON.parse(v); } catch { skipped.push(k); return; }
        } else if (v !== null && typeof v === 'object') {
          parsed = v;
        } else { skipped.push(k); return; }
        window.AeroCloud.set(k, parsed);
        imported++;
      });
      alert(`Importadas ${imported} claves.${skipped.length?' Ignoradas: '+skipped.join(', '):''}`);
    } catch (e) { alert('Error al importar: ' + e.message); }
  };

  // Open calendar from gadget
  const openCalendar = () => openApp('calendar');

  return (
    <>
      <window.Wallpaper kind={tweaks.wallpaper} />
      <window.Particles enabled={tweaks.particles} />

      {/* Desktop icons */}
      <div className="desktop-icons">
        {DESKTOP_ICON_ORDER.map(key => {
          const def = APP_REGISTRY[key];
          return (
            <div key={key}
              className={`desk-icon ${selectedIcon===key?'active':''}`}
              onClick={()=> isTouch ? openApp(key) : setSelectedIcon(key)}
              onDoubleClick={()=> !isTouch && openApp(key)}>
              {window.Icons[key]}
              <div>{def.title}</div>
            </div>
          );
        })}
      </div>

      {/* Sidebar gadgets */}
      <div className="sidebar">
        <window.Gadgets.ClockGadget />
        <window.Gadgets.YearProgressGadget />
        <window.Gadgets.EventsGadget onOpenCalendar={openCalendar} />
        <window.Gadgets.CalendarGadget onOpenFull={openCalendar} />
        <window.Gadgets.HabitsGadget habits={habits} setHabits={setHabits} />
        <window.Gadgets.QuickLinksGadget links={links} />
      </div>

      {/* Windows */}
      {windows.map(w => (
        <window.AeroWindow key={w.id}
          id={w.id} title={w.title} icon={w.icon}
          x={w.x} y={w.y} w={w.w} h={w.h} z={w.z}
          focused={focusedId === w.id} minimized={w.minimized}
          onFocus={focusWindow}
          onClose={closeWindow}
          onMinimize={minimizeWindow}
          onMove={moveWindow}
          onResize={resizeWindow}>
          {renderAppContent(w)}
        </window.AeroWindow>
      ))}

      {/* Tweaks panel */}
      <window.TweaksPanel visible={tweaksVisible} tweaks={tweaks} onTweak={applyTweak} />

      {/* Taskbar */}
      <window.Taskbar
        windows={windows}
        focused={focusedId}
        onFocusToggle={focusToggle}
        onStart={()=>{}}
        clock={clock}
      />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
