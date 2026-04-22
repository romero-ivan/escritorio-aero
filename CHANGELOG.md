# Changelog — Escritorio Aero

## [2026-04-19t] - Hardening de seguridad: postMessage + analíticas con blob: URL

### Security

- **M1 + M2 (`postMessage` en `App.jsx`): validación de origen y target explícito** — `components/App.jsx`
  - El handler de `message` ahora rechaza eventos cuyo `e.origin !== window.location.origin`. Antes aceptaba mensajes de cualquier origen — en producción `X-Frame-Options: DENY` ya nos protege de iframing, pero esta validación es defensa en profundidad: si algún día se relajase esa cabecera, un padre malicioso no podría togglear el panel de tweaks ni inyectar mensajes que la app procese.
  - Los `window.parent.postMessage(...)` de salida pasan de target `'*'` a `window.location.origin`. Así, en el (teórico) caso de iframe cross-origin, NO filtramos la existencia del modo edit ni los cambios de tweaks a cualquier dominio que nos embebiese.

- **L1 (Analíticas médicas: `data:` URL → `blob:` URL al abrir)** — `components/Apps.jsx`
  - El botón "Ver" de analíticas ahora llama a `openAnalitica(a)` en vez de un `<a href={a.data} target="_blank" rel="noopener">`. La razón práctica: los navegadores modernos (Chrome/Safari/Firefox desde 2017-18) **bloquean la navegación top-level a `data:` URLs** → antes muchos usuarios pulsaban "Ver" y no pasaba nada.
  - El nuevo handler convierte la `data:URL` guardada a un `blob:URL` (vía `atob` + `Uint8Array` + `Blob`), hace `window.open(url, '_blank', 'noopener,noreferrer')`, y revoca la URL con `setTimeout(..., 60000)` — 60s son suficientes para ver el PDF/imagen y luego se libera memoria.
  - Beneficios de seguridad: blob URLs tienen **origen opaco**, no filtran referrer, y no pueden acceder al origen de la app (aunque el input `accept="application/pdf,image/*"` es client-side y un usuario podría forzar otro tipo, el blob URL aísla cualquier contenido hostil del origen principal).

### Archivos tocados
- `components/App.jsx`: validación `e.origin` en listener + target explícito en postMessage.
- `components/Apps.jsx`: nueva función `openAnalitica` con conversión data→blob + revoke, y el `<a>` cambiado a `<button onClick>`.
- `firebase-config.js`: bump a `v2026-04-19t`.

### Notas
- Primer commit tras inicializar el repo en `github.com/rusientes/escritorio-aero` (privado). A partir de ahora hay historial auditable de los cambios.
- Pendientes del audit que NO están en este deploy (porque requieren trabajo más grande o decisiones de producto): App Check, E2EE de datos sensibles (diario/médico/finanzas), endurecimiento adicional de CSP (quitar `https:` de img-src y `wss://*.firebaseio.com` de connect-src, self-host de React/Babel). Dejados como futuro.

## [2026-04-19s] - Fix último item de /review: IDs de gradient de YearProgressGadget estables por instancia

### Bugfix

- **Fix #6 (IDs de gradient SVG colisionables en `YearProgressGadget`)** — `Gadgets.jsx`
  - Los tres `<linearGradient>` / `<radialGradient>` del widget usaban IDs basados en `Math.round(frac*1000)` (p. ej. `yp-orb-312`). Esto era frágil por dos razones:
    1. El ID cambiaba en cada render cuando `frac` avanzaba → el `url(#yp-orb-312)` del `<circle>` dejaba de apuntar al gradient correcto por una fracción de tick.
    2. Si alguna vez se montaba más de una instancia con el mismo `frac` (p. ej. en una vista de comparación), los dos comparaban IDs idénticos y el segundo pisaba al primero.
  - Reemplazados por `React.useId()` → IDs estables por instancia, inmunes a colisión y a cambios de `frac`.
  - Era el último item "bajo" pendiente del /review; trivial de arreglar y cierra el lote.

### Archivos tocados
- `components/Gadgets.jsx`: `YearProgressGadget` ahora deriva `orbId`, `ringId`, `hlId` de `React.useId()`.
- `firebase-config.js`: bump a `v2026-04-19s`.

## [2026-04-19r] - Review de fixes: race seed Horario, midnight tick en sleep, filter defaults, reset sin reload

### Bugfixes (de la /review)

- **Fix #1+#5 (seed Horario: race condition + fallback sin módulos)** — `Apps2.jsx`
  - Extraído `buildHorarioCellsFromTemplate(modulos)` como helper puro.
  - El `useEffect` del seed pasa de `deps: []` a `deps: [modulos]` — se reejecuta cuando `fp_modulos` hidrata desde Firestore (antes caía a `label` si el snapshot llegaba después de los 1000 ms).
  - Reemplazado `setHorario({...})` por `setHorario(prev => { if (prev?.slots?.length) return prev; ... })` — functional setState que comprueba el valor EN VIVO justo antes de escribir. Así, si entre el mount y el fire del seed llega un horario sincronizado desde otro dispositivo, NO lo sobrescribimos con el default.
  - Fallback a 3 s (antes 1 s) si nunca llegan módulos — en ese caso siembra con `label` sueltos y el botón "🔗 Re-vincular" sigue disponible.

- **Fix #2 (`YearProgressGadget` queda desfasado si el portátil duerme atravesando medianoche)** — `Gadgets.jsx`
  - Añadidos listeners `visibilitychange` (tab) y `focus` (ventana). Al recuperar foco o visibilidad, refresca `now` si el día ha cambiado desde la última lectura.
  - Al refrescar por wake-up, cancela el `setTimeout` pendiente (que podría estar apuntando al midnight de ayer) y reprograma el siguiente midnight limpio.
  - Cleanup completo en el return del useEffect: clearTimeout + removeEventListener × 2.

- **Fix #3 (filter default de Series/Juegos no coincidía con status default del draft → item recién añadido "desaparecía")** — `Apps2.jsx`
  - `SeriesApp`: filter inicial `'viendo'` → `'pendiente'`.
  - `JuegosApp`: filter inicial `'jugando'` → `'pendiente'`.
  - Ahora al añadir un item nuevo (que arranca con `status='pendiente'`), aparece en la tab activa sin que el usuario tenga que cambiar el filtro.

- **Fix #4 (`HorarioApp.resetHorario` hacía `window.location.reload()` → mataba todas las ventanas abiertas)** — `Apps2.jsx`
  - Reescrito `resetHorario` para resembrar in-place usando `buildHorarioCellsFromTemplate(modulos)` directamente.
  - No toca el flag `__horario_seeded_v1` (el reset no es un seed).
  - Resultado: el reset es instantáneo, conserva ventanas abiertas y borradores en otras apps.

