#!/usr/bin/env node
'use strict';

/**
 * Servidor local para previsualizar docs/ (Node puro). Imita a GitHub Pages:
 * carpetas con index.html, redirección a la barra final y 404.html con estado 404.
 *
 *   node serve.js            → http://localhost:4173
 *   PORT=8080 node serve.js
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const SALIDA = path.join(__dirname, 'docs');
const PUERTO = Number(process.env.PORT) || 4173;
const BASE = new URL(JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')).url).pathname.replace(/\/+$/, '');

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const esArchivo = (p) => fs.existsSync(p) && fs.statSync(p).isFile();

http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  let ruta;
  try { ruta = decodeURIComponent(pathname); } catch { ruta = ''; }

  let archivo = null;
  if (ruta.startsWith(`${BASE}/`) || ruta === BASE) {
    const relativa = path.normalize(ruta.slice(BASE.length) || '/');
    const candidato = path.join(SALIDA, relativa);
    if (candidato.startsWith(SALIDA)) {
      if (esArchivo(candidato)) archivo = candidato;
      else if (fs.existsSync(candidato) && fs.statSync(candidato).isDirectory()) {
        if (!ruta.endsWith('/')) { res.writeHead(301, { Location: `${ruta}/` }); return res.end(); }
        if (esArchivo(path.join(candidato, 'index.html'))) archivo = path.join(candidato, 'index.html');
      }
    }
  }

  const estado = archivo ? 200 : 404;
  archivo = archivo || path.join(SALIDA, '404.html');
  if (!esArchivo(archivo)) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('404'); }

  res.writeHead(estado, { 'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(archivo).pipe(res);
}).listen(PUERTO, () => console.log(`PymeLista en http://localhost:${PUERTO}${BASE}/  (Ctrl+C para parar)`));
