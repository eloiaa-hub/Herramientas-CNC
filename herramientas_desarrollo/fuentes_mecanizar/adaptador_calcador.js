// Contornos del Calcador → trazados del motor de mecanizado (mismo orden y datos que se envían al Generador)
function trazadosParaMecanizar() {
    const { lista } = contornosExportables();
    const abiertosG = contornos.filter(c => !c.cerrado && c.pts.length >= 2).map(c => ({ c, tipo:'abierto' }));
    const ext = lista.filter(o => o.tipo !== 'interior'), int = lista.filter(o => o.tipo === 'interior');
    // el último exterior (o interior, o abierto) va al final, como en el Generador
    const activo = ext.length ? ext[ext.length - 1] : int.length ? int[int.length - 1] : abiertosG[abiertosG.length - 1];
    if (!activo) return [];
    const ordenados = abiertosG.filter(o => o !== activo).concat(ext.filter(o => o !== activo), int.filter(o => o !== activo), [activo]);
    return ordenados.map(({ c, tipo }) => {
        const abierto = !c.cerrado, m = mecAGenerador(c, 1) || {}, p = m.puentes || {};
        const t = { tipo: tipo === 'interior' ? 'interior' : 'exterior', abierto,
            op: abierto ? 'grabado' : (['grabado', 'cajera', 'isla'].includes(m.op) ? m.op : 'corte'),
            prof: typeof m.prof === 'number' && isFinite(m.prof) && m.prof < 0 ? m.prof : null,
            caj: cajDe(c), puentes: { n: Math.max(0, Math.round(+p.n || 0)), ancho: Math.max(0, +p.ancho || 0), alto: Math.max(0, +p.alto || 0), pts: [] },
            tramos: tramos(c).map(q => ({ p1:{ x:q.p1.x, y:q.p1.y }, p2:{ x:q.p2.x, y:q.p2.y }, b:q.b || 0 })), ci: contornos.indexOf(c) };
        if (t.puentes.n > 0) { const pzs = puentesDe(c); if (pzs.length) { t.puentes.pts = pzs.map(q => ({ x:q.p.x, y:q.p.y })); t.puentes.n = pzs.length; } }
        // herramienta propia del contorno (de la base compartida); si no está en la base, la general
        const Tc = c.mec && +c.mec.T;
        if (Tc && t.op !== 'isla') { const h = HB.porT(Tc); if (h) t.herr = { T:h.T, d:h.d, F:h.F, S:h.S, paso:h.paso, nombre:h.nombre }; else t.herrFalta = Tc; }
        return t;
    }).filter(t => t.tramos.length);
}
