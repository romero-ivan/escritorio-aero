// Aqua/Vista-style glossy icons, all inline SVG
// Each icon: a colored orb with highlight + glyph

const GlossyOrb = ({ color1, color2, children, size = 56 }) => (
  <svg viewBox="0 0 56 56" width={size} height={size}>
    <defs>
      <radialGradient id={`orb-${color1}-${color2}`} cx="0.5" cy="0.35" r="0.7">
        <stop offset="0%" stopColor={color1} />
        <stop offset="100%" stopColor={color2} />
      </radialGradient>
      <linearGradient id={`hl-${color1}-${color2}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </linearGradient>
    </defs>
    <circle cx="28" cy="28" r="25" fill={`url(#orb-${color1}-${color2})`} stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
    <ellipse cx="28" cy="18" rx="18" ry="9" fill={`url(#hl-${color1}-${color2})`} opacity="0.8" />
    {children}
  </svg>
);

// Classic blue folder, briefcase, notepad, etc.
const DocIcon = ({ title, color = 'blue' }) => {
  const colors = {
    blue: ['#bfe1ff', '#1f6cc0'],
    green: ['#c7ea8a', '#3a7c14'],
    red: ['#ffb3a1', '#b03010'],
    purple: ['#d8b8ff', '#6a30b3'],
    orange: ['#ffd08a', '#c06810'],
    cyan: ['#b8f0ff', '#1878a8'],
    yellow: ['#ffec9a', '#b08810'],
    pink: ['#ffc5dd', '#c03078'],
  };
  const c = colors[color] || colors.blue;
  return (
    <svg viewBox="0 0 56 56" className="glyph">
      <defs>
        <linearGradient id={`doc-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c[0]} />
          <stop offset="50%" stopColor={c[1]} stopOpacity="0.8" />
          <stop offset="100%" stopColor={c[1]} />
        </linearGradient>
        <linearGradient id={`docHL-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      {/* Paper body */}
      <path d="M 10 6 L 38 6 L 48 16 L 48 52 L 10 52 Z" fill={`url(#doc-${color})`} stroke="rgba(0,0,0,0.4)" strokeWidth="1" />
      {/* Folded corner */}
      <path d="M 38 6 L 48 16 L 38 16 Z" fill="rgba(255,255,255,0.7)" stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" />
      {/* Highlight */}
      <rect x="10" y="6" width="38" height="22" fill={`url(#docHL-${color})`} opacity="0.5" />
      {/* Lines */}
      <g stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" strokeLinecap="round">
        <line x1="16" y1="28" x2="40" y2="28" />
        <line x1="16" y1="34" x2="42" y2="34" />
        <line x1="16" y1="40" x2="36" y2="40" />
      </g>
      {title && <title>{title}</title>}
    </svg>
  );
};

const FolderIcon = ({ color = 'yellow' }) => {
  const colors = {
    yellow: ['#ffe890', '#d89a10', '#8a5e00'],
    blue:   ['#9ecdff', '#2c74c8', '#0d3a72'],
    green:  ['#b8e680', '#4a9a1a', '#1d3e0a'],
    red:    ['#ffab95', '#c02e10', '#5a0f04'],
    purple: ['#d4b5ff', '#6830b0', '#2e0f50'],
  };
  const c = colors[color] || colors.yellow;
  return (
    <svg viewBox="0 0 56 56" className="glyph">
      <defs>
        <linearGradient id={`fld-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c[0]} />
          <stop offset="55%" stopColor={c[1]} />
          <stop offset="100%" stopColor={c[2]} />
        </linearGradient>
      </defs>
      {/* Back tab */}
      <path d="M 4 18 L 22 18 L 26 14 L 52 14 L 52 22 L 4 22 Z" fill={c[2]} stroke="rgba(0,0,0,0.45)" strokeWidth="1" />
      {/* Front face */}
      <path d="M 4 22 L 52 22 L 52 48 L 4 48 Z" fill={`url(#fld-${color})`} stroke="rgba(0,0,0,0.45)" strokeWidth="1" />
      {/* Glossy highlight */}
      <rect x="5" y="23" width="46" height="11" fill="rgba(255,255,255,0.55)" rx="1" />
    </svg>
  );
};

// Specific app icons
const Icons = {
  // School / books / FP tasks
  fp: (
    <svg viewBox="0 0 56 56" className="glyph">
      <defs>
        <linearGradient id="bookG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff9a8a" />
          <stop offset="50%" stopColor="#c02510" />
          <stop offset="100%" stopColor="#6a0f04" />
        </linearGradient>
      </defs>
      <rect x="8" y="10" width="40" height="38" rx="3" fill="url(#bookG)" stroke="rgba(0,0,0,0.4)" />
      <rect x="8" y="10" width="40" height="15" fill="rgba(255,255,255,0.45)" rx="3" />
      <line x1="28" y1="12" x2="28" y2="46" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8"/>
      <g stroke="rgba(255,255,255,0.8)" strokeWidth="1.3" strokeLinecap="round">
        <line x1="12" y1="32" x2="24" y2="32" />
        <line x1="12" y1="37" x2="24" y2="37" />
        <line x1="32" y1="32" x2="44" y2="32" />
        <line x1="32" y1="37" x2="44" y2="37" />
      </g>
    </svg>
  ),
  diario: <DocIcon color="purple" />,
  horario: (
    <svg viewBox="0 0 56 56" className="glyph">
      <defs>
        <linearGradient id="horG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c8e0ff" />
          <stop offset="55%" stopColor="#3070c0" />
          <stop offset="100%" stopColor="#0a2858" />
        </linearGradient>
        <linearGradient id="horHL" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      {/* Cuerpo del reloj/horario tipo cristal */}
      <rect x="6" y="8" width="44" height="42" rx="4" fill="url(#horG)" stroke="rgba(0,0,0,0.45)" />
      {/* Highlight glossy superior */}
      <rect x="6" y="8" width="44" height="14" fill="url(#horHL)" rx="4" opacity="0.7"/>
      {/* Filas horario (líneas blancas + cuadritos por día) */}
      <g fill="rgba(255,255,255,0.85)">
        <rect x="10" y="26" width="36" height="3" rx="1"/>
        <rect x="10" y="32" width="36" height="3" rx="1"/>
        <rect x="10" y="38" width="36" height="3" rx="1"/>
        <rect x="10" y="44" width="36" height="3" rx="1"/>
      </g>
      {/* Columna roja vertical = hoy */}
      <rect x="22" y="24" width="6" height="24" fill="rgba(255,80,60,0.65)" rx="1"/>
      {/* Esquinas tipo agenda */}
      <rect x="14" y="4" width="5" height="10" rx="1.5" fill="#4a4a4a" stroke="rgba(0,0,0,0.5)"/>
      <rect x="37" y="4" width="5" height="10" rx="1.5" fill="#4a4a4a" stroke="rgba(0,0,0,0.5)"/>
    </svg>
  ),
  habitos: (
    <svg viewBox="0 0 56 56" className="glyph">
      <defs>
        <linearGradient id="chkG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c7ea8a" />
          <stop offset="55%" stopColor="#3a7c14" />
          <stop offset="100%" stopColor="#163a06" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="44" height="44" rx="6" fill="url(#chkG)" stroke="rgba(0,0,0,0.5)" />
      <rect x="6" y="6" width="44" height="18" fill="rgba(255,255,255,0.4)" rx="6" />
      <path d="M 16 28 L 25 38 L 44 18" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 56 56" className="glyph">
      <defs>
        <linearGradient id="calG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#bcd" />
        </linearGradient>
      </defs>
      <rect x="6" y="10" width="44" height="40" rx="3" fill="url(#calG)" stroke="rgba(0,0,0,0.45)" />
      <rect x="6" y="10" width="44" height="11" fill="#c02510" rx="3" />
      <rect x="6" y="10" width="44" height="5" fill="rgba(255,255,255,0.4)" rx="3" />
      <rect x="14" y="6" width="5" height="10" rx="1.5" fill="#4a4a4a" stroke="rgba(0,0,0,0.5)" />
      <rect x="37" y="6" width="5" height="10" rx="1.5" fill="#4a4a4a" stroke="rgba(0,0,0,0.5)" />
      <text x="28" y="42" fontFamily="Segoe UI, Tahoma" fontSize="18" fontWeight="700" fill="#1b4c96" textAnchor="middle">15</text>
    </svg>
  ),
  finanzas: (
    <svg viewBox="0 0 56 56" className="glyph">
      <defs>
        <linearGradient id="finG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b8f0d0" />
          <stop offset="55%" stopColor="#2a9a4a" />
          <stop offset="100%" stopColor="#0d4a1c" />
        </linearGradient>
      </defs>
      <rect x="6" y="10" width="44" height="38" rx="4" fill="url(#finG)" stroke="rgba(0,0,0,0.45)" />
      <rect x="6" y="10" width="44" height="12" fill="rgba(255,255,255,0.4)" rx="4" />
      {/* chart bars */}
      <g fill="rgba(255,255,255,0.85)">
        <rect x="12" y="36" width="5" height="8" />
        <rect x="20" y="30" width="5" height="14" />
        <rect x="28" y="26" width="5" height="18" />
        <rect x="36" y="20" width="5" height="24" />
      </g>
      <path d="M 10 38 L 18 32 L 26 28 L 34 22 L 42 16" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  ),
  medico: (
    <svg viewBox="0 0 56 56" className="glyph">
      <defs>
        <linearGradient id="medG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd0d0" />
          <stop offset="55%" stopColor="#e02030" />
          <stop offset="100%" stopColor="#701010" />
        </linearGradient>
      </defs>
      <rect x="6" y="10" width="44" height="38" rx="4" fill="#fff" stroke="rgba(0,0,0,0.45)" />
      <rect x="6" y="10" width="44" height="12" fill="rgba(200,230,255,0.6)" rx="4" />
      <path d="M 24 18 L 32 18 L 32 26 L 40 26 L 40 34 L 32 34 L 32 42 L 24 42 L 24 34 L 16 34 L 16 26 L 24 26 Z" fill="url(#medG)" stroke="rgba(0,0,0,0.4)" />
    </svg>
  ),
  anime: (
    <img src="icono.webp" className="glyph" alt="" draggable="false"
      style={{objectFit:'contain', transform:'scale(0.78)', filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.35))'}} />
  ),
  pelis: (
    <svg viewBox="0 0 56 56" className="glyph">
      <defs>
        <linearGradient id="popBucketG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff8080" />
          <stop offset="55%" stopColor="#c02020" />
          <stop offset="100%" stopColor="#5a0808" />
        </linearGradient>
        <radialGradient id="popKernelG" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0%" stopColor="#fffbe0" />
          <stop offset="60%" stopColor="#ffe080" />
          <stop offset="100%" stopColor="#c08820" />
        </radialGradient>
      </defs>
      {/* popcorn puffs */}
      <g fill="url(#popKernelG)" stroke="rgba(120,60,0,0.4)" strokeWidth="0.6">
        <circle cx="18" cy="16" r="6" />
        <circle cx="28" cy="11" r="6.5" />
        <circle cx="38" cy="16" r="6" />
        <circle cx="14" cy="22" r="5" />
        <circle cx="42" cy="22" r="5" />
        <circle cx="24" cy="18" r="5" />
        <circle cx="34" cy="19" r="5" />
      </g>
      {/* bucket */}
      <path d="M 10 26 L 46 26 L 42 50 L 14 50 Z" fill="url(#popBucketG)" stroke="rgba(0,0,0,0.5)" />
      {/* white stripes */}
      <g fill="#fff" opacity="0.92">
        <path d="M 18 26 L 17 50 L 21 50 L 22 26 Z" />
        <path d="M 30 26 L 30 50 L 34 50 L 34 26 Z" />
        <path d="M 42 26 L 42 50 L 38 50 L 38 26 Z" opacity="0.7" />
      </g>
      {/* highlight */}
      <path d="M 10 26 L 46 26 L 44 30 L 12 30 Z" fill="rgba(255,255,255,0.35)" />
    </svg>
  ),
  series: (
    <svg viewBox="0 0 56 56" className="glyph">
      <defs>
        <linearGradient id="tvG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#80c0e8"/>
          <stop offset="55%" stopColor="#1878c8"/>
          <stop offset="100%" stopColor="#0a2858"/>
        </linearGradient>
      </defs>
      {/* Pantalla TV */}
      <rect x="4" y="10" width="48" height="32" rx="4" fill="url(#tvG)" stroke="rgba(0,0,0,0.5)"/>
      <rect x="4" y="10" width="48" height="12" fill="rgba(255,255,255,0.35)" rx="4"/>
      {/* Reflejo diagonal */}
      <path d="M 8 12 L 28 12 L 14 40 L 8 40 Z" fill="rgba(255,255,255,0.18)"/>
      {/* Antenas */}
      <line x1="18" y1="10" x2="12" y2="4" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="38" y1="10" x2="44" y2="4" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="4" r="1.8" fill="#4a4a4a"/>
      <circle cx="44" cy="4" r="1.8" fill="#4a4a4a"/>
      {/* Base */}
      <rect x="16" y="42" width="24" height="4" rx="1" fill="#2a2a2a" stroke="rgba(0,0,0,0.5)"/>
      <rect x="22" y="46" width="12" height="4" rx="1" fill="#3a3a3a" stroke="rgba(0,0,0,0.5)"/>
      {/* Icono Play */}
      <polygon points="23,20 23,36 38,28" fill="#fff" opacity="0.9"/>
    </svg>
  ),
  juegos: (
    <svg viewBox="0 0 56 56" className="glyph">
      <defs>
        <linearGradient id="padG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c090e8"/>
          <stop offset="55%" stopColor="#6830b0"/>
          <stop offset="100%" stopColor="#2e0f50"/>
        </linearGradient>
      </defs>
      {/* Mando */}
      <path d="M 10 22 Q 6 22 6 30 Q 6 42 12 44 Q 18 44 20 38 L 36 38 Q 38 44 44 44 Q 50 42 50 30 Q 50 22 46 22 Q 40 22 36 26 L 20 26 Q 16 22 10 22 Z"
            fill="url(#padG)" stroke="rgba(0,0,0,0.5)" strokeWidth="1"/>
      {/* Brillo superior */}
      <path d="M 10 22 Q 16 22 20 26 L 36 26 Q 40 22 46 22 Q 48 22 49 24 Q 40 27 28 27 Q 16 27 7 24 Q 8 22 10 22 Z"
            fill="rgba(255,255,255,0.35)"/>
      {/* D-pad */}
      <rect x="13" y="30" width="9" height="3" rx="0.5" fill="#fff" opacity="0.92"/>
      <rect x="16.5" y="26.5" width="3" height="10" rx="0.5" fill="#fff" opacity="0.92"/>
      {/* Botones A/B/X/Y */}
      <circle cx="40" cy="28" r="2" fill="#ffd050"/>
      <circle cx="44" cy="32" r="2" fill="#ff5050"/>
      <circle cx="36" cy="32" r="2" fill="#50d0ff"/>
      <circle cx="40" cy="36" r="2" fill="#80e080"/>
    </svg>
  ),
  proyectos: <FolderIcon color="blue" />,
  recursos: (
    <svg viewBox="0 0 56 56" className="glyph">
      <defs>
        <linearGradient id="gemG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d8b8ff" />
          <stop offset="55%" stopColor="#6830b0" />
          <stop offset="100%" stopColor="#2e0f50" />
        </linearGradient>
      </defs>
      <polygon points="28,6 48,22 40,50 16,50 8,22" fill="url(#gemG)" stroke="rgba(0,0,0,0.45)" />
      <polygon points="28,6 48,22 40,24 28,12 16,24 8,22" fill="rgba(255,255,255,0.4)" />
      <line x1="8" y1="22" x2="48" y2="22" stroke="rgba(0,0,0,0.3)" />
      <line x1="28" y1="6" x2="28" y2="12" stroke="rgba(0,0,0,0.3)" />
    </svg>
  ),
  enlaces: (
    <svg viewBox="0 0 56 56" className="glyph">
      <defs>
        <linearGradient id="glbG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c8f0ff" />
          <stop offset="55%" stopColor="#1878c8" />
          <stop offset="100%" stopColor="#082a58" />
        </linearGradient>
      </defs>
      <circle cx="28" cy="28" r="22" fill="url(#glbG)" stroke="rgba(0,0,0,0.5)" />
      <g stroke="rgba(255,255,255,0.6)" strokeWidth="1" fill="none">
        <ellipse cx="28" cy="28" rx="22" ry="9" />
        <ellipse cx="28" cy="28" rx="10" ry="22" />
        <line x1="6" y1="28" x2="50" y2="28" />
      </g>
      <ellipse cx="22" cy="16" rx="14" ry="7" fill="rgba(255,255,255,0.35)" />
    </svg>
  ),
};

// Small titlebar icons (14px)
const TIcons = {};
Object.keys(Icons).forEach(k => {
  TIcons[k] = <span dangerouslySetInnerHTML={{__html: ''}} />;
});

window.Icons = Icons;
window.DocIcon = DocIcon;
window.FolderIcon = FolderIcon;
window.GlossyOrb = GlossyOrb;
