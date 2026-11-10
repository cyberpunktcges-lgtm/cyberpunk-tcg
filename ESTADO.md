# ESTADO DEL PROYECTO — Portal Cyberpunk TCG España (Arquitectura Multipágina + Deckbuilder + CMS Protegido)

**Fecha de actualización:** 10 de Noviembre de 2026  
**Estado general:** ✅ Diseño visual Cyberpulse multipágina (Mac) fusionado con éxito con el motor y base de datos de cartas/noticias (`src/data/cards.json` y `src/data/cms.json`), Constructor de Mazos integrado, Vitrina de 3 Cartas de Arte Alternativo, Histórico de Torneos y Autenticación en `/admin`.

---

## 0. Fusión de Entornos (Mac + Oficina)
- **Fusión Completada:** Se ha integrado el trabajo visual y la arquitectura multipágina desarrollada en el Mac con el motor de datos remoto (`src/data/cards.json` con las 151 cartas sincronizadas de GitHub y `src/data/cms.json` con las noticias, mazos, torneos, cartas de arte alternativo e histórico de torneos).
- **Dependencias Verificadas:** `npm install` ejecutado y validado sin conflictos.

---

## 1. Arquitectura de Páginas Independientes

1. **Inicio (`/` — `src/pages/index.astro`):**
   - Barra superior con mensaje `Bienvenido a Night City, Edgerunner.` y `Cyberpunk TCG Set One - Welcome to Night City`.
   - **Hero Section** destacada.
   - **Últimas Noticias** con acceso a la hemeroteca completa.
   - **Vitrina de 3 Cartas de Arte Alternativo** elegidas y publicadas desde `/admin` con modal de inspección HD.
   - **Top 3 Mazos del Meta** manteniendo el escáner de carta *Featured* a la derecha.
   - **Próximos Torneos** en formato de avance rápido.

2. **Noticias (`/noticias` — `src/pages/noticias.astro`):**
   - Archivo cronológico de noticias con selector de orden (`MÁS RECIENTES` / `MÁS ANTIGUAS`).
   - Filtros interactivos por **Categoría** (`NOTICIA OFICIAL`, ` SPOILER SET 01`, `ANÁLISIS META`, `TORNEOS`, etc.), por **Facción** y buscador por texto.
   - Lector modal de artículo completo sin perder el filtrado activo.

3. **Base de Cartas + Constructor de Mazos (`/cartas` — `src/pages/cartas.astro`):**
   - Catálogo oficial de **151 cartas** sincronizadas con GitHub (`cyberpunk-tcg-cartas`).
   - Modo **Constructor de Mazos (Deckbuilder)** integrado:
     - Permite añadir hasta 4 copias por carta con un clic sobre el catálogo.
     - Configuración de nombre del mazo y facción principal.
     - Persistencia automática en `localStorage`.
     - Exportación de lista en formato competitivo al portapapeles o descarga directa en `.txt`.

4. **Mazos del Meta (`/mazos` — `src/pages/mazos.astro`):**
   - Clasificación de mazos competitivos actuales manteniendo la estructura de 12 columnas con la **carta Featured interactiva a la derecha**.

5. **Torneos e Histórico (`/torneos` — `src/pages/torneos.astro`):**
   - Calendario de **Próximos Torneos Oficiales**.
   - **Histórico de Torneos y Campeones**: registro de torneos finalizados con ganador (1º), mazo campeón, récord de rondas, podio (2º y 3º puesto), resumen competitivo y carta insignia del mazo ganador.

6. **Foro (Enlace Externo Discourse):**
   - El ítem **Foro** del menú principal enlaza directamente a la URL de Discourse configurable desde `/admin`.

---

## 2. Backend Protegido (`/admin` — `src/pages/admin.astro`)

- **Autenticación NetWatch (`src/utils/auth.js` y `src/pages/api/auth.js`):**
  - Acceso protegido con usuario y contraseña (`admin` / `cyberpunk2077` por defecto, configurable mediante variables de entorno `ADMIN_USER`, `ADMIN_PASSWORD`, `ADMIN_SECRET`) y cookie firmada `HttpOnly`.
- **Pestañas de Administración en `src/components/AdminPanel.jsx`:**
  - `NOTICIAS`: Crear, editar y borrar noticias con categoría y facción.
  - `NOTICIA DESTACADA (HERO)`: Configurar el titular y artículo principal de portada.
  - `ARTE ALTERNATIVO (3)`: Selector visual conectado a las 151 cartas de GitHub para elegir y publicar las 3 cartas de arte alternativo de la portada.
  - `MAZOS`: Gestión de los mazos del meta y sus cartas clave.
  - `TORNEOS`: Gestión de próximos eventos abiertos.
  - `HISTÓRICO TORNEOS`: Publicación de resultados de torneos pasados, podio y mazo ganador.
  - `CARTAS GITHUB`: Sincronización en un clic con el repositorio de cartas.
  - `FORO DISCOURSE`: Configuración en vivo de la URL externa del foro.

---

## 3. Por dónde debemos continuar la Fase 1 mañana

1. **Revisión Visual y Ajustes Finos de Diseño (UI/UX):**
   - Continuar afinando textos, bloques y detalles visuales de cada una de las páginas (`/` Inicio, `/noticias`, `/cartas`, `/mazos`, `/torneos`) según las indicaciones del usuario.
   - Conectar la URL definitiva del **Foro Discourse** en cuanto esté lista.
2. **Contenido Extendido de Noticias y Mazos:**
   - Añadir soporte para cuerpo de artículo completo (`content` / formato enriquecido) al crear noticias en `/admin`, de modo que al abrir una noticia se lea el artículo íntegro además del extracto.
   -Permitir ver y exportar la lista completa de cartas (decklist de 40/50 cartas) tanto en los **Mazos del Meta** (`/mazos`) como en los **Mazos Ganadores del Histórico de Torneos** (`/torneos`).
3. **Atributos Jugables de la Base de Cartas (`src/data/cards.json`):**
   - Ampliar los metadatos de las 151 cartas (coste en Eddies, fuerza, tipo de carta, rareza, palabras clave y habilidad en español) y añadir filtros avanzados por coste/tipo dentro de `/cartas` y del **Constructor de Mazos**.
4. **Preparación para Despliegue SSR (Cloudflare Pages / Node):**
   - Configurar el adaptador oficial de Astro (`@astrojs/cloudflare` o `@astrojs/node`) y las variables de entorno (`ADMIN_USER`, `ADMIN_PASSWORD`, `ADMIN_SECRET`) para producción.

