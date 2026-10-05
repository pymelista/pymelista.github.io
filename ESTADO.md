# ESTADO — PymeLista

Web de contenido para monetizar con Google AdSense. Sitio estático multipágina, Node puro, sin dependencias, en GitHub Pages (`/docs`). Estado a **2026-10-05**.

Carpeta del proyecto: `trabajos/webs/2026-10-04_pymelista/` (dentro del workspace `Trabajo IA/IA_nuevo`).

## Cómo se usa

```bash
node build.js    # genera docs/ (valida contenido, comprueba enlaces y solo escribe si no hay errores)
node serve.js    # previsualiza docs/ en http://localhost:4173
```

## Resumen del estado

| Área | Estado |
|---|---|
| Estructura, plantillas, CSS, JS, `build.js` | Hecho (Parte 1) |
| Análisis de nicho y plan de 30 títulos | Hecho: `NICHO.md`, `PLAN.md` |
| Artículos | **8 publicados** (2 por categoría) |
| Páginas | Sobre, Contacto, Privacidad, Aviso legal y Cookies, **con datos del titular sin rellenar** |
| Publicación | Push hecho; Pages configurado en `main` → `/docs`; **despliegue pendiente por una incidencia de GitHub Actions del 2026-10-05** (ver «Publicación») |
| AdSense / Search Console | Sin configurar (`adsenseId` y `searchConsoleTag` vacíos) |

## Hecho en la Parte 1 (resumen)

- Estructura completa, plantillas, CSS mobile first con modo claro/oscuro, `build.js` con inicio, categorías, artículos, páginas, `sitemap.xml`, `robots.txt`, `feed.xml`, `404.html`, `.nojekyll`.
- SEO en cada página (title, description, canonical, Open Graph, Schema.org: Organization, WebSite, Article, BreadcrumbList, FAQPage si hay FAQ). AdSense y Search Console solo si están rellenos en `config.json`.
- Fuente Newsreader alojada en local, CSS incrustado, imagen social PNG.
- `build.js` genera en memoria y solo escribe `docs/` si no hay errores ni enlaces rotos.

## Hecho en la Parte 2

1. **Borrado el artículo de prueba** y su portada. Nada más de la Parte 1 se ha rehecho.
2. **`NICHO.md`:** por qué el nicho, competencia por categoría (observada en una búsqueda por categoría, con la salvedad de que la herramienta devuelve resultados de EE. UU.), 20 palabras clave sin volúmenes inventados, y CPC/RPM solo como rangos marcados como estimación.
3. **`PLAN.md`:** 30 títulos (≤ 60 caracteres) repartidos en 8 / 8 / 7 / 7, con tipo, pregunta del dueño del negocio y orden sugerido para el lote 2.
4. **8 artículos** (900–1.500 palabras, respuesta en el primer párrafo, tabla comparativa, FAQ de 4 preguntas, 2–3 enlaces internos, fuentes oficiales enlazadas y «datos a fecha de octubre de 2026», portada SVG propia):

| Categoría | Artículo |
|---|---|
| Crear tu web | Wix, Squarespace o WordPress.com: cuál elegir |
| Crear tu web | WordPress.com o WordPress.org: cuál te conviene |
| Tienda online | Shopify, WooCommerce o PrestaShop: cuál elegir |
| Tienda online | Stripe o PayPal: comisiones para cobrar en tu tienda |
| Marketing y email | Mailchimp, Brevo o MailerLite: cuál te conviene |
| Marketing y email | Buffer o Metricool: cuál elegir para tus redes |
| Gestión del negocio | Trello, Asana o Notion: cuál usar en tu negocio |
| Gestión del negocio | Calendly, Cal.com o Fresha: reservas online para tu negocio |

5. **5 páginas:** Sobre PymeLista (proyecto independiente, contenido elaborado con IA y contrastado con fuentes oficiales, sin equipo ni pruebas inventados), Contacto (`mailto:[EMAIL]`), Política de privacidad, Aviso legal y Política de cookies (mencionan Google AdSense y sus cookies). Dejan sin rellenar `[TITULAR]`, `[NIF]`, `[DIRECCIÓN]` y `[EMAIL]`.
6. **Ajustes mínimos en `build.js`:** avisos si el título supera 60 caracteres o la descripción 155; la etiqueta `<title>` no pasa de 60; las tablas van en un contenedor con scroll horizontal accesible (CSS actualizado); aviso permanente al activar AdSense recordando el consentimiento de cookies.
7. **`FUENTES.md` completo:** cada precio, plan, límite y dato legal con su fuente, la fecha y qué es cálculo propio.

## Decisiones tomadas en modo automático (contenido)

