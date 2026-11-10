# ESTADO DEL PROYECTO — Portal Cyberpunk TCG España (Arquitectura Multipágina + Deckbuilder + CMS Protegido)

**Fecha de actualización:** 10 de Noviembre de 2026  
**Estado general:** ✅ Portal completo con diseño Cyberpulse, arquitectura multipágina, Constructor de Mazos (Deckbuilder), CMS protegido con autenticación NetWatch, editor HTML de noticias estilo WordPress/Elementor, subida de archivos/imágenes, contador de visitas reales, sección de Top Cartas Más Vendidas (Cardmarket Best Sellers - Singles) y sistema de autorrelleno de metadatos de cartas verificado.

---

## 1. Novedades y Mejoras Implementadas

1. **Subida de Archivos e Imágenes (`/api/upload.js`):**
   - Selector "Examinar archivo..." para subir imágenes locales directamente al servidor (`public/images/uploads/`).
   - Integrado en todos los formularios del CMS (Hero, Noticias, Mazos, Torneos, Cartas Más Vendidas, Histórico).

2. **Editor de Noticias Enriquecido estilo WordPress / Elementor:**
   - Barra de herramientas con soporte para negrita, cursiva, encabezados (`<h2>`, `<h3>`), listas (`<ul>`, `<ol>`, `<li>`), citas (`<blockquote>`), enlaces e imágenes.
   - Soporte para separador de extracto `<!--more-->` ("Leer más") con vista previa instantánea.
   - Modal de lectura completa con estilos Cyberpunk dedicados.

3. **Portada (Hero) Avanzada:**
   - Imagen destacada de fondo estilo WordPress con degradado Cyberpulse.
   - Cajas de metadatos configurables (Categoría, Palabras clave, Formato/Set).
   - Cálculo automático de minutos de lectura (~200 palabras/min).
   - Contador de visitas reales (`viewsCount`) registrado en servidor.

4. **Cartas Más Vendidas // Cardmarket Best Sellers (Solo Singles):**
   - Sustituida la sección de "Arte Alternativo" por el Top 3 de cartas individuales más vendidas según Cardmarket (descartando material sellado).
   - Ficha técnica completa por carta (ID, Tipo y subtipos, Edición/Rareza, Artista y Colección) tanto en tarjeta como en el visor HD.

5. **Autorrelleno de Metadatos de Cartas Oficiales (`src/utils/cardMetadata.js` y `/api/cards.js`):**
   - Al pegar cualquier URL de GitHub de la carta (enlace `github.com/.../blob/...` o `raw.githubusercontent.com/...`), el sistema detecta la carta y autorrellena Nombre, Tipo oficial, Artista, Edición/Rareza e ID de coleccionista.
   - Datos verificados contra las fuentes oficiales (`cyberpunktcg.com`, `cyberpunktcg.gg`, `nightcity.es`).
   - Persistencia de correcciones manuales realizadas desde `/admin` en `src/data/cards.json` para futuros autorrellenos.

---

## 2. Arquitectura de Páginas y Componentes

1. **Inicio (`/` — `src/pages/index.astro`):** Hero destacado, Top Noticias, Top 3 Cartas Más Vendidas Cardmarket, Top Mazos del Meta y Próximos Torneos.
2. **Noticias (`/noticias` — `src/pages/noticias.astro`):** Archivo con ordenación cronológica, filtros por categoría/facción, búsqueda y lector modal completo.
3. **Base de Cartas + Constructor (`/cartas` — `src/pages/cartas.astro`):** Catálogo de cartas con visor modal HD y Deckbuilder con persistencia en `localStorage` y exportación.
4. **Mazos del Meta (`/mazos` — `src/pages/mazos.astro`):** Mazos competitivos con cartas insignia e inspección individual.
5. **Torneos e Histórico (`/torneos` — `src/pages/torneos.astro`):** Calendario de eventos y Hall of Fame de torneos finalizados.
6. **Backend CMS Protegido (`/admin` — `src/pages/admin.astro`):** Panel completo con 8 pestañas de gestión protegidas con cookie de sesión NetWatch.

---

## 3. Próximos Pasos (Fase 1)

1. Continuar ampliando y verificando los tipos y artistas de la base de cartas a medida que la comunidad y bases oficiales liberen nuevos detalles.
2. Añadir filtros por tipo de carta (`Unit`, `Program`, `Gear`, `Legend`) y coste en el explorador de cartas.
3. Conectar la URL definitiva del Foro Discourse una vez desplegado.
4. Preparar configuración y adaptador de despliegue para producción (Node / Cloudflare).
