#!/usr/bin/env node
'use strict';

/**
 * Generador de PymeLista. Node puro, sin dependencias.
 *
 *   node build.js
 *
 * Lee config.json, contenido/, paginas/, plantillas/ y assets/, y escribe el sitio en docs/.
 * Si hay errores en el contenido, no toca docs/ (se conserva la versión anterior).
 */

const fs = require('node:fs');
const path = require('node:path');

const RAIZ = __dirname;
const DIR = {
  contenido: path.join(RAIZ, 'contenido'),
  paginas: path.join(RAIZ, 'paginas'),
  plantillas: path.join(RAIZ, 'plantillas'),
  assets: path.join(RAIZ, 'assets'),
  img: path.join(RAIZ, 'assets', 'img'),
  salida: path.join(RAIZ, 'docs'),
};

const PLANTILLAS_NECESARIAS = ['base', 'inicio', 'articulo', 'categoria', 'pagina', '404', 'tarjeta'];
const ORDEN_PIE = ['sobre', 'contacto', 'privacidad', 'aviso-legal', 'cookies'];
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const PALABRAS_POR_MINUTO = 200;
const MAX_FEED = 20;

// ---------------------------------------------------------------- avisos y errores

const errores = [];
const avisos = [];
const error = (m) => errores.push(m);
const aviso = (m) => avisos.push(m);

function terminar() {
  for (const m of avisos) console.warn(`  aviso: ${m}`);
  for (const m of errores) console.error(`  ERROR: ${m}`);
  console.error(`\nBuild cancelado: ${errores.length} error(es). docs/ no se ha modificado.`);
  process.exit(1);
}

// ---------------------------------------------------------------- utilidades

const leer = (p) => fs.readFileSync(p, 'utf8');
const existe = (p) => fs.existsSync(p);

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decodificar = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') {
    const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(n) ? String.fromCodePoint(n) : m;
  }
  return ENTIDADES[e.toLowerCase()] ?? m;
});

const sinEtiquetas = (html) => html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, ' ');
const textoPlano = (html) => decodificar(sinEtiquetas(html)).replace(/\s+/g, ' ').trim();

const slugify = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const fechaValida = (s) => {
  if (!FECHA_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; // descarta 2026-02-31, 2026-13-45…
};
const fechaLarga = (iso) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  .format(new Date(`${iso}T00:00:00Z`));

const json = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');
const plural = (n, uno, varios) => (n === 1 ? `${n} ${uno}` : `${n} ${varios}`);

/** Todo lo generado se acumula en memoria; docs/ solo se toca si el build entero sale bien. */
const SALIDA = new Map();
const escribir = (rel, contenido) => SALIDA.set(rel.split(path.sep).join('/'), contenido);

function agregarEstaticos(sub) {
  const recorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) recorrer(p);
      else escribir(path.relative(RAIZ, p), fs.readFileSync(p));
    }
  };
  const origen = path.join(DIR.assets, sub);
  if (existe(origen)) recorrer(origen);
}

let volcando = false;
function volcarADocs() {
  if (path.dirname(DIR.salida) !== RAIZ || path.basename(DIR.salida) !== 'docs') throw new Error('Ruta de salida inesperada');
  volcando = true;
  // Se vacía el contenido, no la carpeta: en Windows no se puede borrar un directorio que una terminal tiene abierto.
  fs.mkdirSync(DIR.salida, { recursive: true });
  for (const entrada of fs.readdirSync(DIR.salida)) fs.rmSync(path.join(DIR.salida, entrada), { recursive: true, force: true });
  for (const [rel, contenido] of SALIDA) {
    const destino = path.join(DIR.salida, rel);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, contenido);
  }
}

// ---------------------------------------------------------------- configuración

