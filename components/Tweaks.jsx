// Tweaks panel — host-integrated edit mode
function TweaksPanel({ visible, tweaks, onTweak }) {
  if (!visible) return null;
  return (
    <div className="tweaks-panel">
      <h4>⚙ Tweaks</h4>
      <div className="tweaks-row">
        <span>Wallpaper</span>
        <select value={tweaks.wallpaper} onChange={e=>onTweak({wallpaper: e.target.value})}>
          <option value="bliss">Cielo azul</option>
          <option value="aurora">Aurora (noche)</option>
          <option value="aqua">Acuático (peces)</option>
          <option value="clouds">Nubes</option>
          <option value="grass">Hierba glossy</option>
        </select>
      </div>
      <div className="tweaks-row">
        <span>Fuente</span>
        <select value={tweaks.font} onChange={e=>onTweak({font: e.target.value})}>
          <option value="segoe">Segoe UI</option>
          <option value="tahoma">Tahoma</option>
          <option value="myriad">Myriad Pro</option>
          <option value="trebuchet">Trebuchet MS</option>
        </select>
      </div>
      <div className="tweaks-row">
        <span>Modo oscuro</span>
        <input type="checkbox" checked={tweaks.dark} onChange={e=>onTweak({dark: e.target.checked})}/>
      </div>
      <div className="tweaks-row">
        <span>Blur ({tweaks.blur}px)</span>
        <input type="range" min="0" max="40" value={tweaks.blur} onChange={e=>onTweak({blur: parseInt(e.target.value)})}/>
      </div>
      <div className="tweaks-row">
        <span>Burbujas</span>
        <input type="checkbox" checked={tweaks.particles} onChange={e=>onTweak({particles: e.target.checked})}/>
      </div>
    </div>
  );
}
window.TweaksPanel = TweaksPanel;
