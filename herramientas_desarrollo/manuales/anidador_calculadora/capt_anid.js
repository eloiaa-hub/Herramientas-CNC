// Capturas para el manual del Anidador de tableros
const { lanzar, path, SUITE, fs } = require(process.env.COMUN || require('path').join(__dirname, '..', '..', 'pruebas', 'comun'));
const { marcar, quitarMarcas } = require('./comun_capt');
const OUT = require('path').join(__dirname, 'capturas'); require('fs').mkdirSync(OUT, { recursive: true }), DAT = path.join(__dirname, 'datos'), E = process.env.EJERCICIOS || '/mnt/user-data/outputs';
const JSONS = [`${E}/Ejercicios_16-25/Ejercicio 25.json`, `${E}/ISO 13 - dos herramientas.json`, `${E}/Ejercicios_Avanzados/Ejercicio avanzado 03.json`, `${E}/Ejercicio 902 - Nota musical.json`];
(async () => {
  const b = await lanzar(); const ctx = await b.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1.5, acceptDownloads: true }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + path.join(SUITE, 'anidador.html')); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('anidador_tema', 'claro'); }); await p.reload(); await p.waitForTimeout(400);
  const pon = (vals) => p.evaluate(vals => { Object.entries(vals).forEach(([id, v]) => { const e = document.getElementById(id); if (e.type === 'checkbox') e.checked = v; else e.value = v; }); todo(); }, vals);
  await pon({ tL: 1830, tA: 700, tG: 16, tP: 0.5, tM: 10, hH: 4, tVeta: true });
  await p.setInputFiles('#archivo', [path.join(DAT, 'despiece_mesita.csv'), ...JSONS]);
  await p.waitForFunction(n => piezas.length >= n, 4 + JSONS.length, { timeout: 10000 });
  await p.evaluate(() => { const q = piezas.find(x => /ISO 13/.test(x.nombre)); if (q) q.cant = 2; todo(); });
  console.log(await p.evaluate(() => JSON.stringify({ piezas: piezas.map(q => [q.nombre, q.tipo, Math.round(geomPieza(q).w), Math.round(geomPieza(q).h), q.cant]), tableros: resultado.tableros.length, fuera: resultado.nFuera })));
  await p.waitForTimeout(3200);
  await p.screenshot({ path: `${OUT}/anid_portada.png` });
  await p.addStyleTag({ content: '.barra { position: relative !important; }' });
  // la pantalla, con sus zonas
  await p.evaluate(() => { const c = [...document.querySelectorAll('.caja')]; c.forEach((e, i) => e.setAttribute('data-marca', i)); });
  await marcar(p, [{ sel: '[data-marca="0"]', n: 1, dx: -10, dy: 12, ox: 16 }, { sel: '[data-marca="1"]', n: 2, dx: -10, dy: 12, ox: 16 }, { sel: '[data-marca="2"]', n: 3, dx: -10, dy: 12, ox: 16 }, { sel: '#tableros', n: 4, dx: -26, dy: 16 },
    { sel: '#vista', n: 5, dx: -10, dy: 12 }, { sel: '#datos', n: 6, dx: -14, dy: 10 }, { sel: '#btnCalcador', n: 7, dx: -12, dy: 10 }, { sel: '#btnAyuda', n: 8, dx: -10, dy: 12 }]);
  await p.screenshot({ path: `${OUT}/anid_pantalla.png`, fullPage: true }); await quitarMarcas(p);
  // cajas por separado
  const caja = async (i, n) => { const l = p.locator('.caja').nth(i); await l.screenshot({ path: `${OUT}/anid_${n}.png` }); };
  await caja(0, 'tablero'); await caja(1, 'fresa'); await caja(2, 'piezas');
  // varios tableros y una pieza que no cabe
  await p.evaluate(() => { piezas.push({ id: 'enorme', nombre: 'Encimera', tipo: 'rect', L: 1900, A: 400, cant: 1, veta: true, giro: null, color: colorNuevo() }); piezas.find(x => x.nombre === 'Balda').cant = 6; todo(); });
  await p.locator('.caja').nth(3).screenshot({ path: `${OUT}/anid_varios.png` });
  await p.locator('.caja').nth(2).screenshot({ path: `${OUT}/anid_piezas_fuera.png` });
  // pasar una balda al tablero 2: arrastrarla hasta su pestaña
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(100);
  { const c = await p.evaluate(() => { const c = resultado.tableros[0].col.find(c => c.p.nombre === 'Balda'); const svg = document.getElementById('vista'), r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
      return { x: r.left + (vistaMap.ox + vistaMap.k * (c.x + c.w / 2)) * r.width / vb.width, y: r.top + (vistaMap.oy - vistaMap.k * (c.y + c.h / 2)) * r.height / vb.height }; });
    await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.mouse.move(c.x + 40, c.y - 40, { steps: 5 });
    const t = await (await p.$('#tableros [data-tab="1"]')).boundingBox(); await p.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 10 }); await p.waitForTimeout(120);
    await p.locator('.caja').nth(3).screenshot({ path: `${OUT}/anid_a_otro.png` }); await p.mouse.up(); await p.waitForTimeout(300); }
  await p.evaluate(() => { piezas = piezas.filter(x => x.id !== 'enorme'); piezas.forEach(x => delete x.fijas); piezas.find(x => x.nombre === 'Balda').cant = 2; tableroVisto = 0; sel = null; todo(); });
  // colocar a mano: arrastrar
  const scr = (x, y) => p.evaluate(([x, y]) => { const svg = document.getElementById('vista'), r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal; return { x: r.left + (vistaMap.ox + vistaMap.k * x) * r.width / vb.width, y: r.top + (vistaMap.oy - vistaMap.k * y) * r.height / vb.height }; }, [x, y]);
  const col = (nombre, k) => p.evaluate(([n, k]) => { const c = resultado.tableros[0].col.find(c => c.p.nombre === n && c.k === (k || 0)); return c && { x: c.x, y: c.y, w: c.w, h: c.h, id: c.p.id }; }, [nombre, k]);
  const vista = p.locator('#vista');
  let t = await col('Trasera'); let a = await scr(t.x + t.w / 2, t.y + t.h / 2), d = await scr(1830 - 10 - t.w / 2, 10 + t.h / 2);
  await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move((a.x + d.x) / 2 + 40, (a.y + d.y) / 2, { steps: 8 }); await p.waitForTimeout(100);
  await vista.screenshot({ path: `${OUT}/anid_arrastrar.png` });
  await p.mouse.move(d.x, d.y, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(200);
  await vista.screenshot({ path: `${OUT}/anid_fijada.png` });
  // arrastrar encima de la fijada: en rojo
  const c2 = await col('Costado'); t = await col('Trasera');
  a = await scr(c2.x + c2.w / 2, c2.y + c2.h / 2); d = await scr(t.x + t.w / 2, t.y + t.h / 2);
  await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move(d.x, d.y, { steps: 8 }); await p.waitForTimeout(100);
  await vista.screenshot({ path: `${OUT}/anid_nocabe.png` }); await p.keyboard.press('Escape'); await p.mouse.up(); await p.waitForTimeout(200);
  // seleccionar y escalar una pieza del Calcador
  const j = await col('Ejercicio 25'); const cj = await scr(j.x + j.w / 2, j.y + j.h / 2);
  await p.mouse.click(cj.x, cj.y); await p.waitForTimeout(500);
  await vista.screenshot({ path: `${OUT}/anid_asas.png` });
  const asa = await (await p.$('#vista .asa-ne')).boundingBox();
  await p.mouse.move(asa.x + 5, asa.y + 5); await p.mouse.down(); const dest = await scr(j.x + j.w * 1.25, j.y + j.h * 1.25); await p.mouse.move(dest.x, dest.y, { steps: 8 }); await p.waitForTimeout(100);
  await vista.screenshot({ path: `${OUT}/anid_escala.png` }); await p.mouse.up(); await p.waitForTimeout(300);
  console.log(await p.evaluate(() => JSON.stringify(resultado.tableros.map(t => t.col.map(c => c.p.nombre + (c.fija ? '📌' : ''))))));
  // girar con doble clic (una balda)
  const bl = await p.evaluate(() => { const c = resultado.tableros[0].col.filter(c => c.p.nombre === 'Balda').pop(); return { x: c.x, y: c.y, w: c.w, h: c.h }; }); const cb = await scr(bl.x + bl.w / 2, bl.y + bl.h / 2); await p.mouse.dblclick(cb.x, cb.y); await p.waitForTimeout(300);
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(2800);
  await p.screenshot({ path: `${OUT}/anid_a_mano.png` });
  await vista.screenshot({ path: `${OUT}/anid_a_mano_vista.png` });
  await p.locator('.caja').nth(2).screenshot({ path: `${OUT}/anid_lista_mano.png` });
  // exportar: PNG del tablero
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#btnPNG')]); await dl.saveAs(`${OUT}/anid_export.png`);
  const [dj] = await Promise.all([p.waitForEvent('download'), p.click('#btnJSON')]); const fj = path.join(DAT, 'tablero_guardado.json'); await dj.saveAs(fj);
  const [dd] = await Promise.all([p.waitForEvent('download'), p.click('#btnDXF')]); await dd.saveAs(path.join(DAT, 'tablero.dxf'));
  // ➜ Abrir en el Calcador
  const [cal] = await Promise.all([ctx.waitForEvent('page'), p.click('#btnCalcador')]); cal.on('dialog', d => d.accept());
  await cal.setViewportSize({ width: 1400, height: 900 }); await cal.waitForTimeout(2500); await cal.evaluate(() => encuadrar && encuadrar()); await cal.waitForTimeout(300);
  await cal.screenshot({ path: `${OUT}/anid_calcador.png` });
  await cal.evaluate(() => { abrirMec(); generarMec(); }); await cal.waitForTimeout(600); await cal.screenshot({ path: `${OUT}/anid_mecanizar.png` }); await cal.close();
  // reabrir el tablero guardado
  const c3 = await b.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1.5 }), p3 = await c3.newPage(); await p3.goto('file://' + path.join(SUITE, 'anidador.html')); await p3.evaluate(() => localStorage.setItem('anidador_tema', 'claro')); await p3.reload(); await p3.waitForTimeout(300);
  await p3.setInputFiles('#archivo', fj); await p3.waitForTimeout(500); await p3.screenshot({ path: `${OUT}/anid_reabrir.png` }); await c3.close();
  // ayuda y móvil
  await p.keyboard.press('F1'); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/anid_ayuda.png` }); await p.keyboard.press('Escape');
  console.log('errores', errs); await b.close();
})();
