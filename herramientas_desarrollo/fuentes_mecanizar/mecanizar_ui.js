// ════════════════════════════════════════════════════════════════════
//  VENTANA «⚙️ MECANIZAR»: parámetros de la máquina, vista previa del
//  recorrido y G-code listo para la máquina (motor MEC, en mm reales)
// ════════════════════════════════════════════════════════════════════
// (cfgMec se declara junto a cfgFresa, en el script principal)
let ultimoMec = null, mecMontado = false;
const escMec = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const MEC_CAMPOS = { mecT:'T', mecF:'F', mecF0:'F0', mecS:'S', mecZseg:'zSeg', mecProf:'prof', mecPaso:'paso', mecAcab:'acab', mecCoord:'coord', mecComp:'comp', mecEstr:'estr', mecUnid:'unid' };
function abrirMec() {
    if (!contornos.some(c => c.pts.length >= 2)) { snack('Dibuja o abre primero la pieza'); return; }
    if (!mecMontado) {
        mecMontado = true;
        HB.montarSelector(document.getElementById('mecHerr'), h => {
            aplicarHerramientaCalc(h);
            Object.assign(cfgMec, { T:h.T, F:h.F, S:h.S }); if (h.paso > 0) cfgMec.paso = h.paso;
            pintarCamposMec(); generarMec();
        });
        Object.keys(MEC_CAMPOS).forEach(id => document.getElementById(id).addEventListener(document.getElementById(id).tagName === 'SELECT' ? 'change' : 'input', () => { leerMec(); generarMecPronto(); }));
        document.getElementById('mecD').addEventListener('input', e => {
            const v = numES(e.target.value); if (!(v > 0)) return;
            const f = document.getElementById('fresaD'); f.value = v; f.dispatchEvent(new Event('input'));
            HB.marcar(document.getElementById('mecHerr'), ''); generarMecPronto();
        });
        document.getElementById('mecAncho').addEventListener('change', e => { cfgMec.ancho = e.target.checked; guardarAutoPronto(); dibujarMec(); });
        window.addEventListener('resize', () => { if (document.getElementById('modalMec').classList.contains('visible')) dibujarMec(); });
    }
    pintarCamposMec();
    document.getElementById('modalMec').classList.add('visible');
    generarMec();
}
let tMec = null;
function generarMecPronto() { clearTimeout(tMec); tMec = setTimeout(generarMec, 300); }
function cerrarMec() { document.getElementById('modalMec').classList.remove('visible'); }
function pintarCamposMec() {
    Object.entries(MEC_CAMPOS).forEach(([id, k]) => { document.getElementById(id).value = cfgMec[k]; });
    document.getElementById('mecD').value = cfgFresa.d;
    document.getElementById('mecAncho').checked = !!cfgMec.ancho;
    HB.marcar(document.getElementById('mecHerr'), cfgFresa.herr && cfgFresa.herr.id || '');
}
function leerMec() {
    Object.entries(MEC_CAMPOS).forEach(([id, k]) => {
        const el = document.getElementById(id);
        if (el.tagName === 'SELECT') cfgMec[k] = el.value;
        else { const v = numES(el.value); if (isFinite(v)) cfgMec[k] = v; }
    });
    guardarAutoPronto();
}
function generarMec() {
    const P = { feed:cfgMec.F, feedPos:cfgMec.F0, tool:cfgMec.T, toolR:(+cfgFresa.d || 0) / 2, spindle:cfgMec.S, zSafe:Math.abs(+cfgMec.zSeg),
        zTotal:-Math.abs(+cfgMec.prof), zStep:Math.abs(+cfgMec.paso), sobre:Math.max(0, +cfgMec.acab || 0), coord:cfgMec.coord, comp:cfgMec.comp,
        estrategia:cfgMec.estr, unidades:cfgMec.unid, nombre:nombreProyecto(), nombreHerr: cfgFresa.herr ? cfgFresa.herr.nombre : '' };
    const res = document.getElementById('mecResumen'), txt = document.getElementById('mecTexto');
    let out;
    if (!(P.zTotal < 0)) out = { error:'La profundidad tiene que ser mayor que 0' };
    else { try { out = MEC.generar(trazadosParaMecanizar(), P); } catch (e) { out = { error:'Error interno: ' + e.message }; } }
    ultimoMec = out.error ? null : out;
    ['mecDescargar', 'mecCopiar', 'mecSimular'].forEach(id => { document.getElementById(id).disabled = !ultimoMec; });
    if (out.error) { txt.value = ''; res.innerHTML = `<div class="mec-error">⚠ ${escMec(out.error)}</div>`; dibujarMec(); return; }
    // (en pantalla, como mucho 5000 líneas: maquetar un texto enorme bloquearía la ventana; la descarga lleva el programa entero)
    const lineas = out.nc.split('\n');
    txt.value = lineas.length > 5000 ? lineas.slice(0, 5000).join('\n') + `\n; … y ${lineas.length - 5000} líneas más: el programa completo está en la descarga y en el Simulador` : out.nc;
    // resumen: trazados, pasadas, recorrido y tiempo estimado
    const prog = out.prog = interpretarISO(out.nc);
    let lCorte = 0, lRap = 0, tiempo = 0;
    prog.segs.forEach(s => { const L = s.tipo === 'A' ? Math.abs(s.theta) * s.r : dist(s.p1, s.p2), dz = Math.abs((s.z1 ?? 0) - (s.z0 ?? 0)), l = Math.hypot(L, dz);
        if (s.rapido) { lRap += l; tiempo += l / P.feedPos; } else { lCorte += l; tiempo += l / P.feed; } });
    (prog.movZ || []).forEach(m => { const l = Math.abs((m.z1 ?? 0) - (m.z0 ?? 0)); tiempo += l / (m.rapido ? P.feedPos : P.feed); });
    const tz = trazadosParaMecanizar(), cuenta = op => tz.filter(t => op === 'grabado' ? (t.op === 'grabado' || t.abierto) : !t.abierto && t.op === op).length;
    const partes = [['corte', 'corte'], ['grabado', 'grabado'], ['cajera', 'cajera'], ['isla', 'isla']].map(([op, n]) => { const k = cuenta(op); return k ? `${k} ${n}${k > 1 ? (n.endsWith('a') ? 's' : 's') : ''}` : ''; }).filter(Boolean).join(' · ');
    const min = Math.floor(tiempo), seg = Math.round((tiempo - min) * 60);
    res.innerHTML = `<div><b>${partes}</b> · pasadas en Z: ${out.pasadas.map(z => fmt(z, 2)).join(', ')}</div>
        <div>Recorrido de corte <b>${fmt(lCorte / 1000, 2)} m</b> · en rápido ${fmt(lRap / 1000, 2)} m · tiempo estimado <b>${min} min ${String(seg).padStart(2, '0')} s</b> · ${out.nc.split('\n').filter(l => l.trim() && !l.trim().startsWith(';')).length} bloques</div>`
        + (P.comp !== 'G40' ? `<div class="mec-nota">Con G41/G42 la fresa baja fuera del contorno (a Ø + 2 mm, por el lado de la fresa), activa la compensación en una recta de entrada perpendicular al contorno y la anula con G40 en una recta de salida. Pon la entrada (P1) en el centro de un lado, no en una esquina.</div>` : '')
        + (out.herramientas && out.herramientas.length > 1 ? `<div>Herramientas: ${out.herramientas.map(h => `<b>T${String(h.T).padStart(3, '0')}</b> Ø${fmt(+h.d, 2)} (${h.n} contorno${h.n > 1 ? 's' : ''})`).join(' → ')} · un cambio con M06 por herramienta</div>` : '')
        + tz.filter(t => t.herrFalta).map(t => `<div class="mec-aviso">⚠ El contorno C${t.ci + 1} pide la herramienta T${t.herrFalta}, que no está en la base de herramientas: se usa la general (T${String(cfgMec.T).padStart(3, '0')}).</div>`).join('')
        + (out.pasadas.length > 50 ? `<div class="mec-aviso">⚠ ${out.pasadas.length} pasadas en Z: ¿el paso (${fmt(cfgMec.paso, 3)} mm) es correcto?</div>` : '')
        + out.avisos.map(a => `<div class="mec-aviso">⚠ ${escMec(a)}</div>`).join('');
    dibujarMec();
}
function dibujarMec() {
    const cv = document.getElementById('mecLienzo'), W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return;
    const dpr = window.devicePixelRatio || 1; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const oscuro = typeof modoOscuro !== 'undefined' && !!modoOscuro;
    g.fillStyle = oscuro ? '#1b232b' : '#f7f9fb'; g.fillRect(0, 0, W, H);
    const prog = ultimoMec ? (ultimoMec.prog || (ultimoMec.prog = interpretarISO(ultimoMec.nc))) : { segs:[] };
    const pts = [].concat(...contornos.filter(c => c.pts.length >= 2).map(c => muestrearContorno(c)));
    prog.segs.forEach(s => { pts.push(s.p1, s.p2); });
    if (!pts.length) return;
    const R = (+cfgFresa.d || 0) / 2, bb = bboxPts(pts), mg = 24;
    const z = Math.min((W - 2 * mg) / Math.max(1e-6, bb.x1 - bb.x0 + 2 * R), (H - 2 * mg) / Math.max(1e-6, bb.y1 - bb.y0 + 2 * R));
    const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, P = q => [W / 2 + (q.x - cx) * z, H / 2 - (q.y - cy) * z];
    const linea = (ps, color, w, dash) => { if (ps.length < 2) return; g.strokeStyle = color; g.lineWidth = w; g.setLineDash(dash || []); g.beginPath(); ps.forEach((q, k) => { const [x, y] = P(q); k ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.setLineDash([]); };
    // muchas polilíneas del mismo estilo en un solo trazo (programas con miles de bloques)
    const lote = (listas, color, w, dash) => { g.strokeStyle = color; g.lineWidth = w; g.setLineDash(dash || []); g.beginPath(); listas.forEach(ps => ps.forEach((q, k) => { const [x, y] = P(q); k ? g.lineTo(x, y) : g.moveTo(x, y); })); g.stroke(); g.setLineDash([]); };
    const pasoM = Math.max(0.5, 1.5 / z);           // muestreo de los arcos según el zoom (≈ 1,5 px)
    const muestras = s => s.tipo === 'A' ? muestrasSeg(s, pasoM) : [s.p1, s.p2];      // las rectas, solo sus extremos
    g.lineCap = 'round'; g.lineJoin = 'round';
    let zMin = -1e-9; prog.segs.forEach(s => { if (s.z1 !== null && s.z1 < zMin) zMin = s.z1; });
    const cortes = prog.segs.filter(s => !s.rapido && s.z1 !== null && s.z1 < -1e-9);
    // la franja que se lleva la fresa
    // (con G41/G42, centrada en la trayectoria real del centro de la fresa)
    if (cfgMec.ancho && R > 0) {
        // cada tramo con el radio de la herramienta que lo corta (T… M06)
        let caminos = cortes.map(s => ({ g:s, r:radioDeHerramienta(s.T, R) }));
        // (la trayectoria compensada se calcula para la vista solo en programas de tamaño normal)
        if (cfgMec.comp !== 'G40' && cortes.length <= 4000) { try { caminos = itemsDePrograma(prog, R).items.filter(it => it.tipo === 'xy' && !it.rapido && it.sg && it.sg.z1 !== null && it.sg.z1 < -1e-9).map(it => ({ g:it.cg || it.sg, r:it.R > 0 ? it.R : R })); } catch (e) { caminos = cortes.map(s => ({ g:s, r:radioDeHerramienta(s.T, R) })); } }
        // la misma franja repetida en cada pasada no se dibuja dos veces
        const vistos = new Set(), porRadio = new Map();
        caminos.forEach(({ g:s, r }) => { const k = [s.p1.x, s.p1.y, s.p2.x, s.p2.y, r].map(v => v.toFixed(3)).join(); if (vistos.has(k)) return; vistos.add(k); if (!porRadio.has(r)) porRadio.set(r, []); porRadio.get(r).push(muestras(s)); });
        [...porRadio.entries()].sort((a, b) => b[0] - a[0]).forEach(([r, ls]) => lote(ls, oscuro ? 'rgba(230,126,34,.16)' : 'rgba(230,126,34,.13)', 2 * r * z));
    }
    // la pieza
    const tipos = tiposResueltos();
    contornos.forEach((c, i) => { if (c.pts.length < 2) return; const m = muestrearContorno(c); linea(c.cerrado ? m.concat([m[0]]) : m, tipos[i] === 'interior' ? '#d64545' : tipos[i] === 'abierto' ? '#7f8c8d' : '#1e6fd9', 1.4); });
    // rápidos y cortes (más oscuros cuanto más hondos)
    lote(prog.segs.filter(s => s.rapido).map(s => [s.p1, s.p2]), oscuro ? 'rgba(200,210,220,.5)' : 'rgba(90,105,120,.55)', 1, [4, 4]);
    const NIV = 6, niveles = Array.from({ length:NIV }, () => []);
    cortes.forEach(s => niveles[Math.min(NIV - 1, Math.floor(Math.min(1, s.z1 / zMin) * NIV - 1e-9))].push(muestras(s)));
    niveles.forEach((ls, k) => { const f = (k + 1) / NIV; if (ls.length) lote(ls, `rgb(${Math.round(240 - 110 * f)},${Math.round(150 - 90 * f)},${Math.round(60 - 40 * f)})`, 1.6); });
    // cero pieza
    const [ox, oy] = P({ x:0, y:0 });
    g.lineWidth = 2; g.strokeStyle = '#d64545'; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + 26, oy); g.stroke();
    g.strokeStyle = '#2e9e52'; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox, oy - 26); g.stroke();
    g.fillStyle = oscuro ? '#fff' : '#1c2733'; g.beginPath(); g.arc(ox, oy, 3.5, 0, 2 * Math.PI); g.fill();
}
function descargarMec() { if (!ultimoMec) return; descargar(ultimoMec.nc, nombreProyecto() + '.nc', 'text/plain'); snack('G-code descargado: ' + nombreProyecto() + '.nc'); }
function copiarMec() { if (!ultimoMec) return; navigator.clipboard.writeText(ultimoMec.nc).then(() => snack('G-code copiado'), () => { const t = document.getElementById('mecTexto'); t.select(); document.execCommand('copy'); snack('G-code copiado'); }); }
function simularMec() { if (!ultimoMec) return; abrirEnSimulador(ultimoMec.nc, nombreProyecto() + ' (mecanizado).nc'); }
