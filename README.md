# Escritorio Aero — Mi Escritorio Personal

Un entorno de escritorio web personal, interactivo y altamente personalizable que recupera la estética Frutiger Aero (popular en los años 2000: brillos, burbujas de agua, transparencias de tipo glassmorphism y colores vivos). Está optimizado para rendimiento e integrado con Firebase para almacenamiento persistente y sincronización en tiempo real.

---

## Características

### 1. Interfaz de Escritorio Inmersiva
*   **Ventanas Arrastrables y Ajustables:** Sistema de ventanas flotantes desarrollado con Pointer Events, compatible con pantallas táctiles (iOS/Android) y escritorio.
*   **Personalización Estética:** Ajustes rápidos de desenfoque de ventanas (blur), papel tapiz (incluyendo el paisaje Bliss), tipografías y efectos de partículas de fondo.
*   **Barra de Tareas y Widgets:** Incluye gadgets clásicos en pantalla como un reloj digital y un visualizador rápido de hábitos.

### 2. Aplicaciones Integradas
*   **Diario:** Registro diario de pensamientos con selector visual de estado de ánimo.
*   **Médico:** Seguimiento de medicación activa, recetas con fecha de fin y visor de analíticas en PDF mediante subida de archivos seguros.
*   **Finanzas:** Control de gastos ordinarios y extraordinarios con archivo histórico anual automatizado.
*   **Tareas:** Lista de tareas organizada por módulos, asignaturas o proyectos.
*   **Calendario:** Gestión de eventos personales y días festivos.
*   **Centros de Ocio:** Paneles específicos para trackear lecturas, animes, series de TV, películas, videojuegos favoritos, proyectos personales y enlaces de recursos interesantes.

---

## Arquitectura y Rendimiento

Este proyecto está optimizado para una carga instantánea y alto rendimiento:
*   **Pre-compilación de JSX:** Todos los componentes React se pre-compilan y minifican en un único archivo distributivo usando esbuild.
*   **Caché Inmutable:** El bundle final utiliza direccionamiento por contenido (dist/app.[hash].js) y políticas de caché de Firebase Hosting.
*   **React en Producción:** Se sirven los builds optimizados de producción de React 18.3.1.
*   **Preconnect hints:** Resolución TLS/DNS en paralelo para los servicios de Firebase.

---

## Desarrollo y Despliegue

### Requisitos
*   Tener Node.js instalado.
*   Tener la CLI de Firebase configurada (npm install -g firebase-tools).

### Construcción del proyecto
Para concatenar, pre-compilar y minificar los componentes JSX en el bundle de distribución local:
```bash
chmod +x build.sh
./build.sh
```

### Ejecución Local
Puedes abrir directamente el archivo Escritorio.html en tu navegador para ver la interfaz o iniciar un servidor web local:
```bash
npx firebase serve
```

### Despliegue
Una vez realizados los cambios y compilado el bundle con ./build.sh, despliega a producción en Firebase Hosting:
```bash
firebase deploy --only hosting
```
