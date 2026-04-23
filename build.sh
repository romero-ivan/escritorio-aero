#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# build.sh — Pre-compila todos los componentes JSX a un único bundle
#            minificado que se carga en lugar de los 10 <script type="text/babel">
#            + babel/standalone. Objetivo: subir Lighthouse Performance de 50 a 90+.
#
# Qué hace:
#   1) Concatena todos los .jsx en el orden correcto (el mismo del HTML).
#   2) Los pasa por esbuild con --loader=jsx --minify --target=es2020 → produce
#      dist/app.<hash>.js (hash = primeros 10 chars del sha256 del bundle).
#   3) Regenera dist/app.latest.js (link simbólico/copia) para el HTML.
#   4) Reescribe la etiqueta <script src="dist/app.xxx.js"> en Escritorio.html
#      con el hash nuevo.
#   5) Borra bundles viejos (deja solo los 2 más recientes por si hay rollback).
#
# Salidas:
#   dist/app.<hash>.js  — bundle content-addressed (cache inmutable)
#
# Uso:
#   ./build.sh
#
# Requisitos: node_modules con esbuild instalado (npm i --no-save esbuild).
# -----------------------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -x node_modules/.bin/esbuild ]]; then
  echo "==> esbuild no encontrado, instalando..."
  npm install --no-save --silent esbuild
fi

# Mismo orden que en Escritorio.html (App.jsx al final: hace el render()).
FILES=(
  components/Wallpaper.jsx
  components/Particles.jsx
  components/Window.jsx
  components/Icons.jsx
  components/Gadgets.jsx
  components/Apps.jsx
  components/Apps2.jsx
  components/Taskbar.jsx
  components/Tweaks.jsx
  components/App.jsx
)

mkdir -p dist
TMP=$(mktemp -t escritorio-bundle.XXXXXX.jsx)
trap 'rm -f "$TMP"' EXIT

# Concatenar con separador para que los errores de esbuild den pistas legibles.
for f in "${FILES[@]}"; do
  printf '\n/* ====== %s ====== */\n' "$f" >> "$TMP"
  cat "$f" >> "$TMP"
done

# Compilar + minificar. Target es2020 cubre Safari 14+, Chrome 80+, Firefox 78+
# (>99% de tráfico global en 2026). Sin polyfills, sin transpilación legacy.
# Usamos stdin para poder forzar loader=jsx sin depender de la extensión.
TMPOUT=$(mktemp -t escritorio-out.XXXXXX.js)
node_modules/.bin/esbuild \
  --loader=jsx \
  --minify \
  --target=es2020 \
  --jsx-factory=React.createElement \
  --jsx-fragment=React.Fragment \
  --legal-comments=none \
  --log-level=warning \
  < "$TMP" > "$TMPOUT"

# Hash del contenido para cache-busting inmutable.
HASH=$(shasum -a 256 "$TMPOUT" | awk '{print substr($1,1,10)}')
OUT="dist/app.${HASH}.js"

mv "$TMPOUT" "$OUT"
echo "==> bundle: $OUT ($(wc -c < "$OUT" | tr -d ' ') bytes)"

# Limpieza: conservar solo los 3 bundles más recientes.
ls -t dist/app.*.js 2>/dev/null | tail -n +4 | xargs -r rm -f || true

# Actualizar la referencia en Escritorio.html.
# Busca la línea: <script src="dist/app.XXXX.js"></script>  y la reescribe.
if grep -qE '<script src="dist/app\.[a-f0-9]+\.js"></script>' Escritorio.html; then
  # ya hay tag bundle → sustituir
  sed -i.bak -E "s|<script src=\"dist/app\.[a-f0-9]+\.js\"></script>|<script src=\"${OUT}\"></script>|" Escritorio.html
  rm -f Escritorio.html.bak
  echo "==> Escritorio.html actualizado con referencia a ${OUT}"
else
  echo "==> aviso: no encontré <script src=\"dist/app.*\"> en Escritorio.html (primera vez). Hay que insertar manualmente."
fi

echo "==> listo. Siguiente paso: firebase deploy --only hosting"
