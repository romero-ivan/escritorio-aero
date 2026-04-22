// Wallpaper component — auténticos backgrounds Frutiger Aero
// All drawn as inline SVG so they're crisp at any size.

function Wallpaper({ kind }) {
  return (
    <div className="wallpaper">
      {kind === 'bliss' && <BlissWallpaper />}
      {kind === 'aurora' && <AuroraWallpaper />}
      {kind === 'aqua' && <AquaWallpaper />}
      {kind === 'clouds' && <CloudsWallpaper />}
      {kind === 'grass' && <GrassWallpaper />}
    </div>
  );
}

function BlissWallpaper() {
  // Cielo azul con nubes (sin colina) — fondo Frutiger Aero limpio.
  return (
    <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="blissSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2d6bbf" />
          <stop offset="40%" stopColor="#4a8fd4" />
          <stop offset="75%" stopColor="#78b6e8" />
          <stop offset="100%" stopColor="#b8d9f2" />
        </linearGradient>
        <radialGradient id="sunGlow" cx="0.75" cy="0.2" r="0.35">
          <stop offset="0%" stopColor="rgba(255,250,220,0.55)" />
          <stop offset="100%" stopColor="rgba(255,250,220,0)" />
        </radialGradient>
        <filter id="softBlur"><feGaussianBlur stdDeviation="3" /></filter>
      </defs>

      <rect width="1920" height="1080" fill="url(#blissSky)" />
      <rect width="1920" height="1080" fill="url(#sunGlow)" />

      {/* Nubes dispersas a varias alturas */}
      <g opacity="0.95" filter="url(#softBlur)">
        <ellipse cx="220" cy="180" rx="160" ry="28" fill="#fff" />
        <ellipse cx="290" cy="160" rx="120" ry="30" fill="#fff" />
        <ellipse cx="340" cy="190" rx="140" ry="22" fill="#fff" />

        <ellipse cx="900" cy="140" rx="180" ry="26" fill="#fff" opacity="0.85" />
        <ellipse cx="980" cy="120" rx="130" ry="32" fill="#fff" opacity="0.85" />

        <ellipse cx="1550" cy="220" rx="200" ry="34" fill="#fff" opacity="0.9" />
        <ellipse cx="1620" cy="195" rx="150" ry="30" fill="#fff" opacity="0.9" />

        <ellipse cx="600" cy="420" rx="120" ry="18" fill="#fff" opacity="0.7" />
        <ellipse cx="1300" cy="500" rx="150" ry="20" fill="#fff" opacity="0.65" />
        <ellipse cx="300" cy="680" rx="180" ry="22" fill="#fff" opacity="0.55" />
        <ellipse cx="1400" cy="780" rx="200" ry="24" fill="#fff" opacity="0.5" />
        <ellipse cx="800" cy="900" rx="220" ry="26" fill="#fff" opacity="0.4" />
      </g>
    </svg>
  );
}

function AuroraWallpaper() {
  return (
    <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="auroraBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1f3d" />
          <stop offset="40%" stopColor="#1a3a6b" />
          <stop offset="100%" stopColor="#0d2850" />
        </linearGradient>
        <linearGradient id="auroraG1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(120,255,200,0)" />
          <stop offset="50%" stopColor="rgba(120,255,200,0.55)" />
          <stop offset="100%" stopColor="rgba(120,255,200,0)" />
        </linearGradient>
        <linearGradient id="auroraG2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(100,180,255,0)" />
          <stop offset="50%" stopColor="rgba(100,180,255,0.55)" />
          <stop offset="100%" stopColor="rgba(100,180,255,0)" />
        </linearGradient>
        <linearGradient id="auroraG3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(180,120,255,0)" />
          <stop offset="50%" stopColor="rgba(180,120,255,0.45)" />
          <stop offset="100%" stopColor="rgba(180,120,255,0)" />
        </linearGradient>
        <filter id="blur40"><feGaussianBlur stdDeviation="40" /></filter>
      </defs>

      <rect width="1920" height="1080" fill="url(#auroraBg)" />
      <g filter="url(#blur40)">
        <path d="M 100 100 Q 400 300 700 200 T 1400 250 Q 1700 300 1920 200 L 1920 600 Q 1700 500 1400 550 T 700 600 Q 400 700 100 600 Z" fill="url(#auroraG1)" />
        <path d="M 0 300 Q 400 500 800 350 T 1600 400 L 1920 380 L 1920 750 Q 1600 700 1200 800 T 400 720 L 0 700 Z" fill="url(#auroraG2)" opacity="0.9" />
        <path d="M 200 500 Q 600 700 1000 550 T 1800 600 L 1920 580 L 1920 950 Q 1500 900 1100 950 T 200 920 Z" fill="url(#auroraG3)" opacity="0.7" />
      </g>
      {/* Stars */}
      <g fill="#fff">
        {Array.from({length: 80}).map((_,i) => (
          <circle key={i} cx={Math.random()*1920} cy={Math.random()*700} r={Math.random()*1.5+0.3} opacity={Math.random()*0.7+0.3} />
        ))}
      </g>
    </svg>
  );
}

