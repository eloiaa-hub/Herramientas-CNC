// Capturas para el manual de la Calculadora de taller
const { lanzar, path, SUITE } = require(process.env.COMUN || require('path').join(__dirname, '..', '..', 'pruebas', 'comun'));
const { marcar, quitarMarcas } = require('./comun_capt');
const OUT = require('path').join(__dirname, 'capturas'); require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await lanzar(); const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1.5 }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(SUITE, 'calculadora.html')); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('calculadora_tema', 'claro'); }); await p.reload(); await p.waitForTimeout(400);
  const hoja = async h => { await p.click(`.pestanas [data-hoja="${h}"]`); await p.waitForTimeout(200); };
  const pon = async (vals) => { for (const [id, v] of Object.entries(vals)) { await p.fill('#' + id, String(v)); } await p.waitForTimeout(200); };
  const modo = async (name, v) => { await p.click(`input[name="${name}"][value="${v}"] + *, label:has(input[name="${name}"][value="${v}"])`).catch(async () => p.evaluate(([n, v]) => { const e = document.querySelector(`input[name="${n}"][value="${v}"]`); e.checked = true; e.dispatchEvent(new Event('change', { bubbles: true })); e.dispatchEvent(new Event('input', { bubbles: true })); }, [name, v])); await p.waitForTimeout(200); };
  const foto = async (n, opts) => { await p.screenshot({ path: `${OUT}/calc_${n}.png`, fullPage: true, ...(opts || {}) }); };
  // Recta: L 50 a 30° desde (20, 10)
  await hoja('recta'); await modo('rModo', 'la'); await pon({ rL: 50, rA: 30, rX0: 20, rY0: 10 });
  await foto('recta');
  await marcar(p, [{ sel: '.barra', n: 1, pos: 'l', dx: 4, dy: 18, ox: -2 }, { sel: '.pestanas', n: 2, dx: -16, dy: 22 }, { sel: '.hoja.activa .caja, .hoja:not([hidden]) .caja', n: 3, dx: -14, dy: 14 },
    { sel: '#btnAyuda', n: 5, dx: -10, dy: 12 }]);
  await p.evaluate(() => { const c = [...document.querySelectorAll('.caja')].filter(e => e.offsetParent); window.__cajas = c.map(e => { const r = e.getBoundingClientRect(); return [r.left, r.top]; }); });
  await p.evaluate(() => { const c = [...document.querySelectorAll('.caja')].filter(e => e.offsetParent); c.forEach((e, i) => e.setAttribute('data-marca', i)); });
  await marcar(p, [{ sel: '.barra', n: 1, dx: 4, dy: 18, ox: 16 }, { sel: '.pestanas', n: 2, dx: -16, dy: 22 }, { sel: '[data-marca="0"]', n: 3, dx: -14, dy: 14 }, { sel: '[data-marca="1"]', n: 4, dx: -14, dy: 14 }, { sel: '[data-marca="2"]', n: 6, dx: -14, dy: 14 }, { sel: '#btnAyuda', n: 5, dx: -10, dy: 12 }]);
  await p.screenshot({ path: `${OUT}/calc_pantalla.png` });
  console.log(await p.evaluate(() => ({ cajas: [...document.querySelectorAll('.caja')].filter(e => e.offsetParent).map(e => e.querySelector('h2,h3') ? e.querySelector('h2,h3').textContent : e.className), ids: [...document.querySelectorAll('button[id]')].map(e => e.id) })));
  await quitarMarcas(p);
  await modo('rModo', 'xa'); await pon({ rDX: 40, rA: -25 }); await foto('recta_xa');
  // Polares
  await hoja('polar'); await modo('pModo', 'pc'); await pon({ pR: 60, pA: 30, pPX: 0, pPY: 0 }); await foto('polar');
  await modo('pModo', 'cp'); await pon({ pX: 40, pY: 40, pPX: 10, pPY: 10 }); await foto('polar_cp');
  // Arco: de (80, 10) a (100, 30), G3, R20
  await hoja('arco'); await pon({ aX1: 80, aY1: 10, aX2: 100, aY2: 30 }); await modo('aSent', 'G3'); await modo('aModo', 'r'); await pon({ aR: 20 }); await modo('aLargo', 'corto'); await foto('arco_r');
  await modo('aLargo', 'largo'); await foto('arco_largo');
  await modo('aLargo', 'corto'); await modo('aModo', 'c'); await pon({ aXC: 80, aYC: 30 }); await foto('arco_c');
  await pon({ aXC: 85, aYC: 30 }); await foto('arco_mal');
  // G90 ↔ G91
  await hoja('conv'); await p.click('text=Ejemplo').catch(() => {}); await modo('cModo', 'G91'); await foto('conv_g91');
  await modo('cModo', 'mix'); await foto('conv_mix');
  // Velocidades
  await hoja('corte'); await modo('vModoS', 'S'); await modo('vModoF', 'fz'); await pon({ vD: 6, vZ: 2, vS: 18000, vFz: 0.08, vL: 1250, vL0: 900, vF0: 10000 }); await foto('corte');
  await modo('vModoS', 'Vc'); await pon({ vVc: 300 }); await foto('corte_vc');
  // Ayuda (F1), modo oscuro y móvil
  await hoja('arco'); await p.keyboard.press('F1'); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/calc_ayuda.png` }); await p.keyboard.press('Escape');
  await p.click('#btnTema').catch(() => {}); await p.waitForTimeout(300); await foto('oscuro'); await p.click('#btnTema').catch(() => {});
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); await m.goto('file://' + path.join(SUITE, 'calculadora.html')); await m.waitForTimeout(400);
  await m.click('.pestanas [data-hoja="arco"]').catch(() => {}); await m.waitForTimeout(300); await m.screenshot({ path: `${OUT}/calc_movil.png` });
  console.log('errores', errs); await b.close();
})();