function cargarSitio() {
  let cfg;
  try {
    cfg = JSON.parse(leer(path.join(RAIZ, 'config.json')));
  } catch (e) {
    error(`config.json: ${e.message}`);
    terminar();
  }

  for (const k of ['nombre', 'lema', 'url', 'autor']) {
    if (typeof cfg[k] !== 'string' || !cfg[k].trim()) error(`config.json: falta "${k}"`);
  }

  let url;
  try {
    url = new URL(cfg.url);
  } catch {
    error(`config.json: "url" no es una URL válida (${cfg.url})`);
  }

  const categorias = Array.isArray(cfg.categorias) ? cfg.categorias : [];
  if (!categorias.length) error('config.json: "categorias" debe ser una lista con al menos una categoría');
  const vistas = new Set();
  for (const c of categorias) {
    if (!c || !SLUG_RE.test(c.slug || '') || !c.nombre || !c.descripcion) {
      error(`config.json: cada categoría necesita slug (a-z, 0-9, guiones), nombre y descripcion: ${JSON.stringify(c)}`);
    } else if (vistas.has(c.slug)) {
      error(`config.json: categoría repetida "${c.slug}"`);
    }
    if (c) vistas.add(c.slug);
  }

  // AdSense: acepta "ca-pub-123…" o "pub-123…"
  let adsense = null;
  const idAdsense = (cfg.adsenseId || '').trim();
  if (idAdsense) {
    const m = idAdsense.match(/^(?:ca-)?pub-(\d{10,20})$/);
    if (m) adsense = { cliente: `ca-pub-${m[1]}`, editor: `pub-${m[1]}` };
    else error(`config.json: adsenseId "${idAdsense}" no tiene el formato ca-pub-0000000000000000`);
  }

  // Search Console: acepta el token suelto o la etiqueta <meta> completa pegada tal cual
  let searchConsole = '';
  const bruto = (cfg.searchConsoleTag || '').trim();
  if (bruto) {
    const m = bruto.match(/content\s*=\s*["']([^"']+)["']/i);
    searchConsole = m ? m[1] : bruto;
    if (!/^[A-Za-z0-9_-]+$/.test(searchConsole)) {
      error('config.json: searchConsoleTag no parece un token válido (solo letras, números, _ y -)');
      searchConsole = '';
    }
  }

  if (errores.length) terminar();

  return {
    nombre: cfg.nombre.trim(),
    lema: cfg.lema.trim(),
    descripcion: (cfg.descripcion || cfg.lema).trim(),
    autor: cfg.autor.trim(),
    categorias,
    adsense,
    searchConsole,
    origen: url.origin,
    base: url.pathname.replace(/\/+$/, ''), // '' en la raíz; '/repo' si se publica como sitio de proyecto
  };
}

const SITIO = cargarSitio();
const ruta = (p) => SITIO.base + p;
const absoluta = (p) => SITIO.origen + SITIO.base + p;

// ---------------------------------------------------------------- plantillas

const PLANTILLAS = {};
for (const nombre of PLANTILLAS_NECESARIAS) {
  const archivo = path.join(DIR.plantillas, `${nombre}.html`);
  if (existe(archivo)) PLANTILLAS[nombre] = leer(archivo);
  else error(`plantillas/${nombre}.html no existe`);
}

/** {{x}} escapa HTML; {{{x}}} inserta tal cual. Una variable que falte es un error, no un hueco silencioso. */
function plantilla(nombre, datos) {
  return PLANTILLAS[nombre].replace(/\{\{\{\s*(\w+)\s*\}\}\}|\{\{\s*(\w+)\s*\}\}/g, (_, crudo, texto) => {
    const clave = crudo || texto;
    if (!(clave in datos)) throw new Error(`Plantilla "${nombre}": falta la variable "${clave}"`);
    return crudo ? String(datos[clave]) : esc(datos[clave]);
  });
}

// ---------------------------------------------------------------- lectura de contenido

function cargarDocumentos(dir, carpeta) {
  if (!existe(dir)) return [];
  const docs = [];
  for (const archivo of fs.readdirSync(dir).filter((f) => f.endsWith('.html')).sort()) {
    const donde = `${carpeta}/${archivo}`;
    const crudo = leer(path.join(dir, archivo));
    const m = crudo.match(/<!--\s*meta\b([\s\S]*?)-->/);
    if (!m) { error(`${donde}: falta el bloque <!--meta { ... } -->`); continue; }
    let meta;
    try {
      meta = JSON.parse(m[1]);
    } catch (e) {
      error(`${donde}: el JSON de <!--meta--> no es válido (${e.message})`);
      continue;
    }
    docs.push({ archivo, donde, meta, cuerpo: crudo.replace(m[0], '').trim() });
  }
  return docs;
}

