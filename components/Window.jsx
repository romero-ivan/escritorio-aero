// Aero window — draggable, resizable, focusable, Vista-style titlebar
function AeroWindow({ id, title, icon, x, y, w, h, z, focused, minimized, onFocus, onClose, onMinimize, onMove, onResize, children }) {
  const winRef = React.useRef(null);
  const dragState = React.useRef(null);

  const startDrag = (e) => {
    onFocus(id);
    dragState.current = { type: 'drag', sx: e.clientX, sy: e.clientY, ox: x, oy: y };
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', endDrag);
    e.preventDefault();
  };
  const startResize = (e) => {
    onFocus(id);
    dragState.current = { type: 'resize', sx: e.clientX, sy: e.clientY, ow: w, oh: h };
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', endDrag);
    e.preventDefault();
    e.stopPropagation();
  };
  const onDrag = (e) => {
    const s = dragState.current;
    if (!s) return;
    if (s.type === 'drag') {
      const nx = Math.max(0, Math.min(window.innerWidth - 80, s.ox + (e.clientX - s.sx)));
      const ny = Math.max(0, Math.min(window.innerHeight - 60, s.oy + (e.clientY - s.sy)));
      onMove(id, nx, ny);
    } else {
      const nw = Math.max(280, s.ow + (e.clientX - s.sx));
      const nh = Math.max(180, s.oh + (e.clientY - s.sy));
      onResize(id, nw, nh);
    }
  };
  const endDrag = () => {
    dragState.current = null;
    window.removeEventListener('mousemove', onDrag);
    window.removeEventListener('mouseup', endDrag);
  };

  if (minimized) return null;

  return (
    <div ref={winRef}
      className={`aero-window ${focused ? 'focused' : ''}`}
      style={{ left: x, top: y, width: w, height: h, zIndex: z }}
      onMouseDown={() => onFocus(id)}>
      <div className="aero-titlebar" onMouseDown={startDrag} onDoubleClick={() => onMinimize(id)}>
        <div className="aero-title">
          {icon && <span className="ticon">{icon}</span>}
          <span>{title}</span>
        </div>
        <div className="aero-ctrls">
          <div className="aero-ctrl" title="Minimizar" onMouseDown={e=>e.stopPropagation()} onClick={() => onMinimize(id)}>_</div>
          <div className="aero-ctrl" title="Maximizar" onMouseDown={e=>e.stopPropagation()}>□</div>
          <div className="aero-ctrl close" title="Cerrar" onMouseDown={e=>e.stopPropagation()} onClick={() => onClose(id)}>✕</div>
        </div>
      </div>
      <div className="aero-body">
        {children}
      </div>
      <div className="aero-resize" onMouseDown={startResize} />
    </div>
  );
}

window.AeroWindow = AeroWindow;
