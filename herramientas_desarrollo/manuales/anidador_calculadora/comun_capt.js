// Utilidades para las capturas de los manuales: marcas numeradas sobre la pantalla
async function marcar(p, marcas) {
  await p.evaluate(ms => {
    document.querySelectorAll('.marca-manual').forEach(e => e.remove());
    ms.forEach(m => {
      const el = typeof m.sel === 'string' ? document.querySelector(m.sel) : null; if (!el) return;
      const r = el.getBoundingClientRect(), d = document.createElement('div'); d.className = 'marca-manual'; d.textContent = m.n;
      const x = m.pos === 'c' ? r.left + r.width / 2 : m.pos === 'tr' ? r.right - 14 : m.pos === 'r' ? r.right + 4 : r.left + (m.dx || 6), y = m.pos === 'c' ? r.top + r.height / 2 : r.top + (m.dy || 6);
      Object.assign(d.style, { position: 'fixed', left: (x - 13 + (m.ox || 0)) + 'px', top: (y - 13 + (m.oy || 0)) + 'px', width: '26px', height: '26px', borderRadius: '50%', background: '#C4580C', color: '#fff',
        font: '700 15px Segoe UI, Arial, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 3px #fff, 0 2px 6px rgba(0,0,0,.35)', zIndex: 99999, pointerEvents: 'none' });
      document.body.appendChild(d);
    });
  }, marcas);
}
const quitarMarcas = p => p.evaluate(() => document.querySelectorAll('.marca-manual').forEach(e => e.remove()));
module.exports = { marcar, quitarMarcas };
