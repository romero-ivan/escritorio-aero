// Aero window — draggable, resizable, focusable, Vista-style titlebar.
//
// v2026-04-23b: reescrito con Pointer Events para arreglar dos bugs:
// 1) En iPhone/iPad las ventanas eran inmovibles porque solo escuchábamos
//    `mousedown` — iOS Safari no lo dispara desde un tap. Pointer Events
//    unifica mouse + touch + pen en una sola API.
// 2) El handler `onDrag` se recreaba en cada render (x,y,w,h son props que
//    cambian en cada move), por lo que `removeEventListener(endDrag, onDrag)`
//    no removía la referencia registrada y se acumulaban listeners fantasma
//    con cada drag. Ahora los handlers se crean DENTRO del pointerdown,
//    capturando los valores iniciales en el cierre, y se adjuntan al
//    `currentTarget` con `setPointerCapture` para recibir move/up aunque el
//    puntero salga del elemento.
function AeroWindow({ id, title, icon, x, y, w, h, z, focused, minimized, onFocus, onClose, onMinimize, onMove, onResize, children }) {
  const winRef = React.useRef(null);

  const startDrag = (e) => {
    onFocus(id);
    const target = e.currentTarget;
    const pointerId = e.pointerId;
    const sx = e.clientX, sy = e.clientY, ox = x, oy = y;
    try { target.setPointerCapture(pointerId); } catch {}
    const onPointerMove = (e2) => {
      if (e2.pointerId !== pointerId) return;
      const nx = Math.max(0, Math.min(window.innerWidth - 80, ox + (e2.clientX - sx)));
      const ny = Math.max(0, Math.min(window.innerHeight - 60, oy + (e2.clientY - sy)));
      onMove(id, nx, ny);
    };
    const onPointerEnd = (e2) => {
      if (e2.pointerId !== pointerId) return;
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerup', onPointerEnd);
      target.removeEventListener('pointercancel', onPointerEnd);
      try { target.releasePointerCapture(pointerId); } catch {}
    };
    target.addEventListener('pointermove', onPointerMove);
    target.addEventListener('pointerup', onPointerEnd);
    target.addEventListener('pointercancel', onPointerEnd);
    e.preventDefault();
  };

  const startResize = (e) => {
    onFocus(id);
    const target = e.currentTarget;
    const pointerId = e.pointerId;
    const sx = e.clientX, sy = e.clientY, ow = w, oh = h;
    try { target.setPointerCapture(pointerId); } catch {}
    const onPointerMove = (e2) => {
      if (e2.pointerId !== pointerId) return;
      const nw = Math.max(280, ow + (e2.clientX - sx));
      const nh = Math.max(180, oh + (e2.clientY - sy));
      onResize(id, nw, nh);
    };
    const onPointerEnd = (e2) => {
      if (e2.pointerId !== pointerId) return;
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerup', onPointerEnd);
      target.removeEventListener('pointercancel', onPointerEnd);
      try { target.releasePointerCapture(pointerId); } catch {}
    };
    target.addEventListener('pointermove', onPointerMove);
    target.addEventListener('pointerup', onPointerEnd);
    target.addEventListener('pointercancel', onPointerEnd);
    e.preventDefault();
    e.stopPropagation();
  };

  if (minimized) return null;

  return (
    <div ref={winRef}
      className={`aero-window ${focused ? 'focused' : ''}`}
      style={{ left: x, top: y, width: w, height: h, zIndex: z, touchAction: 'none' }}
      onPointerDown={() => onFocus(id)}>
      <div className="aero-titlebar" onPointerDown={startDrag} onDoubleClick={() => onMinimize(id)}>
        <div className="aero-title">
          {icon && <span className="ticon">{icon}</span>}
          <span>{title}</span>
        </div>
        <div className="aero-ctrls">
          <div className="aero-ctrl" title="Minimizar" onPointerDown={e=>e.stopPropagation()} onClick={() => onMinimize(id)}>_</div>
          <div className="aero-ctrl" title="Maximizar" onPointerDown={e=>e.stopPropagation()}>□</div>
          <div className="aero-ctrl close" title="Cerrar" onPointerDown={e=>e.stopPropagation()} onClick={() => onClose(id)}>✕</div>
        </div>
      </div>
      <div className="aero-body">
        {children}
      </div>
      <div className="aero-resize" onPointerDown={startResize} />
    </div>
  );
}

window.AeroWindow = AeroWindow;