function dimensionesSvg(archivo) {
  const m = leer(archivo).match(/viewBox="\s*[\d.]+[\s,]+[\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/);
  return m ? { ancho: Math.round(+m[1]), alto: Math.round(+m[2]) } : { ancho: 1200, alto: 630 };
}

function resolverPortada(doc, cat) {
  const pedida = doc.meta.portada ? path.basename(String(doc.meta.portada)) : '';
  let archivo = pedida;
  if (pedida && !existe(path.join(DIR.img, pedida))) {
    aviso(`${doc.donde}: la portada "${pedida}" no existe en assets/img; se usa la de la categoría`);
    archivo = '';
  }
  if (!archivo) archivo = `cat-${cat.slug}.svg`;
  if (!existe(path.join(DIR.img, archivo))) {
    error(`${doc.donde}: falta la portada assets/img/${archivo}`);
    return null;
  }
  // Redes sociales no leen SVG: se usa un PNG con el mismo nombre si existe, o la imagen por defecto.
  const png = archivo.replace(/\.svg$/i, '.png');
  const og = existe(path.join(DIR.img, png)) ? png : null;
  return { archivo, og, ...dimensionesSvg(path.join(DIR.img, archivo)) };
}

function validarArticulo(doc) {
  const m = doc.meta;
  const faltan = ['titulo', 'slug', 'descripcion', 'categoria', 'fecha'].filter((k) => !String(m[k] ?? '').trim());
  if (faltan.length) { error(`${doc.donde}: faltan metadatos: ${faltan.join(', ')}`); return null; }

  const titulo = String(m.titulo).trim();
  const slug = String(m.slug).trim();
  const descripcion = String(m.descripcion).trim();
  const fecha = String(m.fecha).trim();
  const actualizado = String(m.actualizado || m.fecha).trim();
  let ok = true;

  if (!SLUG_RE.test(slug)) { error(`${doc.donde}: slug inválido "${slug}" (solo a-z, 0-9 y guiones)`); ok = false; }
  const cat = SITIO.categorias.find((c) => c.slug === m.categoria || c.slug === slugify(m.categoria));
  if (!cat) {
    error(`${doc.donde}: categoría "${m.categoria}" no existe. Válidas: ${SITIO.categorias.map((c) => c.slug).join(', ')}`);
    ok = false;
  }
  for (const [campo, valor] of [['fecha', fecha], ['actualizado', actualizado]]) {
    if (!fechaValida(valor)) { error(`${doc.donde}: "${campo}" debe ser una fecha AAAA-MM-DD válida (es "${valor}")`); ok = false; }
  }
  if (!ok) return null;

  if (actualizado < fecha) aviso(`${doc.donde}: "actualizado" es anterior a "fecha"`);
  if (doc.archivo !== `${slug}.html`) aviso(`${doc.donde}: el archivo debería llamarse ${slug}.html`);
  if (descripcion.length < 70 || descripcion.length > 155) aviso(`${doc.donde}: la descripción mide ${descripcion.length} caracteres (ideal 70–155)`);
  if (titulo.length > 60) aviso(`${doc.donde}: el título mide ${titulo.length} caracteres (máximo 60)`);

  const portada = resolverPortada(doc, cat);
  if (!portada) return null;

  return { doc, titulo, slug, descripcion, fecha, actualizado, cat, portada, ruta: `/${cat.slug}/${slug}/` };
}

function validarPagina(doc) {
  const m = doc.meta;
  const faltan = ['titulo', 'slug', 'descripcion'].filter((k) => !String(m[k] ?? '').trim());
  if (faltan.length) { error(`${doc.donde}: faltan metadatos: ${faltan.join(', ')}`); return null; }
  const slug = String(m.slug).trim();
  if (!SLUG_RE.test(slug)) { error(`${doc.donde}: slug inválido "${slug}"`); return null; }
  if (SITIO.categorias.some((c) => c.slug === slug) || ['assets', '404'].includes(slug)) {
    error(`${doc.donde}: el slug "${slug}" choca con una categoría o carpeta reservada`);
    return null;
  }
  const actualizado = m.actualizado ? String(m.actualizado).trim() : '';
  if (actualizado && !fechaValida(actualizado)) { error(`${doc.donde}: "actualizado" no es una fecha AAAA-MM-DD válida`); return null; }
  return {
    doc, slug, actualizado,
    titulo: String(m.titulo).trim(),
    descripcion: String(m.descripcion).trim(),
    menu: String(m.menu || m.titulo).trim(),
    noindex: m.noindex === true,
    ruta: `/${slug}/`,
  };
}

// ---------------------------------------------------------------- procesado del cuerpo

/** Si hay una sección "Preguntas frecuentes" (H2) con preguntas en H3, la devuelve para el esquema FAQPage. */
function extraerFaq(html) {
  const secciones = html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2[\s>]|$)/gi);
  for (const [, titulo, resto] of secciones) {
    if (!/^(preguntas\s+(frecuentes|habituales)|faq)\b/i.test(textoPlano(titulo))) continue;
    const partes = resto.split(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i);
    const faq = [];
    for (let i = 1; i < partes.length; i += 2) {
      const pregunta = textoPlano(partes[i]);
      const respuesta = textoPlano(partes[i + 1] || '');
      if (pregunta && respuesta) faq.push({ pregunta, respuesta });
    }
    return faq;
  }
  return [];
}

