"""Calcador: una herramienta por contorno y cambio de herramienta con M06.

- Panel derecho (Mecanizado): «Herramienta» de cada contorno (de la base compartida; vacío = la general de ⚙️ Mecanizar),
  guardada en mec.T. En el plano, la entrada lleva su herramienta (E2 · T102) cuando el ejercicio usa varias.
- Intérprete ISO: herramienta activa (T… M06), husillo (M03/M04/M05), avisos de seguridad del cambio y de G28.
- Compensación y camino del centro con el radio de la herramienta de cada tramo.
- Corrección: cada contorno con la herramienta pedida.
- Hoja de ejercicio: las herramientas y los contornos de cada una.

Uso: python3 multiherramienta.py <carpeta de la suite>   (después de integrar_mecanizar.py y quitar_generador.py)
"""
import os, sys
D = sys.argv[1] if len(sys.argv) > 1 else '.'
P = os.path.join(D, 'calcador.html')
s = open(P, encoding='utf-8').read()

def rep(a, b, cnt=1):
    global s
    n = s.count(a)
    assert n == cnt, f'{n} apariciones (se esperaban {cnt}) de: {a[:100]}'
    s = s.replace(a, b)

# ── Ayudantes: herramienta de cada contorno y radio de una T ──
rep("function mecAGenerador(c, esc) {", """// Herramienta de cada contorno: la suya (mec.T) o la general de ⚙️ Mecanizar
function normT(t) { t = Math.round(+t); return t >= 1 && t < 100 ? t + 100 : t; }      // T1 → T101, como en la base
function tDeContorno(c) { const t = c && c.mec && +c.mec.T; return t > 0 ? normT(t) : (normT(cfgMec.T) || null); }
function herrDeContorno(c) { const T = tDeContorno(c); return T ? HB.porT(T) : null; }
// ¿El ejercicio pide más de una herramienta? (entonces el plano y la corrección las tienen en cuenta)
function variasHerramientas(lista) {
    const cs = (lista || contornos).filter(c => c.pts.length >= 2 && !esIsla(c));
    return cs.some(c => c.mec && +c.mec.T > 0) && new Set(cs.map(tDeContorno)).size > 1;
}
// Radio de la herramienta T (de la base); si no la hay, el que se dé
function radioDeHerramienta(T, R0) { if (!(T > 0)) return R0; const h = HB.porT(normT(T)); return h ? h.d / 2 : R0; }
function mecAGenerador(c, esc) {""")

# ── Panel derecho: campo Herramienta ──
rep("""            <div class="param-line">Profundidad (mm) <input type="number" id="pmProf\"""",
    """            <div class="param-line" title="Herramienta con la que se mecaniza este contorno (de la base de herramientas). «La general» es la de ⚙️ Mecanizar. Si cambia de un contorno a otro, el programa la cambia con M06 y el plano la indica en la entrada (E2 · T102)">Herramienta <select id="pmHerr" style="max-width:150px"></select></div>
            <div class="param-line">Profundidad (mm) <input type="number" id="pmProf\"""")
rep("""        $('pmProf').value = m.prof > 0 ? m.prof : '';""",
    """        $('pmProf').value = m.prof > 0 ? m.prof : '';
        { const sH = $('pmHerr'), base = HB.leer(), Tm = m.T > 0 ? normT(m.T) : null;
          sH.innerHTML = `<option value="">La general (T${String(normT(cfgMec.T) || 101).padStart(3, '0')})</option>` + base.map(h => `<option value="${h.T}">T${h.T} · ${String(h.nombre).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</option>`).join('')
            + (Tm && !base.some(h => h.T === Tm) ? `<option value="${Tm}">T${Tm} (no está en la base)</option>` : '');
          sH.value = Tm ? String(Tm) : ''; sH.disabled = esIsla(c); }""")