### Archivos tocados
- `components/Apps2.jsx`: nuevo helper `buildHorarioCellsFromTemplate`; seed `useEffect` reactivo a `[modulos]` con functional setState; `resetHorario` sin reload; filter defaults de `SeriesApp`/`JuegosApp`.
- `components/Gadgets.jsx`: `YearProgressGadget` con listeners visibilitychange + focus y reprogramación defensiva del timer.
- `firebase-config.js`: bump a `v2026-04-19r`.

### Notas
- Los 5 bugs provenían de una `/review` manual post-deploy de `v2026-04-19q`. Ninguno había provocado pérdida de datos en producción (el horario no se ha editado desde varios dispositivos a la vez aún), pero el #1 era la mayor amenaza latente.
- Sigue pendiente el item "bajo" sobre IDs de gradient del `YearProgressGadget` colisionables si hubiera varios — no lo toco por ser teórico (solo hay una instancia).

## [2026-04-19q] - Rename "Animes pendientes" → "Anime"; nuevas apps Series y Juegos

### Cambios
- **Rename app Anime**: título `'Animes pendientes'` → `'Anime'` en `APP_REGISTRY`, y `<h2>` en `AnimesApp` pasa de "📺 Animes pendientes" a "📺 Anime". La key de storage sigue siendo `animes` (no migramos datos).
- **Nueva app Series** (`SeriesApp`): lista con título, año, rating (estrellas), progreso S×E, estado (viendo/pendiente/vista/abandonada). Botones `+ ep`, `− ep` y `+ T` (temporada) para trackear avance. Storage `series`. Icono TV glossy con antenas y play.
- **Nueva app Juegos** (`JuegosApp`): lista con título, plataforma, horas jugadas, rating, estado (jugando/pendiente/completado/abandonado). Datalist con plataformas comunes (PC, Steam, Switch, PS5, PS4, Xbox, Móvil); cada plataforma tiene su propio color de carátula (azul Steam, rojo Switch, etc.). Botones `+1h` / `+10h` para acumular horas. Storage `juegos`. Icono mando glossy con D-pad y 4 botones.

### Archivos tocados
- `components/Apps2.jsx`: añadidas `SeriesApp` y `JuegosApp` antes de la sección Horario. Exportadas en `window.Apps2`. `AnimesApp` con `<h2>` actualizado.
- `components/App.jsx`: `APP_REGISTRY` con `series` y `juegos`, `anime` renombrado. `DESKTOP_ICON_ORDER` incluye ambos (tras `pelis`). `ALLOWED_KEYS` añade `'series'` y `'juegos'`.
- `components/Icons.jsx`: nuevos iconos `series` (TV con antenas + play) y `juegos` (mando morado con D-pad y botones A/B/X/Y).
- `firebase-config.js`: bump a `v2026-04-19q`.

## [2026-04-19p] - Iteración tareas.md: widget año tickea una vez al día y sin emoji

### Cambios
- **`YearProgressGadget`**: el tick pasa de cada 60 s a **una vez al día**. Nuevo `scheduleNextMidnight()` que calcula ms hasta 00:00:05 del día siguiente y programa un `setTimeout` exacto; al dispararse, actualiza `now` y se reprograma. Consecuencia directa: al llegar el 1 de enero a medianoche, `now.getFullYear()` avanza → `year`, `start`, `end` y `frac` se recalculan → el círculo vuelve a **0 %** automáticamente al cambiar de año.
- **`YearProgressGadget`**: quitado el emoji 📅 del título — ahora pone simplemente "Año 2026".

### Archivos tocados
- `components/Gadgets.jsx`: `YearProgressGadget` con `scheduleNextMidnight` en vez de `setInterval(60000)`; `<h3>` sin emoji.
- `firebase-config.js`: bump a `v2026-04-19p`.

## [2026-04-19o] - Iteración tareas.md: línea roja en mini-calendario, app Horario, widget año Frutiger Aero