function procesarCuerpo(doc, indice) {
  let html = doc.cuerpo;
  if (/<h1[\s>]/i.test(html)) aviso(`${doc.donde}: el cuerpo no debe llevar <h1>; la plantilla ya pone el título`);

  // Enlaces internos con atajo: href="articulo:slug" y href="pagina:slug"
  html = html.replace(/href=(["'])(articulo|pagina):([^"']*)\1/g, (_, q, tipo, slug) => {
    const destino = (tipo === 'articulo' ? indice.articulos : indice.paginas).get(slug);
    if (!destino) {
      error(`${doc.donde}: enlace a ${tipo} inexistente "${tipo}:${slug}"`);
      return 'href="#"';
    }
    return `href="${ruta(destino.ruta)}"`;
  });

  // H2: id automático e índice
  const toc = [];
  const usados = new Set();
  html = html.replace(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi, (_, attrs, interior) => {
    const texto = textoPlano(interior);
    let id = (attrs.match(/\sid=["']([^"']+)["']/i) || [])[1];
    if (!id) {
      const base = slugify(texto) || 'seccion';
      id = base;
      for (let n = 2; usados.has(id); n++) id = `${base}-${n}`;
      attrs += ` id="${id}"`;
    }
    usados.add(id);
    toc.push({ id, texto });
    return `<h2${attrs}>${interior}</h2>`;
  });

  // Imágenes: carga diferida y aviso si falta alt
  html = html.replace(/<img\b([^>]*?)\s*\/?>/gi, (_, attrs) => {
    if (!/\balt\s*=/i.test(attrs)) aviso(`${doc.donde}: una <img> no tiene atributo alt`);
    if (!/\bloading\s*=/i.test(attrs)) attrs += ' loading="lazy" decoding="async"';
    return `<img${attrs}>`;
  });

  // Tablas: contenedor con desplazamiento horizontal, enfocable con teclado, para pantallas estrechas
  html = html.replace(/<table\b[\s\S]*?<\/table>/gi, (t) => `<div class="tabla" role="region" aria-label="Tabla de datos" tabindex="0">${t}</div>`);

  const palabras = textoPlano(html).split(' ').filter(Boolean).length;
  return { html, toc, faq: extraerFaq(html), palabras, lectura: Math.max(1, Math.round(palabras / PALABRAS_POR_MINUTO)) };
}

// ---------------------------------------------------------------- piezas comunes de HTML

function navegacion(slugActivo, enCategoria) {
  return SITIO.categorias.map((c) => {
    const marca = c.slug !== slugActivo ? '' : enCategoria ? ' aria-current="page"' : ' class="activa"';
    return `        <li><a href="${ruta(`/${c.slug}/`)}"${marca}>${esc(c.nombre)}</a></li>`;
  }).join('\n');
}

function migas(items) {
  const lis = items.map((it, i) => (i === items.length - 1
    ? `<li aria-current="page">${esc(it.nombre)}</li>`
    : `<li><a href="${ruta(it.ruta)}">${esc(it.nombre)}</a></li>`)).join('');
  return {
    html: `      <nav class="migas" aria-label="Migas de pan"><ol>${lis}</ol></nav>`,
    esquema: {
      '@type': 'BreadcrumbList',
      itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.nombre, item: absoluta(it.ruta) })),
    },
  };
}

function tarjeta(a, { nivel = 3, destacada = false, prioritaria = false } = {}) {
  return plantilla('tarjeta', {
    clase: destacada ? ' tarjeta--destacada' : '',
    imagen: ruta(`/assets/img/${a.portada.archivo}`),
    ancho: a.portada.ancho,
    alto: a.portada.alto,
    carga: prioritaria ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"',
    categoria: a.cat.nombre,
    nivel,
    url: ruta(a.ruta),
    titulo: a.titulo,
    descripcion: a.descripcion,
    fechaISO: a.actualizado,
    fecha: fechaLarga(a.actualizado),
    lectura: a.lectura,
  });
}

const rejilla = (lista, nivel) => `    <div class="rejilla">\n${lista.map((a) => tarjeta(a, { nivel })).join('')}    </div>`;

// ---------------------------------------------------------------- Schema.org