- **Tema de los 8 primeros:** comparativas de 2–3 herramientas con datos verificables en su web oficial, evitando temas fiscales o legales (por ejemplo, facturación) para no dar asesoramiento.
- **«Mejor» sin pruebas:** los títulos son «A o B: cuál elegir» y la recomendación se limita a criterios medibles (precio, límites, funciones). No hay valoraciones, estrellas ni «lo hemos probado».
- **Lectura de precios en el navegador integrado**, no con resúmenes automáticos, porque en una prueba el resumen devolvió datos incompletos (Wix) o en otra moneda (WordPress.com).
- **Datos descartados o sin cifra:** precio de PrestaShop Hosted, comisiones de Fresha, precio mensual de Asana, tarifa de Stripe fuera del EEE y Reino Unido, planes gratuitos de Wix (no aparece en su página). Aparecen como «no consta en la página consultada» o no aparecen.
- **Monedas:** Trello, Buffer, Calendly y Cal.com se citan en dólares tal como las muestran sus páginas; no se convierten.
- **Dato dudoso no usado:** «500 contactos incluido» en la calculadora de Brevo Starter (ver `FUENTES.md`).
- **Textos legales:** redactados como plantilla informativa para este sitio a partir de las fuentes de `FUENTES.md`. No están revisados por un profesional. No incluyen datos registrales (el Aviso legal no pide más que los cuatro marcadores indicados).
- **Políticas de privacidad y cookies escritas para el estado actual** (sin anuncios, sin cookies de terceros) **y para cuando se active AdSense**, con la promesa de pedir consentimiento antes de instalar cookies publicitarias. Esa promesa obliga a implantar el consentimiento antes de activar `adsenseId`.
- **Fecha de los artículos:** 2026-10-04 (día de la comprobación de datos). Páginas legales: 2026-10-05.
- **Repositorio público con toda la documentación** (`ESTADO.md`, `NICHO.md`, `PLAN.md`, `FUENTES.md`): se ha quitado cualquier ruta del equipo local. Si prefieres que la estrategia no sea pública, añade esos archivos a `.gitignore` y a `git rm --cached`.

## Verificación

- **Lighthouse 13.5.0** (móvil y escritorio, contra `node serve.js` en local): **100 / 100 / 100 / 100** (rendimiento, accesibilidad, buenas prácticas, SEO) en inicio, categoría, artículo con tablas y página legal (móvil) y en artículo (escritorio). Medido sin compresión; no es una medición en producción.
- **Calidad de los 8 artículos (script):** palabras entre 945 y 1.163 (rango pedido: 900–1.500), título ≤ 60, descripción ≤ 155, FAQ de 4, 2–3 enlaces internos, tabla, frase «datos a fecha de octubre de 2026», sin frases prohibidas («hemos probado», estrellas, testimonios…), sin frases repetidas entre artículos.
- **Enlaces:** el build comprueba todos los enlaces y anclas internos (0 rotos). Los 26 enlaces externos responden 200. Sitemap (18 URLs) y feed (8 artículos) son XML válido y todas las URL del sitemap existen en `docs/`.
- **Móvil:** las 19 páginas se cargaron a 375 px de ancho sin desbordamiento horizontal.
- **No disponible:** la skill `playwright-mcp` no existe en este equipo, así que la revisión se ha hecho con el navegador integrado, Lighthouse y scripts. No se ha pasado el JSON-LD por la herramienta de resultados enriquecidos de Google.

## Riesgos y cosas que debes saber

1. **Condiciones de GitHub Pages.** Según los términos de GitHub, Pages está pensado «principalmente como escaparate de proyectos personales y de organizaciones» y no se permite usarlo como alojamiento gratuito para negocios online ni webs dirigidas principalmente a transacciones comerciales; admiten donaciones y crowdfunding como monetización. **No mencionan la publicidad.** Un sitio con AdSense es zona gris y GitHub podría retirarlo. Si te preocupa, consulta al soporte de GitHub antes de activar anuncios. `docs/` es una web estática, así que migrar a otro alojamiento estático es simple.
2. **Marcadores sin rellenar, visibles en el sitio público.** `[TITULAR]`, `[NIF]`, `[DIRECCIÓN]` y `[EMAIL]` aparecen tal cual en Aviso legal, Privacidad, Cookies y Contacto (con `mailto:[EMAIL]`, que no funciona). Rellénalos en esos cuatro archivos de `paginas/` y vuelve a ejecutar `node build.js`.
3. **Consentimiento de cookies (CMP).** Google exige una CMP certificada para anuncios personalizados en el EEE y Reino Unido. El sitio no la tiene. No actives `adsenseId` hasta implantarla; el build avisa mientras `adsenseId` esté relleno.
4. **Aprobación de AdSense.** Google puede rechazar sitios con poco contenido original o de poco valor, y su política de spam alcanza al contenido masivo hecho con IA sin valor añadido. Con 8 artículos, sin tráfico y con datos legales sin rellenar, el riesgo es alto. `NICHO.md` y `PLAN.md` proponen ampliar antes.
5. **Los datos caducan.** Revisa los 8 artículos cada trimestre (fecha de la próxima revisión sugerida: enero de 2027): cambia las cifras, la fecha de la comprobación y el campo `actualizado`.
6. **`ads.txt`** solo funciona en la raíz de un dominio. `pymelista.github.io` es un sitio de usuario (raíz), así que sirve; con otro nombre o un sitio de proyecto no.
7. **Email de las confirmaciones git.** Los commits usan `pymelista@users.noreply.github.com` para no publicar un correo personal.

## Publicación