rep("""            if (c.mec.op === 'cajera') c.mec.caj = { estr: $('pmCajEstr').value, paso: Math.min(100, Math.max(5, v('pmCajPaso') || 50)), entrada: $('pmCajEnt').value };""",
    """            if (c.mec.op === 'cajera') c.mec.caj = { estr: $('pmCajEstr').value, paso: Math.min(100, Math.max(5, v('pmCajPaso') || 50)), entrada: $('pmCajEnt').value };
            if (+$('pmHerr').value > 0) c.mec.T = +$('pmHerr').value;""")
rep("""        $('pmOp').addEventListener('change', () => { guardar(); refrescar(); });""",
    """        $('pmOp').addEventListener('change', () => { guardar(); refrescar(); });
        $('pmHerr').addEventListener('change', () => { guardar(); refrescar(); });""")

# ── Plano: la entrada lleva su herramienta cuando el ejercicio usa varias ──
rep("""        cerrados.forEach(({ c, i }, k) => {
            const p0 = c.pts[0], dir = tangenteInicial(c.pts[0], c.pts[1], c.b[0] || 0);""",
    """        const conHerr = variasHerramientas(lista);
        cerrados.forEach(({ c, i }, k) => {
            const p0 = c.pts[0], dir = tangenteInicial(c.pts[0], c.pts[1], c.b[0] || 0);""")
rep("""            texto(add(p0, add(mulv(nV, 1.3*h), mulv(dir, -0.9*h))), cerrados.length > 1 ? 'E' + (k + 1) : 'E', 0, null);""",
    """            texto(add(p0, add(mulv(nV, 1.3*h), mulv(dir, -0.9*h))), (cerrados.length > 1 ? 'E' + (k + 1) : 'E') + (conHerr ? ' · T' + tDeContorno(c) : ''), 0, null);""")

# ── Intérprete: herramienta activa, husillo y cambio de herramienta ──
rep("""    const est = { mov:null, abs:true, polar:false, pulg:false, plano:17, comp:40, compPend:null, compRun:0 };""",
    """    const est = { mov:null, abs:true, polar:false, pulg:false, plano:17, comp:40, compPend:null, compRun:0, T:null, Tsel:null, husillo:null, tras06:false };
    // Herramienta: con M06 en el programa, la T se cambia en el M06 (T102 M06); sin M06, vale la T escrita (programas de una herramienta)
    const usaM06 = /(^|[^A-Z0-9])M0?6(?![0-9])/i.test(texto.replace(/\\([^)]*\\)/g, ' ').replace(/;.*$/gm, ' '));""")
rep("""        if (palabras.some(w => w.l === 'G' && Math.round(w.v) === 80)) est.ciclo = false;""",
    """        if (palabras.some(w => w.l === 'G' && Math.round(w.v) === 80)) est.ciclo = false;
        // Herramienta y husillo (T, M03, M04, M05, M06), en el orden en que actúan en el bloque
        { const Tw = palabras.filter(w => w.l === 'T'), Ms = palabras.filter(w => w.l === 'M').map(w => Math.round(w.v));
          if (Tw.length) { est.Tsel = normT(Tw[Tw.length - 1].v); if (!usaM06) est.T = est.Tsel; }
          if (Ms.includes(5)) est.husillo = false;
          if (Ms.includes(6)) {
              if (est.Tsel === null) nota('aviso', li, `${etiqueta}: M06 sin herramienta: escribe la T antes (por ejemplo, T102 M06).`, { cat:'herramienta' });
              else {
                  if (z !== null && z < -1e-9) nota('error', li, `${etiqueta}: cambio de herramienta (M06) con la fresa dentro de la pieza (Z${fmt(z, 3)}).`, { cat:'seguridad', pista:'antes del cambio, sube a la altura de seguridad (por ejemplo, G0 Z20)' });
                  else if (z !== null && z < 5 - 1e-9) nota('error', li, `${etiqueta}: cambio de herramienta (M06) con la fresa abajo (Z${fmt(z, 3)}), sin subir a la altura de seguridad.`, { cat:'seguridad', pista:'antes del cambio, sube a la altura de seguridad (por ejemplo, G0 Z20)' });
                  if (est.husillo === true && !Ms.includes(5)) nota('aviso', li, `${etiqueta}: cambio de herramienta con el husillo en marcha: falta M05 antes del M06 (muchas máquinas lo paran solas, pero conviene escribirlo).`, { cat:'herramienta' });
                  est.T = est.Tsel; est.husillo = false; est.tras06 = true;
              }
          }
          if (Ms.includes(3) || Ms.includes(4)) est.husillo = true;
        }""")
