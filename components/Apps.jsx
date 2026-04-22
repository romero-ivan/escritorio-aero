// Apps.jsx — First half of window contents: Tareas FP, Diario, Finanzas, Médico, Calendario completo

const { useState: uS, useEffect: uE, useRef: uR, useMemo: uM } = React;

// ============ TAREAS FP ============
// Módulos: {id, name, color}. Color aplica a badge + evento calendario.
// Tareas: pueden ser tipo 'tarea' (default) o 'examen' (con campo tema + color rojo).
// Si tienen `due`, se reflejan automáticamente en cal_events (id prefix 'fp:').
const MODULO_COLORS = [
  { id: 'red',        hex: '#c02510' },
  { id: 'orange',     hex: '#e07820' },
  { id: 'gold',       hex: '#c89020' },
  { id: 'green',      hex: '#5fa028' },
  { id: 'lightgreen', hex: '#88d050' },
  { id: 'teal',       hex: '#2aa0a0' },
  { id: 'blue',       hex: '#3d7ed8' },
  { id: 'purple',     hex: '#8244d8' },
  { id: 'pink',       hex: '#d8408a' },
  { id: 'lightpink',  hex: '#f29ac0' },
];
const EXAM_COLOR_HEX = '#a01010';
// Verde "festivo" — más vivo y saturado que el verde de módulo, para diferenciar
// un día oficialmente festivo del resto. Se usa en el widget y en el calendario.
const FESTIVO_COLOR_HEX = '#2a8f10';
const DEFAULT_MODULOS = [
  { name: 'Interiores',      color: 'red' },
  { name: 'Auto',            color: 'blue' },
  { name: 'E-tecnica',       color: 'orange' },
  { name: 'Electrónica',     color: 'lightgreen' },
  { name: 'Digitalización',  color: 'lightpink' },
];
// Shared color resolver used by CalendarioApp to render events. 'red' es para exámenes.
// Nota: 'festivo' ya NO es un color de evento — los festivos viven en la key
// independiente `cal_festivos` (array de días ISO). Mantenemos el fallback por
// compatibilidad con eventos antiguos (migración implícita).
window.calEventColor = (name) => {
  if (name === 'red') return EXAM_COLOR_HEX;
  if (name === 'festivo') return FESTIVO_COLOR_HEX;
  const m = MODULO_COLORS.find(c => c.id === name);
  return m ? m.hex : '#3d7ed8';
};
// Helper para saber si un día es festivo. Lee `cal_festivos` (array de strings "YYYY-MM-DD")
// — fuente principal — y como fallback reconoce eventos con color==='festivo' (compat v1).
window.isDayFestivo = (dayKey, festivosArr, eventsForDay) => {
  if (festivosArr && Array.isArray(festivosArr) && festivosArr.includes(dayKey)) return true;
  if (eventsForDay && eventsForDay.some(e => e && e.color === 'festivo')) return true;
  return false;
};