- **Cuenta:** `pymelista` (indicada por el usuario). **Repositorio:** `pymelista.github.io` (público, creado por el usuario, vacío).
- **URL del sitio:** https://pymelista.github.io (ya puesta en `config.json`; el build se ejecutó con ella).
- **Git:** repositorio local creado (rama `main`, `.gitignore`, primer commit `57c13c8`) y **push hecho el 2026-10-05**. Se comprobó por la API pública de GitHub que el remoto contiene los 87 archivos, incluida `docs/`.
- **GitHub Pages:** el propietario lo configuró en **main → /docs** (no se puede ver ni cambiar desde aquí: `gh` no está instalado y el navegador integrado no tiene sesión de GitHub).
- **Incidencia del 2026-10-05 (la web mostraba el README):**
  - Los dos primeros despliegues (18:51 y 18:52 UTC) se hicieron desde la raíz del repositorio con Jekyll, antes de cambiar el origen a `/docs`, y por eso la web mostró el README.
  - Se comprobó que `docs/index.html` y `docs/.nojekyll` están en el remoto, que `.gitignore` no excluye nada de `docs/` y que `node build.js` regenera `docs/` sin cambios.
  - Los despliegues posteriores (el lanzado al cambiar el ajuste y el del commit vacío `f48ae31`) **no llegaron a ejecutarse**: el trabajo `build` esperó 15 minutos sin ejecutor y se canceló, y lo mismo el siguiente. Coincide con una incidencia de GitHub Actions («delays when assigning GitHub-hosted runners», abierta desde las 19:11 UTC y aún sin resolver a las 19:50). No es un fallo del repositorio.
  - Cada push cancela el despliegue en cola, así que no conviene empujar varias veces seguidas mientras dure la incidencia.
  - Estado del sitio: pendiente de un despliegue correcto. Para reintentar sin crear commits: en https://github.com/pymelista/pymelista.github.io/actions abre el último «pages build and deployment» y pulsa **Re-run all jobs**.
- Autoría de los commits: `PymeLista <pymelista@users.noreply.github.com>` (configuración local del repositorio, no global).

## Pasos para configurar GitHub Pages (clic a clic)

Ya están hechos por el propietario; se dejan por si hay que repetirlos. `gh` (GitHub CLI) no está instalado en este equipo, por eso es manual:

1. Entra en https://github.com/pymelista/pymelista.github.io con tu sesión.
2. Pulsa **Settings** (pestaña de la derecha, arriba).
3. En el menú lateral izquierdo, pulsa **Pages**.
4. En **Build and deployment → Source**, elige **Deploy from a branch**.
5. En **Branch**, elige **main** y, en el desplegable de al lado, **/docs**. Pulsa **Save**.
6. Espera uno o dos minutos y recarga. Arriba aparecerá «Your site is live at https://pymelista.github.io/».
7. Abre esa dirección y comprueba el inicio, un artículo y `/sitemap.xml`.

## Pendiente

- Activar Pages (arriba) y comprobar el sitio en producción.
- Rellenar `[TITULAR]`, `[NIF]`, `[DIRECCIÓN]` y `[EMAIL]` y, si el titular está inscrito en un registro público, añadir sus datos registrales al Aviso legal.
- Revisión de las páginas legales por un profesional.
- Dar de alta Search Console y poner `searchConsoleTag` en `config.json`.
- Ampliar el catálogo con `PLAN.md` (orden sugerido del lote 2 al final de ese archivo) y llegar a una veintena de artículos revisados antes de solicitar AdSense.
- Implantar la CMP antes de poner `adsenseId`; actualizar entonces las políticas de cookies y privacidad.
- Paginar inicio y categorías cuando haya muchos artículos.
- Ejecutar un script para rasterizar portadas a PNG si quieres imagen social propia por artículo (hoy todas usan `og-default.png`).

## Cómo escribir contenido

Cada artículo es un `.html` en `contenido/` (el archivo se llama como el `slug`):

```html
<!--meta
{
  "titulo": "…", "slug": "…", "descripcion": "70–155 caracteres", "categoria": "crear-tu-web",
  "fecha": "AAAA-MM-DD", "actualizado": "AAAA-MM-DD", "portada": "archivo.svg"
}
-->
<p>Cuerpo en HTML. No lleves <h1>: lo pone la plantilla.</p>
<h2>…</h2>
```

- `categoria`: el slug de `config.json` (`crear-tu-web`, `tienda-online`, `marketing-y-email`, `gestion-del-negocio`).
- `portada`: archivo SVG en `assets/img/`. Si falta, se usa `cat-<categoria>.svg`.
- Enlaces internos: `href="articulo:slug"` y `href="pagina:slug"`; el build falla si no existen.
- FAQ: un `<h2>Preguntas frecuentes</h2>` con pares `<h3>` + párrafos genera el `FAQPage`.
- URL de artículo: `/<categoria>/<slug>/`. Las páginas de `paginas/` viven en `/<slug>/` (metadatos: titulo, slug, descripcion; opcionales actualizado, menu, noindex).
- Categorías sin artículos se publican con `noindex` y fuera del sitemap hasta tener contenido.
