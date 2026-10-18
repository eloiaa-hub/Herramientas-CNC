// Prepara la carpeta web/ que se mete dentro del ejecutable:
// copia el simulador y sus documentos TAL CUAL y les añade una sola línea
// <script src="tauri/puente.js"> antes de </body>.
//
// Origen de los archivos:
//   1. La carpeta de arriba (../), si existe ../simulador3d.html
//      → es el caso normal dentro del repo Herramientas-CNC.
//   2. Si no, la carpeta herramientas/ de este proyecto.
//
// Así, para actualizar la app basta con actualizar simulador3d.html en el repo.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destino = path.join(raiz, 'web');

const PRINCIPAL = 'simulador3d.html';
// Documentos enlazados desde el simulador (si falta alguno, se avisa y se sigue)
const EXTRAS = ['guia_simulador.html', 'guia_simulador.pdf', 'licencias.html', 'LICENSE', 'LICENCIA-MANUAL.txt'];

const candidatos = [path.resolve(raiz, '..'), path.join(raiz, 'herramientas')];
const origen = candidatos.find(d => fs.existsSync(path.join(d, PRINCIPAL)));
if (!origen) {
    console.error(`✗ No se encuentra ${PRINCIPAL} ni en ${candidatos.join(' ni en ')}`);
    process.exit(1);
}
console.log(`• Origen de las herramientas: ${origen}`);

fs.rmSync(destino, { recursive: true, force: true });
fs.mkdirSync(path.join(destino, 'tauri'), { recursive: true });
fs.copyFileSync(path.join(raiz, 'puente', 'puente.js'), path.join(destino, 'tauri', 'puente.js'));

const ETIQUETA = '<script src="tauri/puente.js"></script>';
// Diagnóstico: se pone lo primero del <head> para anotar en datos/registro.txt
// cualquier error de la página, incluso de los scripts del propio simulador.
const DIAGNOSTICO = `<script>(function(){var T=window.__TAURI__;function r(m){try{T&&T.core&&T.core.invoke('registrar',{texto:String(m)})}catch(e){}}
window.__registrar=r;r('inicio '+location.href+' · '+navigator.userAgent+' · tauri='+(!!T));
window.addEventListener('error',function(e){var t=e.target;r('ERROR '+(e.message||'')+(t&&t!==window&&(t.src||t.href)?' recurso: '+(t.src||t.href):'')+' @'+(e.filename||'')+':'+(e.lineno||'')+':'+(e.colno||''))},true);
window.addEventListener('unhandledrejection',function(e){r('PROMESA RECHAZADA '+(e.reason&&(e.reason.stack||e.reason.message)||e.reason))});
document.addEventListener('DOMContentLoaded',function(){r('DOMContentLoaded')});window.addEventListener('load',function(){r('load · puente='+(!!window.__suiteCNC))});})();</script>`;
function copiar(nombre, obligatorio) {
    const de = path.join(origen, nombre);
    if (!fs.existsSync(de)) {
        if (obligatorio) { console.error(`✗ Falta ${nombre}`); process.exit(1); }
        console.warn(`  (no está ${nombre}: el enlace a él no funcionará)`);
        return;
    }
    const a = path.join(destino, nombre);
    if (/\.html?$/i.test(nombre)) {
        let html = fs.readFileSync(de, 'utf8');
        // justo después de <meta charset> (o de <head>), para no alejar el charset del principio
        let h = html.search(/<meta[^>]+charset[^>]*>/i);
        if (h < 0) h = html.search(/<head[^>]*>/i);
        if (h >= 0) { const fin = html.indexOf('>', h) + 1; html = html.slice(0, fin) + DIAGNOSTICO + html.slice(fin); }
        const i = html.lastIndexOf('</body>');
        html = i >= 0 ? html.slice(0, i) + ETIQUETA + '\n' + html.slice(i) : html + '\n' + ETIQUETA + '\n';
        fs.writeFileSync(a, html);
    } else {
        fs.copyFileSync(de, a);
    }
    console.log(`  ✓ ${nombre}`);
}

copiar(PRINCIPAL, true);
EXTRAS.forEach(n => copiar(n, false));
console.log('• web/ preparada');
