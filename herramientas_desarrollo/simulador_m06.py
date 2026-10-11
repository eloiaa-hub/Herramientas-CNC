"""Simuladores: cambio de herramienta con T… M06.

Cada movimiento lleva su herramienta (la de la base compartida con esa T). El corte del material, la compensación
G41/G42 y la fresa dibujada usan la herramienta de cada tramo; sin T (o con una T que no está en la base) se usa la
del panel. La revisión avisa de los errores típicos del cambio (fresa abajo, falta M05, cortar sin M03) y de G28.

Uso: python3 simulador_m06.py simulador3d.html simulador3d_profesor.html
"""
import sys
for f in sys.argv[1:]:
    s = open(f, encoding='utf-8').read()
    def rep(a, b, cnt=1):
        global s
        n = s.count(a)
        assert n == cnt, f'{f}: {n} apariciones (se esperaban {cnt}) de: {a[:100]}'
        s = s.replace(a, b)

    # ── Intérprete: T, M06 y la herramienta de cada movimiento ──
    rep("""    let husillo = false;  // M3/M4 en marcha, M5 parado
    const meta = { lineaComp: null, compFinal: 40, fin: false, comaDecimal: [], noSoportados: [], ciclosIncr: null };""",
        """    let husillo = false;  // M3/M4 en marcha, M5 parado
    const meta = { lineaComp: null, compFinal: 40, fin: false, comaDecimal: [], noSoportados: [], ciclosIncr: null, cambios: [], g28: null };
    // Herramienta: con M06 en el programa, la T se cambia en el M06 (T102 M06); sin M06, vale la T escrita
    const usaM06 = /(^|[^A-Z0-9])M0?6(?![0-9])/i.test(texto.replace(/\\([^)]*\\)/g, ' ').replace(/;.*$/gm, ' '));
    let tSel = null, tAct = null, tras06 = false;""")
    rep("""            else if (g === 28 || g === 30) noSoportado('G' + g, idx+1, 'G' + g + ' (vuelta a referencia) no se simula: la fresa no se mueve en esta línea.');""",
        """            else if (g === 28) { if (!meta.g28) meta.g28 = idx+1; }
            else if (g === 30) noSoportado('G30', idx+1, 'G30 (vuelta a referencia) no se simula: la fresa no se mueve en esta línea.');""")
    rep("""        palabras.forEach(pw => {
            if (pw[0].toUpperCase() !== 'M') return;
            const m = Math.round(parseFloat(pw.slice(1)));
            if (m === 3 || m === 4) husillo = true;
            else if (m === 5) husillo = false;""",
        """        if ('T' in letras) { tSel = normT(letras.T); if (!usaM06) tAct = tSel; }
        palabras.forEach(pw => {
            if (pw[0].toUpperCase() !== 'M') return;
            const m = Math.round(parseFloat(pw.slice(1)));
            if (m === 3 || m === 4) husillo = true;
            else if (m === 5) husillo = false;
            else if (m === 6) { meta.cambios.push({ linea: idx+1, T: tSel, z, husillo }); if (tSel !== null) { tAct = tSel; husillo = false; tras06 = true; } }""")
    rep("""            const base = { f: ultimoF, linea: idx+1, textoLinea: linea.trim(), comp, xyProgramado: false, husillo, deCiclo: 'G' + ciclo.g };""",
        """            const base = { f: ultimoF, linea: idx+1, textoLinea: linea.trim(), comp, xyProgramado: false, husillo, deCiclo: 'G' + ciclo.g, T: tAct, tras06 };""")
    rep("""                      xyProgramado: ('X' in letras) || ('Y' in letras), husillo };""",
        """                      xyProgramado: ('X' in letras) || ('Y' in letras), husillo, T: tAct, tras06 };""")
    # ── Herramienta de cada movimiento (de la base, leída una vez por programa) ──
    rep("""// Centro de un arco I/J (relativo al punto de partida, ya en las mismas unidades)
function centroArcoIJ(mov) {""",
        """// Herramienta de la base para cada movimiento con T (null: la del panel)
function normT(t) { t = Math.round(+t); return t >= 1 && t < 100 ? t + 100 : t; }      // T1 → T101, como en la base
function asignarHerramientas(moves) {
    const base = new Map(HB.leer().map(h => [h.T, h])), faltan = new Set();
    moves.forEach(m => { const h = m.T ? base.get(m.T) : null; m.herr = h ? { T:h.T, d:h.d, tipo:h.tipo, angulo:h.angulo, nombre:h.nombre } : null; if (m.T && !h) faltan.add(m.T); });
    if (moves.meta) moves.meta.tSinBase = [...faltan];
    return moves;
}
// Ejecuta f con la herramienta h como si fuera la del panel (diámetro, tipo y ángulo); null: la del panel
function conHerramienta(h, f) {
    if (!h) return f();
    const antes = [diametroFresa, tipoFresa, anguloV];
    diametroFresa = h.d; tipoFresa = h.tipo || 'plana'; anguloV = h.angulo || anguloV;
    try { return f(); } finally { [diametroFresa, tipoFresa, anguloV] = antes; }
}
// Centro de un arco I/J (relativo al punto de partida, ya en las mismas unidades)
function centroArcoIJ(mov) {""")
    # compensación con el radio de la herramienta de cada cadena
    rep("""        compensarCadena(moves, muestras, i, j, m.comp === 41 ? 1 : -1, r);""",
        """        compensarCadena(moves, muestras, i, j, m.comp === 41 ? 1 : -1, m.herr ? m.herr.d / 2 : r);""")
    rep("""    avisosCompensacion = [];
    aplicarCompensacion(moves, muestras, diametroFresa/2);""",
        """    avisosCompensacion = [];
    asignarHerramientas(moves);
    aplicarCompensacion(moves, muestras, diametroFresa/2);""")
    # material: cada tramo con su herramienta
    rep("""        estamparTramo(posicionEnIndice(desde), posicionEnIndice(hasta));""",
        """        const pH = puntosPlanos[Math.min(puntosPlanos.length - 1, Math.ceil(hasta))], mH = pH ? gcodeMoves[pH.movIdx] : null;
        conHerramienta(mH && mH.herr, () => estamparTramo(posicionEnIndice(desde), posicionEnIndice(hasta)));""")
    # fresa dibujada: la de la herramienta del tramo
    rep("""    const mov = gcodeMoves[pos.movIdx];
    document.getElementById('infoX').textContent = pos.x.toFixed(2);""",
        """    const mov = gcodeMoves[pos.movIdx];
    // la fresa dibujada cambia con el M06
    const hM = mov && mov.herr, claveH = hM ? hM.T + '|' + hM.d + '|' + hM.tipo + '|' + hM.angulo : 'panel|' + diametroFresa + '|' + tipoFresa + '|' + anguloV;
    if (claveH !== herrVista) { herrVista = claveH; conHerramienta(hM, reconstruirFresaSolida); diamVista = hM ? hM.d : diametroFresa; }
    const iH = document.getElementById('infoHerr');
    if (iH) iH.textContent = !mov ? '—' : hM ? `T${hM.T} · Ø${+(+hM.d).toFixed(2)}` : mov.T ? `T${mov.T} (no está en la base: Ø${+diametroFresa.toFixed(2)})` : `del panel · Ø${+diametroFresa.toFixed(2)}`;
    document.getElementById('infoX').textContent = pos.x.toFixed(2);""")
    rep("""function moverHerramientaA(idxFloat, lineaForzada) {""",
        """let herrVista = null, diamVista = null;      // herramienta dibujada ahora (cambia con T… M06)
function moverHerramientaA(idxFloat, lineaForzada) {""")
    rep("""                <div class="info-row"><span>Compensación</span><span id="infoComp">—</span></div>""",
        """                <div class="info-row"><span>Compensación</span><span id="infoComp">—</span></div>
                <div class="info-row" title="Herramienta que está trabajando: la del último T… M06 (de la base de herramientas) o, si el programa no la cambia, la del panel"><span>Herramienta</span><span id="infoHerr">—</span></div>""")
    # vista 2D: el círculo de la fresa con su diámetro
    rep("""r = Math.max(5, diametroFresa / 2 * V.z), corta = pos.z < -1e-9;""",
        """r = Math.max(5, (diamVista || diametroFresa) / 2 * V.z), corta = pos.z < -1e-9;""")
    # al cambiar la fresa del panel, se vuelve a dibujar
    rep("""function reconstruirFresaSolida() {""", """function reconstruirFresaSolida() {
    herrVista = null;""")
    # ── Revisión: el cambio de herramienta ──
    rep("""    if (sinF) add(sinF, 'error', 'Movimiento de corte sin avance F definido'""",
        """    // Cambio de herramienta (T… M06)
    (meta.cambios || []).forEach(c => {
        if (c.T === null) { add(c.linea, 'aviso', 'M06 sin herramienta: escribe la T antes (por ejemplo, T102 M06).'); return; }
        if (c.z !== null && c.z !== undefined && c.z < -1e-6) add(c.linea, 'error', 'Cambio de herramienta (M06) con la fresa dentro de la pieza (Z' + (+c.z.toFixed(3)) + '). Antes del cambio, sube a la altura de seguridad (por ejemplo, G0 Z20).');
        else if (c.z !== null && c.z !== undefined && c.z < 5 - 1e-6) add(c.linea, 'error', 'Cambio de herramienta (M06) con la fresa abajo (Z' + (+c.z.toFixed(3)) + '): sube antes a la altura de seguridad (por ejemplo, G0 Z20).');
        if (c.husillo) add(c.linea, 'aviso', 'Cambio de herramienta con el husillo en marcha: falta M05 antes del M06 (muchas máquinas lo paran solas, pero conviene escribirlo).');
    });
    { const sinM3 = gcodeMoves.find(m => m.tras06 && !m.husillo && m.tipo === 'corte' && Math.min(m.fromZ, m.z) < -1e-6);
      if (sinM3) add(sinM3.linea, 'error', 'Corta con el husillo parado: después del cambio de herramienta (M06) falta arrancarlo con M03 S….'); }
    (meta.tSinBase || []).forEach(T => { const m = gcodeMoves.find(x => x.T === T); add(m ? m.linea : null, 'aviso', 'La herramienta T' + T + ' no está en la base de herramientas: se simula con la fresa del panel (Ø' + (+diametroFresa.toFixed(2)) + '). Añádela a la base (🧰) para verla con su diámetro.'); });
    if (meta.g28) add(meta.g28, 'aviso', 'G28 depende del control (en Fanuc vuelve al punto de referencia; en Fagor es otra cosa) y no se simula. Para subir antes de un cambio de herramienta, usa G0 Z… (por ejemplo, G0 Z20).');
    if (sinF) add(sinF, 'error', 'Movimiento de corte sin avance F definido'""")
    # el aviso de «entrar sin husillo» de siempre no se repite cuando ya lo da el cambio
    rep("""        if (!husilloAvisado && m.tipo === 'corte' && Math.min(m.fromZ, m.z) < -1e-6 && !m.husillo) {""",
        """        if (!husilloAvisado && !m.tras06 && m.tipo === 'corte' && Math.min(m.fromZ, m.z) < -1e-6 && !m.husillo) {""")
    rep("""    res.sort((a, b) => a.linea - b.linea || (a.nivel === 'error' ? -1 : 1));
    mostrarRevision(res);
}""", """    res.sort((a, b) => a.linea - b.linea || (a.nivel === 'error' ? -1 : 1));
    mostrarRevision(res);
    return res;
}""")
    open(f, 'w', encoding='utf-8').write(s)
    print('M06:', f)
