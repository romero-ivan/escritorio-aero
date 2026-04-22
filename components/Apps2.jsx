// Apps2.jsx — Animes, Pelis, Proyectos, Recursos, Hábitos (full)

const { useState: u2S, useRef: u2R, useMemo: u2M, useEffect: u2E } = React;

// ============ ANIMES ============
// Seed desde animes.md (MyAnimeList export del usuario). Se inserta una sola vez
// — el flag localStorage `__animes_md_seeded_v1` impide reimportar. Wonder Egg
// Priority aparece como completado (12/12) en la lista original, el resto como
// pendientes con watched=0.
const ANIMES_SEED = [
  { title: "86 Eighty-Six", eps: 11, type: "TV" },
  { title: "A Certain Magical Index", eps: 24, type: "TV" },
  { title: "Ajin: Demi-Human", eps: 13, type: "TV" },
  { title: "Akebi's Sailor Uniform", eps: 12, type: "TV" },
  { title: "Berserk", eps: 25, type: "TV" },
  { title: "Blade Runner: Black Lotus", eps: 13, type: "TV" },
  { title: "Bleach", eps: 366, type: "TV" },
  { title: "Blood Blockade Battlefront", eps: 12, type: "TV" },
  { title: "Cardcaptor Sakura", eps: 70, type: "TV" },
  { title: "Castle in the Sky", eps: 1, type: "Movie" },
  { title: "Charlotte", eps: 13, type: "TV" },
  { title: "Clannad", eps: 23, type: "TV" },
  { title: "Claymore", eps: 26, type: "TV" },
  { title: "Cyberpunk: Edgerunners 2", eps: 10, type: "ONA", notes: "No emitido" },
  { title: "Darker than Black", eps: 25, type: "TV" },
  { title: "Deadman Wonderland", eps: 12, type: "TV" },
  { title: "Death Note", eps: 37, type: "TV" },
  { title: "Death Parade", eps: 12, type: "TV" },
  { title: "Do It Yourself!!", eps: 12, type: "TV" },
  { title: "Don't Toy with Me, Miss Nagatoro", eps: 12, type: "TV" },
  { title: "Elfen Lied", eps: 13, type: "TV" },
  { title: "Erased", eps: 12, type: "TV" },
  { title: "Frieren: Beyond Journey's End", eps: 28, type: "TV" },
  { title: "Fullmetal Alchemist: Brotherhood", eps: 64, type: "TV" },
  { title: "Gachiakuta", eps: 24, type: "TV" },
  { title: "GATE", eps: 12, type: "TV" },
  { title: "Ghost", eps: 1, type: "Movie", notes: "No emitido" },
  { title: "Guilty Crown", eps: 22, type: "TV" },
  { title: "Heavenly Delusion", eps: 13, type: "TV" },
  { title: "Housing Complex C", eps: 4, type: "TV" },
  { title: "Initial D First Stage", eps: 26, type: "TV" },
  { title: "Kaguya-sama: Love is War", eps: 12, type: "TV" },
  { title: "Kids on the Slope", eps: 12, type: "TV" },
  { title: "Kiki's Delivery Service", eps: 1, type: "Movie" },
  { title: "Kino's Journey", eps: 13, type: "TV" },
  { title: "Knights of Sidonia", eps: 12, type: "TV" },
  { title: "Lazarus", eps: 13, type: "TV" },
  { title: "Made in Abyss", eps: 13, type: "TV" },
  { title: "Magimoji Rurumo", eps: 12, type: "TV" },
  { title: "Migi & Dali", eps: 13, type: "TV" },
  { title: "Monster", eps: 74, type: "TV" },
  { title: "Mushi-Shi", eps: 26, type: "TV" },
  { title: "Naruto Shippuden", eps: 500, type: "TV" },
  { title: "Natsume's Book of Friends", eps: 13, type: "TV" },
  { title: "Nichijou - My Ordinary Life", eps: 26, type: "TV" },
  { title: "Parasyte: The Maxim", eps: 24, type: "TV" },
  { title: "Phantom: Requiem for the Phantom", eps: 26, type: "TV" },
  { title: "Re:ZERO -Starting Life in Another World-", eps: 25, type: "TV" },
  { title: "Sing a Bit of Harmony", eps: 1, type: "Movie" },
  { title: "Someday's Dreamers II: Sora", eps: 12, type: "TV" },
  { title: "Soul Eater", eps: 51, type: "TV" },
  { title: "Steins;Gate 0", eps: 23, type: "TV" },
  { title: "Summer Time Rendering", eps: 25, type: "TV" },
  { title: "Takopi's Original Sin", eps: 6, type: "ONA" },
  { title: "Tatsuki Fujimoto 17-26", eps: 8, type: "ONA" },
  { title: "The Ancient Magus' Bride", eps: 24, type: "TV" },
  { title: "The Apothecary Diaries", eps: 24, type: "TV" },
  { title: "The Disappearance of Haruhi Suzumiya", eps: 1, type: "Movie" },
  { title: "The Eminence in Shadow", eps: 20, type: "TV" },
  { title: "The Fragrant Flower Blooms with Dignity", eps: 13, type: "TV" },
  { title: "The Melancholy of Haruhi Suzumiya", eps: 14, type: "TV" },
  { title: "The Melancholy of Haruhi Suzumiya (2009)", eps: 14, type: "TV" },
  { title: "Vinland Saga", eps: 24, type: "TV" },
  { title: "Violet Evergarden", eps: 13, type: "TV" },
  { title: "Wonder Egg Priority", eps: 12, type: "TV", watched: 12, status: "completado" },
  { title: "xxxHOLiC", eps: 24, type: "TV" },
];

