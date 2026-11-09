# ESTADO DEL PROYECTO — Portal Cyberpunk TCG España (Fase 1)

**Fecha de actualización:** 09 de Noviembre de 2026  
**Estado general:** ✅ Fase 1 (Portada Cyberpulse + Base de Cartas GitHub + Backend CMS) implementada y subida a GitHub.

---

## 1. Resumen de lo Implementado Hoy

### A. Diseño Visual "Cyberpulse eSports + Cyberpunk 2077"
- **Paleta de Colores Oficial:**
  - Fondo principal en Negro Profundo (`#070a10` / `#000000`).
  - Color de marca en Amarillo Cyberpunk (`#FCEE0A`).
  - Acentos y estados interactivos en Rojo Neón (`#FF003C`) y Cian (`#00F0FF`).
- **Geometría Recortada (`clip-path`):**
  - Eliminación total de bordes redondeados (`rounded-none`).
  - Aplicación de esquinas biseladas en diagonal (`polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px))`) en botones, tarjetas de noticias, buscadores, selectores y contenedores principales.
  - Componente `CyberpulseButton` con animación de *glitch* rápido y capas cromáticas al pasar el cursor.
- **Identidad y Assets Locales (`/public/images/`):**
  - Incorporación del logo oficial **Cyberpunk TCG España** (`/images/logo-cyberpunk-tcg-españa.jpg`) en la esquina superior izquierda de la cabecera y en el pie de página.
  - Integración de wallpapers locales de Night City (`/images/wallpapers/`) en el Hero Banner, tarjetas de noticias, banners de mazos y torneos.
- **Menú de Navegación Superior:**
  - Configurado en el orden oficial: **Inicio**, **Noticias**, **Base de Cartas**, **Mazos**, **Torneos** y **Foro**.

### B. Base de Cartas Conectada a GitHub (`cyberpunk-tcg-cartas`)
- Sincronización con el repositorio oficial `https://github.com/cyberpunktcges-lgtm/cyberpunk-tcg-cartas` (**151 cartas `.webp`** indexadas en `src/data/cards.json`).
- **Buscador en Tiempo Real:**
  - Buscador rápido en la cabecera con desplegable instantáneo de resultados y miniaturas.
  - Sección dedicada **Base de Cartas (`#base-de-cartas`)** con filtrado por texto y facción (`TODOS`, `CORPO`, `NETRUNNER`, `BANDAS`, `MERCENARIO`).
  - Visor modal en alta resolución al hacer clic en cualquier carta.

### C. Backend CMS y Panel de Administración (`/admin`)
- Creación de endpoints de servidor en Astro:
  - `src/pages/api/cms.js` (`/api/cms`): CRUD completo persistente sobre `src/data/cms.json`.
  - `src/pages/api/cards.js` (`/api/cards`): Consulta y sincronización en directo con la API de GitHub.
- Creación del **Panel de Control (`/admin`)** (`src/pages/admin.astro` y `src/components/AdminPanel.jsx`) para actualizar sin tocar código:
  - **Noticias** (crear, editar y eliminar).
  - **Noticia Destacada / Hero Banner**.
  - **Mazos del Meta** (con selector visual de cartas conectado a las 151 cartas de GitHub).
  - **Torneos** (crear, editar y eliminar).
  - **Sincronización con GitHub** en un clic.

---

## 2. Qué nos toca hacer en la siguiente sesión (Continuación Fase 1)

1. **Páginas Individuales de Detalle (Rutas Dinámicas):**
   - Crear la vista completa para leer cada **Noticia** (`/noticias/[id]`) con cuerpo de artículo extendido.
   - Crear la vista detallada de cada **Mazo** (`/mazos/[id]`) mostrando la curva de costes, estadísticas completas y lista exportable.
2. **Metadatos Avanzados de las Cartas (Atributos Jugables):**
   - Enriquecer `src/data/cards.json` (y el panel `/admin`) para poder asignar o editar coste en Eddies, fuerza, tipo de carta, rareza y texto de habilidad en español a cada una de las 151 cartas.
3. **Autenticación para el Panel Backend (`/admin`):**
   - Añadir protección por contraseña / sesión de administrador para cuando el portal pase a producción pública.
4. **Sección de Torneos e Inscripciones + Foro:**
   - Añadir formulario o enlace directo de inscripción a cada torneo y desarrollar la vista interactiva del **Foro** de la comunidad.