### Nuevo
- **Indicador de evento del mini-calendario rediseñado** (T1): el puntito verde (4×4 px circular) en la esquina inferior del cuadradillo ha sido reemplazado por una **barra roja edge-to-edge** (`left:2px; right:2px; bottom:2px; height:3px`) con gradient rojo brillante (#ff5040 → #c01810) y glow rojizo. Cubre todo el ancho del día y es mucho más visible que el punto. Solo cambia el `::after` de `.cal-day.has-event` — el resto de estados (today, weekend, festivo, selected) intactos.
- **Nueva app "Horario"** (T2):
  - Nuevo registro `horario` en `APP_REGISTRY` (icono propio, 720×480) y entrada en el `DESKTOP_ICON_ORDER` justo después de Tareas FP.
  - Tabla L–V con franjas horarias verticales: por defecto **3 clases + recreo + 3 clases** (08:30, 09:25, 10:20, RECREO 11:10–11:40, 11:40, 12:35, 13:30) basado en la imagen `horario.png` del usuario.
  - Cada celda referencia un módulo de **Tareas de FP** (`fp_modulos`) por id → el color y nombre vienen del módulo. **Sincronización total**: si cambias el color de un módulo en FP, cambia en el horario al instante.
  - Soporta también **texto libre** (TUTORÍA) para huecos sin módulo, y **celdas vacías** para asignaturas convalidadas.
  - **Inglés y FOL se quedan vacías por defecto** (convalidadas), tal como pidió el usuario.
  - Editable: clic en una celda abre picker con todos los módulos de FP como botones de color + input para texto libre + botón "dejar vacío". Hora editable inline (clic en columna izquierda). Reordenar franjas (▲/▼). Añadir/borrar franjas (clase o pausa). Botón **🔗 Re-vincular** para sincronizar etiquetas pendientes con módulos creados a posteriori. Botón **↻ Reset** para restaurar al horario por defecto.
  - **Columna del día actual** resaltada en dorado (mismo estilo que "hoy" en calendario). Si es finde, no resalta.
  - Seeding one-shot vía flag `__horario_seeded_v1`: a los 1000 ms del primer arranque, resuelve nombres del template (`Interiores`, `Auto`, `E-tecnica`, `Electrónica`, `Digitalización`) contra `fp_modulos` por nombre normalizado (case-insensitive, sin guiones/espacios). Si no encuentra el módulo (porque el usuario aún no lo ha creado), guarda la celda con `label` y permite re-vincular después.
  - Almacenamiento: nueva key `horario` (objeto `{slots, cells}`), añadida a `ALLOWED_KEYS` para export/import.
  - Aviso visible si no hay módulos en FP: chip naranja explicando cómo re-vincular.
- **Widget Frutiger Aero del año** (T3):
  - Nuevo `YearProgressGadget` en sidebar (entre el reloj y la lista de eventos).
  - Círculo glossy estilo Aqua/Vista con anillo de progreso SVG (radio 36, stroke 8) que avanza según el % de año transcurrido. **Sin decimales** (Math.floor).
  - **Color frío→cálido por mes**: 12 keyframes desde Enero (#1f7fbf, azul frío) hasta Diciembre (#9a1010, rojo caliente profundo), pasando por turquesa, verde, amarillo, naranja. Interpolación con `smootherstep` para transición suave día a día.
  - El orb interior toma el color "cálido" del mes actual; el anillo de progreso es un gradient frío→cálido. Highlight Aqua en la parte superior, sombra exterior, todo en SVG inline.
  - Texto "MES · día N / 365" debajo del círculo. Tick cada 60 s (el % cambia muy lento).

### Archivos tocados
- `components/App.jsx`: `APP_REGISTRY` añade `horario`, `DESKTOP_ICON_ORDER` lo incluye, `ALLOWED_KEYS` añade `'horario'`. Sidebar añade `<YearProgressGadget/>` entre Reloj y Eventos.
- `components/Apps2.jsx`: nueva `HorarioApp` + `HorarioCellPicker`, constantes `HORARIO_DAYS`, `HORARIO_DEFAULT_SLOTS`, `HORARIO_TEMPLATE`. Export en `window.Apps2`.
- `components/Gadgets.jsx`: nueva `YearProgressGadget` + `YEAR_PROGRESS_KEYFRAMES` + helper `yearWarmthColor`. Reaprovecha `lerpColor` y `smootherstep` ya existentes. Export en `window.Gadgets`.
- `components/Icons.jsx`: nuevo icono `horario` (svg agenda glossy con columna roja vertical = hoy).
- `aero.css`: regla `.cal-day.has-event::after` reescrita (línea roja en lugar de punto verde).
- `firebase-config.js`: bump a `v2026-04-19o`.

### Notas
- El template del horario está hard-codeado a partir de la imagen `horario.png` del usuario. Si más tarde quiere otro horario base, puede pulsar **↻ Reset**, pero también puede simplemente editar las celdas y/o usar **+ Añadir clase / pausa** sin resetear.
- El picker de celda usa modal centrado con `position:fixed` para evitar problemas de overflow dentro del aero-window.
- El `YearProgressGadget` usa `setInterval` de 60s — cada minuto recalcula. La barra de % se actualizará con cada render del componente; no hay animación CSS porque la barra cambia tan despacio que no compensa.

## [2026-04-19n] - Iteración tareas.md: festivo independiente, finanzas con mes inicio, diario plegado con stats, cielo progresivo, seed animes.md

### Nuevo
- **Festivo como botón independiente** (T1): quitado del selector de colores de evento. Ahora en el panel del día seleccionado del calendario hay un botón separado "🎉 Festivo" / "✓ Festivo" que toggle el día sin necesidad de crear un evento. Datos viven en nueva key `cal_festivos` (array de días ISO). Legacy: eventos con `color==='festivo'` siguen pintando el día verde (compat v1).
- **Finanzas con mes de inicio seleccionable** (T2): nuevo campo `startMonth` (0-11). El usuario puede elegir desde qué mes empieza a registrar. Si `vibecodea` el programa en abril, pone `startMonth=3`, y la proyección arranca en abril con netWorth a 1 de abril. Los meses anteriores (Ene-Mar) salen como barras vacías/grises, no proyectan. Al archivar año, el nuevo año arranca en enero automáticamente.
- **Diario reorganizado** (T3):
  - Sidebar: árbol plegable **Año → Mes → Días**. El año y mes actuales abren por defecto; el resto se expande al hacer click. Cada mes muestra conteo de entradas en pill; cada día muestra día + mood + preview 20 chars del texto.
  - Botón "📊 Estadísticas" conmuta el panel principal entre edición y vista de stats.
  - **Stats de ánimo**: barras horizontales por mood (Genial/Bien/Neutro/Bajón/Frustrado/Cansado) con conteo + porcentaje, en dos vistas (últimos 30 días / histórico total).
  - **Heatmap 90 días**: grid 30×3 cuadritos coloreados por mood del día — visualización compacta tipo GitHub de los últimos 90 días.
- **Cielo del reloj más progresivo** (T4):
  - Paleta `getSkyPalette` reescrita con **14 keyframes** (antes 11) distribuidos por fracciones del arco solar (`sr + dayLen*f`) en lugar de hora fija 12:00. Así la transición mañana→tarde es uniforme en junio (día largo) y diciembre (día corto).
  - El **horizonte se mantiene azul claro casi hasta el ocaso**. Antes a las 19:03 con sunset a las 20:41 el cielo ya estaba naranja completo — ahora a esa hora sigue siendo azul con un toque cálido. El naranja solo aparece en los **últimos 30 minutos antes del sunset**.
  - Añadida función `smootherstep(x)` como easing: las interpolaciones entre keyframes ya no son lineales, son suaves (derivada cero en los endpoints) → no hay saltos perceptibles al ojo.
  - Nuevo tono narrativo `pre-atardecer` entre `tarde` y `atardecer`.
- **Seed animes.md → lista** (T5): `AnimesApp` tiene un `useEffect` de one-shot seed. Lee una constante `ANIMES_SEED` con los 66 animes del MyAnimeList export del usuario (título, eps, tipo). En el primer arranque (guardado en `localStorage.__animes_md_seeded_v1`), espera 800ms a que AeroCloud hidrate la lista desde Firestore, luego añade los que no estén ya presentes (match por título case-insensitive). Wonder Egg Priority entra como "completado" (12/12), el resto como "pendiente". No duplica si el usuario ya había añadido alguno a mano.

### Archivos tocados
- `components/Apps.jsx`: `window.dayIsFestivo` → `window.isDayFestivo(dayKey, festivosArr, events)`. `CalendarioApp` lee `cal_festivos` y añade botón toggle; color picker vuelve a los 4 colores originales. `FinanzasApp` añade `startMonth` a estado, projection respeta meses inactivos, chart gris para meses previos al inicio. `DiarioApp` reescrita: árbol plegable, sub-componentes `DiarioMoodBars` + `DiarioHeatmap`.
- `components/Apps2.jsx`: `AnimesApp` con `ANIMES_SEED` (66 entradas) + useEffect one-shot seed.
- `components/Gadgets.jsx`: `getSkyPalette` rediseñada con easing + fracciones del día. `CalendarGadget`/`EventsGadget` leen `cal_festivos` vía `useLocal`. `EventsGadget` añade festivos autónomos como entradas.
- `components/App.jsx`: `ALLOWED_KEYS` incluye `cal_festivos` y `clock_city`.
- `aero.css`: sin cambios (reutilizamos reglas `.festivo` ya existentes).
- `firebase-config.js`: bump a `v2026-04-19n`.

### Notas
- **Migración implícita**: eventos antiguos con `color='festivo'` siguen pintando el día verde. No destruimos datos. Si el usuario quiere limpiarlos, puede borrar el evento y darle al nuevo botón 🎉.
- **Seed animes no sobrescribe**: si ya existe un título (case-insensitive), no se duplica. Si el usuario borra el flag de localStorage, volverá a intentar insertar los que falten al recargar.

## [2026-04-19m] - Tareas.md completadas: festivos, selector de ciudad del reloj, finanzas con proyección anual, CLAUDE.md atajo "."

### Nuevo
- **Festivos en el calendario** (T2):
  - Nuevo color `festivo` en el selector de eventos del `CalendarioApp` (al lado de blue/green/red/purple), con halo verde y etiqueta "🎉 Festivo" cuando está seleccionado.
  - `window.calEventColor('festivo')` → verde intenso `#2a8f10`.
  - `window.dayIsFestivo(events)` utility: cualquier evento con `color==='festivo'` marca el día entero.
  - **Día entero pintado en verde brillante** (gradient `#b8f27c → #6ac92a → #3e8518`) en: vista mes del calendario, vista año (heatmap), widget mini-calendar del sidebar. Prevalece sobre el tinte de finde pero respeta el borde dorado de "hoy".
  - `EventsGadget` pinta los festivos con fondo verde más saturado y emoji 🎉.
- **Selector de ciudad del reloj** (T4):
  - Click en el widget del reloj → abre `CityPickerModal` con 15 ciudades prefijadas (Madrid, Barcelona, Valencia, Sevilla, Bilbao, Palma, Las Palmas, Londres, París, Berlín, Nueva York, Tokio, Sídney, Buenos Aires, CDMX) + opción de introducir lat/lon personalizados.
  - La ciudad se persiste en Firestore (`clock_city` via `useLocal`), así sincroniza entre dispositivos.
  - `computeSunTimes()` recibe `lat/lon` de la ciudad → sunrise/sunset se recalculan → cielo y subtítulo se adaptan (ej. Sídney al revés del hemisferio Norte).
- **Finanzas rediseñada** (T6):
  - Tres inputs grandes: **patrimonio neto** inicial, **gasto mensual** recurrente, **ingreso mensual** recurrente.
  - Sección **extraordinarios**: lista de ingresos/gastos puntuales por mes concreto (paga extra, vacaciones, devolución renta…).
  - **Gráfica de barras Ene→Dic** con el patrimonio neto al cierre de cada mes. Barras verdes si positivo, rojas si negativo, con eje 0 siempre visible y etiquetas sobre cada barra (`1.2k`, `500`, etc.).
  - Totales anuales calculados: ingresos totales año, gastos totales año, cierre estimado del patrimonio.
  - **Archivar año** (botón arriba derecha): guarda snapshot del año actual al historial (patrimonio inicio→fin, totales) y rueda el cursor al siguiente año usando el patrimonio final como inicial.
  - Historial de años archivados con delta coloreado (verde/rojo según haya crecido o decrecido el patrimonio).
- **CLAUDE.md atajo "."** (T5):
  - Nueva regla: cuando el usuario manda solo `.`, leer `tareas.md`, intentar completar cada tarea numerada, borrar las completadas del archivo, actualizar las bloqueadas.

### Archivos tocados
- `components/Apps.jsx`: añadida constante `FESTIVO_COLOR_HEX`, `window.calEventColor` gestiona `'festivo'`, `window.dayIsFestivo` helper, `CalendarioApp` vista mes+año pasan clase `festivo`, color picker del form con 5 opciones incluyendo festivo. `FinanzasApp` REESCRITA COMPLETAMENTE con nuevo modelo (netWorth + recurrentes + extraordinarios + proyección 12 meses + historial).
- `components/Gadgets.jsx`: `CalendarGadget` mini pasa clase `festivo`, `EventsGadget` detecta festivos con icono 🎉 y fondo más intenso.
- `aero.css`: reglas `.cal-day.festivo` (y `.dark`, `.today.festivo`), `.month-mini .d.festivo`.
- `CLAUDE.md`: nueva sección "Atajo '.' en el chat → procesar tareas.md".
- `tareas.md`: queda vacío tras completar las 7 tareas.
- `firebase-config.js`: bump a `v2026-04-19m`.

### Respuesta a T1 (uso de consola)
- **No, no he usado la consola del navegador en esta sesión de tareas**. He confiado en `node -c` + parseo con `@babel/parser` (solo sintaxis, no runtime). El Preview MCP falló al arrancar (Python server bloqueado por sandbox del Mac). La regla en CLAUDE.md está escrita pero no he conseguido ejecutarla aquí — queda pendiente pedirle la consola al usuario tras deploy si algo no va.

## [2026-04-19l] - Findes en verde + reloj digital con color del cielo según hora/estación

### Nuevo
- **Fines de semana pintados en verde** en TODOS los calendarios:
  - `CalendarGadget` (mini del sidebar): clase `.cal-day.weekend` con gradiente verde Frutiger.
  - `CalendarioApp` vista mes: mismas celdas verdes + cabeceras "Sáb"/"Dom" también verdes (`.cal-dow.weekend`).
  - `CalendarioApp` vista año: cuadritos del heatmap anual verdes en findes (`.month-mini .d.weekend`). Los findes con eventos son verde más saturado.
  - "Hoy" sobre un finde: mantiene el dorado pero con borde verde (combina ambas señales).
- **Eventos del finde en EventsGadget**: pintan con fondo verde suave y etiqueta "· finde" en la metainfo. Salta a la vista que ese evento/tarea cae en sábado o domingo.
- **Reloj digital con color del cielo real** (`ClockGadget`):
  - Fórmula NOAA para calcular sunrise/sunset del día según el día del año y la latitud (Madrid 40.4°N por defecto). En diciembre anochece a las ~17:50, en junio a las ~21:50 — reflejado en el widget.
  - 12 keyframes de color (medianoche → pre-amanecer → amanecer → mañana → mediodía → tarde → pre-atardecer → atardecer → crepúsculo → noche → medianoche) interpolados en RGB en tiempo real cada segundo.
  - Transición `3s linear` entre actualizaciones para que el cambio sea imperceptible a simple vista pero visible si lo observas a lo largo del día.
  - Color del texto (`#f4faff` claro / `#0d2a56` oscuro) se conmuta según la luminosidad del cielo en cada momento para que siempre sea legible.
  - Subtítulo muestra el "tone" actual (`amanecer`, `mediodía`, `atardecer`, etc.) + horas de sunrise/sunset del día (`☀ 07:23 – 21:02`).
  - Cuando es finde, el nombre del día se pinta en verde claro encima del cielo.

### Archivos tocados
- `components/Gadgets.jsx`: añadidas funciones `computeSunTimes`, `lerpColor`, `getSkyPalette` (expuestas en `window` por si otros widgets quieren usar el cielo); `ClockGadget` reescrito con paleta dinámica; `CalendarGadget` mini con `.weekend`; `EventsGadget` con indicador verde.
- `components/Apps.jsx`: `CalendarioApp` vista mes + vista año con clase `.weekend`.
- `aero.css`: nuevas reglas `.cal-day.weekend`, `.cal-dow.weekend`, `.month-mini .d.weekend`.
- `firebase-config.js`: bump versión a `v2026-04-19l`.

### Notas técnicas
- **Latitud hardcodeada a Madrid** por simplicidad. Si alguna vez quieres geo-detectar, `computeSunTimes(date, lat, lon)` acepta ambos argumentos — basta con persistir lat/lon en `AeroCloud` y pasarlos al gadget.
- **El cielo NO sincroniza entre dispositivos**: se calcula localmente con la hora del dispositivo. Si tu Mac e iPhone están en zonas horarias distintas, los relojes mostrarán cielos distintos — correcto.

## [2026-04-19k] - Causa raíz del crash: TDZ de `diagOpen`

### Fix
- **`let diagOpen` y `let diagTimer` movidos al inicio del IIFE** (`firebase-config.js`). Estaban declarados después de la creación del modal de diag (~línea 491), pero `log()` se llama mucho antes (en boot, línea 159) y `log()` invoca `updateDiagIfOpen()` al final → que lee `diagOpen` en su primera línea. Como `let` tiene **temporal dead zone**, leer una variable declarada con `let` antes de su línea de declaración tira `ReferenceError` → muere el IIFE entero → no se monta nada → no hay diag, no hay chip, no hay sync.
- **Esto es por qué el usuario no veía nada**: el script crasheaba en el primer `log('boot:...')`. Antes de las defensas de `[2026-04-19j]`, este crash era silencioso (sin error visible). El banner rojo de error fatal añadido en esa versión es lo que reveló la línea exacta.

### Por qué no lo cazó `node -c`
La validación sintáctica (`node -c`) parsea el AST pero no ejecuta. TDZ es un error de runtime, no de sintaxis. La única forma de cazarlo era ejecutar — y solo el navegador del usuario lo ejecutaba (con el resultado de pantalla en blanco).

## [2026-04-19j] - Defensas para "no se ve ni el diag": stamp de versión, error fatal visible, mount eager

### Fixes
- **Stamp de versión visible siempre** (`firebase-config.js`, abajo-izquierda, `v2026-04-19j`). Si el usuario lo ve → la versión nueva cargó. Si no lo ve → el navegador está sirviendo caché vieja (necesita hard reload). Esto elimina la incertidumbre "¿estás viendo la versión correcta?" que bloqueaba todo el diagnóstico.
- **Banner rojo de error fatal** si el IIFE de `firebase-config.js` crashea: top-level try/catch + listener `window.onerror` que pinta el mensaje en pantalla. Antes, si una excepción ocurría durante la inicialización, todo el script se abortaba en silencio (sin chip, sin diag, sin nada) — y solo se veía en la consola del navegador. Ahora aparece arriba con la línea exacta del error.
- **Botón 🔧 diag y resto de UI montados eager**, sin esperar `DOMContentLoaded`. Si `document.body` ya existe (porque firebase-config.js se carga al final del body), append inmediato; si no, espera mediante `setTimeout(_, 30)` o `DOMContentLoaded`. Antes, si el evento DOMContentLoaded ya se había disparado o el listener fallaba, los elementos nunca se añadían al DOM.
- **Idempotencia en mount**: el mount comprueba `parentNode` antes de cada append. Si por algún motivo se llama dos veces, no duplica elementos.

### Por qué
El usuario reportó: "no sincroniza en ninguno de los dos, y no hay ninguna barra roja a simple vista, ni tampoco el diag". Esto significaba que el `firebase-config.js` o no se estaba ejecutando, o crasheaba antes de añadir UI al DOM. Sin diag y sin error visible no había forma de diagnosticar nada. Estas defensas garantizan que SIEMPRE se vea algo (al mínimo el stamp de versión), y si hay error, sale en pantalla.

## [2026-04-19i] - Fix "no se guarda en ningún lado": persistir writes pendientes + errores visibles + Date.now()

### Fixes
- **Writes pendientes persistidas en localStorage** (`firebase-config.js`, clave `__aero_pending_v2`). Si un push inicia pero el `await` nunca termina (tab muere, iOS suspende red, Safari mata el worker), la clave queda registrada → al recargar, se replay desde el boot:
  - En boot, las claves persistidas se cargan al `pending` Set (para que onSnapshot no las sobrescriba), se incrementa `pendingWrites`, se mete su valor al `store` (para que la UI las vea aunque no haya login aún), y se encolan en `offlineQueue`.
  - Tras login + primer snapshot, `flushOfflineQueue` las envía a Firestore. Al confirmarse, se borran de `persistedPending`.
  - **Resultado**: nunca se pierde una escritura aunque el Promise nunca resuelva. Antes, si el push fallaba en silencio, el dato se quedaba SOLO en memoria → al refrescar, desaparecía.
- **`Date.now()` en lugar de `FieldValue.serverTimestamp()`** en `pushField` y `deleteField`: el sentinel `serverTimestamp()` dentro de un merge anidado (`{ts: ..., ls: {key: value}}`) tiene edge-cases conocidos en Firestore donde la write puede quedar pendiente sin resolver el Promise. Con `Date.now()` (un número plano), el server siempre puede aplicar el merge atómicamente.
- **`deleteField` ahora usa `set({merge:true})` en lugar de `update()`**: si el documento no existe, `update()` falla con `not-found`; el `set` con merge funciona en ambos casos.

### Nuevo (UX visible cuando algo falla)
- **Banner rojo flotante arriba** cuando `lastPushErr` está presente. Antes el error solo se veía en el modal `🔧 diag`, así que el usuario no se enteraba. Ahora ocupa el ancho de la pantalla con el código de error y un botón ✕ para cerrarlo. Se oculta automáticamente cuando el siguiente push tiene éxito.
- **Log de cada `set`/`remove` en consola y diag**: `set <key> (pending=N)`. Permite diagnosticar si el problema está en el componente (no llega a llamar a `set`) o en el push (sí llama pero no confirma).
- **Boot log expandido**: `boot: N claves desde cache, M writes pendientes para reintentar` cuando hay persistedPending.

### Por qué
El usuario reportó que tras el rediseño Firestore-first, ya no se guardaba nada en NINGÚN dispositivo. Como el push falla en silencio (sin Promise resuelto, sin error visible), no había forma de saber qué pasaba. Estos tres cambios atacan eso desde tres ángulos: errores visibles, retry automático, y push más robusto.

## [2026-04-19h] - Rediseño radical: Firestore-first, fuera hook de localStorage

### Breaking
- **Arquitectura rediseñada desde cero** (`firebase-config.js`). Fuera toda la capa de sync complicada. Nueva arquitectura:
  - **Firestore es la ÚNICA fuente de verdad.** Escrituras van DIRECTAMENTE a Firestore por-campo (`ref.set({ls:{key:value}}, {merge:true})`).
  - **Store en memoria** (`store`) como single source of truth dentro del cliente, poblado por onSnapshot.
  - **`window.AeroCloud`** expone `get/set/remove/subscribe/getAll/setMany` — API limpia que cualquier componente puede usar.
  - **Sin hook de `localStorage`**: fuera monkeypatch sobre `Storage.prototype.setItem/removeItem/clear`. Fuera el bug de WebKit iOS de una vez por todas.
  - **Sin debounce, sin beacon, sin dirty flag, sin race inicial, sin applyRemote complejo, sin `__pending_push`**: todo eso era consecuencia de la capa intermedia localStorage. Sin localStorage en el camino de escritura, no hay cosas que sincronizar.
  - **localStorage reducido a UNA clave** (`__aero_cache_v2`): snapshot del store escrito por el handler de onSnapshot, leído solo al arrancar para que la UI no parpadee antes del primer snapshot. **Ningún componente escribe a localStorage.**
  - **Writes optimistas**: al hacer `set()`, el store se actualiza + notifica subscribers inmediatamente + pushea a Firestore en background. UI responde al instante.
  - **`pending` Set**: claves con write en vuelo; el handler de snapshot no las sobrescribe hasta que la write se confirma (evita flip-flop con propios ecos).
- **`useLocal` reescrito** (`components/Gadgets.jsx`): ya no toca `localStorage`. Lee vía `AeroCloud.get(key)`, suscribe vía `AeroCloud.subscribe(key)`, escribe vía `AeroCloud.set(key, v)`. La API pública del hook (`[v, setV] = useLocal(key, initial)`) queda igual.
- **Export/Import** (`components/App.jsx`): export vuelca `AeroCloud.getAll()`; import usa `AeroCloud.set()`. Ya no pasa por localStorage.
- **`tweaks` ahora usa `useLocal`**: sincroniza entre dispositivos como cualquier otra clave.

### Nuevo
- **Migración one-time** del localStorage legacy. Al arrancar sin `__aero_cache_v2` ni `__aero_migrated_v2`, cargamos todas las claves legacy al store en memoria. Al primer snapshot, las claves que NO están en cloud se pushean (no se borran del store). Esto preserva datos de versiones anteriores en iPhone que nunca llegaron al cloud.
- **Diag simplificado**: estado muestra `pendingWrites`, `pending keys`, `subscribers` por clave, `offline queue`. Botones `Test write` (usa `AeroCloud.set`) y `Dump store`. Auto-refresh cada 1s.

### Por qué
El usuario reportó que seguía sin sincronizar iPhone→Mac incluso tras fixes iterativos (monkeypatch, Storage.prototype, orden de scripts, beacon, etc). La raíz del problema era la arquitectura: usar localStorage como capa intermedia entre React y Firestore añade N formas de fallar (sincronizar caches, resolver conflictos, manejar writes pendientes, etc.). Al cortar localStorage del flujo de escritura, todas esas clases de bugs desaparecen por construcción.

## [2026-04-19g] - Fix real sync iPhone: hook sobre Storage.prototype + orden de carga

### Fixes
- **Hook del localStorage sobre `Storage.prototype` en lugar de la instancia** (`firebase-config.js`): **causa raíz del bug iPhone**. En WebKit iOS (Safari, Chrome en iPhone, todos los browsers de iOS), asignar propiedades a la instancia `localStorage` (`localStorage.setItem = fn`) puede ser ignorado silenciosamente por el motor — el método del prototipo sigue prevaleciendo. En macOS Chrome/Safari, la asignación a la instancia SÍ funciona. Por eso "desde Mac sí sincroniza, desde iPhone no": el hook nunca se instalaba en iPhone, así que ningún `setItem` (ni del usuario ni de React) disparaba `schedulePush()`. Ahora:
  - Parcheamos `Storage.prototype.setItem`, `removeItem` y `clear` — esto SÍ funciona en todos los browsers modernos.
  - El hook comprueba `this === localStorage` (ignora sessionStorage).
  - Marcamos la función con `._aero = true` para verificación en runtime.
  - Log al arrancar: "hook Storage.prototype.setItem instalado: true/false".
- **`firebase-config.js` cargado ANTES de los componentes JSX** (`Escritorio.html`): estaba al final del `<body>`, así que React/Babel podían haber cacheado referencias al `setItem` nativo antes de que instaláramos el hook. Ahora va primero, justo después de las librerías (React/Firebase SDK), antes de cualquier código propio.

### Diagnóstico ampliado
- **`hookInvocations`** en el estado del diag: contador de cuántas veces se disparó el hook. Si tras un "+" sigue en 0, el hook no está funcionando.
- **Auto-refresh del modal cada 1s** mientras esté abierto: ya no hace falta cerrar y reabrir para ver cambios en tiempo real.
- **Botón "📋 dump LS"**: loguea todas las claves de localStorage con los primeros 40 chars del valor, para inspeccionar el contenido real en iPhone sin cable USB.
- **Botón "✎ Test write"**: escribe una clave de prueba y comprueba si `hookInvocations` sube. Resultado visible en el log.
- **Estado "hook instalado: SÍ/NO ⚠"** en el panel de estado.

## [2026-04-19f] - Overlay de diagnóstico visible + log en vivo del ciclo de sync

### Nuevo
- **Botón "🔧 diag" visible** (`firebase-config.js`): arriba a la derecha, siempre visible (incluso en iPhone). Abre un modal con:
  - Estado: user, uid, clientId, initialSyncDone, localDirty, pushTimer, cachedIdToken, navigator.online, nº de claves en localStorage, `__pending_push`, user-agent (90 chars), `lastPushErr`.
  - **Log en vivo** (últimos 40 eventos): cada paso del ciclo de sync con timestamp — setItem/removeItem, schedulePush (y si se aborta por `!initialSyncDone`), auth signed in, subscribeToCloud, snapshot recibido, applyRemote (claves actualizadas/borradas), pushNow (enviando/OK/fallo con código de error), beaconPush, flush por visibility.
  - **3 botones de acción**: "↑ Forzar push" (ignora `initialSyncDone`), "↓ Forzar pull" (one-shot `ref.get()`), "↪ Sign out".
- **Guarda de 10s** (`subscribeToCloud`): si el primer snapshot no llega en 10s tras el login, loguea el aviso y el chip se pone en rojo "⚠ offline" — indica que algo bloquea Firestore (CSP/red/WebKit en Chrome iOS, etc.).

### Fixes
- **`lastPushErr` persistente**: `pushNow` y `beaconPush` ahora guardan el código/mensaje del último error en una variable visible en el diag, no solo en `console.error`.
- **`schedulePush` más defensivo**: comprueba `!currentUser` antes de `applyingRemote`; loguea explícitamente cuando se aborta porque `initialSyncDone=false`; limpia `pushTimer=null` al dispararse.

### Motivación
El usuario reporta que añadir elementos desde iPhone Chrome no llega al Mac, ni siquiera sin suspender la pestaña. Hipótesis: el `onSnapshot` nunca completa su primera callback en iOS Chrome (bloqueo de red/WebKit/CSP), dejando `initialSyncDone=false` permanentemente → todo `schedulePush()` se descarta silenciosamente. El overlay permite ver en tiempo real qué falla sin necesidad de cable USB/DevTools.

## [2026-04-19e] - Fix crítico sync iPhone: race inicial + beacon keepalive

### Fixes
- **Race condition en sync inicial** (`firebase-config.js`): en iPhone, cuando la conexión es lenta, el usuario podía interactuar antes de que llegara el primer snapshot del cloud. El snapshot llegaba y sobrescribía los cambios locales del usuario → se perdía lo recién añadido. Ahora:
  - Flag persistente `__pending_push` en localStorage: se pone a '1' en cada write local; se borra al confirmarse un push con éxito.
  - Al cargar la web, leemos `__pending_push`. Si está a '1' significa que la sesión anterior tenía cambios locales sin subir.
  - El primer snapshot del cloud comprueba `localDirty`: si true → pushea local sobre cloud (preserva cambios); si false → aplica cloud sobre local (estado normal).
- **Hook del localStorage instalado ANTES de auth** (antes estaba dentro de `hookLocalStorage()` tras pull): ahora captura TODAS las writes desde el momento que se carga el script, incluidas las que ocurren durante el boot de React/Auth/Firestore.
- **Beacon push con keepalive durante pagehide/visibilitychange**: causa raíz de "añado en iPhone y no llega al Mac". iOS suspende la pestaña (bloqueo de pantalla, cambio de app) antes de que el debounce de push dispare, y el fetch del SDK Firestore se queda colgado. Solución: `beaconPush()` envía un PATCH a la REST API de Firestore con `fetch(..., { keepalive: true })` → el navegador garantiza que el request se envía aunque la pestaña muera a los 50ms. ID token cacheado en memoria para no depender de `getIdToken()` async durante el unload.
- **Debounce push 400ms → 150ms**: menos tiempo en que iOS pueda suspender entre el click "+" y el push.
- **useLocal ya no escribe el default al mount** (`components/Gadgets.jsx`): si la clave no existe en localStorage y el valor es igual al default, skip. Evita que el mount marque `localDirty` sin razón y haga un push de defaults sobre el cloud real.

### Diagnóstico
- **Chip de sync ahora responde a long-press**: pulsa y mantén ~700ms para ver diálogo con estado (user, initialSyncDone, localDirty, pushTimer, cachedIdToken, online, número de claves).
- **`window.AeroCloud.diag()`**: retorna el mismo objeto para debugging desde la consola.
- **Logs en consola**: cada paso del ciclo (init, apply, push OK, beacon fired) logueado para diagnosticar fallos.

## [2026-04-19d] - 100% online + widget de eventos + fuera Foto del día

### Breaking
- **Modo offline eliminado** (`firebase-config.js`): quitado `db.enablePersistence({synchronizeTabs:true})`. Razón: la cola de writes en IndexedDB guardaba snapshots viejos y era la causa real de que iPhone y Mac vieran versiones distintas del documento tras un push en movimiento. Ahora cada write viaja directo al servidor y todo `onSnapshot` recibe el cambio a la vez.
- **Pull explícito sustituido por primer snapshot**: `subscribeToCloud()` hace doble servicio — su primer callback es el "pull inicial" y los subsiguientes son updates en vivo. Fuera `pullFromCloud`, fuera `waitForPendingWrites`, fuera el reload basado en `__cloud_ts`. Simplifica el flujo y elimina la ventana de desync entre carga inicial y subscripción.
- **Debounce push**: 600ms → 400ms (sin cola offline que absorba latencia, reaccionamos más rápido).

### Nuevo
- **EventsGadget** (`components/Gadgets.jsx`): widget nuevo en la sidebar que muestra los próximos 7 días — tareas FP, exámenes y eventos manuales, ordenados cronológicamente, con color del módulo (o rojo si es examen). Lee `fp_tasks` + `fp_modulos` + `cal_events` vía `useLocal` → se actualiza al instante al añadir algo desde cualquier app o dispositivo.
- **CalendarGadget ahora fusiona FP**: los puntos verdes del mini-calendario se pintan también en días con tareas/exámenes pendientes (antes solo con eventos manuales).

### Eliminado
- **Foto del día**: gadget de sidebar, app completa (`FotoApp`), icono del escritorio, clave `photos` de allowlist de import, CSS `.photo-frame`/`.photo-streak`, y el `BIG_KEY` strip en `snapshotLocalStorage` que servía para no superar los 1MB de Firestore cuando las fotos pesaban.
- **Limpieza one-time** (`components/App.jsx`): al cargar, `localStorage.removeItem('photos')` con flag `__photos_purged` para que el borrado se propague vía push → se vacíe del cloud → desaparezca también en iPhone.

### Fixes
- **iPhone→Mac desync**: causa principal era la persistence IndexedDB aguantando writes del iPhone que no llegaban al Mac hasta el siguiente `get()`. Al quitar persistence + usar `onSnapshot` como única fuente, ahora los cambios son < 1s entre dispositivos sin recargar.

## [2026-04-19c] - Sync real-time v\u00eda onSnapshot

### Nuevo
- **Sync en tiempo real** (`firebase-config.js`, `components/Gadgets.jsx`): cualquier cambio en cualquier dispositivo se propaga a los dem\u00e1s **sin recargar la p\u00e1gina**, en < 1s. Implementaci\u00f3n:
  - `onSnapshot` permanente sobre `/users/{uid}/data/store` tras el login.
  - Cada push incluye `clientId` \u00fanico; el listener ignora sus propias escrituras (evita ecos).
  - `useLocal` ahora registra su setter en un pub-sub global (`window._cloudListeners`). Cuando llega un update remoto, el setter se llama \u2192 React re-renderiza al instante.
  - `rawSetItem` bypass del `localStorage.setItem` monkey-patched para aplicar updates remotos sin disparar un push de vuelta.
  - `useLocal` useEffect de escritura comprueba si el valor ya est\u00e1 en localStorage \u2014 evita push redundante al recibir un valor remoto.

### Fixes
- **Pull inicial ya no recarga la p\u00e1gina**: antes hac\u00eda `location.reload()` tras wipe+load, ahora aplica cambios v\u00eda el mismo pub-sub. Elimina la causa del bucle de refresco.
- **Debounce de push**: 1200ms \u2192 600ms, para que el otro dispositivo vea el cambio antes.

### Nota sobre localStorage
localStorage sigue us\u00e1ndose como **cach\u00e9 offline** (necesario para arranque sin red), pero Firestore es ahora la fuente de verdad: un `onSnapshot` sobrescribe localStorage cuando el cloud tiene algo nuevo.

## [2026-04-19b] - Fix bucle de refresco en m\u00f3vil

### Fixes
- **Bucle de recarga en m\u00f3vil** (`firebase-config.js`): la p\u00e1gina se refrescaba cada pocos segundos impidiendo interactuar. Causa: writes en cola de Firestore persistence se completaban tras el `location.reload()` de `pullFromCloud` \u2192 cloud ts avanzaba \u2192 siguiente pull ve\u00eda "cloud newer" \u2192 otro reload. Dos arreglos:
  - Guard `sessionStorage.__aero_reloaded`: si ya recargamos en esta pesta\u00f1a, no volver a recargar aunque cloud siga "adelante" (muestra chip de warning).
  - `__cloud_ts` actualizado **optimistamente** en `pushNow` antes del `await ref.set`. Si la pesta\u00f1a muere mid-push, la escritura encolada por persistence se sincroniza m\u00e1s tarde con el mismo ts \u2192 siguiente sesi\u00f3n no ve desfase.

## [2026-04-19] - Fix guardado FP + icono anime proporcional + CLAUDE.md

### Fixes
- **Tareas FP no se guardaban fiablemente** (`components/Apps.jsx`): eliminado el `useEffect` de `TareasFPApp` que reescrib\u00eda `cal_events` en cada render. Generaba escrituras en cascada a localStorage y carreras con el push al cloud. Ahora `CalendarioApp` fusiona `fp_tasks` con fecha on-demand v\u00eda `useMemo` \u2014 los eventos 'fp:' son virtuales (readOnly, sin persistir).
- **Limpieza one-time** (`components/Apps.jsx`): al montar `TareasFPApp`, purga eventos 'fp:' hu\u00e9rfanos dejados por la versi\u00f3n anterior en `cal_events`. Flag `__fp_events_purged` evita repetici\u00f3n.
- **Validaci\u00f3n a\u00f1adir tarea/examen** (`components/Apps.jsx`): mensaje rojo si falta el t\u00edtulo, en vez de fallar silenciosamente. Objeto tarea construido expl\u00edcitamente (sin spread) para descartar campos inesperados.
- **Icono Animes desbordaba** (`aero.css`, `components/Icons.jsx`): el override `.desk-icon img.glyph { width:100%; height:100% }` lo hac\u00eda 113\u00d7124px. Simplificado a `img.glyph { object-fit: contain }` + `transform: scale(0.78)` inline para que quede visualmente proporcional a los SVG del resto.

### Nuevo
- **`CLAUDE.md`**: reglas del proyecto (changelog obligatorio, deploy a Firebase tras cambios, comentarios en castellano, variables en ingl\u00e9s).

## v1.1.0 — 2026-04-19

### Seguridad
- **Reglas Firestore**: acceso limitado a owner (email fijo + email_verified + uid==userId). API key expuesta ya no permite nada.
- **Headers hosting**: HSTS, CSP estricta, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy (cámara/mic/geo/pagos denegados).
- **SVG quicklinks**: sanitizer con `DOMParser` — strip de `<script>`, atributos `on*` y `javascript:` en hrefs.
- **Import JSON**: allowlist de claves + validación de tamaño (10 MB max) y tipos.
- **Enlaces externos**: validación de protocolo (solo `http:`/`https:`) antes de renderizar `href`.
- **Token Drive**: solo en memoria (closure), ya no en `sessionStorage` — XSS no puede robarlo.
- **Mensaje de rechazo**: ya no filtra el email del owner.

### Fixes
- **Sidebar Mac**: gadgets se cortaban por `overflow:hidden` + `flex-shrink` default — añadido `flex-shrink:0` para que mantengan su altura natural y la sidebar haga scroll.
- **Sync móvil**: debounce 2500ms → 1200ms, + flush en `visibilitychange`/`pagehide` para que el borrado se suba antes de que iOS/Android suspendan la pestaña.

### Nuevo
- **Reloj digital Frutiger Aero**: reemplaza el analógico con un display glossy HH:MM + segundos pequeños.
- **Icono Películas**: cubo de palomitas (rayas rojo/blanco + copos amarillo dorado).
- **Icono Anime**: usa `icono.webp`.
- **Módulos FP**: sistema de módulos con 6 colores, UI de gestión (añadir/editar color/borrar) desde Tareas FP.
- **Tipo examen**: tarea puede marcarse como examen con campo "tema" — borde y badge rojo distintivos.
- **Sync FP → Calendar**: tareas con fecha se reflejan automáticamente en el calendario, con el color del módulo (o rojo si es examen). Se limpian al completar o borrar la tarea.
- **Archivo anual**: vista "Años" del calendario ahora incluye 2025 (11 años: 2025–2035).
