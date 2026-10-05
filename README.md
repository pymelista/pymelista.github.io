# PymeLista

Guías claras sobre software y herramientas online para autónomos y pequeños negocios en España. Sitio estático en Node puro, sin dependencias.

- **Publicado en:** https://pymelista.github.io (GitHub Pages, rama `main`, carpeta `/docs`).
- **Generar el sitio:** `node build.js` lee `config.json`, `contenido/`, `paginas/`, `plantillas/` y `assets/`, y escribe `docs/`.
- **Previsualizar:** `node serve.js` y abre http://localhost:4173.
- **Escribir un artículo:** un `.html` en `contenido/` con `<!--meta { ... } -->` (titulo, slug, descripcion, categoria, fecha, actualizado, portada) y el cuerpo en HTML.
- **Enlaces internos:** `href="articulo:slug"` o `href="pagina:slug"`; el build los resuelve y falla si no existen.
- **Datos con precio:** solo de la web oficial de cada herramienta, con fecha; cada comprobación se anota en `FUENTES.md`.
- **Plan editorial:** `NICHO.md` (análisis) y `PLAN.md` (30 títulos). Estado y pendientes: `ESTADO.md`.
- **Antes de activar AdSense:** rellenar los datos legales `[TITULAR]`, `[NIF]`, `[DIRECCIÓN]` y `[EMAIL]` e implantar el consentimiento de cookies (ver `ESTADO.md`).