const idOrg = () => `${absoluta('/')}#organizacion`;
const organizacion = () => ({
  '@type': 'Organization',
  '@id': idOrg(),
  name: SITIO.nombre,
  url: absoluta('/'),
  logo: { '@type': 'ImageObject', url: absoluta('/assets/img/logo.svg') },
});
const sitioWeb = () => ({
  '@type': 'WebSite',
  '@id': `${absoluta('/')}#sitio`,
  name: SITIO.nombre,
  url: absoluta('/'),
  description: SITIO.lema,
  inLanguage: 'es-ES',
  publisher: { '@id': idOrg() },
});

// ---------------------------------------------------------------- página completa

/** La etiqueta <title> no pasa de 60 caracteres: si con la marca se pasa, va solo el título. */
const tituloConMarca = (t) => (t.length + 3 + SITIO.nombre.length <= 60 ? `${t} | ${SITIO.nombre}` : t);

let CSS = '';
let CABECERA_EXTRA = '';
let OG_DEFECTO = '';
let PAGINAS_PIE = [];

function pie() {
  if (!PAGINAS_PIE.length) return '';
  const items = PAGINAS_PIE.map((p) => `        <li><a href="${ruta(p.ruta)}">${esc(p.menu)}</a></li>`).join('\n');
  return `    <nav class="pie__nav" aria-label="Información legal y del sitio">\n      <ul>\n${items}\n      </ul>\n    </nav>`;
}

function renderPagina(o) {
  const urlAbs = o.ruta ? absoluta(o.ruta) : absoluta('/');
  return plantilla('base', {
    titulo: o.titulo,
    descripcion: o.descripcion,
    canonical: o.ruta ? `<link rel="canonical" href="${esc(urlAbs)}">` : '',
    robots: o.noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large',
    icono: ruta('/assets/img/logo.svg'),
    nombre: SITIO.nombre,
    feed: ruta('/feed.xml'),
    ogTipo: o.ogTipo || 'website',
    ogTitulo: o.ogTitulo || o.titulo,
    urlAbsoluta: urlAbs,
    ogImagen: o.ogImagen || OG_DEFECTO,
    fuente: ruta('/assets/fonts/newsreader-700-latin.woff2'),
    css: CSS,
    cabeceraExtra: CABECERA_EXTRA,
    jsonld: json({ '@context': 'https://schema.org', '@graph': [organizacion(), sitioWeb(), ...(o.esquemas || [])] }),
    inicio: ruta('/'),
    navegacion: navegacion(o.categoriaActiva, o.enCategoria),
    contenido: o.contenido,
    pie: pie(),
    lema: SITIO.lema,
    anio: new Date().getFullYear(),
    js: ruta('/assets/js/main.js'),
  });
}

// ---------------------------------------------------------------- generación