rep("""            else if (g === 28 || g === 30) ignorar('G' + g + ' (vuelta a referencia)', li, etiqueta);""",
    """            else if (g === 28) nota('aviso', li, `${etiqueta}: G28 depende del control (en Fanuc vuelve al punto de referencia; en Fagor es otra cosa). Para subir antes de un cambio de herramienta, usa G0 Z… (por ejemplo, G0 Z20).`, { cat:'herramienta' });
            else if (g === 30) ignorar('G30 (vuelta a referencia)', li, etiqueta);""")
rep("""        const base = { linea:li, etiqueta, texto:original.trim(), z0, z1, abs:est.abs, polar:est.polar && est.plano === 17, mov:est.mov, w:{ X, Y, I, J, R }, k, ord: orden++, comp:est.comp, compRun:est.compRun };""",
    """        const base = { linea:li, etiqueta, texto:original.trim(), z0, z1, abs:est.abs, polar:est.polar && est.plano === 17, mov:est.mov, w:{ X, Y, I, J, R }, k, ord: orden++, comp:est.comp, compRun:est.compRun, T:est.T };""")
rep("""        const corta = hayZ ? (Math.min(z0 === null ? 1 : z0, z1 === null ? 1 : z1) < -1e-9) : est.mov !== 0;""",
    """        const corta = hayZ ? (Math.min(z0 === null ? 1 : z0, z1 === null ? 1 : z1) < -1e-9) : est.mov !== 0;
        // después de un cambio de herramienta, cortar sin haber arrancado el husillo
        if (corta && est.mov !== 0 && est.tras06 && est.husillo === false) { nota('error', li, `${etiqueta}: corta con el husillo parado: después del cambio de herramienta (M06) falta arrancarlo con M03 S….`, { cat:'seguridad', pista:'después de T… M06, arranca el husillo: M03 S… (con las revoluciones de la nueva fresa)' }); est.husillo = true; }""")
rep("""                if (z1 !== z0) movZ.push({ ord: orden++, p:{ ...pos }, z0, z1, linea:li, etiqueta, texto:original.trim(), rapido: est.mov === 0, abs:est.abs, mov:est.mov, comp:est.comp });""",
    """                if (z1 !== z0) movZ.push({ ord: orden++, p:{ ...pos }, z0, z1, linea:li, etiqueta, texto:original.trim(), rapido: est.mov === 0, abs:est.abs, mov:est.mov, comp:est.comp, T:est.T });""")

# ── Compensación con el radio de cada tramo ──
rep("""function compensarItems(items, R) {
    if (!(R > 0) || !items.some(it => it.comp === 41 || it.comp === 42)) return items;""",
    """function compensarItems(items, R0) {
    // R es el radio de la herramienta del tramo que se está calculando (cada tramo lleva el suyo: it.R)
    let R = R0;
    const radioIt = it => it && it.R > 0 ? it.R : R0;
    if (!(R0 > 0 || items.some(it => it.R > 0)) || !items.some(it => it.comp === 41 || it.comp === 42)) return items;""")