function AquaWallpaper() {
  // Underwater, light rays, fish silhouettes
  return (
    <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="aquaBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9fe4ff" />
          <stop offset="30%" stopColor="#5ab8e8" />
          <stop offset="70%" stopColor="#1e6fa8" />
          <stop offset="100%" stopColor="#0a3a6b" />
        </linearGradient>
        <linearGradient id="rayG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <filter id="blur20"><feGaussianBlur stdDeviation="20" /></filter>
      </defs>
      <rect width="1920" height="1080" fill="url(#aquaBg)" />

      {/* Light rays */}
      <g filter="url(#blur20)" opacity="0.6">
        <polygon points="200,0 400,0 800,1080 500,1080" fill="url(#rayG)" />
        <polygon points="700,0 900,0 1100,1080 850,1080" fill="url(#rayG)" />
        <polygon points="1300,0 1450,0 1600,1080 1400,1080" fill="url(#rayG)" />
        <polygon points="1700,0 1850,0 1920,1080 1750,1080" fill="url(#rayG)" />
      </g>

      {/* Fish silhouettes (very simple shapes) */}
      <g fill="rgba(10,50,90,0.35)">
        <g transform="translate(300 450)">
          <ellipse cx="0" cy="0" rx="55" ry="18" />
          <polygon points="40,-12 65,-22 65,22 40,12" />
        </g>
        <g transform="translate(1200 620) scale(-1 1)">
          <ellipse cx="0" cy="0" rx="70" ry="22" />
          <polygon points="55,-15 85,-28 85,28 55,15" />
        </g>
        <g transform="translate(1550 400)">
          <ellipse cx="0" cy="0" rx="40" ry="14" />
          <polygon points="30,-9 48,-16 48,16 30,9" />
        </g>
      </g>

      {/* Seaweed at bottom */}
      <g fill="rgba(10,50,30,0.4)">
        <path d="M 100 1080 Q 120 900 110 780 Q 130 850 150 1080 Z" />
        <path d="M 260 1080 Q 280 920 270 800 Q 290 870 310 1080 Z" />
        <path d="M 1700 1080 Q 1720 920 1710 810 Q 1730 870 1750 1080 Z" />
        <path d="M 1820 1080 Q 1840 940 1830 830 Q 1850 880 1870 1080 Z" />
      </g>
    </svg>
  );
}

function CloudsWallpaper() {
  return (
    <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="cloudSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3d7ed8" />
          <stop offset="60%" stopColor="#9cc6ff" />
          <stop offset="100%" stopColor="#f5faff" />
        </linearGradient>
        <filter id="softBlurC"><feGaussianBlur stdDeviation="4" /></filter>
      </defs>
      <rect width="1920" height="1080" fill="url(#cloudSky)" />
      <g filter="url(#softBlurC)" fill="#fff">
        {[
          [200,250,180,32],[310,220,140,40],[400,260,160,28],
          [800,160,200,34],[920,130,150,40],[1050,180,170,28],
          [1450,320,190,30],[1560,290,140,36],
          [100,500,150,24],[1700,560,180,30],
          [600,680,210,36],[720,650,160,42],
          [1200,850,250,40],[1380,820,180,44]
        ].map((c,i) => <ellipse key={i} cx={c[0]} cy={c[1]} rx={c[2]} ry={c[3]} opacity={0.85} />)}
      </g>
    </svg>
  );
}

function GrassWallpaper() {
  return (
    <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="grassBg" cx="0.5" cy="0.7" r="0.9">
          <stop offset="0%" stopColor="#b8e65a" />
          <stop offset="50%" stopColor="#6ab02b" />
          <stop offset="100%" stopColor="#1f4a0c" />
        </radialGradient>
        <filter id="leafBlur"><feGaussianBlur stdDeviation="1.5" /></filter>
      </defs>
      <rect width="1920" height="1080" fill="url(#grassBg)" />
      {/* Large glossy leaves in corners */}
      <g opacity="0.85" filter="url(#leafBlur)">
        <path d="M -100 1080 Q 100 700 350 750 Q 400 900 200 1080 Z" fill="#a0d94a" />
        <path d="M -100 1080 Q 100 700 350 750" stroke="rgba(255,255,255,0.5)" strokeWidth="3" fill="none" />

        <path d="M 2020 1080 Q 1800 700 1550 780 Q 1500 950 1720 1080 Z" fill="#7ac933" />
        <path d="M 2020 1080 Q 1800 700 1550 780" stroke="rgba(255,255,255,0.4)" strokeWidth="3" fill="none" />

        <path d="M 1700 -60 Q 1850 250 1700 400 Q 1550 300 1600 80 Z" fill="#8ac938" />
      </g>
      {/* Water droplets */}
      <g>
        {Array.from({length:20}).map((_,i) => {
          const x = Math.random()*1920, y = Math.random()*1080, r = Math.random()*6+3;
          return (
            <g key={i} transform={`translate(${x} ${y})`}>
              <ellipse cx="0" cy="0" rx={r} ry={r*0.85} fill="rgba(255,255,255,0.45)" />
              <ellipse cx={-r*0.3} cy={-r*0.3} rx={r*0.3} ry={r*0.2} fill="rgba(255,255,255,0.9)" />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

window.Wallpaper = Wallpaper;
