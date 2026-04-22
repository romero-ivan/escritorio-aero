// Taskbar — start orb, open windows, tray clock
function Taskbar({ windows, focused, onFocusToggle, onStart, clock }) {
  return (
    <div className="taskbar">
      <div className="start-orb" onClick={onStart}>
        <svg viewBox="0 0 24 24" width="18" height="18">
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
        Inicio
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