rep("""    items.forEach((it, idx) => {
        if (it.tipo !== 'xy') { it.pc = pos ? { ...pos } : it.p; out.push(it); return; }
        const g = it.sg, comp = it.comp === 41 || it.comp === 42 ? it.comp : 40, s = comp === 41 ? 1 : -1;""",
    """    items.forEach((it, idx) => {
        if (it.tipo !== 'xy') { it.pc = pos ? { ...pos } : it.p; out.push(it); return; }
        R = radioIt(it);
        const g = it.sg, comp = it.comp === 41 || it.comp === 42 ? it.comp : 40, s = comp === 41 ? 1 : -1;""")
rep("""        const s = z.comp === 41 ? 1 : -1, giro = cross(tgFin(z.sg), tgIni(a.sg));
        if (giro * s <= 1e-9) return;""",
    """        const s = z.comp === 41 ? 1 : -1, giro = cross(tgFin(z.sg), tgIni(a.sg));
        if (giro * s <= 1e-9) return;
        R = radioIt(a);""")
rep("""    quitarBucles(out, R);
    return out;
}""", """    quitarBucles(out, Math.max(R0 || 0, ...out.map(it => it.R || 0)));
    return out;
}""")
rep("""    prog.segs.forEach(sg => items.push({ ord:sg.ord, tipo:'xy', sg, linea:sg.linea, etiqueta:sg.etiqueta, texto:sg.texto, z0:sg.z0, z1:sg.z1, rapido:sg.rapido, corte:sg.corte, abs:sg.abs, mov:sg.mov, comp:sg.comp,""",
    """    prog.segs.forEach(sg => items.push({ ord:sg.ord, tipo:'xy', sg, linea:sg.linea, etiqueta:sg.etiqueta, texto:sg.texto, z0:sg.z0, z1:sg.z1, rapido:sg.rapido, corte:sg.corte, abs:sg.abs, mov:sg.mov, comp:sg.comp, T:sg.T, R:radioDeHerramienta(sg.T, R),""")

# ── Corrección: camino del centro con el radio de la herramienta de cada contorno ──
rep("""            const eq = (equidistante(o.c, R, sg, 'redondas') || []).filter(k => k.cerrado && k.pts.length >= 2);""",
    """            const Rc = variasHerramientas() ? radioDeHerramienta(tDeContorno(o.c), R) : R;
            const eq = (equidistante(o.c, Rc, sg, 'redondas') || []).filter(k => k.cerrado && k.pts.length >= 2);""")
rep("""        const clave = JSON.stringify([R, orden.map(o => [o.i, o.c.pts, o.c.b, tipos[o.i]])]);""",
    """        const clave = JSON.stringify([R, orden.map(o => [o.i, o.c.pts, o.c.b, tipos[o.i], variasHerramientas() ? tDeContorno(o.c) : 0])]);""")
# ── Corrección: herramienta de cada contorno ──
rep("""    // ── Compensación de radio: lado, activación y anulación ──
    const comp = comprobarCompensacion(prog, cortes, orden, tipos, R, tol, reqComp, usaComp, modoComp);""",
    """    // ── Herramienta de cada contorno (si el ejercicio pide varias): cuenta como «lo pedido», no estropea la pieza ──
    const herrH = variasHerramientas() ? comprobarHerramientas(prog, cortes, orden, solTramos, tol, paso, idxSol) : [];
    // ── Compensación de radio: lado, activación y anulación ──
    const comp = comprobarCompensacion(prog, cortes, orden, tipos, R, tol, reqComp, usaComp, modoComp);""")
