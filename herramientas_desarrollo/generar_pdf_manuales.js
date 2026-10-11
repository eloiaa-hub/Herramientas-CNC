// PDF de los manuales (Chromium/Playwright). El del Calcador recalcula los números de página de su índice impreso.
// Uso: node generar_pdf_manuales.js <carpeta de la suite>   (SOLO=manual_anidador para imprimir solo ese)
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const { lanzar } = require(process.env.COMUN || path.join(__dirname, 'pruebas', 'comun'));
const D = path.resolve(process.argv[2] || '.');
const pie = (izq, num) => `<div style="width:100%;font-size:7pt;font-family:'Segoe UI',Arial,sans-serif;color:#555;padding:0 15mm;display:flex;justify-content:space-between"><span>${izq}</span><span>${num}</span></div>`;
const MANUALES = [
  { html:'manual_calcador.html', pdf:'manual_calcador.pdf', margin:{ top:'15mm', bottom:'16mm', left:'15mm', right:'15mm' }, css:false,
    pie: pie('Calcador de contornos · Manual de uso', '<span class="pageNumber"></span> / <span class="totalPages"></span>'), indice:true },
  { html:'manual_corrector.html', pdf:'manual_corrector.pdf', css:true, pie: pie('Corrector · Manual para el profesorado', '<span class="pageNumber"></span>') },
  { html:'manual_calculadora.html', pdf:'manual_calculadora.pdf', css:true, pie: pie('Calculadora de taller · Manual para el alumnado', '<span class="pageNumber"></span>') },
  { html:'manual_anidador.html', pdf:'manual_anidador.pdf', css:true, pie: pie('Anidador de tableros · Manual para el profesorado', '<span class="pageNumber"></span>') },
].filter(M => !process.env.SOLO || process.env.SOLO.split(',').some(n => M.html.startsWith(n)));
const textoPaginas = f => execFileSync('pdftotext', ['-layout', f, '-'], { maxBuffer:1 << 28 }).toString().split('\f');
(async () => {
  const b = await lanzar();
  for (const M of MANUALES) {
    const imprimir = async () => {
      const p = await b.newPage(); await p.goto('file://' + path.join(D, M.html), { waitUntil:'load' }); await p.waitForTimeout(800);
      await p.emulateMedia({ media:'print' });
      await p.pdf({ path: path.join(D, M.pdf), format:'A4', printBackground:true, preferCSSPageSize: M.css, margin: M.margin,
        displayHeaderFooter:true, headerTemplate:'<span></span>', footerTemplate: M.pie });
      await p.close();
    };
    await imprimir();
    if (M.indice) {
      // índice impreso: cada capítulo con la página donde empieza su título
      let s = fs.readFileSync(path.join(D, M.html), 'utf8'), cambios = 0;
      const pags = textoPaginas(path.join(D, M.pdf));
      const norm = t => t.replace(/\s+/g, ' ').trim();
      s = s.replace(/<li><span>([^<]+)<\/span><span class="pag">(\d+)<\/span><\/li>/g, (todo, tit, n) => {
        const t = norm(tit); let pg = -1;
        for (let k = 2; k < pags.length; k++) { const lineas = pags[k].split('\n').map(norm); if (lineas.some(l => l === t || l.endsWith(' ' + t) || new RegExp('^\\d+\\s*' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$').test(l))) { pg = k + 1; break; } }
        if (pg < 0) { console.log('  ⚠ no encuentro en el PDF:', t); return todo; }
        if (+n !== pg) cambios++;
        return `<li><span>${tit}</span><span class="pag">${pg}</span></li>`;
      });
      fs.writeFileSync(path.join(D, M.html), s);
      if (cambios) { console.log(`  índice: ${cambios} números de página cambiados; se vuelve a imprimir`); await imprimir(); }
    }
    // las capturas, a JPEG de calidad 85 (el PDF pesa menos de la mitad y no se nota); necesita Python con pikepdf y Pillow
    try { execFileSync('python3', [path.join(__dirname, 'aligerar_pdf.py'), path.join(D, M.pdf), path.join(D, M.pdf)], { stdio: 'pipe' }); }
    catch (e) { console.log('  (sin aligerar: falta Python con pikepdf y Pillow)'); }
    const n = execFileSync('pdfinfo', [path.join(D, M.pdf)]).toString().match(/Pages:\s+(\d+)/)[1];
    console.log(`${M.pdf}: ${n} páginas, ${(fs.statSync(path.join(D, M.pdf)).size / 1048576).toFixed(1)} MB`);
  }
  await b.close();
})();
