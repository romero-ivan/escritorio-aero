// Taskbar — start orb, open windows, tray clock.
// El reloj vive aquí (no en App root) para aislar su re-render de 30s del
// resto del árbol (ventanas, gadgets con SVG charts). Además se pausa cuando
// la pestaña queda oculta: en iOS cada setInterval activo consume batería
// incluso con pantalla apagada.
function Taskbar({ windows, focused, onFocusToggle, onStart }) {
  const [clock, setClock] = React.useState(new Date());
  const [showNotify, setShowNotify] = React.useState(false);
  const notifyTimerRef = React.useRef(null);

  React.useEffect(() => {
    let timer;
    const start = () => { timer = setInterval(() => setClock(new Date()), 30000); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const onVis = () => {
      if (document.hidden) { stop(); }
      else { setClock(new Date()); if (!timer) start(); }
    };
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  const handleStartClick = () => {
    if (notifyTimerRef.current) clearTimeout(notifyTimerRef.current);
    setShowNotify(true);
    notifyTimerRef.current = setTimeout(() => {
      setShowNotify(false);
    }, 4000);
    
    if (onStart) onStart();
  };

  return (
    <div className="taskbar">
      {showNotify && (
        <div className="aero-balloon-tooltip" style={{
          position: 'fixed',
          bottom: '38px',
          left: '8px',
          background: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(111, 199, 44, 0.6)',
          borderRadius: '8px',
          padding: '10px 14px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4), inset 0 0 10px rgba(111, 199, 44, 0.15)',
          zIndex: 1000,
          animation: 'slide-up-aero 0.3s cubic-bezier(0.19, 1, 0.22, 1) forwards',
          pointerEvents: 'none'
        }}>
          <div style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: '11px',
            fontWeight: '700',
            color: '#6fc72c',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            marginBottom: '3px'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              background: '#6fc72c',
              borderRadius: '50%',
              boxShadow: '0 0 6px #6fc72c'
            }}></span>
            Aero Desktop {window.AERO_VERSION || 'v2026-04-23c'}
          </div>
          <div style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: '10px',
            color: '#cbd5e1'
          }}>
            Última versión sincronizada con GitHub
          </div>
        </div>
      )}
      <div className="start-orb" onClick={handleStartClick}>
        <svg viewBox="0 0 24 24" width="14" height="14">
          <defs>
            <radialGradient id="orbG" cx="0.35" cy="0.35" r="0.7">
              <stop offset="0%" stopColor="#e8f9c8"/>
              <stop offset="50%" stopColor="#6fc72c"/>
              <stop offset="100%" stopColor="#1a4a08"/>
            </radialGradient>
          </defs>
          <circle cx="12" cy="12" r="10" fill="url(#orbG)" stroke="rgba(0,0,0,0.4)"/>
          <g fill="#fff">
            <rect x="6" y="6" width="4" height="4" rx="0.5"/>
            <rect x="11" y="6" width="4" height="4" rx="0.5"/>
            <rect x="6" y="11" width="4" height="4" rx="0.5"/>
            <rect x="11" y="11" width="4" height="4" rx="0.5"/>
          </g>
          <ellipse cx="12" cy="8" rx="7" ry="3" fill="rgba(255,255,255,0.45)"/>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.05, marginLeft: '2px' }}>
          <span style={{ fontSize: '10px', fontWeight: 'bold' }}>Inicio</span>
          <span style={{ fontSize: '7.2px', opacity: 0.85, fontWeight: 'normal', fontFamily: 'monospace' }}>
            {window.AERO_VERSION || 'v2026-04-23c'}
          </span>
        </div>
      </div>
      <div className="tb-divider"/>
      {windows.map(w => (
        <div key={w.id} className={`tb-btn ${focused===w.id && !w.minimized ? 'active' : ''}`} onClick={()=>onFocusToggle(w.id)}>
          {w.icon}
          <span>{w.title}</span>
        </div>
      ))}
      <div className="tb-tray">
        <span style={{fontSize:13}}>🔊 📶 🔋</span>
        <div className="tb-clock">
          <div>{clock.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'})}</div>
          <div style={{fontSize:10, opacity:0.85}}>{clock.toLocaleDateString('es-ES', {day:'2-digit', month:'2-digit', year:'numeric'})}</div>
        </div>
      </div>
    </div>
  );
}
window.Taskbar = Taskbar;