rep("""// ── Requisitos del ejercicio ──
function rangosBloques(segs, todos) {""",
    """// ── Herramientas: cada contorno se corta con la que pide el plano ──
function comprobarHerramientas(prog, cortes, orden, solTramos, tol, paso, idxSol) {
    const H = [];
    if (!cortes.some(s => s.T !== null && s.T !== undefined)) {
        const pide = [...new Set(orden.map(o => tDeContorno(o.c)))].map(T => 'T' + T).join(', ');
        H.push({ tipo:'error', cat:'herramienta', linea:null, msg:`El ejercicio pide varias herramientas (${pide}) y el programa no indica ninguna: escribe T… M06 antes de los contornos de cada una.`,
            pista:'antes de cada grupo de contornos: G0 Z20 · M05 · T102 M06 · M03 S…' });
        return H;
    }
    // cada corte que va sobre el contorno: ¿de qué contorno es y con qué herramienta lo corta?
    const porContorno = new Map();
    cortes.forEach(sg => {
        if (sg.estado !== 'ok') return;
        const m = muestrasSeg(sg, paso), q = m[Math.floor(m.length / 2)];
        const t = idxSol.cerca(q).find(x => distASeg(q, x) <= tol); if (!t) return;
        const r = porContorno.get(t.ci) || { ci:t.ci, entrada:t.entrada, mal:[], usadas:new Set() };
        r.usadas.add(sg.T); if (sg.T !== tDeContorno(contornos[t.ci])) r.mal.push(sg);
        porContorno.set(t.ci, r);
    });
    porContorno.forEach(r => {
        if (!r.mal.length) return;
        const pide = tDeContorno(contornos[r.ci]), h = HB.porT(pide), sg = r.mal[0];
        H.push({ tipo:'error', cat:'herramienta', linea:sg.linea, seg:sg, cortes:r.mal.length,
            msg:`${sg.etiqueta}: el contorno E${r.entrada} (C${r.ci + 1}) se corta con ${sg.T ? 'T' + sg.T : 'ninguna herramienta indicada'} y el plano pide T${pide}${h ? ' (' + h.nombre + ')' : ''}.`,
            pista:`antes de este contorno, cambia de herramienta: G0 Z20 · M05 · T${pide} M06 · M03 S${h ? h.S : '…'}` });
    });
    return H;
}
// ── Requisitos del ejercicio ──
function rangosBloques(segs, todos) {""")
rep("    hall.push(...req);\n", "    hall.push(...req, ...herrH);\n")
rep("incumple: req.some(h => h.tipo === 'error'),", "incumple: req.some(h => h.tipo === 'error') || herrH.some(h => h.tipo === 'error'),")
rep("    const incumple = H.filter(h => h.tipo === 'error' && h.cat === 'requisito').length;", "    const incumple = H.filter(h => h.tipo === 'error' && (h.cat === 'requisito' || h.cat === 'herramienta')).length;")
# compensación: las comprobaciones con el radio de la herramienta del tramo
rep("else if (activa && R > 0 && sg !== prog.segs[0] && largo(sg) < R - tol)", "else if (activa && R > 0 && sg !== prog.segs[0] && largo(sg) < radioDeHerramienta(sg.T, R) - tol)")
rep("            if (peor < R - Math.max(tol * 5, 0.1)) {", "            if (peor < (it.R > 0 ? it.R : R) - Math.max(tol * 5, 0.1)) {")
# la categoría en la lista de la corrección
rep("""    const cat = { geometria:'Geometría', seguridad:'Seguridad', fuera:'Zona que sobra', requisito:'Lo pedido', compensacion:'Compensación' };""",
    """    const cat = { geometria:'Geometría', seguridad:'Seguridad', fuera:'Zona que sobra', requisito:'Lo pedido', compensacion:'Compensación', herramienta:'Herramienta' };""", 2)