function generar({ articulos, paginas }) {
  const urls = []; // para sitemap.xml
  const ultimaMod = (lista) => lista.map((a) => a.actualizado).sort().pop();

  // --- Inicio
  {
    const recientes = articulos.slice(0, 9);
    let ultimos;
    if (!recientes.length) {
      ultimos = '  <p class="vacio">Estamos preparando los primeros artículos. Vuelve pronto.</p>';
    } else {
      const destacada = tarjeta(recientes[0], { nivel: 3, destacada: true, prioritaria: true });
      const resto = recientes.slice(1);
      ultimos = `  <div class="destacada">\n${destacada}  </div>` + (resto.length ? `\n  ${rejilla(resto, 3).trimStart()}` : '');
    }
    const temas = SITIO.categorias.map((c) => {
      const n = articulos.filter((a) => a.cat.slug === c.slug).length;
      return `    <li><a class="tema-caja" href="${ruta(`/${c.slug}/`)}"><span class="tema-caja__nombre">${esc(c.nombre)}</span>` +
        `<span class="tema-caja__texto">${esc(c.descripcion)}</span>` +
        `<span class="tema-caja__cuenta">${n ? plural(n, 'artículo', 'artículos') : 'Próximamente'}</span></a></li>`;
    }).join('\n');

    escribir('index.html', renderPagina({
      titulo: `${SITIO.nombre}: ${SITIO.lema}`,
      descripcion: SITIO.descripcion,
      ruta: '/',
      contenido: plantilla('inicio', { lema: SITIO.lema, descripcion: SITIO.descripcion, ultimos, temas }),
    }));
    urls.push({ loc: absoluta('/'), lastmod: ultimaMod(articulos) });
  }

  // --- Categorías
  for (const cat of SITIO.categorias) {
    const lista = articulos.filter((a) => a.cat.slug === cat.slug);
    const rutaCat = `/${cat.slug}/`;
    const m = migas([{ nombre: 'Inicio', ruta: '/' }, { nombre: cat.nombre, ruta: rutaCat }]);
    const listado = lista.length
      ? rejilla(lista, 2)
      : '    <p class="vacio">Todavía no hay artículos en esta categoría. Estamos preparando los primeros.</p>';

    escribir(`${cat.slug}/index.html`, renderPagina({
      titulo: `${cat.nombre} | ${SITIO.nombre}`,
      descripcion: cat.descripcion,
      ruta: rutaCat,
      noindex: !lista.length, // una categoría vacía es contenido fino: no se indexa hasta tener artículos
      categoriaActiva: cat.slug,
      enCategoria: true,
      esquemas: [m.esquema],
      contenido: plantilla('categoria', { migas: m.html, nombre: cat.nombre, descripcion: cat.descripcion, listado }),
    }));
    if (lista.length) urls.push({ loc: absoluta(rutaCat), lastmod: ultimaMod(lista) });
  }

  // --- Artículos
  const paginaSobre = paginas.find((p) => p.slug === 'sobre');
  for (const a of articulos) {
    const m = migas([
      { nombre: 'Inicio', ruta: '/' },
      { nombre: a.cat.nombre, ruta: `/${a.cat.slug}/` },
      { nombre: a.titulo, ruta: a.ruta },
    ]);

    const toc = a.toc.length >= 2
      ? '      <nav class="toc" aria-labelledby="toc-titulo">\n        <p class="toc__titulo" id="toc-titulo">En este artículo</p>\n        <ol>\n' +
        a.toc.map((t) => `          <li><a href="#${esc(t.id)}">${esc(t.texto)}</a></li>`).join('\n') +
        '\n        </ol>\n      </nav>'
      : '';

    const relacionados = articulos.filter((x) => x !== a && x.cat.slug === a.cat.slug).slice(0, 3);
    const bloqueRelacionados = relacionados.length
      ? '  <section class="relacionados" aria-labelledby="relacionados">\n' +
        `    <h2 class="seccion__titulo" id="relacionados">Sigue leyendo en ${esc(a.cat.nombre)}</h2>\n${rejilla(relacionados, 3)}\n  </section>`
      : '';

    const autor = paginaSobre ? `<a href="${ruta(paginaSobre.ruta)}">${esc(SITIO.autor)}</a>` : esc(SITIO.autor);
    const urlAbs = absoluta(a.ruta);
    const esquemas = [
      {
        '@type': 'Article',
        '@id': `${urlAbs}#articulo`,
        mainEntityOfPage: { '@type': 'WebPage', '@id': urlAbs },
        headline: a.titulo.slice(0, 110),
        description: a.descripcion,
        image: [absoluta(`/assets/img/${a.portada.archivo}`)],
        datePublished: a.fecha,
        dateModified: a.actualizado,
        inLanguage: 'es-ES',
        articleSection: a.cat.nombre,
        wordCount: a.palabras,
        author: { '@type': 'Organization', name: SITIO.autor, url: absoluta('/') },
        publisher: { '@id': idOrg() },
      },
      m.esquema,
    ];
    if (a.faq.length) {
      esquemas.push({
        '@type': 'FAQPage',
        mainEntity: a.faq.map((f) => ({ '@type': 'Question', name: f.pregunta, acceptedAnswer: { '@type': 'Answer', text: f.respuesta } })),
      });
    }

    escribir(`${a.cat.slug}/${a.slug}/index.html`, renderPagina({
      titulo: tituloConMarca(a.titulo),
      ogTitulo: a.titulo,
      descripcion: a.descripcion,
      ruta: a.ruta,
      ogTipo: 'article',
      ogImagen: a.portada.og ? absoluta(`/assets/img/${a.portada.og}`) : undefined,
      categoriaActiva: a.cat.slug,
      esquemas,
      contenido: plantilla('articulo', {
        migas: m.html,
        categoriaUrl: ruta(`/${a.cat.slug}/`),
        categoria: a.cat.nombre,
        titulo: a.titulo,
        descripcion: a.descripcion,
        autor,
        actualizadoISO: a.actualizado,
        actualizado: fechaLarga(a.actualizado),
        lectura: a.lectura,
        portada: ruta(`/assets/img/${a.portada.archivo}`),
        ancho: a.portada.ancho,
        alto: a.portada.alto,
        toc,
        cuerpo: a.html,
        relacionados: bloqueRelacionados,
      }),
    }));
    urls.push({ loc: urlAbs, lastmod: a.actualizado });
  }

  // --- Páginas (sobre, contacto, legales…)
  for (const p of paginas) {
    const m = migas([{ nombre: 'Inicio', ruta: '/' }, { nombre: p.titulo, ruta: p.ruta }]);
    const actualizado = p.actualizado
      ? `        <p class="articulo__meta">Última actualización: <time datetime="${p.actualizado}">${fechaLarga(p.actualizado)}</time></p>`
      : '';
    escribir(`${p.slug}/index.html`, renderPagina({
      titulo: `${p.titulo} | ${SITIO.nombre}`,
      ogTitulo: p.titulo,
      descripcion: p.descripcion,
      ruta: p.ruta,
      noindex: p.noindex,
      esquemas: [m.esquema],
      contenido: plantilla('pagina', { migas: m.html, titulo: p.titulo, actualizado, cuerpo: p.html }),
    }));
    if (!p.noindex) urls.push({ loc: absoluta(p.ruta), lastmod: p.actualizado || undefined });
  }

  // --- 404
  {
    const ultimos = articulos.length
      ? '  <section class="seccion" aria-labelledby="ultimos404">\n    <h2 class="seccion__titulo" id="ultimos404">Últimos artículos</h2>\n' +
        `${rejilla(articulos.slice(0, 3), 3)}\n  </section>`
      : '';
    escribir('404.html', renderPagina({
      titulo: `Página no encontrada | ${SITIO.nombre}`,
      descripcion: 'La página que buscas no existe o ha cambiado de dirección.',
      ruta: null,
      noindex: true,
      contenido: plantilla('404', { inicio: ruta('/'), ultimos }),
    }));
  }

  // --- sitemap.xml
  escribir('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n') + '\n</urlset>\n');

  // --- robots.txt
  escribir('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${absoluta('/sitemap.xml')}\n`);

  // --- feed.xml (RSS 2.0)
  const rfc822 = (iso) => new Date(`${iso}T00:00:00Z`).toUTCString();
  const items = articulos.slice(0, MAX_FEED).map((a) => `    <item>
      <title>${esc(a.titulo)}</title>
      <link>${esc(absoluta(a.ruta))}</link>
      <guid isPermaLink="true">${esc(absoluta(a.ruta))}</guid>
      <pubDate>${rfc822(a.fecha)}</pubDate>
      <category>${esc(a.cat.nombre)}</category>
      <description>${esc(a.descripcion)}</description>
    </item>`).join('\n');
  escribir('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITIO.nombre)}</title>
    <link>${esc(absoluta('/'))}</link>
    <description>${esc(SITIO.lema)}</description>
    <language>es-es</language>
${articulos.length ? `    <lastBuildDate>${rfc822(ultimaMod(articulos))}</lastBuildDate>\n` : ''}    <atom:link href="${esc(absoluta('/feed.xml'))}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`);

  // --- .nojekyll, ads.txt
  escribir('.nojekyll', '');
  if (SITIO.adsense) escribir('ads.txt', `google.com, ${SITIO.adsense.editor}, DIRECT, f08c47fec0942fa0\n`);
}

// ---------------------------------------------------------------- comprobación de enlaces

function comprobarEnlaces() {
  const hayArchivo = (p) => {
    const clave = p.replace(/^\//, '');
    return SALIDA.has(clave) || ((clave === '' || clave.endsWith('/')) && SALIDA.has(`${clave}index.html`));
  };
  for (const [rel, contenido] of SALIDA) {
    if (!rel.endsWith('.html')) continue;
    const html = contenido;
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    for (const [, url] of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
      if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(url)) continue; // enlaces externos, mailto:, tel:…
      if (url.startsWith('#')) {
        if (url.length > 1 && !ids.has(decodeURIComponent(url.slice(1)))) error(`${rel}: ancla rota ${url}`);
        continue;
      }
      if (!url.startsWith('/')) { aviso(`${rel}: enlace relativo "${url}" (usa rutas que empiecen por /)`); continue; }
      if (SITIO.base && !url.startsWith(`${SITIO.base}/`)) { error(`${rel}: el enlace ${url} no cuelga de ${SITIO.base}/`); continue; }
      const destino = decodeURIComponent(url.slice(SITIO.base.length).split(/[?#]/)[0]);
      if (!hayArchivo(destino)) error(`${rel}: enlace roto ${url}`);
    }
  }
}

// ---------------------------------------------------------------- principal

function main() {
  const inicio = Date.now();

  // 1. Contenido
  const docsArticulos = cargarDocumentos(DIR.contenido, 'contenido');
  const docsPaginas = cargarDocumentos(DIR.paginas, 'paginas');

  const articulos = [];
  const slugs = new Set();
  for (const doc of docsArticulos) {
    const a = validarArticulo(doc);
    if (!a) continue;
    if (slugs.has(a.slug)) { error(`${doc.donde}: el slug "${a.slug}" está repetido`); continue; }
    slugs.add(a.slug);
    articulos.push(a);
  }
  const paginas = [];
  const slugsPagina = new Set();
  for (const doc of docsPaginas) {
    const p = validarPagina(doc);
    if (!p) continue;
    if (slugsPagina.has(p.slug)) { error(`${doc.donde}: el slug "${p.slug}" está repetido`); continue; }
    slugsPagina.add(p.slug);
    paginas.push(p);
  }

  articulos.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.actualizado.localeCompare(a.actualizado) || a.titulo.localeCompare(b.titulo, 'es'));

  const indice = {
    articulos: new Map(articulos.map((a) => [a.slug, a])),
    paginas: new Map(paginas.map((p) => [p.slug, p])),
  };
  for (const a of articulos) Object.assign(a, procesarCuerpo(a.doc, indice));
  for (const p of paginas) p.html = procesarCuerpo(p.doc, indice).html;

  // 2. Recursos compartidos
  const archivoCss = path.join(DIR.assets, 'css', 'estilos.css');
  if (!existe(archivoCss)) error('assets/css/estilos.css no existe');
  if (errores.length) terminar();

  CSS = leer(archivoCss)
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ')
    .replace(/:\s+/g, ':').replace(/\s*([{};,>])\s*/g, '$1').replace(/;}/g, '}')
    .trim().replace(/%BASE%/g, SITIO.base);

  if (SITIO.adsense) {
    aviso('AdSense activo: el sitio aún no incluye un sistema de gestión del consentimiento (CMP). Las páginas de cookies y privacidad prometen pedir consentimiento antes de instalar cookies publicitarias: impleméntalo antes de publicar (ver ESTADO.md).');
  }

  const cabecera = [];
  if (SITIO.searchConsole) cabecera.push(`<meta name="google-site-verification" content="${esc(SITIO.searchConsole)}">`);
  if (SITIO.adsense) {
    cabecera.push(`<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${SITIO.adsense.cliente}" crossorigin="anonymous"></script>`);
  }
  CABECERA_EXTRA = cabecera.join('\n');

  OG_DEFECTO = absoluta(`/assets/img/${existe(path.join(DIR.img, 'og-default.png')) ? 'og-default.png' : 'og-default.svg'}`);

  const rango = (p) => (ORDEN_PIE.includes(p.slug) ? ORDEN_PIE.indexOf(p.slug) : ORDEN_PIE.length);
  PAGINAS_PIE = [...paginas].sort((a, b) => rango(a) - rango(b) || a.titulo.localeCompare(b.titulo, 'es'));

  // 3. Generación en memoria
  generar({ articulos, paginas });
  for (const sub of ['img', 'js', 'fonts']) agregarEstaticos(sub);
  const cname = path.join(RAIZ, 'CNAME'); // dominio propio: se conserva al regenerar docs/
  if (existe(cname)) escribir('CNAME', fs.readFileSync(cname));

  comprobarEnlaces();
  if (errores.length) terminar();

  // 4. Escritura en docs/
  volcarADocs();

  // 5. Informe
  const total = [...SALIDA.keys()].filter((k) => k.endsWith('.html')).length;
  console.log(`${SITIO.nombre}: ${plural(articulos.length, 'artículo', 'artículos')}, ${plural(paginas.length, 'página', 'páginas')}, ` +
    `${SITIO.categorias.length} categorías → ${total} HTML en docs/ (${Date.now() - inicio} ms)`);
  console.log(`  URL: ${absoluta('/')}  |  AdSense: ${SITIO.adsense ? SITIO.adsense.cliente : 'sin configurar'}  |  Search Console: ${SITIO.searchConsole ? 'sí' : 'sin configurar'}`);
  for (const m of avisos) console.warn(`  aviso: ${m}`);
}

try {
  main();
} catch (e) {
  console.error(`\nERROR: ${e.message}`);
  console.error(volcando ? 'docs/ puede haber quedado incompleto: corrige el problema y vuelve a ejecutar node build.js.' : 'docs/ no se ha modificado.');
  if (process.env.DEBUG) console.error(e.stack);
  process.exit(1);
}
