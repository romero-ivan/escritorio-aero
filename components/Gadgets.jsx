// Sidebar gadgets

const { useState, useEffect } = React;

// useLocal: ya NO toca localStorage. Lee/escribe vía window.AeroCloud que va
// directamente a Firestore. El único cache local lo gestiona AeroCloud internamente.
function useLocal(key, initial) {
  const [v, setV] = useState(() => {
    const cached = window.AeroCloud?.get(key);
    return cached === undefined ? initial : cached;
  });
  // Suscribirse a cambios remotos (llegan vía onSnapshot → AeroCloud.notify)
  useEffect(() => {
    if (!window.AeroCloud) return;
    const unsub = window.AeroCloud.subscribe(key, (newVal) => {
      setV(newVal === undefined ? initial : newVal);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  // Propagar cambios locales a AeroCloud (Firestore). Pero sólo si el valor
  // cambió de verdad, para no pushear el default al montar.
  useEffect(() => {
    if (!window.AeroCloud) return;
    const current = window.AeroCloud.get(key);
    const sV = JSON.stringify(v);
    if (current !== undefined && JSON.stringify(current) === sV) return;
    if (current === undefined && sV === JSON.stringify(initial)) return;
    window.AeroCloud.set(key, v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, v]);
  return [v, setV];
}
window.useLocal = useLocal;

function todayKey(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), dd = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
}
window.todayKey = todayKey;

// ===== CIELO: sunrise/sunset según latitud + día del año =====
// Fórmula NOAA simplificada. Lat/lon por defecto: Madrid (40.4°N, -3.7°E).
// Devuelve { sunrise, sunset } en horas decimales local (ej. 7.5 = 7:30).
function computeSunTimes(date, lat = 40.4168, lon = -3.7038) {
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const N = Math.floor((date - startOfYear) / 86400000); // día del año (1-366)
  const B = (2 * Math.PI / 365) * (N - 81);
  // Ecuación del tiempo en minutos
  const EoT = 9.87 * Math.sin(2*B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  // Declinación solar (radianes)
  const decl = Math.asin(Math.sin(23.44 * Math.PI/180) * Math.sin(B));
  const latRad = lat * Math.PI / 180;
  // Ángulo horario del amanecer (con refracción -0.83°)
  const cosH = (Math.sin(-0.83 * Math.PI/180) - Math.sin(latRad)*Math.sin(decl)) / (Math.cos(latRad)*Math.cos(decl));
  if (cosH > 1)  return { sunrise: null, sunset: null, polarNight: true };
  if (cosH < -1) return { sunrise: null, sunset: null, polarDay: true };
  const H = Math.acos(cosH) * 180/Math.PI; // grados
  const tzOffsetHours = -date.getTimezoneOffset() / 60; // ej. Madrid verano = +2
  const solarNoonUTC = 12 - lon/15 - EoT/60;
  return {
    sunrise: solarNoonUTC - H/15 + tzOffsetHours,
    sunset:  solarNoonUTC + H/15 + tzOffsetHours,
  };
}

// Interpolación lineal entre dos colores hex.
function lerpColor(a, b, t) {
  t = Math.max(0, Math.min(1, t));
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ra = (pa>>16)&0xff, ga = (pa>>8)&0xff, ba = pa&0xff;
  const rb = (pb>>16)&0xff, gb = (pb>>8)&0xff, bb = pb&0xff;
  return `rgb(${Math.round(ra+(rb-ra)*t)},${Math.round(ga+(gb-ga)*t)},${Math.round(ba+(bb-ba)*t)})`;
}

// Easing: smootherstep (más suave que smoothstep). Evita transiciones lineales
// que se sienten abruptas al ojo — el cambio es lento cerca de los keyframes y
// más rápido en el medio, pero nunca salta.
function smootherstep(x) {
  x = Math.max(0, Math.min(1, x));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

// Dado la hora actual y sunrise/sunset, devuelve { top, bottom, tone, textLight }.
// Los keyframes están en hora decimal relativa al día; interpolamos entre el anterior
// y el siguiente según la hora actual.
//
// DISEÑO PROGRESIVO (v2026-04-19n):
// El color del horizonte durante el día es AZUL CLARO estable casi hasta sunset.
// El tono dorado/naranja aparece SOLO en la media hora antes del ocaso — no 1.5h
// antes como hacía la versión anterior. Se añaden keyframes intermedios usando
// fracciones del arco solar (sr → ss) para que la transición Oeste sea uniforme
// independientemente de la estación (en diciembre tarda 2h, en junio casi 5h, pero
// el patrón visual es el mismo). Easing smootherstep encima para suavizar saltos.
function getSkyPalette(now, sunrise, sunset) {
  const h = now.getHours() + now.getMinutes()/60 + now.getSeconds()/3600;
  if (sunrise == null) {
    return { top: '#05070f', bottom: '#0a0f1f', tone: 'polar-night', textLight: true };
  }
  const sr = sunrise, ss = sunset;
  const dayLen = Math.max(0.5, ss - sr); // duración del día en horas
  // Fracciones de día para repartir los tonos de mañana/mediodía/tarde uniformemente.
  const f = (frac) => sr + dayLen * frac;
  const keyframes = [
    // hora, top (cenit), bottom (horizonte), tone narrativo, textLight?
    { t: 0,            top: '#05070f', bottom: '#0a0f1f', tone: 'medianoche',    textLight: true  },
    { t: sr - 1.5,     top: '#0a1330', bottom: '#1f2a55', tone: 'pre-amanecer',  textLight: true  },
    { t: sr - 0.8,     top: '#1a2350', bottom: '#4e5580', tone: 'pre-amanecer',  textLight: true  },
    { t: sr - 0.35,    top: '#2d3a78', bottom: '#c87a55', tone: 'amanecer',      textLight: true  },
    { t: sr,           top: '#4a6fa5', bottom: '#f4a876', tone: 'amanecer',      textLight: true  },
    { t: sr + 0.35,    top: '#6090c8', bottom: '#f5cfa5', tone: 'amanecer',      textLight: false },
    { t: f(0.10),      top: '#6ea8dc', bottom: '#b8dcf4', tone: 'mañana',        textLight: false },
    { t: f(0.25),      top: '#5aa0dc', bottom: '#a8d4ef', tone: 'mañana',        textLight: false },
    { t: f(0.45),      top: '#4e9ce0', bottom: '#9ccfef', tone: 'mediodía',      textLight: false },
    { t: f(0.55),      top: '#4b9be0', bottom: '#9ccfef', tone: 'mediodía',      textLight: false },
    { t: f(0.70),      top: '#4d99dc', bottom: '#9dd0ee', tone: 'tarde',         textLight: false },
    { t: f(0.83),      top: '#4f96d5', bottom: '#b0d6ee', tone: 'tarde',         textLight: false },
    // A partir del 90% del arco solar (≈10% del día restante) empieza a calentar:
    { t: f(0.92),      top: '#528fc8', bottom: '#d0d8e4', tone: 'tarde',         textLight: false },
    { t: ss - 0.5,     top: '#5a8fce', bottom: '#e4c4a0', tone: 'pre-atardecer', textLight: false },
    // Últimos 20 min antes de sunset: naranja creciente
    { t: ss - 0.2,     top: '#6a7fb8', bottom: '#f0a070', tone: 'pre-atardecer', textLight: true  },
    { t: ss - 0.05,    top: '#6a4a8f', bottom: '#e87850', tone: 'atardecer',     textLight: true  },
    { t: ss,           top: '#4a3878', bottom: '#d06030', tone: 'atardecer',     textLight: true  },
    // Tras el ocaso, crepúsculo violáceo que se apaga hacia la noche:
    { t: ss + 0.25,    top: '#2d2a60', bottom: '#8a3e50', tone: 'crepúsculo',    textLight: true  },
    { t: ss + 0.8,     top: '#1a1f45', bottom: '#3a2850', tone: 'crepúsculo',    textLight: true  },
    { t: ss + 1.6,     top: '#0e1430', bottom: '#1a2040', tone: 'noche',         textLight: true  },
    { t: ss + 2.5,     top: '#0a0f25', bottom: '#141a38', tone: 'noche',         textLight: true  },
    { t: 24,           top: '#05070f', bottom: '#0a0f1f', tone: 'medianoche',    textLight: true  },
  ].filter(k => !isNaN(k.t));
  // Asegurar monotonicidad (por si sunset es muy temprano en invierno o los
  // fractional keyframes se solapan con los absolutos ss-X).
  for (let i = 1; i < keyframes.length; i++) {
    if (keyframes[i].t <= keyframes[i-1].t) keyframes[i].t = keyframes[i-1].t + 0.0001;
  }
  // Encontrar el intervalo actual
  let a = keyframes[0], b = keyframes[keyframes.length-1];
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (h >= keyframes[i].t && h < keyframes[i+1].t) { a = keyframes[i]; b = keyframes[i+1]; break; }
  }
  const span = b.t - a.t;
  const rawFrac = span > 0 ? (h - a.t) / span : 0;
  const frac = smootherstep(rawFrac); // easing
  return {
    top:    lerpColor(a.top,    b.top,    frac),
    bottom: lerpColor(a.bottom, b.bottom, frac),
    tone:   rawFrac < 0.5 ? a.tone : b.tone,
    textLight: rawFrac < 0.5 ? a.textLight : b.textLight,
  };
}
window.getSkyPalette = getSkyPalette;
window.computeSunTimes = computeSunTimes;

// ===== CLOCK GADGET (Frutiger Aero digital) =====
// El fondo del reloj se adapta al color del cielo real: amanecer naranja, día azul,
// atardecer rojizo, noche oscura. Sunrise/sunset se recalculan con el día del año
// (fórmula NOAA, lat Madrid), así que en diciembre anochece antes que en junio.
function ClockGadget() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  // Ciudad actual (sincronizada via AeroCloud, default Madrid)
  const [city, setCity] = useLocal('clock_city', CLOCK_CITIES[0]);
  const pad = n => String(n).padStart(2,'0');
  const hh = pad(now.getHours()), mm = pad(now.getMinutes()), ss = pad(now.getSeconds());
  const blink = now.getSeconds() % 2 === 0;
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

  // Sunrise/sunset del día: cambia con fecha Y con ciudad
  const sun = React.useMemo(() => computeSunTimes(now, city.lat, city.lon), [todayKey(now), city.lat, city.lon]);
  // Paleta: se recalcula cada segundo (con now) → transición visual continua
  const sky = React.useMemo(() => getSkyPalette(now, sun.sunrise, sun.sunset), [now, sun.sunrise, sun.sunset]);

  const dow = now.getDay();
  const isWeekend = dow === 0 || dow === 6;
  const textColor = sky.textLight ? '#f4faff' : '#0d2a56';
  const textShadow = sky.textLight ? '0 1px 2px rgba(0,0,0,0.6)' : '0 1px 1px rgba(255,255,255,0.5)';

  // Formateo sunrise/sunset para el subtítulo
  const fmtHour = (h) => {
    if (h == null || isNaN(h)) return '—';
    const H = Math.floor(((h % 24) + 24) % 24);
    const M = Math.round((h - Math.floor(h)) * 60);
    return pad(H) + ':' + pad(M);
  };

  // El gradient del cielo va DENTRO del .clock-face (no en el .gadget) porque es ahí
  // donde está el "cristal" visible del reloj. En el .gadget lo tapaba la capa interior.
  const skyGradient = `linear-gradient(to bottom, ${sky.top} 0%, ${sky.bottom} 100%)`;

  // Ciudad configurable: click en el reloj abre modal de selección
  const [cityOpen, setCityOpen] = useState(false);

  return (
    <>
    <div
      className={`gadget clock-digital sky-${sky.tone.replace(/[^a-z]/gi,'')} ${isWeekend?'weekend-clock':''}`}
      style={{
        textAlign:'center',
        color: textColor,
        cursor: 'pointer',
      }}
      onClick={() => setCityOpen(true)}
      title="Cambiar ciudad"
    >
      <div
        className="clock-face"
        style={{
          color: textColor,
          textShadow,
          background: skyGradient,
          transition: 'background 3s linear',
        }}
      >
        <div className="clock-time">
          <span className="clock-digits">{hh}</span>
          <span className="clock-colon" style={{opacity: blink ? 1 : 0.25}}>:</span>
          <span className="clock-digits">{mm}</span>
          <span className="clock-seconds">{ss}</span>
        </div>
        <div className="clock-shine"></div>
      </div>
      <div style={{fontSize:12, marginTop:8, textTransform:'capitalize', fontWeight:600, textShadow,
                   color: isWeekend ? '#b8f27c' : textColor}}>
        {dias[now.getDay()]}, {now.getDate()} de {meses[now.getMonth()]}
        {isWeekend && <span style={{marginLeft:4, fontSize:10, opacity:0.9}}>· finde</span>}
      </div>
      <div style={{fontSize:10, opacity:0.85, marginTop:2, textShadow}}>
        {city.name} · {sky.tone} · ☀ {fmtHour(sun.sunrise)} – {fmtHour(sun.sunset)}
      </div>
    </div>
    {cityOpen && <CityPickerModal currentCity={city} onClose={() => setCityOpen(false)} onPick={(c) => { setCity(c); setCityOpen(false); }} />}
    </>
  );
}

// ===== CIUDADES para el reloj (lat, lon, nombre visible) =====
// Lat/lon se usan en computeSunTimes para calcular sunrise/sunset propios de la ciudad.
const CLOCK_CITIES = [
  { id: 'madrid',    name: 'Madrid',        lat: 40.4168, lon: -3.7038 },
  { id: 'barcelona', name: 'Barcelona',     lat: 41.3851, lon:  2.1734 },
  { id: 'valencia',  name: 'Valencia',      lat: 39.4699, lon: -0.3763 },
  { id: 'sevilla',   name: 'Sevilla',       lat: 37.3891, lon: -5.9845 },
  { id: 'bilbao',    name: 'Bilbao',        lat: 43.2630, lon: -2.9350 },
  { id: 'palma',     name: 'Palma',         lat: 39.5696, lon:  2.6502 },
  { id: 'canarias',  name: 'Las Palmas',    lat: 28.1235, lon: -15.4363 },
  { id: 'london',    name: 'Londres',       lat: 51.5074, lon: -0.1278 },
  { id: 'paris',     name: 'París',         lat: 48.8566, lon:  2.3522 },
  { id: 'berlin',    name: 'Berlín',        lat: 52.5200, lon: 13.4050 },
  { id: 'nyc',       name: 'Nueva York',    lat: 40.7128, lon: -74.0060 },
  { id: 'tokyo',     name: 'Tokio',         lat: 35.6762, lon: 139.6503 },
  { id: 'sydney',    name: 'Sídney',        lat: -33.8688, lon: 151.2093 },
  { id: 'buenosaires', name: 'Buenos Aires',lat: -34.6037, lon: -58.3816 },
  { id: 'mexico',    name: 'Ciudad de México', lat: 19.4326, lon: -99.1332 },
];
window.CLOCK_CITIES = CLOCK_CITIES;

function CityPickerModal({ currentCity, onClose, onPick }) {
  const [customName, setCustomName] = useState('');
  const [customLat, setCustomLat] = useState('');
  const [customLon, setCustomLon] = useState('');
  const pickCustom = () => {
    const lat = parseFloat(customLat), lon = parseFloat(customLon);
    if (!customName.trim() || isNaN(lat) || isNaN(lon)) return;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return;
    onPick({ id: 'custom:' + customName.toLowerCase().replace(/\s+/g,'-'), name: customName.trim(), lat, lon });
  };
  return (
    <div
      onClick={onClose}
      style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16}}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:'linear-gradient(to bottom, #e8f3fb, #c8dff2)',
          border:'1px solid rgba(40,80,140,0.4)',
          borderRadius:12,
          padding:16,
          maxWidth:380,
          width:'100%',
          maxHeight:'80vh',
          overflow:'auto',
          boxShadow:'0 10px 40px rgba(0,20,60,0.5)',
          fontFamily:'var(--font-ui)'
        }}
      >
        <h3 style={{margin:'0 0 10px', fontSize:14, color:'#0d2a56'}}>🌍 Ciudad del reloj</h3>
        <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:4, marginBottom:10}}>
          {CLOCK_CITIES.map(c => (
            <button
              key={c.id}
              className={`btn sm ${currentCity.id === c.id ? 'green' : ''}`}
              style={{fontSize:11, padding:'6px 4px', textAlign:'center'}}
              onClick={() => onPick(c)}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div style={{borderTop:'1px solid rgba(40,80,140,0.3)', paddingTop:8, marginTop:8}}>
          <div style={{fontSize:11, fontWeight:700, color:'#0d2a56', marginBottom:4}}>O introduce coordenadas:</div>
          <input placeholder="Nombre (ej. Oporto)" value={customName} onChange={e=>setCustomName(e.target.value)}
                 style={{width:'100%', marginBottom:4, padding:'4px 6px', fontSize:11}}/>
          <div style={{display:'flex', gap:4, marginBottom:4}}>
            <input placeholder="Lat (ej. 41.15)" value={customLat} onChange={e=>setCustomLat(e.target.value)}
                   style={{flex:1, padding:'4px 6px', fontSize:11}}/>
            <input placeholder="Lon (ej. -8.61)" value={customLon} onChange={e=>setCustomLon(e.target.value)}
                   style={{flex:1, padding:'4px 6px', fontSize:11}}/>
          </div>
          <button className="btn sm green" onClick={pickCustom} style={{width:'100%'}}>Usar coordenadas</button>
        </div>
        <div style={{marginTop:10, textAlign:'right'}}>
          <button className="btn sm" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
window.CityPickerModal = CityPickerModal;

// ===== CALENDAR GADGET (mini, current month) =====
// Lee fp_tasks + cal_events directamente para reflejar puntos de eventos al instante
// cuando se añade una tarea/examen/evento desde cualquier app (o desde otro dispositivo).
function CalendarGadget({ onOpenFull }) {
  const [events] = useLocal('cal_events', {});
  const [festivos] = useLocal('cal_festivos', []);
  const [fpTasks] = useLocal('fp_tasks', []);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return {y: d.getFullYear(), m: d.getMonth()}; });
  const today = new Date();

  // Fusiona eventos manuales + tareas FP con fecha → los puntos del mini-calendario
  // se pintan también cuando hay una tarea/examen pendiente. Conservamos el campo
  // `color` de los eventos manuales para poder detectar festivos (color==='festivo').
  const mergedEvents = React.useMemo(() => {
    const out = {};
    Object.entries(events || {}).forEach(([day, list]) => {
      out[day] = list.filter(e => !(typeof e.id === 'string' && e.id.startsWith('fp:')));
    });
    (fpTasks || []).forEach(t => {
      if (!t.due || t.done) return;
      if (!out[t.due]) out[t.due] = [];
      out[t.due].push({ id: 'fp:' + t.id });
    });
    return out;
  }, [events, fpTasks]);
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const first = new Date(cursor.y, cursor.m, 1);
  const daysInMonth = new Date(cursor.y, cursor.m+1, 0).getDate();
  const startDow = (first.getDay() + 6) % 7; // Mon-first

  const cells = [];
  for (let i=0; i<startDow; i++) cells.push(null);
  for (let d=1; d<=daysInMonth; d++) cells.push(d);

  const prev = () => {
    const m = cursor.m-1; if (m<0) setCursor({y:cursor.y-1, m:11}); else setCursor({y:cursor.y, m});
  };
  const next = () => {
    const m = cursor.m+1; if (m>11) setCursor({y:cursor.y+1, m:0}); else setCursor({y:cursor.y, m});
  };

  return (
    <div className="gadget">
      <div className="cal-nav">
        <span className="btn sm" onClick={prev}>◀</span>
        <span style={{fontSize:12}}>{meses[cursor.m]} {cursor.y}</span>
        <span className="btn sm" onClick={next}>▶</span>
      </div>
      <div className="cal-grid">
        {['L','M','X','J','V','S','D'].map(d => <div key={d} className="cal-dow" style={{color:'#fff',opacity:0.9}}>{d}</div>)}
        {cells.map((d, i) => {
          if (d === null) return <div key={i}/>;
          const key = `${cursor.y}-${String(cursor.m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          const evsForDay = mergedEvents[key] || [];
          const isToday = today.getFullYear()===cursor.y && today.getMonth()===cursor.m && today.getDate()===d;
          const hasEv = evsForDay.length > 0;
          // Sábado=6, domingo=0 → marcamos findes en verde
          const dow = new Date(cursor.y, cursor.m, d).getDay();
          const isWeekend = dow === 0 || dow === 6;
          // Festivo: día está en cal_festivos (o evento legacy con color='festivo')
          const isFestivo = window.isDayFestivo ? window.isDayFestivo(key, festivos, evsForDay) : false;
          return (
            <div key={i} className={`cal-day ${isToday?'today':''} ${hasEv?'has-event':''} ${isWeekend?'weekend':''} ${isFestivo?'festivo':''}`} onClick={onOpenFull}>
              {d}
            </div>
          );
        })}
      </div>
      <div style={{fontSize:11, textAlign:'center', marginTop:6, opacity:0.85, cursor:'pointer'}} onClick={onOpenFull}>
        Abrir calendario completo →
      </div>
    </div>
  );
}

// ===== EVENTS GADGET =====
// Próximos eventos/tareas/exámenes (7 días). Lee fp_tasks + fp_modulos + cal_events
// y los fusiona en una lista cronológica. Actualización instantánea via useLocal.
function EventsGadget({ onOpenCalendar }) {
  const [fpTasks] = useLocal('fp_tasks', []);
  const [fpModulos] = useLocal('fp_modulos', []);
  const [events] = useLocal('cal_events', {});
  const [festivos] = useLocal('cal_festivos', []);

  const items = React.useMemo(() => {
    const out = [];
    const today = new Date(); today.setHours(0,0,0,0);
    const max = new Date(today); max.setDate(max.getDate() + 7);
    const inRange = (isoDay) => {
      const d = new Date(isoDay + 'T00:00:00');
      return d >= today && d <= max;
    };
    const colorFor = (name) => (window.calEventColor ? window.calEventColor(name) : '#3d7ed8');

    // Tareas/exámenes FP con fecha
    fpTasks.forEach(t => {
      if (!t.due || t.done || !inRange(t.due)) return;
      const mod = fpModulos.find(m => m.id === t.moduloId);
      const colorName = t.tipo === 'examen' ? 'red' : (mod?.color || 'blue');
      out.push({
        key: 'fp:' + t.id,
        date: t.due,
        icon: t.tipo === 'examen' ? '📝' : '📋',
        text: t.title + (t.tema ? ` — ${t.tema}` : ''),
        color: colorFor(colorName),
        kind: t.tipo === 'examen' ? 'Examen' : 'Tarea',
      });
    });

    // Eventos manuales del calendario
    Object.entries(events || {}).forEach(([day, list]) => {
      if (!inRange(day)) return;
      list.forEach(e => {
        // Evita duplicar: los 'fp:' virtuales se regeneran arriba
        if (typeof e.id === 'string' && e.id.startsWith('fp:')) return;
        const isFestivo = e.color === 'festivo'; // legacy
        out.push({
          key: 'ev:' + day + ':' + e.id,
          date: day,
          icon: isFestivo ? '🎉' : '📅',
          text: e.text,
          color: colorFor(e.color),
          kind: isFestivo ? 'Festivo' : 'Evento',
          isFestivo,
        });
      });
    });

    // Festivos autónomos (cal_festivos) — entradas "🎉 Día festivo" sin texto libre
    (festivos || []).forEach(day => {
      if (!inRange(day)) return;
      // Evita duplicar si ya hay un festivo-evento ese día
      if (out.some(it => it.date === day && it.isFestivo)) return;
      out.push({
        key: 'fest:' + day,
        date: day,
        icon: '🎉',
        text: 'Día festivo',
        color: '#2a8f10',
        kind: 'Festivo',
        isFestivo: true,
      });
    });

    out.sort((a, b) => a.date.localeCompare(b.date));
    return out;
  }, [fpTasks, fpModulos, events, festivos]);

  const label = (isoDay) => {
    const d = new Date(isoDay + 'T00:00:00');
    const t = new Date(); t.setHours(0,0,0,0);
    const diff = Math.round((d - t) / 86400000);
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Mañana';
    if (diff < 7) return ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d.getDay()];
    return isoDay.slice(5);
  };

  return (
    <div className="gadget">
      <h3>🔔 Próximos 7 días</h3>
      {items.length === 0 && (
        <div style={{fontSize:11, opacity:0.75, fontStyle:'italic', padding:'4px 2px'}}>
          Nada a la vista.
        </div>
      )}
      {items.slice(0, 6).map(it => {
        // Findes en verde: pintamos el fondo con tinte verde suave para que salten a la vista.
        // Festivos en verde MÁS intenso — prevalecen sobre el tinte de finde.
        const dow = new Date(it.date + 'T00:00:00').getDay();
        const isWeekend = dow === 0 || dow === 6;
        const bg = it.isFestivo
          ? 'linear-gradient(to right, rgba(42,143,16,0.55), rgba(42,143,16,0.25))'
          : isWeekend
            ? 'linear-gradient(to right, rgba(95,160,40,0.28), rgba(95,160,40,0.12))'
            : 'rgba(255,255,255,0.1)';
        return (
          <div key={it.key} style={{
            display:'flex', alignItems:'center', gap:6, marginBottom:4,
            padding:'3px 5px', borderRadius:4,
            background: bg,
            borderLeft:`3px solid ${it.color}`
          }}>
            <span style={{fontSize:12}}>{it.icon}</span>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:11, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                {it.text}
              </div>
              <div style={{fontSize:9, opacity:0.85, color: (it.isFestivo || isWeekend) ? '#d4ffb0' : undefined}}>
                {label(it.date)} · {it.kind}{it.isFestivo ? ' · 🎉' : isWeekend ? ' · finde' : ''}
              </div>
            </div>
          </div>
        );
      })}
      {items.length > 6 && (
        <div style={{fontSize:10, opacity:0.7, textAlign:'center'}}>+{items.length - 6} más</div>
      )}
      {onOpenCalendar && (
        <div style={{fontSize:11, textAlign:'center', marginTop:6, opacity:0.85, cursor:'pointer'}}
          onClick={onOpenCalendar}>
          Abrir calendario →
        </div>
      )}
    </div>
  );
}

// ===== HABITS GADGET =====
function HabitsGadget({ habits, setHabits }) {
  const t = todayKey();
  const toggle = (id) => {
    setHabits(habits.map(h => {
      if (h.id !== id) return h;
      const done = {...(h.done||{})};
      done[t] = !done[t];
      return {...h, done};
    }));
  };
  // Show last 5 days
  const days = [];
  for (let i=4; i>=0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    days.push({ key: todayKey(d), label: ['L','M','X','J','V','S','D'][(d.getDay()+6)%7] });
  }

  return (
    <div className="gadget">
      <h3>✓ Hábitos de hoy</h3>
      {habits.length === 0 && <div style={{fontSize:10, opacity:0.7, fontStyle:'italic'}}>Abre la ventana de hábitos para añadir</div>}
      {habits.slice(0,6).map(h => (
        <div key={h.id} className="habit-row" style={{marginBottom:4}}>
          <span style={{fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{h.name}</span>
          <div className="habit-days">
            {days.map(d => (
              <div key={d.key}
                className={`habit-dot ${h.done && h.done[d.key] ? 'done':''}`}
                title={d.key}
                onClick={() => d.key === t && toggle(h.id)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== QUICKLINKS GADGET =====
// Whitelist de SVG: strip <script>, atributos on*, y href/xlink:href peligrosos
const SVG_ALLOWED_TAGS = new Set(['svg','defs','g','path','circle','ellipse','rect','line','polygon','polyline','text','tspan','lineargradient','radialgradient','stop','filter','fegaussianblur','femerge','femergenode','feoffset','fecolormatrix','feflood','fecomposite','mask','clippath','use','title','desc']);
function sanitizeSvg(raw) {
  if (typeof raw !== 'string' || raw.length > 8000) return '';
  try {
    const doc = new DOMParser().parseFromString(raw, 'image/svg+xml');
    if (doc.querySelector('parsererror')) return '';
    const root = doc.documentElement;
    if (!root || root.nodeName.toLowerCase() !== 'svg') return '';
    const walk = (el) => {
      const tag = el.nodeName.toLowerCase();
      if (!SVG_ALLOWED_TAGS.has(tag)) { el.remove(); return; }
      [...el.attributes].forEach(attr => {
        const n = attr.name.toLowerCase();
        if (n.startsWith('on')) el.removeAttribute(attr.name);
        else if ((n === 'href' || n === 'xlink:href') && /^\s*javascript:/i.test(attr.value)) el.removeAttribute(attr.name);
      });
      [...el.children].forEach(walk);
    };
    walk(root);
    return new XMLSerializer().serializeToString(root);
  } catch { return ''; }
}
function safeExternalUrl(url) {
  try {
    const u = new URL(url, window.location.href);
    return (u.protocol === 'https:' || u.protocol === 'http:') ? u.href : '#';
  } catch { return '#'; }
}
window.sanitizeSvg = sanitizeSvg;
window.safeExternalUrl = safeExternalUrl;

function QuickLinksGadget({ links }) {
  return (
    <div className="gadget">
      <h3>⚡ Links rápidos</h3>
      <div className="quicklinks">
        {links.map((l, i) => (
          <a key={i} className="ql-btn" href={safeExternalUrl(l.url)} target="_blank" rel="noopener noreferrer" title={l.name}>
            <div dangerouslySetInnerHTML={{__html: sanitizeSvg(l.svg)}} />
          </a>
        ))}
      </div>
    </div>
  );
}

// ===== YEAR PROGRESS GADGET (Frutiger Aero) =====
// Círculo glossy estilo Aqua/Vista que muestra qué porcentaje del año ha pasado.
// Paleta de color: enero = azul frío (cyan/teal), diciembre = rojo caliente.
// Interpolamos por keyframes mensuales con smootherstep para una transición suave.
// Sincronizado con la fecha real (recalcula cada minuto).
const YEAR_PROGRESS_KEYFRAMES = [
  // 12 keyframes — uno por mes (fracción 0 → 11/12). Diciembre extiende hasta 1.
  { t: 0/12,  hex: '#1f7fbf' }, // Enero — azul frío profundo
  { t: 1/12,  hex: '#2e98c8' }, // Febrero — azul cielo invernal
  { t: 2/12,  hex: '#3aa8b0' }, // Marzo — turquesa primaveral
  { t: 3/12,  hex: '#52b890' }, // Abril — verde menta
  { t: 4/12,  hex: '#86c860' }, // Mayo — verde lima
  { t: 5/12,  hex: '#c0c83a' }, // Junio — amarillo verdoso
  { t: 6/12,  hex: '#e8c020' }, // Julio — amarillo cálido pleno
  { t: 7/12,  hex: '#f0a020' }, // Agosto — naranja dorado
  { t: 8/12,  hex: '#e87820' }, // Septiembre — naranja
  { t: 9/12,  hex: '#d85020' }, // Octubre — naranja rojizo
  { t: 10/12, hex: '#c02818' }, // Noviembre — rojo
  { t: 1.0,   hex: '#9a1010' }, // Diciembre/fin de año — rojo caliente profundo
];
function yearWarmthColor(frac) {
  const f = Math.max(0, Math.min(1, frac));
  const ks = YEAR_PROGRESS_KEYFRAMES;
  for (let i = 0; i < ks.length - 1; i++) {
    if (f >= ks[i].t && f <= ks[i+1].t) {
      const span = ks[i+1].t - ks[i].t;
      const local = span > 0 ? (f - ks[i].t) / span : 0;
      return lerpColor(ks[i].hex, ks[i+1].hex, smootherstep(local));
    }
  }
  return ks[ks.length-1].hex;
}

function YearProgressGadget() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    // El porcentaje cambia ~0.27% al día — con recalcular una vez al día sobra.
    // Programamos un timeout exacto a medianoche; al dispararse, actualiza y
    // reprograma el siguiente. Resetea automáticamente al cambiar de año
    // (ej. 1 enero 2027 → pct vuelve a 0%) porque new Date().getFullYear() actualiza.
    let timer;
    const scheduleNextMidnight = () => {
      const n = new Date();
      const next = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 5);
      const ms = Math.max(1000, next.getTime() - n.getTime());
      timer = setTimeout(() => { setNow(new Date()); scheduleNextMidnight(); }, ms);
    };
    scheduleNextMidnight();
    // Si el portátil duerme atravesando la medianoche, el setTimeout no dispara
    // (macOS/iOS pausan timers). Al despertar o recuperar foco, forzamos refresh
    // si el día del calendario ha cambiado desde la última lectura.
    const refresh = () => {
      setNow(prev => {
        const nd = new Date();
        const sameDay = prev.getFullYear() === nd.getFullYear() &&
                        prev.getMonth() === nd.getMonth() &&
                        prev.getDate() === nd.getDate();
        if (sameDay) return prev;
        // Día nuevo → además de actualizar `now`, reprogramamos el siguiente midnight
        // porque el anterior puede haber quedado en el pasado (el setTimeout "dormido"
        // se ejecutará en cuanto el runloop lo atienda, pero lo cancelamos y lo
        // reprogramamos por higiene).
        if (timer) clearTimeout(timer);
        scheduleNextMidnight();
        return nd;
      });
    };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const year = now.getFullYear();
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();
  const elapsed = now.getTime() - start;
  const total = end - start;
  const frac = Math.max(0, Math.min(1, elapsed / total));
  const pct = Math.floor(frac * 100); // sin decimales, según pidió el usuario

  const warm = yearWarmthColor(frac);
  // Color "frío" del gradient — siempre azul claro Frutiger; el caliente es el variable.
  const cold = '#a8d4ef';

  // Anillo de progreso SVG. Radio 36, stroke 8 → diámetro visible 80px.
  const R = 36;
  const C = 2 * Math.PI * R;
  const dash = C * frac;
  const gap  = C - dash;

  // IDs de los gradientes SVG: estables por instancia vía React.useId(). Así, si
  // mañana alguien monta dos YearProgressGadgets a la vez, cada uno tiene sus
  // propios IDs y no se pisan los gradientes. Los antiguos IDs basados en
  // `Math.round(frac*1000)` cambiaban cada render y colisionaban entre instancias
  // con el mismo frac.
  const uid = React.useId();
  const orbId = `yp-orb-${uid}`;
  const ringId = `yp-ring-${uid}`;
  const hlId = `yp-hl-${uid}`;

  // Texto: blanco con sombra para legibilidad sobre cualquier color del rango.
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  return (
    <div className="gadget" style={{textAlign:'center'}}>
      <h3>Año {year}</h3>
      <div style={{display:'flex', justifyContent:'center', padding:'4px 0 6px'}}>
        <svg viewBox="0 0 100 100" width="110" height="110" style={{filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.35))'}}>
          <defs>
            {/* Orb glossy: cálido en el centro, oscuro en el borde */}
            <radialGradient id={orbId} cx="0.4" cy="0.35" r="0.75">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85"/>
              <stop offset="35%" stopColor={warm} stopOpacity="0.95"/>
              <stop offset="100%" stopColor={warm} stopOpacity="1"/>
            </radialGradient>
            {/* Anillo de progreso: gradient frío→cálido */}
            <linearGradient id={ringId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={cold}/>
              <stop offset="100%" stopColor={warm}/>
            </linearGradient>
            {/* Highlight superior */}
            <linearGradient id={hlId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.85)"/>
              <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
            </linearGradient>
          </defs>
          {/* Track del anillo (fondo gris translúcido) */}
          <circle cx="50" cy="50" r={R}
                  fill="none"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth="8"/>
          {/* Anillo de progreso. Empieza arriba (-90°) gracias al transform. */}
          <circle cx="50" cy="50" r={R}
                  fill="none"
                  stroke={`url(#${ringId})`}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${gap}`}
                  transform="rotate(-90 50 50)"/>
          {/* Orb interior glossy */}
          <circle cx="50" cy="50" r={R - 7}
                  fill={`url(#${orbId})`}
                  stroke="rgba(0,0,0,0.25)"
                  strokeWidth="0.8"/>
          {/* Highlight superior del orb */}
          <ellipse cx="50" cy="38" rx={R - 12} ry={R/3.5}
                   fill={`url(#${hlId})`}/>
          {/* Texto del porcentaje */}
          <text x="50" y="56"
                textAnchor="middle"
                fontFamily="Segoe UI, Tahoma, sans-serif"
                fontSize="20" fontWeight="700"
                fill="#fff"
                style={{textShadow:'0 1px 2px rgba(0,0,0,0.55)'}}>
            {pct}%
          </text>
        </svg>
      </div>
      <div style={{fontSize:11, opacity:0.9, marginTop:-2}}>
        {meses[now.getMonth()]} · día {Math.floor((now - new Date(year,0,1)) / 86400000) + 1} / {Math.round(total / 86400000)}
      </div>
    </div>
  );
}

// ===== SYSTEM GADGET (export/import) =====
function SystemGadget({ onExport, onImport }) {
  const fileRef = React.useRef();
  return (
    <div className="gadget">
      <h3>⚙ Sistema</h3>
      <div style={{display:'flex', gap:4, flexWrap:'wrap'}}>
        <button className="btn sm green" onClick={onExport}>💾 Exportar</button>
        <button className="btn sm" onClick={() => fileRef.current.click()}>📂 Importar</button>
      </div>
      <input ref={fileRef} type="file" accept="application/json" style={{display:'none'}}
        onChange={e => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = () => onImport(r.result); r.readAsText(f); } }} />
      <div style={{fontSize:9, marginTop:6, opacity:0.7, lineHeight:1.3}}>
        Todos los datos viven en este navegador. Exporta JSON para backup.
      </div>
    </div>
  );
}

window.Gadgets = { ClockGadget, CalendarGadget, EventsGadget, HabitsGadget, QuickLinksGadget, SystemGadget, YearProgressGadget };