# simulación del programa del alumno: la huella y la fresa con el radio de cada tramo
rep("""        const centros = hechosIt.map(x => ({ g: x.cg || x.sg, corte: x.corte, comp: !!x.cg && x.cg !== x.sg }));   // por donde va el centro
        if (act && act.tipo === 'xy') { if (act.sg) hechos.push(segParcial(act.sg, f)); centros.push({ g: segParcial(act.cg || act.sg, f), corte: act.corte, comp: !!act.cg && act.cg !== act.sg }); }""",
    """        const centros = hechosIt.map(x => ({ g: x.cg || x.sg, corte: x.corte, comp: !!x.cg && x.cg !== x.sg, D: x.R > 0 ? 2 * x.R : D }));   // por donde va el centro
        if (act && act.tipo === 'xy') { if (act.sg) hechos.push(segParcial(act.sg, f)); centros.push({ g: segParcial(act.cg || act.sg, f), corte: act.corte, comp: !!act.cg && act.cg !== act.sg, D: act.R > 0 ? 2 * act.R : D }); }""")
rep("""        if (sim.huella && D > 0) centros.filter(c => c.corte).forEach(c => { g.lineCap = 'round'; g.lineJoin = 'round'; trazar(c.g, oscuro ? 'rgba(230,126,34,.16)' : 'rgba(230,126,34,.14)', D * V.z); g.lineCap = 'butt'; });""",
    """        if (sim.huella && D > 0) centros.filter(c => c.corte).forEach(c => { g.lineCap = 'round'; g.lineJoin = 'round'; trazar(c.g, oscuro ? 'rgba(230,126,34,.16)' : 'rgba(230,126,34,.14)', c.D * V.z); g.lineCap = 'butt'; });""")
rep("""            const pz = puntoItem(act, f), q = P(pz.p), rr = Math.max(4, D / 2 * V.z);""",
    """            const pz = puntoItem(act, f), q = P(pz.p), rr = Math.max(4, (act.R > 0 ? act.R : D / 2) * V.z);""")

# ── Hoja de ejercicio: herramientas por contorno ──
rep("""<td><span class="et">Herramienta</span><span class="v">${esc(H.herramienta)}</s""",
    """<td><span class="et">Herramienta${variasHerramientas() ? 's' : ''}</span><span class="v">${variasHerramientas() ? textoHerramientasHoja() : esc(H.herramienta)}</s""")
rep("""function hayRequisitos() {""", """// «T101 · Fresa plana Ø6: E1, E3 · T102 · Fresa plana Ø3: E2» (la entrada de cada contorno, como en el plano)
function textoHerramientasHoja() {
    const tipos = tiposResueltos();
    const cs = contornos.map((c, i) => ({ c, i })).filter(o => o.c.pts.length >= 2 && !soloFabricar(o.c)).sort((a, b) => (rangoMecanizado(tipos[a.i], a.c) - rangoMecanizado(tipos[b.i], b.c)) || a.i - b.i);
    const grupos = new Map(); cs.forEach((o, k) => { const T = tDeContorno(o.c); if (!grupos.has(T)) grupos.set(T, []); grupos.get(T).push('E' + (k + 1)); });
    const e = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return [...grupos.entries()].map(([T, es]) => { const h = HB.porT(T); return `T${T}${h ? ' · ' + e(h.nombre) : ''}: ${es.join(', ')}`; }).join('<br>');
}
function hayRequisitos() {""")

# ── Tabla de soluciones (programa ISO): con varias herramientas, el cambio con T… M06 ──
rep("""        let modal = null;
        const zLinea = t => { if (modal === 'G91') { lineas.push('G90 ' + t); modal = 'G90'; } else lineas.push(t); };
        d.grupos.forEach(g => {
            lineas.push(`(${sinTildes(g.titulo.replace(' · ', ' ')).toUpperCase()})`);
            zLinea(`G0 Z${zSeg}`);""",
    """        let modal = null;
        const zLinea = t => { if (modal === 'G91') { lineas.push('G90 ' + t); modal = 'G90'; } else lineas.push(t); };
        // Con varias herramientas: antes de cada contorno que cambia de herramienta, ya arriba, M05 · T… M06 · M03 S…
        const cambiaHerr = variasHerramientas();
        let tActual = null;
        if (cambiaHerr) lineas.push('(CAMBIO DE HERRAMIENTA CON T... M06, A LA ALTURA DE SEGURIDAD)');
        d.grupos.forEach(g => {
            lineas.push(`(${sinTildes(g.titulo.replace(' · ', ' ')).toUpperCase()})`);
            zLinea(`G0 Z${zSeg}`);
            const tG = cambiaHerr ? tDeContorno(contornos[g.ci]) : null;
            if (tG && tG !== tActual) {
                const h = HB.porT(tG);
                if (tActual !== null) lineas.push('M05');
                lineas.push(`T${tG} M06`, `M03 S${h && +h.S > 0 ? Math.round(+h.S) : 12000}`);
                tActual = tG;
            }""")