function TareasFPApp() {
  const [tasks, setTasks] = window.useLocal('fp_tasks', []);
  const [modulos, setModulos] = window.useLocal('fp_modulos', []);
  const [draft, setDraft] = uS({ title: '', moduloId: '', tipo: 'tarea', tema: '', due: '', prio: 'media' });
  const [filter, setFilter] = uS('pending');
  const [showModModal, setShowModModal] = uS(false);
  const [modDraft, setModDraft] = uS({ name: '', color: 'blue' });
  const [addError, setAddError] = uS('');

  const moduloById = (id) => modulos.find(m => m.id === id);
  const moduloColorHex = (id) => { const m = moduloById(id); return m ? (MODULO_COLORS.find(c => c.id === m.color)?.hex || '#3d7ed8') : '#3d7ed8'; };

  // NOTA: la fusi\u00f3n con cal_events se hace on-demand dentro de CalendarioApp
  // (lee fp_tasks directamente). Antes hab\u00eda un useEffect aqu\u00ed que reescrib\u00eda
  // cal_events en cada render \u2014 generaba escrituras en cascada a localStorage
  // y carreras con el push al cloud, lo que romp\u00eda el guardado fiable.

  // Limpieza one-time: borra eventos 'fp:' residuales escritos por la versi\u00f3n
  // anterior. Corre solo una vez por navegador (flag local, no sincroniza).
  uE(() => {
    if (localStorage.getItem('__fp_events_purged') === '1') return;
    try {
      const evs = window.AeroCloud?.get('cal_events');
      if (!evs || typeof evs !== 'object') { localStorage.setItem('__fp_events_purged', '1'); return; }
      let changed = false;
      const cleaned = { ...evs };
      Object.keys(cleaned).forEach(day => {
        const kept = (cleaned[day] || []).filter(e => !(typeof e.id === 'string' && e.id.startsWith('fp:')));
        if (kept.length !== (cleaned[day]||[]).length) { changed = true; cleaned[day] = kept; }
        if (kept.length === 0) { delete cleaned[day]; changed = true; }
      });
      if (changed) window.AeroCloud.set('cal_events', cleaned);
      localStorage.setItem('__fp_events_purged', '1');
    } catch {}
  }, []);

  const add = () => {
    const title = draft.title.trim();
    if (!title) {
      setAddError(draft.tipo === 'examen'
        ? 'Escribe el nombre del examen en el primer campo.'
        : 'Escribe el nombre de la tarea.');
      return;
    }
    setAddError('');
    const newTask = {
      id: Date.now(),
      title,
      moduloId: draft.moduloId,
      tipo: draft.tipo,
      tema: draft.tema.trim(),
      due: draft.due,
      prio: draft.prio,
      done: false,
      created: Date.now(),
    };
    setTasks([...tasks, newTask]);
    setDraft({ title: '', moduloId: draft.moduloId, tipo: 'tarea', tema: '', due: '', prio: 'media' });
  };
  const toggle = (id) => setTasks(tasks.map(t => t.id===id ? {...t, done: !t.done} : t));
  const del = (id) => setTasks(tasks.filter(t => t.id !== id));

  const addModulo = () => {
    if (!modDraft.name.trim()) return;
    setModulos([...modulos, { id: 'm' + Date.now(), name: modDraft.name.trim(), color: modDraft.color }]);
    setModDraft({ name: '', color: 'blue' });
  };
  const delModulo = (id) => {
    if (!confirm('¿Borrar módulo? Las tareas con este módulo lo perderán.')) return;
    setModulos(modulos.filter(m => m.id !== id));
    setTasks(tasks.map(t => t.moduloId === id ? {...t, moduloId: ''} : t));
  };
  const editModuloColor = (id, color) => setModulos(modulos.map(m => m.id === id ? {...m, color} : m));
  const loadDefaults = () => {
    const existingNames = new Set(modulos.map(m => m.name.toLowerCase()));
    const toAdd = DEFAULT_MODULOS
      .filter(d => !existingNames.has(d.name.toLowerCase()))
      .map((d, i) => ({ id: 'm' + Date.now() + i, name: d.name, color: d.color }));
    if (toAdd.length === 0) { alert('Todos los módulos por defecto ya existen.'); return; }
    setModulos([...modulos, ...toAdd]);
  };

  const filtered = tasks.filter(t => filter==='all' || (filter==='pending' ? !t.done : t.done));
  const daysLeft = (due) => due ? Math.ceil((new Date(due) - new Date()) / 86400000) : null;

  return (
    <div>
      <h2 className="section-title">📚 Tareas de FP
        <button className="btn sm" style={{float:'right', fontSize:10}} onClick={()=>setShowModModal(true)}>📂 Módulos ({modulos.length})</button>
      </h2>
      <div className="add-row" style={{flexWrap:'wrap'}}>
        <input placeholder={draft.tipo==='examen'?'Nombre del examen…':'Tarea…'} value={draft.title} onChange={e=>setDraft({...draft, title: e.target.value})} onKeyDown={e=>e.key==='Enter'&&add()}/>
        <select value={draft.moduloId} onChange={e=>setDraft({...draft, moduloId: e.target.value})} style={{maxWidth:130}}>
          <option value="">— Módulo —</option>
          {modulos.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={draft.tipo} onChange={e=>setDraft({...draft, tipo: e.target.value})} style={{maxWidth:90}}>
          <option value="tarea">📋 Tarea</option>
          <option value="examen">📝 Examen</option>
        </select>
        {draft.tipo === 'examen' && (
          <input placeholder="Tema del examen…" value={draft.tema} onChange={e=>setDraft({...draft, tema: e.target.value})} style={{maxWidth:140}}/>
        )}
        <input type="date" value={draft.due} onChange={e=>setDraft({...draft, due: e.target.value})} style={{maxWidth:130}}/>
        <select value={draft.prio} onChange={e=>setDraft({...draft, prio: e.target.value})} style={{maxWidth:80}}>
          <option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option>
        </select>
        <button className="btn green sm" onClick={add}>+ Añadir</button>
      </div>
      {addError && <div style={{color:'#b01010', fontSize:11, padding:'4px 2px'}}>⚠ {addError}</div>}
      <div className="tabs">
        {['pending','all','done'].map(f => (
          <div key={f} className={`tab ${filter===f?'active':''}`} onClick={()=>setFilter(f)}>
            {f==='pending'?'Pendientes':f==='all'?'Todas':'Completadas'}
            <span className="pill-count">{tasks.filter(t => f==='all'||(f==='pending'?!t.done:t.done)).length}</span>
          </div>
        ))}
      </div>
      <ul className="tasks-list">
        {filtered.length === 0 && <div className="empty-hint">No hay tareas aquí.</div>}
        {filtered.map(t => {
          const dl = daysLeft(t.due);
          const prioColor = t.prio==='alta' ? 'red' : t.prio==='baja' ? 'blue' : 'gold';
          const mod = moduloById(t.moduloId);
          const isExam = t.tipo === 'examen';
          return (
            <li key={t.id} className={`task-item ${t.done?'done':''}`} style={isExam ? {borderLeft:`3px solid ${EXAM_COLOR_HEX}`} : null}>
              <div className={`aero-checkbox ${t.done?'checked':''}`} onClick={()=>toggle(t.id)}>
                {t.done && '✓'}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600}}>{isExam && '📝 '}{t.title}{t.tema && <span style={{fontWeight:400, opacity:0.8}}> — {t.tema}</span>}</div>
                <div style={{fontSize:10, opacity:0.75, marginTop:2, display:'flex', gap:6, flexWrap:'wrap', alignItems:'center'}}>
                  {mod && <span className="tag" style={{background: moduloColorHex(mod.id), color:'#fff'}}>{mod.name}</span>}
                  {isExam && <span className="tag" style={{background: EXAM_COLOR_HEX, color:'#fff'}}>Examen</span>}
                  <span className={`tag ${prioColor}`}>{t.prio}</span>
                  {t.due && <span style={{color: dl < 0 ? '#b01010' : dl < 3 ? '#b08000' : 'inherit'}}>
                    📅 {t.due} {dl !== null && (dl < 0 ? `(${Math.abs(dl)}d tarde)` : dl===0 ? '(¡hoy!)' : `(en ${dl}d)`)}
                  </span>}
                </div>
              </div>
              <button className="btn red sm" onClick={()=>del(t.id)}>✕</button>
            </li>
          );
        })}
      </ul>

      {showModModal && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10}} onClick={()=>setShowModModal(false)}>
          <div className="aero-card" style={{width:380, maxHeight:'80%', overflowY:'auto', padding:16}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
              <h3 style={{margin:0, fontSize:15}}>📂 Módulos FP</h3>
              <button className="btn sm" onClick={()=>setShowModModal(false)}>✕</button>
            </div>
            <div className="add-row" style={{marginBottom:10}}>
              <input placeholder="Nombre del módulo…" value={modDraft.name} onChange={e=>setModDraft({...modDraft, name: e.target.value})} onKeyDown={e=>e.key==='Enter'&&addModulo()}/>
              <select value={modDraft.color} onChange={e=>setModDraft({...modDraft, color: e.target.value})} style={{maxWidth:110}}>
                {MODULO_COLORS.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
              </select>
              <button className="btn green sm" onClick={addModulo}>+</button>
            </div>
            <div style={{marginBottom:10}}>
              <button className="btn sm" onClick={loadDefaults} style={{width:'100%'}}>⚡ Cargar módulos por defecto (FP)</button>
            </div>
            {modulos.length === 0 && <div className="empty-hint">Aún no hay módulos. Añade el primero arriba.</div>}
            {modulos.map(m => (
              <div key={m.id} className="aero-card" style={{padding:'6px 10px', display:'flex', alignItems:'center', gap:8, marginBottom:4}}>
                <div style={{width:14, height:14, borderRadius:3, background: MODULO_COLORS.find(c=>c.id===m.color)?.hex, border:'1px solid rgba(0,0,0,0.35)'}}/>
                <div style={{flex:1, fontWeight:600}}>{m.name}</div>
                <select value={m.color} onChange={e=>editModuloColor(m.id, e.target.value)} style={{maxWidth:90}}>
                  {MODULO_COLORS.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
                </select>
                <button className="btn red sm" onClick={()=>delModulo(m.id)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ DIARIO ============
// Reorganizado: sidebar con árbol plegable Año → Mes → Días. Panel de estadísticas
// de ánimo (conteo de moods últimos 30 días + gráfica barras). Los días aparecen
// compactos, sin saturación visual.
const DIARIO_MOODS = [
  {k:'😀', l:'Genial',    hex:'#4fb53a'},
  {k:'🙂', l:'Bien',      hex:'#9cc932'},
  {k:'😐', l:'Neutro',    hex:'#c8b020'},
  {k:'😔', l:'Bajón',     hex:'#5a7bc8'},
  {k:'😡', l:'Frustrado', hex:'#c83020'},
  {k:'😴', l:'Cansado',   hex:'#8848c0'},
];
const DIARIO_MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function DiarioApp() {
  const [entries, setEntries] = window.useLocal('diario', {});
  const [date, setDate] = uS(window.todayKey());
  // Expansión del árbol: Set simulado como objeto {"2026":true, "2026-04":true}
  const [expanded, setExpanded] = uS(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth()+1).padStart(2,'0');
    // Año y mes actual abiertos por defecto
    return { [y]: true, [`${y}-${m}`]: true };
  });
  const [showStats, setShowStats] = uS(false);
  const cur = entries[date] || { text: '', mood: '', ts: 0 };
  const setCur = (patch) => setEntries({...entries, [date]: {...cur, ...patch, ts: Date.now()}});

  // Agrupar entradas por año → mes → días
  const tree = uM(() => {
    const byYear = {};
    Object.keys(entries).sort().reverse().forEach(d => {
      // d = "YYYY-MM-DD"
      const [y, m] = d.split('-');
      if (!byYear[y]) byYear[y] = {};
      if (!byYear[y][m]) byYear[y][m] = [];
      byYear[y][m].push(d);
    });
    return byYear;
  }, [entries]);

  // Estadísticas de mood (últimos 30 días + todo el tiempo)
  const stats = uM(() => {
    const all = Object.entries(entries)
      .map(([d, e]) => ({ d, mood: e.mood, ts: e.ts }))
      .filter(x => x.mood);
    const counts = {};
    DIARIO_MOODS.forEach(m => { counts[m.k] = 0; });
    all.forEach(x => { if (counts[x.mood] !== undefined) counts[x.mood]++; });
    const total = all.length;
    // Últimos 30 días
    const today = new Date(); today.setHours(0,0,0,0);
    const cutoff = today.getTime() - 30 * 86400000;
    const recent = all.filter(x => new Date(x.d + 'T00:00:00').getTime() >= cutoff);
    const recentCounts = {};
    DIARIO_MOODS.forEach(m => { recentCounts[m.k] = 0; });
    recent.forEach(x => { if (recentCounts[x.mood] !== undefined) recentCounts[x.mood]++; });
    return { counts, total, recentCounts, recentTotal: recent.length, daysWithEntry: Object.keys(entries).length };
  }, [entries]);

  const toggleExpand = (key) => setExpanded({...expanded, [key]: !expanded[key]});

  const years = Object.keys(tree).sort().reverse();

  return (
    <div style={{display:'grid', gridTemplateColumns:'200px 1fr', gap:10, height:'100%'}}>
      {/* Sidebar: árbol plegable Año → Mes → Días */}
      <div style={{borderRight:'1px solid rgba(30,70,130,0.2)', paddingRight:8, overflow:'auto', fontSize:11}}>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{width:'100%', marginBottom:6, fontSize:11}}/>
        <button className={`btn sm ${showStats?'green':''}`} style={{width:'100%', fontSize:10, marginBottom:6}}
          onClick={()=>setShowStats(!showStats)}>
          📊 Estadísticas
        </button>
        {years.length === 0 && <div className="empty-hint" style={{fontSize:10}}>Sin entradas</div>}
        {years.map(y => {
          const months = Object.keys(tree[y]).sort().reverse();
          const yearOpen = !!expanded[y];
          const yearCount = months.reduce((s, m) => s + tree[y][m].length, 0);
          return (
            <div key={y} style={{marginBottom:2}}>
              <div
                onClick={()=>toggleExpand(y)}
                style={{cursor:'pointer', padding:'3px 4px', fontWeight:700, display:'flex', alignItems:'center', gap:4, borderRadius:3, background: yearOpen ? 'rgba(61,126,216,0.12)' : 'transparent'}}
              >
                <span style={{width:10, fontSize:9}}>{yearOpen ? '▼' : '▶'}</span>
                <span style={{flex:1}}>{y}</span>
                <span style={{fontSize:9, opacity:0.65}}>{yearCount}</span>
              </div>
              {yearOpen && months.map(m => {
                const monthKey = `${y}-${m}`;
                const monthOpen = !!expanded[monthKey];
                const days = tree[y][m];
                const mi = parseInt(m, 10) - 1;
                return (
                  <div key={m} style={{marginLeft:10}}>
                    <div
                      onClick={()=>toggleExpand(monthKey)}
                      style={{cursor:'pointer', padding:'2px 4px', fontSize:10, display:'flex', alignItems:'center', gap:4, opacity:0.9}}
                    >
                      <span style={{width:10, fontSize:9}}>{monthOpen ? '▼' : '▶'}</span>
                      <span style={{flex:1}}>{DIARIO_MESES[mi]}</span>
                      <span style={{fontSize:9, opacity:0.65}}>{days.length}</span>
                    </div>
                    {monthOpen && (
                      <div style={{marginLeft:12, display:'flex', flexDirection:'column', gap:1}}>
                        {days.map(d => {
                          const dd = d.slice(8, 10);
                          const e = entries[d];
                          const active = d === date;
                          return (
                            <div key={d}
                              onClick={()=>setDate(d)}
                              style={{
                                cursor:'pointer', padding:'1px 4px', fontSize:10,
                                borderRadius:2,
                                display:'flex', alignItems:'center', gap:4,
                                background: active ? 'linear-gradient(to right, #cfe6ff, #9cc6ff)' : 'transparent',
                                fontWeight: active ? 700 : 400,
                              }}
                            >
                              <span style={{minWidth:14, opacity:0.75}}>{dd}</span>
                              {e.mood && <span>{e.mood}</span>}
                              <span style={{flex:1, fontSize:9, opacity:0.6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                {e.text ? e.text.slice(0, 20) : ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Panel principal: estadísticas o edición */}
      {showStats ? (
        <div style={{overflow:'auto'}}>
          <h2 className="section-title">📊 Estadísticas de ánimo</h2>
          <div style={{fontSize:11, opacity:0.8, marginBottom:8}}>
            {stats.daysWithEntry} entradas totales · {stats.recentTotal} con ánimo en los últimos 30 días
          </div>

          <h3 className="section-title" style={{fontSize:12, marginTop:4}}>Últimos 30 días</h3>
          <DiarioMoodBars counts={stats.recentCounts} total={stats.recentTotal || 1}/>

          <h3 className="section-title" style={{fontSize:12, marginTop:14}}>Histórico total</h3>
          <DiarioMoodBars counts={stats.counts} total={stats.total || 1}/>

          {/* Heatmap últimos 90 días por mood */}
          <h3 className="section-title" style={{fontSize:12, marginTop:14}}>Últimos 90 días</h3>
          <DiarioHeatmap entries={entries}/>
        </div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          <h2 className="section-title">📖 {date}</h2>
          <div style={{display:'flex', gap:4, flexWrap:'wrap'}}>
            {DIARIO_MOODS.map(m => (
              <button key={m.k} className={`btn sm ${cur.mood===m.k?'green':''}`}
                onClick={()=>setCur({mood: cur.mood===m.k ? '' : m.k})}
                title={m.l}>
                <span style={{fontSize:14}}>{m.k}</span> {m.l}
              </button>
            ))}
          </div>
          <textarea
            value={cur.text}
            onChange={e=>setCur({text: e.target.value})}
            placeholder="¿Cómo ha ido el día? Escribe libremente…"
            style={{flex:1, minHeight:200}}
          />
          {cur.ts > 0 && <div style={{fontSize:10, opacity:0.6, textAlign:'right'}}>Guardado · {new Date(cur.ts).toLocaleTimeString('es-ES')}</div>}
        </div>
      )}
    </div>
  );
}

// Sub-componente: barras horizontales con conteo por mood
function DiarioMoodBars({ counts, total }) {
  return (
    <div style={{display:'flex', flexDirection:'column', gap:4}}>
      {DIARIO_MOODS.map(m => {
        const n = counts[m.k] || 0;
        const pct = total > 0 ? (n / total) * 100 : 0;
        return (
          <div key={m.k} style={{display:'flex', alignItems:'center', gap:6, fontSize:11}}>
            <span style={{fontSize:16, width:22}}>{m.k}</span>
            <span style={{minWidth:60, opacity:0.85}}>{m.l}</span>
            <div style={{flex:1, height:14, background:'rgba(255,255,255,0.25)', borderRadius:3, position:'relative', overflow:'hidden'}}>
              <div style={{
                width: `${pct}%`,
                height:'100%',
                background:`linear-gradient(to right, ${m.hex}cc, ${m.hex})`,
                transition:'width 0.3s',
              }}/>
            </div>
            <span style={{minWidth:55, textAlign:'right', fontVariantNumeric:'tabular-nums'}}>
              {n} <span style={{opacity:0.6, fontSize:9}}>({pct.toFixed(0)}%)</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Sub-componente: heatmap de 90 días (cada día un cuadrito coloreado por mood)
function DiarioHeatmap({ entries }) {
  const days = [];
  const today = new Date(); today.setHours(0,0,0,0);
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const e = entries[k];
    const moodObj = e?.mood ? DIARIO_MOODS.find(m => m.k === e.mood) : null;
    days.push({ k, mood: e?.mood, hex: moodObj?.hex });
  }
  return (
    <div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(30, 1fr)', gap:2}}>
        {days.map(d => (
          <div key={d.k}
            title={`${d.k}${d.mood ? ' · ' + d.mood : ''}`}
            style={{
              aspectRatio:'1',
              background: d.hex || 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius:2,
            }}
          />
        ))}
      </div>
      <div style={{fontSize:9, opacity:0.6, marginTop:4}}>
        Cada cuadro = un día. De izquierda (hace 90 días) a derecha (hoy).
      </div>
    </div>
  );
}

// ============ FINANZAS ============
// Modelo: patrimonio neto inicial + recurrentes (gasto/ingreso mensual) + movimientos
// extraordinarios por mes concreto. La proyección enero→diciembre aplica, mes a mes,
// los recurrentes + los extraordinarios de ese mes, y dibuja el patrimonio resultante
// como barras. Al cerrarse el año, el usuario puede archivar el año completo al
// historial (patrimonio de cierre, total gastos, total ingresos) y resetear a cero.
const FIN_MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function FinanzasApp() {
  const [fin, setFin] = window.useLocal('finanzas', {
    currency: '€',
    year: new Date().getFullYear(),
    startMonth: new Date().getMonth(), // mes de inicio del año (0-11). Si se vibecodea en abril, startMonth=3.
    netWorth: 0,                 // patrimonio neto al comenzar startMonth del año activo
    monthlyExpense: 0,           // gasto recurrente mensual esperado
    monthlyIncome: 0,            // ingreso recurrente mensual esperado
    extraordinary: [],           // [{id, month: 0-11, amount (+/-), label}]
    history: [],                 // [{year, startNet, endNet, totalIncome, totalExpense}]
  });
  const [extDraft, setExtDraft] = uS({ month: new Date().getMonth(), amount: '', label: '', kind: 'ingreso' });

  const currency = fin.currency || '€';
  const year = fin.year || new Date().getFullYear();
  const startMonth = Number.isInteger(fin.startMonth) ? fin.startMonth : 0;

  const addExtraordinary = () => {
    const a = parseFloat(extDraft.amount);
    if (isNaN(a) || !extDraft.label.trim()) return;
    const signed = extDraft.kind === 'gasto' ? -Math.abs(a) : Math.abs(a);
    const next = [...(fin.extraordinary || []), {
      id: Date.now(),
      month: parseInt(extDraft.month, 10),
      amount: signed,
      label: extDraft.label.trim(),
    }];
    setFin({ ...fin, extraordinary: next });
    setExtDraft({ month: extDraft.month, amount: '', label: '', kind: 'ingreso' });
  };
  const delExtraordinary = (id) => {
    setFin({ ...fin, extraordinary: (fin.extraordinary || []).filter(e => e.id !== id) });
  };

  // Proyección mes a mes desde startMonth hasta diciembre. Los meses anteriores a
  // startMonth se marcan como "inactivos" (barra vacía, netEnd=null): no tienen
  // sentido proyectar sobre ellos porque el patrimonio solo se conoce a partir de
  // startMonth. Si startMonth=3 (abril), las barras de Ene/Feb/Mar salen vacías.
  const projection = uM(() => {
    const rows = [];
    let running = Number(fin.netWorth) || 0;
    const mI = Number(fin.monthlyIncome) || 0;
    const mE = Number(fin.monthlyExpense) || 0;
    for (let m = 0; m < 12; m++) {
      if (m < startMonth) {
        rows.push({
          month: m, label: FIN_MESES[m],
          netStart: null, netEnd: null,
          inc: 0, exp: 0, delta: 0,
          extras: [], inactive: true,
        });
        continue;
      }
      const extras = (fin.extraordinary || []).filter(e => e.month === m);
      const extraIn = extras.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0);
      const extraOut = extras.filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);
      const inc = mI + extraIn;
      const exp = mE + extraOut;
      const start = running;
      running = running + inc - exp;
      rows.push({
        month: m, label: FIN_MESES[m],
        netStart: start, netEnd: running,
        inc, exp, delta: inc - exp,
        extras, inactive: false,
      });
    }
    return rows;
  }, [fin.netWorth, fin.monthlyIncome, fin.monthlyExpense, fin.extraordinary, startMonth]);

  const totals = uM(() => {
    const active = projection.filter(r => !r.inactive);
    const totalIn = active.reduce((s, r) => s + r.inc, 0);
    const totalOut = active.reduce((s, r) => s + r.exp, 0);
    const endNet = active.length ? active[active.length - 1].netEnd : (Number(fin.netWorth) || 0);
    return { totalIn, totalOut, endNet };
  }, [projection, fin.netWorth]);

  // Rango Y: aseguramos que 0 quede visible si el patrimonio cruza cero durante el año.
  // Ignora meses inactivos (netEnd === null).
  const netValues = projection.filter(r => r.netEnd !== null).map(r => r.netEnd).concat([Number(fin.netWorth) || 0]);
  const yMax = Math.max(100, ...netValues);
  const yMin = Math.min(0, ...netValues);

  const archiveYear = () => {
    if (!confirm(`¿Archivar año ${year}?\nSe guardará el cierre al historial y podrás empezar ${year+1} desde el patrimonio final (${totals.endNet.toFixed(2)} ${currency}).`)) return;
    const snapshot = {
      year,
      startNet: Number(fin.netWorth) || 0,
      endNet: totals.endNet,
      totalIncome: totals.totalIn,
      totalExpense: totals.totalOut,
      monthlyIncome: Number(fin.monthlyIncome) || 0,
      monthlyExpense: Number(fin.monthlyExpense) || 0,
      extraordinary: fin.extraordinary || [],
      archivedAt: Date.now(),
    };
    setFin({
      ...fin,
      year: year + 1,
      startMonth: 0, // nuevo año completo desde enero
      netWorth: totals.endNet,
      extraordinary: [],
      history: [snapshot, ...(fin.history || [])],
    });
  };

  // ----- Render de la gráfica de barras (SVG). 12 barras, una por mes. -----
  const chartW = 600, chartH = 200;
  const padL = 36, padR = 10, padT = 14, padB = 28;
  const innerW = chartW - padL - padR, innerH = chartH - padT - padB;
  const xAt = (i) => padL + (i + 0.5) * (innerW / 12);
  const barW = Math.max(12, innerW / 12 - 6);
  const yAt = (v) => padT + innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH;
  const yZero = yAt(0);

  return (
    <div>
      <h2 className="section-title">💰 Finanzas · Año {year}
        <button className="btn sm" style={{float:'right', fontSize:10}} onClick={archiveYear}>
          📦 Archivar año
        </button>
      </h2>

      {/* Inputs básicos: patrimonio, gasto/ingreso recurrente */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:10}}>
        <div className="aero-card">
          <div style={{fontSize:10, opacity:0.7, display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <span>Patrimonio neto al empezar</span>
            <select
              value={startMonth}
              onChange={e=>setFin({...fin, startMonth: parseInt(e.target.value, 10)})}
              style={{fontSize:10, padding:'1px 3px'}}
              title="Mes desde el que empiezas a registrar — la proyección arranca aquí"
            >
              {FIN_MESES.map((m,i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div className="stat-num">
            <input type="number" value={fin.netWorth} onChange={e=>setFin({...fin, netWorth: parseFloat(e.target.value)||0})}
              style={{width:100, fontSize:17, fontWeight:700, background:'transparent', border:'none', padding:0, color:'inherit'}} /> {currency}
          </div>
          <div style={{fontSize:9, opacity:0.6, marginTop:2}}>A 1 de {FIN_MESES[startMonth].toLowerCase()} de {year}</div>
        </div>
        <div className="aero-card">
          <div style={{fontSize:10, opacity:0.7}}>Gasto mensual</div>
          <div className="stat-num" style={{color:'#b01010'}}>
            -<input type="number" value={fin.monthlyExpense} onChange={e=>setFin({...fin, monthlyExpense: parseFloat(e.target.value)||0})}
              style={{width:80, fontSize:17, fontWeight:700, background:'transparent', border:'none', padding:0, color:'inherit'}} /> {currency}
          </div>
          <div style={{fontSize:9, opacity:0.6, marginTop:2}}>Recurrente (alquiler, comida…)</div>
        </div>
        <div className="aero-card">
          <div style={{fontSize:10, opacity:0.7}}>Ingreso mensual</div>
          <div className="stat-num" style={{color:'#2a7a14'}}>
            +<input type="number" value={fin.monthlyIncome} onChange={e=>setFin({...fin, monthlyIncome: parseFloat(e.target.value)||0})}
              style={{width:80, fontSize:17, fontWeight:700, background:'transparent', border:'none', padding:0, color:'inherit'}} /> {currency}
          </div>
          <div style={{fontSize:9, opacity:0.6, marginTop:2}}>Nómina, recurrente</div>
        </div>
      </div>

      {/* Totales anuales calculados */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:10, fontSize:11}}>
        <div className="aero-card" style={{padding:'6px 10px'}}>
          <span style={{opacity:0.7}}>Ingresos año: </span>
          <strong style={{color:'#2a7a14'}}>+{totals.totalIn.toFixed(2)} {currency}</strong>
        </div>
        <div className="aero-card" style={{padding:'6px 10px'}}>
          <span style={{opacity:0.7}}>Gastos año: </span>
          <strong style={{color:'#b01010'}}>-{totals.totalOut.toFixed(2)} {currency}</strong>
        </div>
        <div className="aero-card" style={{padding:'6px 10px'}}>
          <span style={{opacity:0.7}}>Cierre estimado: </span>
          <strong style={{color: totals.endNet >= (Number(fin.netWorth)||0) ? '#2a7a14' : '#b01010'}}>
            {totals.endNet.toFixed(2)} {currency}
          </strong>
        </div>
      </div>

      {/* Formulario para añadir movimiento extraordinario (por mes concreto) */}
      <h3 className="section-title" style={{fontSize:12, marginTop:4}}>Ingresos/gastos extraordinarios</h3>
      <div className="add-row" style={{flexWrap:'wrap'}}>
        <select value={extDraft.month} onChange={e=>setExtDraft({...extDraft, month: e.target.value})} style={{maxWidth:90}}>
          {FIN_MESES.map((m,i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={extDraft.kind} onChange={e=>setExtDraft({...extDraft, kind: e.target.value})} style={{maxWidth:90}}>
          <option value="ingreso">Ingreso</option>
          <option value="gasto">Gasto</option>
        </select>
        <input type="number" placeholder="Cantidad" value={extDraft.amount} onChange={e=>setExtDraft({...extDraft, amount: e.target.value})} style={{maxWidth:100}}/>
        <input placeholder="Concepto (ej. paga extra, vacaciones…)" value={extDraft.label} onChange={e=>setExtDraft({...extDraft, label: e.target.value})} onKeyDown={e=>e.key==='Enter'&&addExtraordinary()}/>
        <button className="btn green sm" onClick={addExtraordinary}>+ Añadir</button>
      </div>
      <div style={{maxHeight:100, overflow:'auto', marginBottom:10}}>
        {(fin.extraordinary || []).length === 0 && <div className="empty-hint">Sin extraordinarios este año</div>}
        {(fin.extraordinary || []).sort((a,b) => a.month - b.month).map(e => (
          <div key={e.id} className="list-row" style={{padding:'3px 6px'}}>
            <span className="tag blue" style={{fontSize:9}}>{FIN_MESES[e.month]}</span>
            <div style={{flex:1, marginLeft:6}}>{e.label}</div>
            <div style={{fontWeight:700, color: e.amount < 0 ? '#b01010' : '#2a7a14', marginRight:6}}>
              {e.amount > 0 ? '+' : ''}{e.amount.toFixed(2)} {currency}
            </div>
            <button className="btn red sm" onClick={()=>delExtraordinary(e.id)}>✕</button>
          </div>
        ))}
      </div>

      {/* Gráfica de barras: patrimonio al cierre de cada mes */}
      <div className="chart-wrap">
        <div style={{fontSize:10, opacity:0.7, marginBottom:4}}>
          Patrimonio neto proyectado · {FIN_MESES[startMonth]} → Dic {year}
          {startMonth > 0 && <span style={{opacity:0.5}}> (meses previos inactivos)</span>}
        </div>
        <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{width:'100%', height:chartH}}>
          <defs>
            <linearGradient id="finBarPos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a5e15a" />
              <stop offset="50%" stopColor="#5fa028" />
              <stop offset="100%" stopColor="#2a7a14" />
            </linearGradient>
            <linearGradient id="finBarNeg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff8878" />
              <stop offset="50%" stopColor="#d8402c" />
              <stop offset="100%" stopColor="#881810" />
            </linearGradient>
          </defs>
          {/* Eje 0 y lineas horizontales */}
          <line x1={padL} x2={chartW-padR} y1={yZero} y2={yZero} stroke="rgba(30,70,130,0.4)" strokeWidth="1" />
          {[0.25, 0.5, 0.75].map(f => {
            const y = padT + innerH * f;
            return <line key={f} x1={padL} x2={chartW-padR} y1={y} y2={y} stroke="rgba(30,70,130,0.1)" strokeDasharray="3 3" />;
          })}
          {/* Etiquetas Y: min, 0, max */}
          <text x="4" y={yAt(yMax)+4} fontSize="9" fill="currentColor" opacity="0.7">{yMax.toFixed(0)}</text>
          <text x="4" y={yZero+3} fontSize="9" fill="currentColor" opacity="0.7">0</text>
          {yMin < 0 && <text x="4" y={yAt(yMin)-2} fontSize="9" fill="currentColor" opacity="0.7">{yMin.toFixed(0)}</text>}

          {/* Barras */}
          {projection.map((r, i) => {
            const x = xAt(i) - barW/2;
            if (r.inactive) {
              // Mes anterior al inicio: caja gris translúcida (sin valor proyectable)
              return (
                <g key={i}>
                  <rect x={x} y={padT} width={barW} height={innerH}
                    fill="rgba(150,150,150,0.08)" stroke="rgba(120,120,120,0.25)" strokeDasharray="2 3" rx="2"/>
                  <text x={xAt(i)} y={padT + innerH/2 + 3} fontSize="8" textAnchor="middle" fill="currentColor" opacity="0.4">
                    —
                  </text>
                  <text x={xAt(i)} y={chartH - 10} fontSize="9" textAnchor="middle" fill="currentColor" opacity="0.4">
                    {r.label}
                  </text>
                </g>
              );
            }
            const v = r.netEnd;
            const top = yAt(Math.max(v, 0));
            const bottom = yAt(Math.min(v, 0));
            const h = Math.max(1, bottom - top);
            const isPos = v >= 0;
            return (
              <g key={i}>
                <rect x={x} y={top} width={barW} height={h}
                  fill={isPos ? 'url(#finBarPos)' : 'url(#finBarNeg)'}
                  stroke={isPos ? '#2a7a14' : '#881810'} strokeWidth="0.5" rx="2"/>
                {/* Valor sobre la barra */}
                <text x={xAt(i)} y={isPos ? top - 3 : bottom + 10}
                  fontSize="8" textAnchor="middle" fill="currentColor" opacity="0.85">
                  {v >= 1000 || v <= -1000 ? (v/1000).toFixed(1)+'k' : v.toFixed(0)}
                </text>
                {/* Etiqueta mes */}
                <text x={xAt(i)} y={chartH - 10} fontSize="9" textAnchor="middle" fill="currentColor" opacity="0.8">
                  {r.label}
                </text>
              </g>
            );
          })}
        </svg>
        <div style={{fontSize:9, opacity:0.6, textAlign:'center'}}>
          Cada barra = patrimonio al cierre de ese mes (tras aplicar recurrente + extraordinarios)
        </div>
      </div>

      {/* Historial de años archivados */}
      {(fin.history && fin.history.length > 0) && (
        <>
          <h3 className="section-title" style={{fontSize:12, marginTop:12}}>📚 Historial</h3>
          <div style={{maxHeight:140, overflow:'auto'}}>
            {fin.history.map(h => {
              const delta = h.endNet - h.startNet;
              return (
                <div key={h.year} className="aero-card" style={{padding:'6px 10px', marginBottom:4, display:'flex', alignItems:'center', gap:8}}>
                  <div style={{fontWeight:700, fontSize:13, minWidth:44}}>{h.year}</div>
                  <div style={{flex:1, fontSize:10, opacity:0.85}}>
                    {h.startNet.toFixed(0)} → <strong>{h.endNet.toFixed(0)}</strong> {currency}
                    <span style={{marginLeft:6, color: delta >= 0 ? '#2a7a14' : '#b01010', fontWeight:700}}>
                      ({delta >= 0 ? '+' : ''}{delta.toFixed(0)})
                    </span>
                  </div>
                  <div style={{fontSize:9, opacity:0.7}}>
                    <span style={{color:'#2a7a14'}}>+{h.totalIncome.toFixed(0)}</span>
                    {' / '}
                    <span style={{color:'#b01010'}}>-{h.totalExpense.toFixed(0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ============ MÉDICO ============
function MedicoApp() {
  const [med, setMed] = window.useLocal('medico', {
    medicamentos: [], patologias: [], analiticas: [], notas: ''
  });
  const [tab, setTab] = uS('meds');
  const [mDraft, setMDraft] = uS({ nombre: '', dosis: '', cantidad: '', inicio: '', fin: '' });
  const [pDraft, setPDraft] = uS({ nombre: '', desde: '', notas: '' });
  const [aFile, setAFile] = uS(null);
  const fileRef = uR();

  const addMed = () => {
    if (!mDraft.nombre) return;
    setMed({...med, medicamentos: [...med.medicamentos, {...mDraft, id: Date.now()}]});
    setMDraft({ nombre: '', dosis: '', cantidad: '', inicio: '', fin: '' });
  };
  const addPat = () => {
    if (!pDraft.nombre) return;
    setMed({...med, patologias: [...med.patologias, {...pDraft, id: Date.now()}]});
    setPDraft({ nombre: '', desde: '', notas: '' });
  };
  const onAnal = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      setMed({...med, analiticas: [{
        id: Date.now(), name: f.name, fecha: window.todayKey(), size: f.size,
        data: r.result, type: f.type
      }, ...med.analiticas]});
    };
    r.readAsDataURL(f);
  };

  // Abrir analítica: convierte la data: URL guardada a blob: URL y la abre en
  // pestaña nueva. Motivos:
  //   1) Los navegadores modernos (Chrome/Safari/Firefox desde 2017-18) BLOQUEAN
  //      la navegación top-level a data: URLs por seguridad. Con <a href={data:...}>
  //      en muchos navegadores simplemente no pasa nada al pulsar. Con blob:
  //      funciona siempre.
  //   2) blob: tiene origen opaco, no filtra referrer a terceros, y se libera
  //      cuando revocamos la URL (cleanup a 60s — tiempo suficiente para ver
  //      el archivo).
  //   3) Si alguien ha conseguido meter un data:text/html malicioso (imposible
  //      con el <input accept="application/pdf,image/*"> pero defensa en
  //      profundidad), blob: abre en un contexto con origen null que no puede
  //      acceder al origen de la app.
  const openAnalitica = (a) => {
    try {
      const comma = a.data.indexOf(',');
      if (comma < 0 || !a.data.startsWith('data:')) throw new Error('formato inválido');
      const header = a.data.slice(5, comma);
      const isB64 = header.endsWith(';base64');
      const mime = isB64 ? header.slice(0, -7) : (header || 'application/octet-stream');
      const payload = a.data.slice(comma + 1);
      let blob;
      if (isB64) {
        const bin = atob(payload);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        blob = new Blob([arr], { type: mime });
      } else {
        blob = new Blob([decodeURIComponent(payload)], { type: mime });
      }
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      alert('No se pudo abrir el archivo: ' + (err && err.message || err));
    }
  };

  return (
    <div>
      <h2 className="section-title">⚕ Historial médico</h2>
      <div className="tabs">
        {[['meds','💊 Medicamentos'],['pat','🩺 Patologías'],['anal','📄 Analíticas'],['notas','📝 Notas']].map(([k,l]) => (
          <div key={k} className={`tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</div>
        ))}
      </div>

      {tab === 'meds' && <div>
        <div className="add-row">
          <input placeholder="Medicamento" value={mDraft.nombre} onChange={e=>setMDraft({...mDraft, nombre: e.target.value})}/>
          <input placeholder="Dosis (ej. 500mg)" value={mDraft.dosis} onChange={e=>setMDraft({...mDraft, dosis: e.target.value})} style={{maxWidth:110}}/>
          <input placeholder="Toma diaria" value={mDraft.cantidad} onChange={e=>setMDraft({...mDraft, cantidad: e.target.value})} style={{maxWidth:110}}/>
          <input type="date" value={mDraft.inicio} onChange={e=>setMDraft({...mDraft, inicio: e.target.value})} style={{maxWidth:130}}/>
          <input type="date" value={mDraft.fin} onChange={e=>setMDraft({...mDraft, fin: e.target.value})} style={{maxWidth:130}}/>
          <button className="btn green sm" onClick={addMed}>+</button>
        </div>
        {med.medicamentos.length === 0 && <div className="empty-hint">Sin medicamentos en curso</div>}
        {med.medicamentos.map(m => {
          const activo = !m.fin || new Date(m.fin) >= new Date();
          return (
            <div key={m.id} className="aero-card">
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <div>
                  <div style={{fontWeight:700, fontSize:13}}>{m.nombre} <span style={{fontWeight:400, opacity:0.75}}>{m.dosis}</span></div>
                  <div style={{fontSize:11, marginTop:2}}>
                    <span className="tag blue">{m.cantidad}/día</span>{' '}
                    {m.inicio && `Desde ${m.inicio}`} {m.fin && `→ ${m.fin}`}
                    {' '}<span className={`tag ${activo?'':'red'}`}>{activo?'en curso':'finalizado'}</span>
                  </div>
                </div>
                <button className="btn red sm" onClick={()=>setMed({...med, medicamentos: med.medicamentos.filter(x=>x.id!==m.id)})}>✕</button>
              </div>
            </div>
          );
        })}
      </div>}

      {tab === 'pat' && <div>
        <div className="add-row">
          <input placeholder="Patología" value={pDraft.nombre} onChange={e=>setPDraft({...pDraft, nombre: e.target.value})}/>
          <input type="date" value={pDraft.desde} onChange={e=>setPDraft({...pDraft, desde: e.target.value})} style={{maxWidth:130}}/>
          <input placeholder="Notas" value={pDraft.notas} onChange={e=>setPDraft({...pDraft, notas: e.target.value})}/>
          <button className="btn green sm" onClick={addPat}>+</button>
        </div>
        {med.patologias.length === 0 && <div className="empty-hint">Sin patologías registradas</div>}
        {med.patologias.map(p => (
          <div key={p.id} className="aero-card">
            <div style={{display:'flex', justifyContent:'space-between'}}>
              <div>
                <div style={{fontWeight:700}}>{p.nombre}</div>
                <div style={{fontSize:11, opacity:0.75}}>Desde {p.desde || '—'} · {p.notas}</div>
              </div>
              <button className="btn red sm" onClick={()=>setMed({...med, patologias: med.patologias.filter(x=>x.id!==p.id)})}>✕</button>
            </div>
          </div>
        ))}
      </div>}

      {tab === 'anal' && <div>
        <div className="dropzone" onClick={()=>fileRef.current.click()}>
          📄 Click para subir PDF de analítica (o imagen)
        </div>
        <input ref={fileRef} type="file" accept="application/pdf,image/*" style={{display:'none'}} onChange={onAnal}/>
        <div style={{marginTop:10}}>
          {med.analiticas.length === 0 && <div className="empty-hint">Sin analíticas subidas</div>}
          {med.analiticas.map(a => (
            <div key={a.id} className="aero-card">
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <div style={{fontWeight:700}}>📄 {a.name}</div>
                  <div style={{fontSize:11, opacity:0.75}}>{a.fecha} · {(a.size/1024).toFixed(1)} KB</div>
                </div>
                <div style={{display:'flex', gap:4}}>
                  <button className="btn sm" onClick={()=>openAnalitica(a)}>Ver</button>
                  <button className="btn red sm" onClick={()=>setMed({...med, analiticas: med.analiticas.filter(x=>x.id!==a.id)})}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>}

      {tab === 'notas' && <div>
        <textarea value={med.notas} onChange={e=>setMed({...med, notas: e.target.value})} placeholder="Alergias, grupo sanguíneo, contactos de emergencia, médico de cabecera…" style={{width:'100%', minHeight:200}}/>
      </div>}
    </div>
  );
}

// ============ CALENDARIO COMPLETO ============
function CalendarioApp() {
  const [events, setEvents] = window.useLocal('cal_events', {}); // {"YYYY-MM-DD": [{id, text, color}]}
  const [festivos, setFestivos] = window.useLocal('cal_festivos', []); // ["YYYY-MM-DD", ...]
  const [fpTasks] = window.useLocal('fp_tasks', []);
  const [fpModulos] = window.useLocal('fp_modulos', []);
  const [view, setView] = uS('month');
  const [cursor, setCursor] = uS(() => { const d = new Date(); return {y: d.getFullYear(), m: d.getMonth()}; });
  const [selected, setSelected] = uS(window.todayKey());
  const [draft, setDraft] = uS({ text: '', color: 'blue' });

  // Toggle festivo de un día concreto: lo añade si no está, lo quita si está.
  // No necesita evento asociado — los festivos son independientes.
  const toggleFestivo = (dayKey) => {
    const list = Array.isArray(festivos) ? festivos : [];
    if (list.includes(dayKey)) setFestivos(list.filter(d => d !== dayKey));
    else setFestivos([...list, dayKey]);
  };

  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const today = new Date();

  // Fusi\u00f3n on-demand: tareas FP con fecha \u2192 eventos virtuales (id prefijo 'fp:').
  // Se recomputa en cada render pero NO escribe a cal_events \u2014 evita carreras con el push al cloud.
  const mergedEvents = uM(() => {
    const out = {};
    Object.entries(events).forEach(([day, list]) => {
      out[day] = list.filter(e => !(typeof e.id === 'string' && e.id.startsWith('fp:')));
    });
    fpTasks.forEach(t => {
      if (!t.due || t.done) return;
      const mod = fpModulos.find(m => m.id === t.moduloId);
      const color = t.tipo === 'examen' ? 'red' : (mod?.color || 'blue');
      const label = (t.tipo === 'examen' ? '\ud83d\udcdd Examen: ' : '') + t.title + (t.tema ? ` (${t.tema})` : '');
      if (!out[t.due]) out[t.due] = [];
      out[t.due] = [...out[t.due], { id: 'fp:' + t.id, text: label, color, readOnly: true }];
    });
    Object.keys(out).forEach(day => { if (out[day].length === 0) delete out[day]; });
    return out;
  }, [events, fpTasks, fpModulos]);

  const addEv = () => {
    if (!draft.text.trim()) return;
    const evs = {...events};
    if (!evs[selected]) evs[selected] = [];
    evs[selected] = [...evs[selected], {id: Date.now(), text: draft.text, color: draft.color}];
    setEvents(evs);
    setDraft({ text: '', color: draft.color });
  };
  const delEv = (day, id) => {
    const evs = {...events};
    evs[day] = evs[day].filter(e => e.id !== id);
    if (evs[day].length === 0) delete evs[day];
    setEvents(evs);
  };

  const monthGrid = () => {
    const first = new Date(cursor.y, cursor.m, 1);
    const dim = new Date(cursor.y, cursor.m+1, 0).getDate();
    const startDow = (first.getDay() + 6) % 7;
    const prevDim = new Date(cursor.y, cursor.m, 0).getDate();
    const cells = [];
    for (let i=startDow-1; i>=0; i--) cells.push({d: prevDim-i, outside: true, y: cursor.m===0?cursor.y-1:cursor.y, m: cursor.m===0?11:cursor.m-1});
    for (let d=1; d<=dim; d++) cells.push({d, outside:false, y:cursor.y, m:cursor.m});
    while (cells.length % 7 !== 0 || cells.length < 42) cells.push({d: cells.length - startDow - dim + 1, outside:true, y: cursor.m===11?cursor.y+1:cursor.y, m: cursor.m===11?0:cursor.m+1});
    return cells.slice(0,42);
  };

  return (
    <div>
      <h2 className="section-title">📅 Calendario</h2>
      <div className="tabs">
        <div className={`tab ${view==='month'?'active':''}`} onClick={()=>setView('month')}>Mes</div>
        <div className={`tab ${view==='year'?'active':''}`} onClick={()=>setView('year')}>Años</div>
      </div>

      {view === 'month' && (
        <div style={{display:'grid', gridTemplateColumns:'1fr 220px', gap:10}}>
          <div>
            <div className="cal-nav">
              <button className="btn sm" onClick={()=>setCursor(cursor.m===0 ? {y:cursor.y-1,m:11} : {y:cursor.y,m:cursor.m-1})}>◀</button>
              <span style={{fontSize:14, fontWeight:700}}>{meses[cursor.m]} {cursor.y}</span>
              <button className="btn sm" onClick={()=>setCursor(cursor.m===11 ? {y:cursor.y+1,m:0} : {y:cursor.y,m:cursor.m+1})}>▶</button>
            </div>
            <div className="cal-grid">
              {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map((d, i) => (
                <div key={d} className={`cal-dow ${i>=5?'weekend':''}`}>{d}</div>
              ))}
              {monthGrid().map((c, i) => {
                const key = `${c.y}-${String(c.m+1).padStart(2,'0')}-${String(c.d).padStart(2,'0')}`;
                const isToday = today.getFullYear()===c.y && today.getMonth()===c.m && today.getDate()===c.d;
                const evs = mergedEvents[key] || [];
                // Sábado=6, domingo=0 → findes en verde
                const dow = new Date(c.y, c.m, c.d).getDay();
                const isWeekend = dow === 0 || dow === 6;
                const isFestivo = window.isDayFestivo(key, festivos, evs);
                return (
                  <div key={i} className={`cal-day ${c.outside?'outside':''} ${isToday?'today':''} ${selected===key?'selected':''} ${isWeekend?'weekend':''} ${isFestivo?'festivo':''}`}
                    style={{flexDirection:'column', padding:2, minHeight:52, alignItems:'stretch', justifyContent:'flex-start'}}
                    onClick={()=>setSelected(key)}>
                    <div style={{fontWeight:isToday?700:500, fontSize:10, textAlign:'right'}}>{c.d}</div>
                    {evs.slice(0,2).map(e => (
                      <div key={e.id} style={{fontSize:8, padding:'1px 3px', margin:'1px 0', borderRadius:2, color:'#fff',
                        background: window.calEventColor(e.color)}}>
                        {e.text.slice(0,18)}
                      </div>
                    ))}
                    {evs.length > 2 && <div style={{fontSize:8, opacity:0.7}}>+{evs.length-2}</div>}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{borderLeft:'1px solid rgba(30,70,130,0.2)', paddingLeft:10}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6}}>
              <div style={{fontWeight:700}}>{selected}</div>
              {/* Botón festivo independiente — toggle sin necesidad de crear evento */}
              <button
                className={`btn sm ${(festivos || []).includes(selected) ? 'green' : ''}`}
                style={{fontSize:10}}
                onClick={() => toggleFestivo(selected)}
                title="Marcar este día como festivo (se pintará verde en todo el calendario)"
              >
                {(festivos || []).includes(selected) ? '✓ Festivo' : '🎉 Festivo'}
              </button>
            </div>
            <div className="add-row" style={{flexDirection:'column', gap:4}}>
              <input placeholder="Evento…" value={draft.text} onChange={e=>setDraft({...draft, text: e.target.value})} onKeyDown={e=>e.key==='Enter'&&addEv()}/>
              <div style={{display:'flex', gap:4, alignItems:'center'}}>
                {['blue','green','red','purple'].map(c => (
                  <div key={c} onClick={()=>setDraft({...draft, color:c})}
                    title={c}
                    style={{width:16, height:16, borderRadius:4, cursor:'pointer',
                      background: window.calEventColor(c),
                      outline: draft.color===c ? '2px solid #0d2a56' : '1px solid rgba(0,0,0,0.3)'}}/>
                ))}
                <button className="btn green sm" onClick={addEv} style={{marginLeft:'auto'}}>+ Añadir</button>
              </div>
            </div>
            <div style={{marginTop:8}}>
              {(mergedEvents[selected] || []).length === 0 && <div className="empty-hint">Sin eventos</div>}
              {(mergedEvents[selected] || []).map(e => (
                <div key={e.id} className="aero-card" style={{padding:'4px 8px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div>
                    <span className="tag" style={{background: window.calEventColor(e.color), color:'#fff', marginRight:4}}> </span>
                    {e.text}
                    {e.readOnly && <span style={{fontSize:9, opacity:0.6, marginLeft:4}}>(FP)</span>}
                  </div>
                  {!e.readOnly && <button className="btn red sm" onClick={()=>delEv(selected, e.id)}>✕</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === 'year' && (
        <div>
          {Array.from({length: 11}, (_,i) => 2025 + i).map(yr => (
            <div key={yr} style={{marginBottom:12}}>
              <div style={{fontWeight:700, fontSize:13, marginBottom:4}}>{yr}</div>
              <div className="year-heat">
                {Array.from({length:12}).map((_, mi) => {
                  const dim = new Date(yr, mi+1, 0).getDate();
                  const startDow = (new Date(yr, mi, 1).getDay() + 6) % 7;
                  const cells = [];
                  for (let i=0; i<startDow; i++) cells.push(null);
                  for (let d=1; d<=dim; d++) cells.push(d);
                  return (
                    <div key={mi} className="month-mini">
                      <h5>{meses[mi].slice(0,3)}</h5>
                      <div className="grid">
                        {cells.map((d,i) => {
                          if (d === null) return <div key={i}/>;
                          const key = `${yr}-${String(mi+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                          const evs = mergedEvents[key] || [];
                          const has = evs.length > 0;
                          const isToday = today.getFullYear()===yr && today.getMonth()===mi && today.getDate()===d;
                          const dow = new Date(yr, mi, d).getDay();
                          const isWeekend = dow === 0 || dow === 6;
                          const isFestivo = window.isDayFestivo(key, festivos, evs);
                          return <div key={i} className={`d ${has?'has':''} ${isToday?'today':''} ${isWeekend?'weekend':''} ${isFestivo?'festivo':''}`} title={key} onClick={()=>{setView('month'); setCursor({y:yr, m:mi}); setSelected(key);}}/>;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

window.Apps = { TareasFPApp, DiarioApp, FinanzasApp, MedicoApp, CalendarioApp };