function AnimesApp() {
  const [list, setList] = window.useLocal('animes', []);
  const [draft, setDraft] = u2S({ title: '', eps: '', watched: 0, status: 'pendiente', rating: 0, notes: '' });
  const [filter, setFilter] = u2S('todos');

  // Seed una sola vez: si el flag no está en localStorage, inserta los animes de
  // ANIMES_SEED que no estén ya en la lista (matching por título). Luego marca
  // el flag para no repetirlo. Se espera 800ms a que AeroCloud popule la lista
  // desde Firestore antes de decidir — así no seedeamos si el dispositivo ya
  // tiene sincronizados los animes desde otra sesión.
  u2E(() => {
    if (localStorage.getItem('__animes_md_seeded_v1') === '1') return;
    const timer = setTimeout(() => {
      setList(prev => {
        const existing = Array.isArray(prev) ? prev : [];
        const existingTitles = new Set(existing.map(a => (a.title || '').toLowerCase().trim()));
        const toAdd = ANIMES_SEED
          .filter(s => !existingTitles.has(s.title.toLowerCase().trim()))
          .map((s, i) => ({
            id: Date.now() + i,
            title: s.title,
            eps: s.eps,
            watched: s.watched || 0,
            status: s.status || 'pendiente',
            rating: 0,
            notes: s.notes || '',
            type: s.type || 'TV',
          }));
        localStorage.setItem('__animes_md_seeded_v1', '1');
        if (toAdd.length === 0) return existing;
        return [...existing, ...toAdd];
      });
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const add = () => {
    if (!draft.title.trim()) return;
    setList([...list, {...draft, id: Date.now(), eps: parseInt(draft.eps)||null, watched: parseInt(draft.watched)||0, rating: parseInt(draft.rating)||0}]);
    setDraft({ title: '', eps: '', watched: 0, status: 'pendiente', rating: 0, notes: '' });
  };
  const update = (id, patch) => setList(list.map(x => x.id===id ? {...x, ...patch} : x));
  const del = (id) => setList(list.filter(x => x.id !== id));

  const filtered = list.filter(x => filter==='todos' || x.status === filter);
  const statuses = [['todos','Todos'],['pendiente','Pendientes'],['viendo','Viendo'],['completado','Completados'],['pausado','Pausados']];

  return (
    <div>
      <h2 className="section-title">📺 Anime</h2>
      <div className="add-row">
        <input placeholder="Título…" value={draft.title} onChange={e=>setDraft({...draft, title: e.target.value})} onKeyDown={e=>e.key==='Enter'&&add()}/>
        <input type="number" placeholder="Eps" value={draft.eps} onChange={e=>setDraft({...draft, eps: e.target.value})} style={{maxWidth:70}}/>
        <select value={draft.status} onChange={e=>setDraft({...draft, status: e.target.value})} style={{maxWidth:110}}>
          <option>pendiente</option><option>viendo</option><option>completado</option><option>pausado</option>
        </select>
        <button className="btn green sm" onClick={add}>+</button>
      </div>
      <div className="tabs">
        {statuses.map(([k,l]) => (
          <div key={k} className={`tab ${filter===k?'active':''}`} onClick={()=>setFilter(k)}>{l}
            <span className="pill-count">{k==='todos'?list.length:list.filter(x=>x.status===k).length}</span>
          </div>
        ))}
      </div>
      {filtered.length===0 && <div className="empty-hint">Vacío</div>}
      {filtered.map(a => (
        <div key={a.id} className="aero-card">
          <div style={{display:'flex', gap:10, alignItems:'flex-start'}}>
            <div style={{width:44, height:60, background:'linear-gradient(135deg, #c030a0, #4a0f50)', borderRadius:4, display:'grid', placeItems:'center', color:'#fff', fontSize:9, fontFamily:'monospace', boxShadow:'inset 0 1px 0 rgba(255,255,255,0.4)', flex:'0 0 44px'}}>
              COVER
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700, fontSize:13}}>{a.title}</div>
              <div style={{fontSize:11, margin:'2px 0', display:'flex', gap:4, alignItems:'center', flexWrap:'wrap'}}>
                <select value={a.status} onChange={e=>update(a.id, {status: e.target.value})} style={{fontSize:10, padding:'1px 4px'}}>
                  <option>pendiente</option><option>viendo</option><option>completado</option><option>pausado</option>
                </select>
                {a.eps && <span>Ep {a.watched}/{a.eps}</span>}
                {!a.eps && <span>Ep <input type="number" value={a.watched} onChange={e=>update(a.id, {watched: parseInt(e.target.value)||0})} style={{width:40, fontSize:10, padding:'1px 4px'}}/></span>}
                <span className="stars">
                  {[1,2,3,4,5].map(n => (
                    <span key={n} style={{cursor:'pointer', opacity: n<=a.rating?1:0.25}} onClick={()=>update(a.id, {rating: a.rating===n?0:n})}>★</span>
                  ))}
                </span>
              </div>
              {a.eps && (
                <div className="bar-bg" style={{marginTop:3}}>
                  <div className="bar-fill blue" style={{width: `${Math.min(100, (a.watched/a.eps)*100)}%`}}/>
                </div>
              )}
            </div>
            <button className="btn red sm" onClick={()=>del(a.id)}>✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ PELIS ============
function PelisApp() {
  const [list, setList] = window.useLocal('pelis', []);
  const [draft, setDraft] = u2S({ title: '', year: '', status: 'pendiente', rating: 0 });
  const [filter, setFilter] = u2S('pendiente');

  const add = () => {
    if (!draft.title.trim()) return;
    setList([...list, {...draft, id: Date.now()}]);
    setDraft({ title: '', year: '', status: 'pendiente', rating: 0 });
  };
  const update = (id, patch) => setList(list.map(x => x.id===id ? {...x, ...patch} : x));
  const del = (id) => setList(list.filter(x => x.id !== id));

  const filtered = list.filter(x => filter==='todos' || x.status === filter);

  return (
    <div>
      <h2 className="section-title">🎬 Películas pendientes</h2>
      <div className="add-row">
        <input placeholder="Título…" value={draft.title} onChange={e=>setDraft({...draft, title: e.target.value})} onKeyDown={e=>e.key==='Enter'&&add()}/>
        <input placeholder="Año" value={draft.year} onChange={e=>setDraft({...draft, year: e.target.value})} style={{maxWidth:60}}/>
        <button className="btn green sm" onClick={add}>+</button>
      </div>
      <div className="tabs">
        {[['pendiente','Pendientes'],['vista','Vistas'],['todos','Todas']].map(([k,l]) => (
          <div key={k} className={`tab ${filter===k?'active':''}`} onClick={()=>setFilter(k)}>{l}
            <span className="pill-count">{k==='todos'?list.length:list.filter(x=>x.status===k).length}</span>
          </div>
        ))}
      </div>
      {filtered.length===0 && <div className="empty-hint">Vacío</div>}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:6}}>
        {filtered.map(p => (
          <div key={p.id} className="aero-card" style={{display:'flex', gap:8, alignItems:'center'}}>
            <div style={{width:36, height:52, background:'linear-gradient(135deg, #e0a020, #6a3800)', borderRadius:3, flex:'0 0 36px', boxShadow:'inset 0 1px 0 rgba(255,255,255,0.4)'}}/>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontWeight:700, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{p.title}</div>
              <div style={{fontSize:10, opacity:0.75}}>{p.year}</div>
              <div className="stars" style={{fontSize:11}}>
                {[1,2,3,4,5].map(n => (
                  <span key={n} style={{cursor:'pointer', opacity: n<=p.rating?1:0.25}} onClick={()=>update(p.id, {rating: p.rating===n?0:n})}>★</span>
                ))}
              </div>
              <button className="btn sm" onClick={()=>update(p.id, {status: p.status==='vista'?'pendiente':'vista'})} style={{marginTop:3}}>
                {p.status==='vista' ? '↩ No vista' : '✓ Vista'}
              </button>
            </div>
            <button className="btn red sm" onClick={()=>del(p.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ PROYECTOS ============
function ProyectosApp() {
  const [list, setList] = window.useLocal('proyectos', []);
  const [draft, setDraft] = u2S({ title: '', desc: '', status: 'idea' });
  const [open, setOpen] = u2S(null);

  const add = () => {
    if (!draft.title.trim()) return;
    setList([...list, {...draft, id: Date.now(), created: Date.now(), subtasks: [], notes: ''}]);
    setDraft({ title: '', desc: '', status: 'idea' });
  };
  const update = (id, patch) => setList(list.map(x => x.id===id ? {...x, ...patch} : x));
  const del = (id) => { setList(list.filter(x => x.id !== id)); if (open===id) setOpen(null); };

  const openProj = list.find(p => p.id === open);

  return (
    <div>
      <h2 className="section-title">🚀 Proyectos personales</h2>
      {!openProj && <>
        <div className="add-row">
          <input placeholder="Nombre del proyecto…" value={draft.title} onChange={e=>setDraft({...draft, title: e.target.value})}/>
          <input placeholder="Descripción breve" value={draft.desc} onChange={e=>setDraft({...draft, desc: e.target.value})}/>
          <select value={draft.status} onChange={e=>setDraft({...draft, status: e.target.value})} style={{maxWidth:100}}>
            <option>idea</option><option>activo</option><option>pausado</option><option>terminado</option>
          </select>
          <button className="btn green sm" onClick={add}>+</button>
        </div>
        {list.length===0 && <div className="empty-hint">Sin proyectos</div>}
        {list.map(p => {
          const completed = (p.subtasks||[]).filter(s=>s.done).length;
          const total = (p.subtasks||[]).length;
          const prog = total ? Math.round(completed/total*100) : 0;
          return (
            <div key={p.id} className="aero-card" style={{cursor:'pointer'}} onClick={()=>setOpen(p.id)}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700}}>{p.title} <span className={`tag ${p.status==='activo'?'':p.status==='idea'?'blue':p.status==='pausado'?'gold':'purple'}`}>{p.status}</span></div>
                  <div style={{fontSize:11, opacity:0.75}}>{p.desc}</div>
                  {total > 0 && (
                    <div style={{marginTop:4}}>
                      <div className="bar-bg" style={{height:6}}><div className="bar-fill" style={{width:`${prog}%`}}/></div>
                      <div style={{fontSize:10, opacity:0.7}}>{completed}/{total} tareas · {prog}%</div>
                    </div>
                  )}
                </div>
                <button className="btn red sm" onClick={(e)=>{e.stopPropagation(); del(p.id);}}>✕</button>
              </div>
            </div>
          );
        })}
      </>}

      {openProj && <ProjectDetail p={openProj} update={(patch)=>update(openProj.id, patch)} onBack={()=>setOpen(null)} />}
    </div>
  );
}

function ProjectDetail({ p, update, onBack }) {
  const [subDraft, setSubDraft] = u2S('');
  const addSub = () => {
    if (!subDraft.trim()) return;
    update({ subtasks: [...(p.subtasks||[]), {id: Date.now(), text: subDraft, done: false}] });
    setSubDraft('');
  };
  return (
    <div>
      <button className="btn sm" onClick={onBack}>← Volver</button>
      <h3 style={{margin:'8px 0 4px'}}>{p.title}</h3>
      <div style={{fontSize:11, opacity:0.75, marginBottom:8}}>{p.desc}</div>
      <div style={{display:'flex', gap:4, marginBottom:8}}>
        {['idea','activo','pausado','terminado'].map(s => (
          <button key={s} className={`btn sm ${p.status===s?'green':''}`} onClick={()=>update({status:s})}>{s}</button>
        ))}
      </div>
      <hr className="aero-sep"/>
      <div style={{fontWeight:700, fontSize:12, marginBottom:4}}>Tareas del proyecto</div>
      <div className="add-row">
        <input placeholder="Subtarea…" value={subDraft} onChange={e=>setSubDraft(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addSub()}/>
        <button className="btn green sm" onClick={addSub}>+</button>
      </div>
      {(p.subtasks||[]).map(s => (
        <div key={s.id} className={`task-item ${s.done?'done':''}`}>
          <div className={`aero-checkbox ${s.done?'checked':''}`} onClick={()=>update({subtasks: p.subtasks.map(x=>x.id===s.id?{...x,done:!x.done}:x)})}>
            {s.done && '✓'}
          </div>
          <div style={{flex:1}}>{s.text}</div>
          <button className="btn red sm" onClick={()=>update({subtasks: p.subtasks.filter(x=>x.id!==s.id)})}>✕</button>
        </div>
      ))}
      <hr className="aero-sep"/>
      <div style={{fontWeight:700, fontSize:12, marginBottom:4}}>Notas</div>
      <textarea value={p.notes||''} onChange={e=>update({notes: e.target.value})} style={{width:'100%', minHeight:120}} placeholder="Ideas, links, referencias…"/>
    </div>
  );
}

// ============ RECURSOS GUARDADOS ============
function RecursosApp() {
  const [items, setItems] = window.useLocal('recursos', []);
  const [draft, setDraft] = u2S({ type: 'tweet', url: '', text: '', tag: '' });
  const [filter, setFilter] = u2S('todos');
  const fileRef = u2R();

  const add = () => {
    if (!draft.url && !draft.text) return;
    setItems([{...draft, id: Date.now(), ts: Date.now()}, ...items]);
    setDraft({ type: 'tweet', url: '', text: '', tag: '' });
  };
  const addImage = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => setItems([{id: Date.now(), ts: Date.now(), type: 'imagen', src: r.result, text: f.name, tag: ''}, ...items]);
    r.readAsDataURL(f);
  };
  const del = (id) => setItems(items.filter(x => x.id !== id));

  const filtered = items.filter(x => filter==='todos' || x.type === filter);

  return (
    <div>
      <h2 className="section-title">💎 Recursos guardados</h2>
      <div className="add-row">
        <select value={draft.type} onChange={e=>setDraft({...draft, type: e.target.value})} style={{maxWidth:90}}>
          <option>tweet</option><option>link</option><option>texto</option>
        </select>
        <input placeholder="URL" value={draft.url} onChange={e=>setDraft({...draft, url: e.target.value})}/>
        <input placeholder="Nota / tag" value={draft.tag} onChange={e=>setDraft({...draft, tag: e.target.value})} style={{maxWidth:100}}/>
        <button className="btn green sm" onClick={add}>+</button>
        <button className="btn sm" onClick={()=>fileRef.current.click()}>🖼️ Img</button>
        <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={addImage}/>
      </div>
      <textarea placeholder="Texto o contenido del tweet (pégalo aquí)…" value={draft.text} onChange={e=>setDraft({...draft, text: e.target.value})} style={{width:'100%', minHeight:50, marginBottom:6}}/>

      <div className="tabs">
        {['todos','tweet','link','texto','imagen'].map(f => (
          <div key={f} className={`tab ${filter===f?'active':''}`} onClick={()=>setFilter(f)}>
            {f[0].toUpperCase()+f.slice(1)}
            <span className="pill-count">{f==='todos'?items.length:items.filter(x=>x.type===f).length}</span>
          </div>
        ))}
      </div>

      {filtered.length === 0 && <div className="empty-hint">Sin recursos</div>}
      <div className="media-grid" style={{gridTemplateColumns:'1fr 1fr'}}>
        {filtered.map(r => (
          <div key={r.id} className="aero-card" style={{padding:8, aspectRatio:'unset'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:4}}>
              <span className={`tag ${r.type==='tweet'?'blue':r.type==='link'?'':r.type==='imagen'?'purple':'gold'}`}>{r.type}</span>
              <button className="btn red sm" onClick={()=>del(r.id)}>✕</button>
            </div>
            {r.type === 'imagen' && <img src={r.src} style={{width:'100%', maxHeight:140, objectFit:'cover', borderRadius:4}}/>}
            {r.text && <div style={{fontSize:11, marginTop:4, lineHeight:1.35}}>{r.text}</div>}
            {r.url && <a href={window.safeExternalUrl ? window.safeExternalUrl(r.url) : '#'} target="_blank" rel="noopener noreferrer" style={{fontSize:10, wordBreak:'break-all', color:'#1b4c96'}}>{r.url}</a>}
            {r.tag && <div style={{fontSize:10, opacity:0.7, marginTop:3}}>#{r.tag}</div>}
            <div style={{fontSize:9, opacity:0.5, marginTop:3}}>{new Date(r.ts).toLocaleDateString('es-ES')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ HÁBITOS COMPLETO ============
function HabitosApp({ habits, setHabits }) {
  const [draft, setDraft] = u2S('');
  const add = () => {
    if (!draft.trim()) return;
    setHabits([...habits, {id: Date.now(), name: draft, done: {}, created: Date.now()}]);
    setDraft('');
  };
  const del = (id) => setHabits(habits.filter(h => h.id !== id));
  const toggle = (id, day) => {
    setHabits(habits.map(h => {
      if (h.id !== id) return h;
      const done = {...(h.done||{})};
      done[day] = !done[day];
      if (!done[day]) delete done[day];
      return {...h, done};
    }));
  };

  // Last 14 days
  const days = [];
  for (let i=13; i>=0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    days.push({ key: window.todayKey(d), label: d.getDate(), dow: ['L','M','X','J','V','S','D'][(d.getDay()+6)%7] });
  }

  return (
    <div>
      <h2 className="section-title">✓ Tracker de hábitos</h2>
      <div className="add-row">
        <input placeholder="Nuevo hábito (ej. Leer 30 min, Correr, Meditar)" value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()}/>
        <button className="btn green sm" onClick={add}>+</button>
      </div>
      {habits.length === 0 && <div className="empty-hint">Añade tu primer hábito</div>}
      <div style={{overflowX:'auto'}}>
        <table style={{borderCollapse:'separate', borderSpacing:2, fontSize:10, width:'100%'}}>
          <thead>
            <tr>
              <th style={{textAlign:'left', padding:'4px 6px', minWidth:120}}>Hábito</th>
              {days.map(d => (
                <th key={d.key} style={{textAlign:'center', padding:'2px 3px', fontSize:9}}>
                  <div style={{opacity:0.7}}>{d.dow}</div>
                  <div>{d.label}</div>
                </th>
              ))}
              <th style={{padding:'4px 6px'}}>Racha</th>
              <th/>
            </tr>
          </thead>
          <tbody>
            {habits.map(h => {
              // compute current streak
              let streak = 0;
              for (let i = days.length - 1; i>=0; i--) {
                if (h.done && h.done[days[i].key]) streak++;
                else break;
              }
              const total = Object.keys(h.done||{}).length;
              return (
                <tr key={h.id}>
                  <td style={{padding:'4px 6px', fontWeight:600}}>{h.name}
                    <div style={{fontSize:9, opacity:0.6}}>Total: {total}</div>
                  </td>
                  {days.map(d => (
                    <td key={d.key} style={{textAlign:'center'}}>
                      <div className={`habit-dot ${h.done && h.done[d.key]?'done':''}`} style={{width:20, height:20, margin:'0 auto'}} onClick={()=>toggle(h.id, d.key)}/>
                    </td>
                  ))}
                  <td style={{textAlign:'center', fontWeight:700, color: streak > 2 ? '#c06810' : 'inherit'}}>🔥{streak}</td>
                  <td><button className="btn red sm" onClick={()=>del(h.id)}>✕</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============ SERIES ============
// Lista de series con temporadas/episodios y estado (viendo / pendiente / vista / abandonada).
// Misma filosofía que Pelis pero con campos adicionales de progreso S×E.
function SeriesApp() {
  const [list, setList] = window.useLocal('series', []);
  const [draft, setDraft] = u2S({ title: '', year: '', status: 'pendiente', rating: 0, season: 1, episode: 0, notes: '' });
  // Filter inicial = 'pendiente' para que el item recién añadido aparezca en la
  // tab activa (antes se añadía con status='pendiente' y la tab mostraba 'viendo'
  // → el usuario creía que no se guardaba).
  const [filter, setFilter] = u2S('pendiente');

  const add = () => {
    if (!draft.title.trim()) return;
    setList([...list, { ...draft, id: Date.now() }]);
    setDraft({ title: '', year: '', status: 'pendiente', rating: 0, season: 1, episode: 0, notes: '' });
  };
  const update = (id, patch) => setList(list.map(x => x.id === id ? { ...x, ...patch } : x));
  const del = (id) => setList(list.filter(x => x.id !== id));

  const filtered = list.filter(x => filter === 'todos' || x.status === filter);
  const cycleStatus = (s) => s === 'pendiente' ? 'viendo' : s === 'viendo' ? 'vista' : s === 'vista' ? 'abandonada' : 'pendiente';
  const statusEmoji = (s) => ({ pendiente: '⏳', viendo: '▶', vista: '✓', abandonada: '✕' }[s] || '?');

  return (
    <div>
      <h2 className="section-title">📺 Series</h2>
      <div className="add-row">
        <input placeholder="Título…" value={draft.title} onChange={e=>setDraft({...draft, title: e.target.value})} onKeyDown={e=>e.key==='Enter'&&add()}/>
        <input placeholder="Año" value={draft.year} onChange={e=>setDraft({...draft, year: e.target.value})} style={{maxWidth:60}}/>
        <button className="btn green sm" onClick={add}>+</button>
      </div>
      <div className="tabs">
        {[['viendo','Viendo'],['pendiente','Pendientes'],['vista','Vistas'],['abandonada','Abandonadas'],['todos','Todas']].map(([k,l]) => (
          <div key={k} className={`tab ${filter===k?'active':''}`} onClick={()=>setFilter(k)}>{l}
            <span className="pill-count">{k==='todos'?list.length:list.filter(x=>x.status===k).length}</span>
          </div>
        ))}
      </div>
      {filtered.length===0 && <div className="empty-hint">Vacío</div>}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:6}}>
        {filtered.map(s => (
          <div key={s.id} className="aero-card" style={{display:'flex', gap:8, alignItems:'center'}}>
            <div style={{width:36, height:52, background:'linear-gradient(135deg, #80c0e8, #0a3058)', borderRadius:3, flex:'0 0 36px', boxShadow:'inset 0 1px 0 rgba(255,255,255,0.4)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:14}}>📺</div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontWeight:700, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{s.title}</div>
              <div style={{fontSize:10, opacity:0.75}}>{s.year}{s.year?' · ':''}S{s.season||1}×E{s.episode||0}</div>
              <div style={{display:'flex', gap:2, alignItems:'center', marginTop:2}}>
                <button className="btn sm" style={{fontSize:9, padding:'1px 4px'}} onClick={()=>update(s.id, {episode: Math.max(0, (s.episode||0)-1)})}>−</button>
                <button className="btn sm" style={{fontSize:9, padding:'1px 4px'}} onClick={()=>update(s.id, {episode: (s.episode||0)+1})}>+ ep</button>
                <button className="btn sm" style={{fontSize:9, padding:'1px 4px'}} onClick={()=>update(s.id, {season: (s.season||1)+1, episode: 0})}>+ T</button>
              </div>
              <div className="stars" style={{fontSize:11}}>
                {[1,2,3,4,5].map(n => (
                  <span key={n} style={{cursor:'pointer', opacity: n<=s.rating?1:0.25}} onClick={()=>update(s.id, {rating: s.rating===n?0:n})}>★</span>
                ))}
              </div>
              <button className="btn sm" onClick={()=>update(s.id, {status: cycleStatus(s.status)})} style={{marginTop:3, fontSize:10}}>
                {statusEmoji(s.status)} {s.status}
              </button>
            </div>
            <button className="btn red sm" onClick={()=>del(s.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ JUEGOS ============
// Lista de videojuegos con plataforma, horas jugadas y estado.
function JuegosApp() {
  const [list, setList] = window.useLocal('juegos', []);
  const [draft, setDraft] = u2S({ title: '', platform: '', status: 'pendiente', rating: 0, horas: 0, notes: '' });
  // Filter inicial = 'pendiente' (ver nota en SeriesApp).
  const [filter, setFilter] = u2S('pendiente');

  const add = () => {
    if (!draft.title.trim()) return;
    setList([...list, { ...draft, id: Date.now() }]);
    setDraft({ title: '', platform: '', status: 'pendiente', rating: 0, horas: 0, notes: '' });
  };
  const update = (id, patch) => setList(list.map(x => x.id === id ? { ...x, ...patch } : x));
  const del = (id) => setList(list.filter(x => x.id !== id));

  const filtered = list.filter(x => filter === 'todos' || x.status === filter);
  const cycleStatus = (s) => s === 'pendiente' ? 'jugando' : s === 'jugando' ? 'completado' : s === 'completado' ? 'abandonado' : 'pendiente';
  const statusEmoji = (s) => ({ pendiente: '⏳', jugando: '🎮', completado: '🏆', abandonado: '✕' }[s] || '?');
  const platformColors = {
    // Paleta tipo cartucho/caja por plataforma — fallback a morado gaming genérico.
    PC: 'linear-gradient(135deg, #a0a0b0, #30303a)',
    Steam: 'linear-gradient(135deg, #66c0f4, #1b2838)',
    Switch: 'linear-gradient(135deg, #ff4a5a, #9a0010)',
    PS5: 'linear-gradient(135deg, #4a9ae8, #003791)',
    PS4: 'linear-gradient(135deg, #4a9ae8, #003791)',
    Xbox: 'linear-gradient(135deg, #9cd850, #107c10)',
    Móvil: 'linear-gradient(135deg, #ffd080, #c06820)',
  };
  const platBg = (p) => platformColors[p] || 'linear-gradient(135deg, #c090e8, #4a108a)';

  return (
    <div>
      <h2 className="section-title">🎮 Juegos</h2>
      <div className="add-row">
        <input placeholder="Título…" value={draft.title} onChange={e=>setDraft({...draft, title: e.target.value})} onKeyDown={e=>e.key==='Enter'&&add()}/>
        <input placeholder="Plataforma" value={draft.platform} onChange={e=>setDraft({...draft, platform: e.target.value})} list="jg-plats" style={{maxWidth:100}}/>
        <datalist id="jg-plats">
          <option value="PC"/><option value="Steam"/><option value="Switch"/><option value="PS5"/><option value="PS4"/><option value="Xbox"/><option value="Móvil"/>
        </datalist>
        <button className="btn green sm" onClick={add}>+</button>
      </div>
      <div className="tabs">
        {[['jugando','Jugando'],['pendiente','Pendientes'],['completado','Completados'],['abandonado','Abandonados'],['todos','Todos']].map(([k,l]) => (
          <div key={k} className={`tab ${filter===k?'active':''}`} onClick={()=>setFilter(k)}>{l}
            <span className="pill-count">{k==='todos'?list.length:list.filter(x=>x.status===k).length}</span>
          </div>
        ))}
      </div>
      {filtered.length===0 && <div className="empty-hint">Vacío</div>}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:6}}>
        {filtered.map(g => (
          <div key={g.id} className="aero-card" style={{display:'flex', gap:8, alignItems:'center'}}>
            <div style={{width:36, height:52, background: platBg(g.platform), borderRadius:3, flex:'0 0 36px', boxShadow:'inset 0 1px 0 rgba(255,255,255,0.4)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:14}}>🎮</div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontWeight:700, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{g.title}</div>
              <div style={{fontSize:10, opacity:0.75}}>{g.platform || '—'}{g.horas ? ` · ${g.horas}h` : ''}</div>
              <div style={{display:'flex', gap:2, alignItems:'center', marginTop:2}}>
                <button className="btn sm" style={{fontSize:9, padding:'1px 4px'}} onClick={()=>update(g.id, {horas: Math.max(0, (g.horas||0)-1)})}>−</button>
                <button className="btn sm" style={{fontSize:9, padding:'1px 4px'}} onClick={()=>update(g.id, {horas: (g.horas||0)+1})}>+1h</button>
                <button className="btn sm" style={{fontSize:9, padding:'1px 4px'}} onClick={()=>update(g.id, {horas: (g.horas||0)+10})}>+10h</button>
              </div>
              <div className="stars" style={{fontSize:11}}>
                {[1,2,3,4,5].map(n => (
                  <span key={n} style={{cursor:'pointer', opacity: n<=g.rating?1:0.25}} onClick={()=>update(g.id, {rating: g.rating===n?0:n})}>★</span>
                ))}
              </div>
              <button className="btn sm" onClick={()=>update(g.id, {status: cycleStatus(g.status)})} style={{marginTop:3, fontSize:10}}>
                {statusEmoji(g.status)} {g.status}
              </button>
            </div>
            <button className="btn red sm" onClick={()=>del(g.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ HORARIO ============
// Tabla de horario semanal del instituto. Filas = franjas horarias, columnas = días (L-V).
// Cada celda referencia un módulo de FP (`fp_modulos`) por id → coloreado y nombre vienen
// del módulo. También permite texto libre (label) para huecos especiales (TUTORÍA), y
// dejar celdas vacías (Inglés / FOL convalidadas).
//
// Storage `horario`:
//   {
//     slots: [{ id, type:'class'|'break', time, label? }, ...],
//     cells: { [slotId]: { [dayIdx]: { moduloId?, label? } } },
//   }
//
// Seeding one-shot: si no hay nada en `horario`, intentamos rellenar con el horario
// real del usuario del instituto (3 clases + recreo + 3 clases). Resolvemos los
// módulos por nombre contra `fp_modulos` para que los colores coincidan con los de
// Tareas de FP. Las asignaturas convalidadas (Inglés, FOL) se quedan vacías.
const HORARIO_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const HORARIO_DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
const HORARIO_DEFAULT_SLOTS = [
  { id: 'h1', type: 'class', time: '08:30 – 09:20' },
  { id: 'h2', type: 'class', time: '09:25 – 10:15' },
  { id: 'h3', type: 'class', time: '10:20 – 11:10' },
  { id: 'h4', type: 'break', time: '11:10 – 11:40', label: 'RECREO' },
  { id: 'h5', type: 'class', time: '11:40 – 12:30' },
  { id: 'h6', type: 'class', time: '12:35 – 13:25' },
  { id: 'h7', type: 'class', time: '13:30 – 14:30' },
];
// Plantilla del horario del usuario, indexada por slot+día (0=Lun..4=Vie). Se almacena
// con NOMBRES de módulo, no IDs — al sembrar resolvemos contra fp_modulos del usuario.
// `null` = celda vacía (Inglés y FOL convalidadas → null deliberadamente).
//                       Lun           Mar           Mié           Jue                 Vie
const HORARIO_TEMPLATE = {
  h1: ['Interiores',   'Auto',        null,         'E-tecnica',         'Auto'],          // 8:30-9:20 (mié = inglés vacío)
  h2: ['Interiores',   'Auto',        null,         { label: 'Digitalización', mod: 'Digitalización' }, 'Auto'], // 9:25-10:15
  h3: ['Interiores',   'E-tecnica',   'Auto',       'Interiores',        null],             // 10:20-11:10 (vie = FOL vacío)
  h5: [{ label: 'TUTORÍA' }, 'E-tecnica', 'Auto',   'Interiores',        null],             // 11:40-12:30 (lun=tut, vie=FOL)
  h6: ['Auto',         'Electrónica', 'Interiores', 'Interiores',        'E-tecnica'],     // 12:35-13:25
  h7: ['Auto',         'Electrónica', 'Interiores', null,                'E-tecnica'],     // 13:30-14:30 (jue=FOL vacío)
};
const HORARIO_DEFAULT_CELLS = {}; // se rellena al sembrar (necesita fp_modulos)

// Color neutro para etiquetas sin módulo (TUTORÍA, etc.)
const HORARIO_NEUTRAL_COLOR = '#c89020';
// Color del recreo
const HORARIO_BREAK_COLOR = '#7090b8';

// Construye el objeto `cells` del horario resolviendo nombres del template contra
// `fp_modulos` por nombre normalizado (case-insensitive, tolera "E-tecnia" ↔
// "E-tecnica"). Entradas no resueltas caen a `{label}` sin `moduloId` — el
// usuario puede re-vincularlas después con el botón "🔗 Re-vincular".
// Extraído como helper para que tanto el seed inicial como el reset puedan usarlo
// sin duplicar lógica ni tener que recargar la página.
function buildHorarioCellsFromTemplate(modulos) {
  const findModId = (name) => {
    if (!name) return '';
    const norm = name.toLowerCase().trim();
    const m = (modulos || []).find(x => {
      const xn = (x.name || '').toLowerCase().trim();
      return xn === norm || xn.replace(/[-\s]/g,'') === norm.replace(/[-\s]/g,'');
    });
    return m ? m.id : '';
  };
  const cells = {};
  Object.entries(HORARIO_TEMPLATE).forEach(([slotId, dayArr]) => {
    cells[slotId] = {};
    dayArr.forEach((entry, idx) => {
      if (entry === null) return; // celda vacía (convalidada)
      if (typeof entry === 'string') {
        const id = findModId(entry);
        cells[slotId][idx] = id ? { moduloId: id } : { label: entry };
      } else if (entry && typeof entry === 'object') {
        const id = entry.mod ? findModId(entry.mod) : '';
        cells[slotId][idx] = id ? { moduloId: id, label: entry.label } : { label: entry.label };
      }
    });
  });
  return cells;
}

function HorarioApp() {
  const [horario, setHorario] = window.useLocal('horario', null);
  const [modulos] = window.useLocal('fp_modulos', []);
  const [editing, setEditing] = u2S(null); // { slotId, dayIdx } | null
  const [editingTime, setEditingTime] = u2S(null); // slotId | null

  // ----- Sembrar horario inicial UNA VEZ por navegador -----
  // Reactivo a `modulos`: esperamos a que `fp_modulos` hidrate desde Firestore
  // antes de sembrar, así las celdas arrancan ya con `moduloId` resuelto y colores
  // correctos (antes caían a `label` cuando el snapshot llegaba tarde).
  //
  // Protegido contra race condition con otros dispositivos: usamos `setHorario(prev => ...)`
  // para comprobar el valor EN VIVO antes de escribir. Si el snapshot de Firestore
  // trae un horario desde el móvil entre el mount y el fire del timer, `prev`
  // contiene ya esos datos y NO los sobrescribimos.
  u2E(() => {
    if (localStorage.getItem('__horario_seeded_v1') === '1') return;
    // Si aún no hay módulos, esperamos — el efecto se reejecutará cuando hidraten.
    // (En el peor caso, el usuario nuevo sin módulos nunca ve el seed hasta que
    // cree al menos uno. Dejamos un fallback en 3s para sembrar con labels sueltos.)
    if (!modulos || modulos.length === 0) {
      const fallback = setTimeout(() => {
        setHorario(prev => {
          if (prev && prev.slots && prev.slots.length) return prev;
          return { slots: HORARIO_DEFAULT_SLOTS, cells: buildHorarioCellsFromTemplate([]) };
        });
        try { localStorage.setItem('__horario_seeded_v1', '1'); } catch {}
      }, 3000);
      return () => clearTimeout(fallback);
    }
    // Con módulos ya disponibles: sembrado inmediato con functional setState
    // (protegido contra overwrite de datos sincronizados).
    setHorario(prev => {
      if (prev && prev.slots && prev.slots.length) return prev; // ya hay datos — no tocar
      return { slots: HORARIO_DEFAULT_SLOTS, cells: buildHorarioCellsFromTemplate(modulos) };
    });
    try { localStorage.setItem('__horario_seeded_v1', '1'); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modulos]);

  // Estado seguro: si está null, mostramos placeholder mientras siembra.
  const data = horario || { slots: HORARIO_DEFAULT_SLOTS, cells: {} };
  const moduloById = (id) => (modulos || []).find(m => m.id === id);
  const moduloHex = (id) => {
    const m = moduloById(id); if (!m) return null;
    const c = (window.calEventColor ? window.calEventColor(m.color) : null);
    return c || '#3d7ed8';
  };

  // ----- Acciones -----
  const setCell = (slotId, dayIdx, value) => {
    const next = { ...data, cells: { ...(data.cells || {}) } };
    next.cells[slotId] = { ...(next.cells[slotId] || {}) };
    if (value === null) delete next.cells[slotId][dayIdx];
    else next.cells[slotId][dayIdx] = value;
    setHorario(next);
  };
  const updateSlot = (slotId, patch) => {
    const next = { ...data, slots: data.slots.map(s => s.id === slotId ? { ...s, ...patch } : s) };
    setHorario(next);
  };
  const addClassSlot = () => {
    const id = 'h' + Date.now();
    const next = { ...data, slots: [...data.slots, { id, type: 'class', time: '15:00 – 15:50' }] };
    setHorario(next);
  };
  const addBreakSlot = () => {
    const id = 'h' + Date.now();
    const next = { ...data, slots: [...data.slots, { id, type: 'break', time: '00:00 – 00:00', label: 'PAUSA' }] };
    setHorario(next);
  };
  const removeSlot = (slotId) => {
    if (!confirm('¿Borrar esta franja?')) return;
    const next = {
      ...data,
      slots: data.slots.filter(s => s.id !== slotId),
      cells: Object.fromEntries(Object.entries(data.cells || {}).filter(([k]) => k !== slotId)),
    };
    setHorario(next);
  };
  const moveSlot = (slotId, dir) => {
    const idx = data.slots.findIndex(s => s.id === slotId);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= data.slots.length) return;
    const slots = [...data.slots];
    [slots[idx], slots[j]] = [slots[j], slots[idx]];
    setHorario({ ...data, slots });
  };
  const resetHorario = () => {
    if (!confirm('¿Resetear horario al horario por defecto del instituto? Se perderán los cambios.')) return;
    // Resembrado in-place: reconstruye el horario con el template + módulos actuales,
    // sin reload. No perdemos ventanas abiertas ni borradores en otras apps.
    setHorario({ slots: HORARIO_DEFAULT_SLOTS, cells: buildHorarioCellsFromTemplate(modulos || []) });
    // El flag de seeded sigue a '1' — este reset NO es un seed, es una sobrescritura
    // voluntaria. Mantenemos el flag para que no se dispare un seed automático
    // después si el usuario limpia `horario` por otro camino.
  };

  // Intentar re-vincular celdas con `label` (sin moduloId) que matcheen por nombre con
  // un módulo recién creado en fp_modulos.
  const relinkCells = () => {
    let changed = 0;
    const next = { ...data, cells: { ...(data.cells || {}) } };
    Object.entries(next.cells).forEach(([slotId, byDay]) => {
      const newByDay = { ...byDay };
      Object.entries(byDay).forEach(([dayIdx, cell]) => {
        if (cell.moduloId) return;
        if (!cell.label) return;
        const norm = cell.label.toLowerCase().trim();
        const m = (modulos || []).find(x => {
          const xn = (x.name || '').toLowerCase().trim();
          return xn === norm || xn.replace(/[-\s]/g,'') === norm.replace(/[-\s]/g,'');
        });
        if (m) { newByDay[dayIdx] = { moduloId: m.id, label: cell.label }; changed++; }
      });
      next.cells[slotId] = newByDay;
    });
    if (changed === 0) { alert('No hay etiquetas pendientes que coincidan con módulos de FP.'); return; }
    setHorario(next);
    alert(`Re-vinculadas ${changed} celdas con sus módulos de FP.`);
  };

  // Día actual (0=Lun..4=Vie, -1 si finde) — para resaltar columna de hoy.
  const todayDow = (() => {
    const d = new Date().getDay(); // 0=Dom..6=Sáb
    if (d === 0 || d === 6) return -1;
    return d - 1;
  })();

  return (
    <div>
      <h2 className="section-title">🕐 Horario del instituto
        <span style={{float:'right', display:'flex', gap:4}}>
          <button className="btn sm" onClick={relinkCells} title="Vincular etiquetas con módulos de FP por nombre">🔗 Re-vincular</button>
          <button className="btn sm" onClick={resetHorario} title="Restablecer al horario por defecto">↻ Reset</button>
        </span>
      </h2>
      <div style={{fontSize:11, opacity:0.85, marginBottom:8, lineHeight:1.45}}>
        Pulsa una celda para asignar una asignatura (módulo de FP) o dejarla vacía.
        Las asignaturas <b>convalidadas</b> (Inglés, FOL) están vacías por defecto.
        Los colores se sincronizan con los módulos de <i>Tareas de FP</i>.
      </div>

      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%', borderCollapse:'separate', borderSpacing:2, fontSize:11}}>
          <thead>
            <tr>
              <th style={{padding:'6px 4px', background:'rgba(30,70,130,0.15)', borderRadius:4, fontSize:10, width:90}}>Hora</th>
              {HORARIO_DAYS.map((d, i) => (
                <th key={d} style={{
                  padding:'6px 4px',
                  background: i === todayDow ? 'rgba(216,142,20,0.45)' : 'rgba(30,70,130,0.15)',
                  borderRadius:4,
                  fontWeight:700,
                  color: i === todayDow ? '#5a3800' : '#0d2a56',
                }}>
                  {HORARIO_DAYS_SHORT[i]}
                  {i === todayDow && <span style={{fontSize:9, marginLeft:3}}>· hoy</span>}
                </th>
              ))}
              <th style={{width:30}}/>
            </tr>
          </thead>
          <tbody>
            {data.slots.map((slot, slotIdx) => {
              const isBreak = slot.type === 'break';
              return (
                <tr key={slot.id}>
                  {/* Columna hora — editable */}
                  <td style={{
                    padding:'6px 4px',
                    background:'rgba(30,70,130,0.08)',
                    borderRadius:4,
                    fontSize:10,
                    fontWeight:600,
                    textAlign:'center',
                    color:'#0d2a56',
                    cursor:'pointer',
                  }} onClick={() => setEditingTime(editingTime === slot.id ? null : slot.id)}>
                    {editingTime === slot.id ? (
                      <input
                        autoFocus
                        defaultValue={slot.time}
                        onBlur={(e) => { updateSlot(slot.id, { time: e.target.value }); setEditingTime(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { updateSlot(slot.id, { time: e.target.value }); setEditingTime(null); } if (e.key === 'Escape') setEditingTime(null); }}
                        style={{width:'100%', fontSize:10, padding:'2px 3px'}}
                        onClick={e => e.stopPropagation()}
                      />
                    ) : slot.time}
                    <div style={{display:'flex', gap:2, justifyContent:'center', marginTop:2}}>
                      <span title="Subir" onClick={(e) => { e.stopPropagation(); moveSlot(slot.id, -1); }}
                        style={{cursor:'pointer', opacity: slotIdx === 0 ? 0.25 : 0.7, fontSize:9}}>▲</span>
                      <span title="Bajar" onClick={(e) => { e.stopPropagation(); moveSlot(slot.id, 1); }}
                        style={{cursor:'pointer', opacity: slotIdx === data.slots.length - 1 ? 0.25 : 0.7, fontSize:9}}>▼</span>
                    </div>
                  </td>

                  {isBreak ? (
                    <td colSpan={5} style={{
                      padding:'8px 4px',
                      background: `linear-gradient(to bottom, rgba(112,144,184,0.55), rgba(80,110,150,0.35))`,
                      borderRadius:4,
                      textAlign:'center',
                      color:'#fff',
                      fontWeight:700,
                      letterSpacing:1.5,
                      textShadow:'0 1px 2px rgba(0,0,0,0.4)',
                    }}>
                      {editingTime === '__lbl__' + slot.id ? (
                        <input
                          autoFocus
                          defaultValue={slot.label || 'PAUSA'}
                          onBlur={(e) => { updateSlot(slot.id, { label: e.target.value }); setEditingTime(null); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { updateSlot(slot.id, { label: e.target.value }); setEditingTime(null); } if (e.key === 'Escape') setEditingTime(null); }}
                          style={{width:160, padding:'2px 6px', fontSize:11, color:'#0d2a56'}}
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <span style={{cursor:'pointer'}} onClick={() => setEditingTime('__lbl__' + slot.id)}>
                          {slot.label || 'RECREO'}
                        </span>
                      )}
                    </td>
                  ) : (
                    HORARIO_DAYS.map((_, dayIdx) => {
                      const cell = (data.cells[slot.id] || {})[dayIdx];
                      const mod = cell?.moduloId ? moduloById(cell.moduloId) : null;
                      const hex = mod ? moduloHex(mod.id) : (cell?.label ? HORARIO_NEUTRAL_COLOR : null);
                      const display = mod ? mod.name.toUpperCase() : (cell?.label ? cell.label.toUpperCase() : '—');
                      const isEditing = editing && editing.slotId === slot.id && editing.dayIdx === dayIdx;
                      const isToday = dayIdx === todayDow;
                      return (
                        <td key={dayIdx} style={{
                          padding:0,
                          position:'relative',
                          minWidth:80,
                        }}>
                          <div
                            onClick={() => setEditing({ slotId: slot.id, dayIdx })}
                            style={{
                              padding:'10px 4px',
                              borderRadius:4,
                              background: hex
                                ? `linear-gradient(to bottom, ${hex}ee 0%, ${hex} 60%, ${hex}cc 100%)`
                                : 'rgba(255,255,255,0.18)',
                              border: hex ? '1px solid rgba(0,0,0,0.18)' : '1px dashed rgba(0,0,0,0.18)',
                              color: hex ? '#fff' : '#7a8aa0',
                              textShadow: hex ? '0 1px 1px rgba(0,0,0,0.45)' : 'none',
                              fontWeight: hex ? 700 : 400,
                              fontStyle: hex ? 'normal' : 'italic',
                              fontSize: 10.5,
                              textAlign:'center',
                              cursor:'pointer',
                              boxShadow: hex ? 'inset 0 1px 0 rgba(255,255,255,0.4)' : 'none',
                              outline: isToday ? '2px solid rgba(216,142,20,0.6)' : 'none',
                              outlineOffset: isToday ? -2 : 0,
                              minHeight: 32,
                              display:'flex',
                              alignItems:'center',
                              justifyContent:'center',
                            }}
                            title={mod ? mod.name : cell?.label || 'Vacío (clic para asignar)'}
                          >
                            {display}
                          </div>
                          {isEditing && (
                            <HorarioCellPicker
                              modulos={modulos || []}
                              currentMod={cell?.moduloId || ''}
                              currentLabel={cell?.label || ''}
                              onPick={(value) => { setCell(slot.id, dayIdx, value); setEditing(null); }}
                              onClose={() => setEditing(null)}
                            />
                          )}
                        </td>
                      );
                    })
                  )}

                  <td style={{textAlign:'center'}}>
                    <button className="btn red sm" style={{fontSize:9, padding:'2px 5px'}}
                      onClick={() => removeSlot(slot.id)} title="Borrar franja">✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{display:'flex', gap:6, marginTop:10, flexWrap:'wrap'}}>
        <button className="btn sm green" onClick={addClassSlot}>+ Añadir clase</button>
        <button className="btn sm" onClick={addBreakSlot}>+ Añadir pausa/recreo</button>
      </div>

      {(modulos || []).length === 0 && (
        <div style={{marginTop:12, padding:8, background:'rgba(216,142,20,0.18)', borderLeft:'3px solid #d88e14', borderRadius:4, fontSize:11, lineHeight:1.45}}>
          ⚠ No hay módulos en <b>Tareas de FP</b>. Las asignaturas se mostrarán como
          texto sin color hasta que crees los módulos. Una vez creados, pulsa
          <b> 🔗 Re-vincular</b> arriba para sincronizar los colores automáticamente.
        </div>
      )}
    </div>
  );
}

// Pop-up para editar una celda del horario. Lista de módulos como botones de color +
// input para texto libre (TUTORÍA, etc.) + botón "vacío" (para convalidadas).
function HorarioCellPicker({ modulos, currentMod, currentLabel, onPick, onClose }) {
  const [customLabel, setCustomLabel] = u2S(currentLabel || '');
  const moduloHex = (m) => {
    if (!m) return '#999';
    const c = (window.calEventColor ? window.calEventColor(m.color) : null);
    return c || '#3d7ed8';
  };
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
        zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:'linear-gradient(to bottom, #e8f3fb, #c8dff2)',
          border:'1px solid rgba(40,80,140,0.4)',
          borderRadius:10,
          padding:14,
          maxWidth:340,
          width:'100%',
          boxShadow:'0 10px 40px rgba(0,20,60,0.5)',
          fontFamily:'var(--font-ui)',
        }}
      >
        <h3 style={{margin:'0 0 8px', fontSize:13, color:'#0d2a56'}}>📚 Asignatura</h3>
        <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:4, marginBottom:10}}>
          {modulos.map(m => {
            const hex = moduloHex(m);
            const selected = currentMod === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onPick({ moduloId: m.id })}
                style={{
                  padding:'6px 4px',
                  background: `linear-gradient(to bottom, ${hex}ee, ${hex})`,
                  color:'#fff',
                  border: selected ? '2px solid #0d2a56' : '1px solid rgba(0,0,0,0.3)',
                  borderRadius:4,
                  fontSize:10.5,
                  fontWeight:700,
                  textShadow:'0 1px 1px rgba(0,0,0,0.4)',
                  cursor:'pointer',
                }}
              >{m.name.toUpperCase()}</button>
            );
          })}
        </div>
        <div style={{borderTop:'1px solid rgba(40,80,140,0.3)', paddingTop:8, marginTop:4}}>
          <div style={{fontSize:11, fontWeight:600, color:'#0d2a56', marginBottom:4}}>O texto libre (sin módulo):</div>
          <div style={{display:'flex', gap:4}}>
            <input
              value={customLabel}
              onChange={e => setCustomLabel(e.target.value)}
              placeholder="Ej. TUTORÍA"
              style={{flex:1, padding:'4px 6px', fontSize:11}}
            />
            <button
              className="btn sm green"
              disabled={!customLabel.trim()}
              onClick={() => onPick({ label: customLabel.trim() })}
            >✓</button>
          </div>
        </div>
        <div style={{display:'flex', gap:6, marginTop:10}}>
          <button className="btn sm" style={{flex:1}} onClick={() => onPick(null)}>
            ⬜ Dejar vacío (convalidada)
          </button>
          <button className="btn sm" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

window.Apps2 = { AnimesApp, PelisApp, ProyectosApp, RecursosApp, HabitosApp, HorarioApp, HorarioCellPicker, SeriesApp, JuegosApp };