# ── Simulación del plano: la huella y la fresa dibujada, con el diámetro de la herramienta de cada tramo ──
rep("""    const hechos = hechosIt.filter(x => x.sg).map(x => x.sg), centros = hechosIt.map(x => ({ g: x.cg || x.sg, rapido: x.rapido, comp: !!x.cg && x.cg !== x.sg }));
    if (act && act.tipo === 'xy') { if (act.sg) hechos.push(segParcial(act.sg, f)); centros.push({ g: segParcial(act.cg || act.sg, f), rapido: act.rapido, comp: !!act.cg && act.cg !== act.sg }); }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (D > 0) centros.filter(c => !c.rapido).forEach(c => trazo(c.g, 'rgba(230,126,34,.16)', D * view.z));      // huella de la fresa""",
    """    const Dde = x => x && x.R > 0 ? 2 * x.R : D;          // cada tramo con su herramienta (T… M06)
    const hechos = hechosIt.filter(x => x.sg).map(x => x.sg), centros = hechosIt.map(x => ({ g: x.cg || x.sg, rapido: x.rapido, comp: !!x.cg && x.cg !== x.sg, D: Dde(x) }));
    if (act && act.tipo === 'xy') { if (act.sg) hechos.push(segParcial(act.sg, f)); centros.push({ g: segParcial(act.cg || act.sg, f), rapido: act.rapido, comp: !!act.cg && act.cg !== act.sg, D: Dde(act) }); }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    centros.filter(c => !c.rapido && c.D > 0).forEach(c => trazo(c.g, 'rgba(230,126,34,.16)', c.D * view.z));      // huella de la fresa""")
rep("""    const pz = act ? puntoItem(act, f) : { p:{ x:0, y:0 } }, q = aPantalla(pz.p), rr = Math.max(5, D / 2 * view.z), corta = act && !act.rapido;""",
    """    // la fresa dibujada: la del tramo (en los movimientos en Z, la del último tramo en XY)
    let hAct = act; if (hAct && hAct.tipo !== 'xy') { for (let k = i; k >= 0; k--) if (simP.items[k].tipo === 'xy') { hAct = simP.items[k]; break; } }
    const pz = act ? puntoItem(act, f) : { p:{ x:0, y:0 } }, q = aPantalla(pz.p), rr = Math.max(5, Dde(hAct) / 2 * view.z), corta = act && !act.rapido;""")
# al cambiar la herramienta de un contorno (o la base), la simulación se rehace
rep("""function firmaSimPlano() { return JSON.stringify([contornos.map(c => [c.pts, c.b, c.cerrado, c.tipo]), document.getElementById('tbProg').value, document.getElementById('tbArco').value, document.getElementById('spComp').value, cfgFresa.d]); }""",
    """function firmaSimPlano() { return JSON.stringify([contornos.map(c => [c.pts, c.b, c.cerrado, c.tipo, c.mec && c.mec.T]), document.getElementById('tbProg').value, document.getElementById('tbArco').value, document.getElementById('spComp').value, cfgFresa.d, cfgMec.T,
    variasHerramientas() ? HB.leer().map(h => h.T + ':' + h.d).join() : '']); }""")

open(P, 'w', encoding='utf-8').write(s)
print('Calcador: herramienta por contorno y cambio con M06')
