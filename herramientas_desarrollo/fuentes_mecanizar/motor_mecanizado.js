// ════════════════════════════════════════════════════════════════════
//  MOTOR DE MECANIZADO (G-code de la máquina): pasadas en Z, desbaste y
//  acabado, puentes, grabados, cajeras con islas, estrategia de corte,
//  compensación y coordenadas absolutas o incrementales.
//  Traído del Generador de G-Code (v81), en milímetros reales.
//  No lee la pantalla: recibe los trazados y los parámetros y devuelve
//  { nc, avisos } o { error }.
//
//  trazado: { tipo:'exterior'|'interior', abierto, op:'corte'|'grabado'|'cajera'|'isla',
//             prof (mm, negativa) | null, caj:{ estr, paso, entrada },
//             puentes:{ n, ancho, alto, pts:[{x,y}] }, tramos:[{ p1, p2, b }] }
//    (tramos en mm respecto al cero pieza, en el orden dibujado y empezando por la entrada;
//     b es la curvatura del tramo: 0 recta, > 0 arco antihorario, < 0 horario)
//  trazado.herr (opcional): { T, d, F, S, paso, nombre } — herramienta propia del contorno (si no, la general de P)
//  P: { feed, feedPos, tool, toolR, spindle, zSafe, zTotal, zStep, sobre,
//       coord:'G90'|'G91'|'mixta' (G90 en la entrada y el cierre, G91 en el recorrido), comp:'G40'|'G41'|'G42'|'auto' (según el trazado), estrategia:'plano'|'concordancia'|'oposicion',
//       unidades:'G71'|'G70', nombre, origen:'el Calcador' }
// ════════════════════════════════════════════════════════════════════
const MEC = (() => {
    const fmtNum = n => { const t = (+n.toFixed(3)).toString(); return t === '-0' ? '0' : t; };
    const CUERDA_RECTA = 0.0125, CUERDA_NULA = 0.000025;      // como el Generador (0,5 px y 0,001 px a 40 px/mm)

    // Tramo (p1, p2, curvatura) → segmento de máquina: recta o arco con centro, radio, sentido y longitud
    function segmento(p1, p2, b) {
        const cuerda = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (!b || Math.abs(b) < 1e-12 || cuerda < CUERDA_RECTA) return { recta:true, p1:{ ...p1 }, p2:{ ...p2 }, L:cuerda, nulo: cuerda < CUERDA_NULA };
        const theta = 4 * Math.atan(b), u = { x:(p2.x - p1.x) / cuerda, y:(p2.y - p1.y) / cuerda }, nrm = { x:-u.y, y:u.x };
        const h = (cuerda / 2) * (1 - b * b) / (2 * b), c = { x:(p1.x + p2.x) / 2 + nrm.x * h, y:(p1.y + p2.y) / 2 + nrm.y * h };
        const r = Math.hypot(p1.x - c.x, p1.y - c.y), dir = b > 0 ? 1 : -1;
        return { recta:false, p1:{ ...p1 }, p2:{ ...p2 }, c, r, dir, a1:Math.atan2(p1.y - c.y, p1.x - c.x), L:r * Math.abs(theta), g: dir > 0 ? 'G3' : 'G2' };
    }
    // Sentido de recorrido de un trazado (área con signo, con el punto medio de cada arco)
    function antihorario(tramos) {
        const pts = [];
        tramos.forEach(t => { pts.push(t.p1); if (t.b) { const s = segmento(t.p1, t.p2, t.b); if (!s.recta) { const am = s.a1 + s.dir * s.L / s.r / 2; pts.push({ x:s.c.x + s.r * Math.cos(am), y:s.c.y + s.r * Math.sin(am) }); } } });
        if (tramos.length) pts.push(tramos[tramos.length - 1].p2);
        let area = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], q = pts[(i + 1) % pts.length]; area += a.x * q.y - q.x * a.y; }
        return area > 0;
    }
    // Contorno aplanado (arcos con flecha ≤ 0,002 mm), para las cajeras
    function contornoPlano(tramos) {
        const out = [];
        tramos.forEach(t => {
            const s = segmento(t.p1, t.p2, t.b);
            if (!out.length) out.push({ ...t.p1 });
            if (s.recta) { out.push({ ...t.p2 }); return; }
            const sw = s.dir * s.L / s.r, n = Math.max(4, Math.ceil(Math.abs(sw) / Math.max(1e-3, 2 * Math.acos(Math.max(-1, 1 - 0.002 / Math.max(s.r, 1e-6))))));
            for (let k = 1; k < n; k++) { const a = s.a1 + sw * k / n; out.push({ x:s.c.x + s.r * Math.cos(a), y:s.c.y + s.r * Math.sin(a) }); }
            out.push({ ...t.p2 });
        });
        if (out.length > 2 && Math.hypot(out[0].x - out[out.length - 1].x, out[0].y - out[out.length - 1].y) < 1e-9) out.pop();
        return out;
    }

    // Segmentos de máquina → polilínea (arcos con flecha ≤ 0,01 mm)
    function poliSeg(lista) {
        const out = [];
        lista.forEach(sg => {
            if (!out.length) out.push({ ...sg.p1 });
            if (sg.recta) { out.push({ ...sg.p2 }); return; }
            const sw = sg.dir * sg.L / sg.r, n = Math.max(4, Math.ceil(Math.abs(sw) / Math.max(1e-3, 2 * Math.acos(Math.max(-1, 1 - 0.01 / Math.max(sg.r, 1e-6))))));
            for (let k = 1; k < n; k++) { const a = sg.a1 + sw * k / n; out.push({ x:sg.c.x + sg.r * Math.cos(a), y:sg.c.y + sg.r * Math.sin(a) }); }
            out.push({ ...sg.p2 });
        });
        return out;
    }
    const distSeg = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy; const t = L2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2)) : 0; return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t); };
    const dentroPoli = (p, pol) => { let d = false; for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) { const a = pol[i], b = pol[j]; if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) d = !d; } return d; };
    const cruzan = (a, b, c, d) => { const r = { x:b.x - a.x, y:b.y - a.y }, q = { x:d.x - c.x, y:d.y - c.y }, den = r.x * q.y - r.y * q.x; if (Math.abs(den) < 1e-12) return false; const w = { x:c.x - a.x, y:c.y - a.y }, t = (w.x * q.y - w.y * q.x) / den, u = (w.x * r.y - w.y * r.x) / den; return t > 1e-9 && t < 1 - 1e-9 && u > -1e-9 && u < 1 + 1e-9; };
    const tangenteSeg = (sg, fin) => {
        if (sg.recta) { const L = sg.L || 1; return { x:(sg.p2.x - sg.p1.x) / L, y:(sg.p2.y - sg.p1.y) / L }; }
        const a = sg.a1 + (fin ? sg.dir * sg.L / sg.r : 0); return sg.dir > 0 ? { x:-Math.sin(a), y:Math.cos(a) } : { x:Math.sin(a), y:-Math.cos(a) };
    };
    // Entrada y salida de la compensación (G41/G42): rectas perpendiculares al contorno, por el lado
    // de la fresa, de Ø + 2 mm (más cortas si no caben). La fresa baja fuera del contorno, activa la
    // compensación en la recta de entrada y la anula con G40 en la de salida (como en los ejemplos del Simulador).
    // (otros: polilíneas de los demás contornos de la pieza, que la fresa tampoco puede tocar al bajar)
    function entradaSalida(lista, lado, R, otros) {
        const vivos = lista.filter(sg => !sg.nulo); if (!vivos.length) return null;
        const pol = poliSeg(vivos), cerrado = Math.hypot(pol[0].x - pol[pol.length - 1].x, pol[0].y - pol[pol.length - 1].y) < 1e-6;
        const todos = [pol, ...(otros || [])];
        const distA = (p, q) => { let m = Infinity; for (let i = 0; i + 1 < q.length; i++) m = Math.min(m, distSeg(p, q[i], q[i + 1])); return m; };
        const dist = p => distA(p, pol), distOtros = p => Math.min(Infinity, ...todos.slice(1).map(q => distA(p, q)));
        const libre = (a, b) => { for (const q of todos) for (let i = 0; i + 1 < q.length; i++) if (cruzan(a, b, q[i], q[i + 1])) return false; return true; };
        const buscar = (P0, t) => {
            const n = { x:-t.y * lado, y:t.x * lado }, en = d => ({ x:P0.x + n.x * d, y:P0.y + n.y * d });
            const ref = cerrado ? dentroPoli(en(0.05), pol) : null;
            for (let L = 2 * R + 2; L >= R + 0.2; L *= 0.85) {
                const Q = en(L);
                if (cerrado && dentroPoli(Q, pol) !== ref) continue;
                if (dist(Q) < Math.min(R, L) - 1e-6 || distOtros(Q) < R + 0.05 || !libre(en(0.05), Q)) continue;
                return { p:Q, corta:L < 2 * R + 2 - 1e-9 };
            }
            return { p:en(Math.max(R, 0.5)), corta:true, mala:true };
        };
        const e = buscar(vivos[0].p1, tangenteSeg(vivos[0], false)), s = buscar(vivos[vivos.length - 1].p2, tangenteSeg(vivos[vivos.length - 1], true));
        const r3 = p => ({ x:+p.x.toFixed(3), y:+p.y.toFixed(3) });
        return { ap:r3(e.p), sal:r3(s.p), corta:e.corta || s.corta, mala:e.mala || s.mala };
    }
    const MARCA = '\u0001';   // (mixta) bloque del recorrido que se escribe en G91
    // Mixta: el programa se escribe en G90 y los bloques marcados pasan a G91 (incrementos desde el punto anterior)
    function aMixta(nc) {
        let modal = 'G90', px = 0, py = 0;
        return nc.split('\n').map(l => {
            const marcada = l.startsWith(MARCA); if (marcada) l = l.slice(1);
            const k = l.indexOf(';'), cod = k < 0 ? l : l.slice(0, k), com = k < 0 ? '' : l.slice(k);
            if (!/^\s*(G4[0-2]\s+)?G0?[0-3]\b/.test(cod)) return l;
            const mx = cod.match(/X(-?[\d.]+)/), my = cod.match(/Y(-?[\d.]+)/);
            const ax = mx ? +mx[1] : px, ay = my ? +my[1] : py;
            let out = cod;
            if (marcada) {
                out = cod.replace(/X-?[\d.]+/, 'X' + fmtNum(ax - px)).replace(/Y-?[\d.]+/, 'Y' + fmtNum(ay - py));
                if (modal !== 'G91') { out = 'G91 ' + out; modal = 'G91'; }
            } else if (modal !== 'G90' && /[XYZ]/.test(cod)) { out = 'G90 ' + out; modal = 'G90'; }
            px = ax; py = ay;
            return out + com;
        }).join('\n');
    }

    function generar(trazados, P) {
        if (!trazados.length) return { error:'No hay ningún contorno que mecanizar' };
        // (feed, toolR, spindle, zStep y toolStr son los de la herramienta que está trabajando: cambian con cada M06)
        let feed = Math.max(1, Math.abs(+P.feed || 300)); const feedPos = Math.max(1, Math.abs(+P.feedPos || 1200));
        const toolNum = Math.min(999, Math.max(1, parseInt(P.tool) || 101)); let toolStr = String(toolNum).padStart(3, '0');
        let toolR = Math.max(0, +P.toolR || 0), spindle = Math.max(1, Math.abs(parseInt(P.spindle) || 10000));
        const zSafe = +P.zSafe, zTotal = +P.zTotal;
        if (!isFinite(zSafe)) return { error:'La altura de seguridad no es un número válido' };
        if (!isFinite(zTotal)) return { error:'La profundidad no es un número válido' };
        const avisos = [];
        const MAX_PASADAS_Z = 300;
        let zStep = Math.abs(+P.zStep) || 1;
        const limitarPaso = (paso, T) => {
            if (paso > 0 && zTotal < 0 && Math.ceil(Math.abs(zTotal) / paso) + 1 > MAX_PASADAS_Z) {
                paso = Math.abs(zTotal) / (MAX_PASADAS_Z - 1);
                avisos.push(`Paso en Z demasiado pequeño${T ? ' (T' + T + ')' : ''}: ajustado a ${paso.toFixed(3)} mm (como mucho ${MAX_PASADAS_Z} pasadas)`);
            }
            return paso;
        };
        zStep = limitarPaso(zStep);
        const isMix = P.coord === 'mixta', coordMode = P.coord === 'G91' ? 'G91' : 'G90', compAuto = P.comp === 'auto', compMode = ['G41', 'G42'].includes(P.comp) ? P.comp : 'G40';
        const strategy = ['concordancia', 'oposicion'].includes(P.estrategia) ? P.estrategia : 'plano';
        const unitsMode = P.unidades === 'G70' ? 'G70' : 'G71', isIncr = coordMode === 'G91';

        // Orden: grabados (con la pieza aún sujeta), cajeras, cortes exteriores y cortes interiores
        const grabados = trazados.filter(t => t.op === 'grabado' || t.abierto);
        const cajeras = trazados.filter(t => t.op === 'cajera' && !t.abierto);
        const islasTz = trazados.filter(t => t.op === 'isla' && !t.abierto);
        const cortes = trazados.filter(t => !t.abierto && (t.op === 'corte' || !['grabado', 'cajera', 'isla'].includes(t.op)));
        const exteriores = cortes.filter(t => t.tipo !== 'interior'), interiores = cortes.filter(t => t.tipo === 'interior');
        const orden0 = [...grabados, ...cajeras, ...exteriores, ...interiores];
        if (!orden0.length) return { error:'No hay nada que mecanizar (solo islas)' };
        // Herramientas: cada contorno con la suya (o la general). Se mecaniza por herramientas, en el orden
        // en que aparecen, y dentro de cada una con el orden de siempre: así hay un cambio (M06) por herramienta
        const hG = { T:toolNum, d:2 * toolR, F:feed, S:spindle, paso:zStep, nombre:P.nombreHerr || '' };
        const herrDe = t => t.herr && isFinite(+t.herr.T) && +t.herr.d > 0 ? t.herr : hG;
        const claveH = h => (+h.T) + '|' + (+h.d);
        const grupos = [];
        orden0.forEach(t => { const h = herrDe(t), k = claveH(h); let g = grupos.find(x => x.k === k); if (!g) grupos.push(g = { k, h, ts:[] }); g.ts.push(t); });
        const orden = [].concat(...grupos.map(g => g.ts)), multi = grupos.length > 1;
        let hActual = null;
        const usar = h => {
            hActual = h;
            const T = Math.min(999, Math.max(1, parseInt(h.T) || toolNum)); toolStr = String(T).padStart(3, '0');
            toolR = Math.max(0, +h.d / 2 || 0); feed = Math.max(1, Math.abs(+h.F || feed)); spindle = Math.max(1, Math.abs(parseInt(h.S) || spindle));
            zStep = h === hG ? hG.paso : limitarPaso(Math.abs(+h.paso) || hG.paso, T);
        };
        usar(grupos[0].h);
        const pasadasZ = zT => { const r = []; if (zStep > 0 && zT < 0) for (let z = -zStep; z > zT; z -= zStep) r.push(parseFloat(z.toFixed(4))); r.push(zT); return r; };
        const zDepths = pasadasZ(zTotal);

        const p0 = orden[0].tramos[0] && orden[0].tramos[0].p1;
        if (!p0) return { error:'El primer contorno no tiene vértices válidos' };
        let cur = { x:p0.x, y:p0.y, z:zSafe };
        let escritoXY = null, escritoZ = null;
        function fmtXY(xAbs, yAbs) {
            if (!isIncr) return `X${fmtNum(xAbs)} Y${fmtNum(yAbs)}`;
            const dx = fmtNum(xAbs - cur.x), dy = fmtNum(yAbs - cur.y);
            escritoXY = { x: cur.x + parseFloat(dx), y: cur.y + parseFloat(dy) };
            return `X${dx} Y${dy}`;
        }
        function fmtZ(zAbs) {
            if (!isIncr) return `Z${fmtNum(zAbs)}`;
            const dz = fmtNum(zAbs - cur.z); escritoZ = cur.z + parseFloat(dz); return `Z${dz}`;
        }
        function moveCur(xAbs, yAbs, zAbs) {
            if (zAbs !== undefined) cur.z = escritoZ !== null ? escritoZ : zAbs;
            if (xAbs !== undefined) cur.x = escritoXY ? escritoXY.x : xAbs;
            if (yAbs !== undefined) cur.y = escritoXY ? escritoXY.y : yAbs;
            escritoXY = null; escritoZ = null;
        }

        // ── Cabecera ──
        let nc = `;; G-code generado por ${P.origen || 'el Calcador de contornos'}\n`;
        nc += `;; Proyecto  : ${P.nombre || 'pieza'}\n`;
        nc += `;; Fecha     : ${new Date().toLocaleString('es')}\n`;
        nc += `;; Modo      : ${isIncr ? 'Incremental (G91)' : isMix ? 'Mixto (G90 en la entrada y el cierre de cada contorno, G91 en el recorrido)' : 'Absoluto (G90)'}\n`;
        nc += `;; Unidades  : ${unitsMode === 'G70' ? 'Pulgadas (G70)' : 'mm (G71)'}\n`;
        nc += multi ? `;; Herramientas: ${grupos.map(g => `T${String(g.h.T).padStart(3, '0')}${g.h.nombre ? ' (' + g.h.nombre + ')' : ''} Ø${fmtNum(+g.h.d)} mm`).join(' · ')} — cambio con M06\n`
                    : `;; Herramienta: T${toolStr}${hActual.nombre ? ' (' + hActual.nombre + ')' : ''}, Ø${fmtNum(2 * toolR)} mm\n`;
        nc += `;; Estrategia: ${strategy === 'concordancia' ? 'Concordancia / Climb' : strategy === 'plano' ? 'Según el plano (sentido dibujado)' : 'Oposición / Conventional'}\n`;
        nc += `;; Pasadas Z : ${zDepths.map(fmtNum).join(', ')}\n`;
        nc += `;; Trazados  : ${cajeras.length ? cajeras.length + ' cajera(s)' + (islasTz.length ? ' con ' + islasTz.length + ' isla(s)' : '') + ', ' : ''}${grabados.length ? grabados.length + ' grabado(s), ' : ''}${exteriores.length} exterior(es), ${interiores.length} interior(es) — ${grabados.length ? 'grabados primero, después exteriores' : 'se mecanizan exteriores primero'} y luego interiores\n;\n`;
        nc += `${unitsMode}              ; unidades ${unitsMode === 'G70' ? 'pulgadas' : 'mm'}\n`;
        nc += `${coordMode}           ; coordenadas ${isIncr ? 'incrementales' : isMix ? 'absolutas (el recorrido de cada contorno, en G91)' : 'absolutas'}\n`;
        nc += `T${toolStr} M06         ; herramienta${multi ? ` 1 de ${grupos.length}` : ''}\n`;
        nc += `M03 S${spindle}        ; arrancar el husillo\n`;
        nc += compAuto || compMode !== 'G40' ? `G40           ; sin corrección: G41/G42 se activa en la entrada de cada contorno (radio=${toolR}mm)\n` : `${compMode}           ; corrección herramienta (radio=${toolR}mm)\n`;
        let compEstado = 'G40';
        if (isIncr) nc += `G90              ; absoluto para posicionamiento inicial\n`;
        nc += `G0 Z${fmtNum(zSafe)} F${feedPos}      ; subir a Z seguro\n`;
        nc += `\n; -- Cero Pieza (W): pasa a ser el origen X0 Y0 --\n`;
        nc += `G0 X0 Y0 F${feedPos}   ; -> Cero pieza\n`;
        if (isIncr) nc += `G91              ; volver a incremental\n`;

        // ── Cajeras ──
        const dentroPol = (p, pol) => { let d = false; for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) { const a = pol[i], b = pol[j]; if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) d = !d; } return d; };
        const g0Abs = (x, y, txt) => {
            if (isIncr) nc += `G90              ; absoluto para posicionamiento\n`;
            nc += `G0 X${fmtNum(x)} Y${fmtNum(y)} F${feedPos}   ; ${txt}\n`; moveCur(x, y);
            if (isIncr) nc += `G91              ; volver a incremental\n`;
        };
        const tramoXY = (q, extra) => `G1 ${fmtXY(q.x, q.y)}${extra ? ' ' + extra : ''} F${feed}`;
        function bloqueCajera(t, ti) {
            const mec = t, caj = t.caj || { estr:'concentrica', paso:50, entrada:'vertical' }, cont = contornoPlano(t.tramos);
            const islas = islasTz.map(i => contornoPlano(i.tramos)).filter(pol => pol.length >= 3 && dentroPol(pol[0], cont));
            nc += `\n; ══════ Trazado ${ti + 1}/${orden.length} — CAJERA ${caj.estr === 'zigzag' ? 'en zigzag' : 'concéntrica'} (paso ${caj.paso} % del diámetro, entrada ${caj.entrada}${islas.length ? ', ' + islas.length + ' isla(s)' : ''}) ══════\n`;
            if (!(toolR > 0)) { nc += `; ⚠ Sin radio de herramienta no se puede calcular el vaciado: cajera omitida\n`; avisos.push('Pon el diámetro de la fresa para calcular las cajeras'); return; }
            const pasoMm = 2 * toolR * caj.paso / 100;
            const res = CAJ.calcular(cont, islas, toolR, pasoMm, caj.estr, strategy === 'concordancia');
            res.avisos.forEach(a => { nc += `; ⚠ ${a}\n`; avisos.push(a); });
            if (!res.pasadas.length) { nc += `; Cajera omitida\n`; return; }
            nc += `; Las esquinas interiores quedan con el radio de la herramienta (R${fmtNum(toolR)})\n`;
            if (compEstado !== 'G40') { nc += `G40              ; cajera: trayectoria calculada, sin corrección\n`; compEstado = 'G40'; }
            const zDepthsT = pasadasZ(mec.prof !== null && mec.prof !== undefined ? mec.prof : zTotal);
            let zPrev = 0; const ajustes = new Map(), enlaces = new Map();
            zDepthsT.forEach((zPass, passIdx) => {
                nc += `; ── Pasada ${passIdx + 1} / ${zDepthsT.length}  (Z=${fmtNum(zPass)}) ──\n`;
                const ord = CAJ.ordenar(res.pasadas, { x:cur.x, y:cur.y });
                let abajo = false;
                ord.forEach((pz, k) => {
                    const q0 = pz.pts[0];
                    // (los mismos enlaces se repiten en cada pasada: se comprueban una vez)
                    const ce = abajo ? `${cur.x.toFixed(4)},${cur.y.toFixed(4)}|${q0.x.toFixed(4)},${q0.y.toFixed(4)}` : '';
                    if (abajo && !enlaces.has(ce)) enlaces.set(ce, CAJ.segmentoDentro({ x:cur.x, y:cur.y }, q0, res.zonaEnlace));
                    if (abajo && enlaces.get(ce)) { nc += tramoXY(q0) + `   ; enlace\n`; moveCur(q0.x, q0.y); }
                    else {
                        if (abajo) { nc += `G0 ${fmtZ(zSafe)} F${feedPos}      ; subir para cambiar de zona\n`; moveCur(undefined, undefined, zSafe); }
                        g0Abs(q0.x, q0.y, k ? 'siguiente zona de la cajera' : 'entrada de la cajera');
                        nc += `G1 ${fmtZ(zPrev)} F${feed}       ; bajar a Z${fmtNum(zPrev)}\n`; moveCur(undefined, undefined, zPrev);
                        if (caj.entrada === 'rampa' && zPass < zPrev) {
                            const tramo = []; let L = 0; const lMax = Math.max(Math.min(Math.max(4 * toolR, 5), 0.45 * pz.pts.reduce((a, q, i) => i ? a + Math.hypot(q.x - pz.pts[i - 1].x, q.y - pz.pts[i - 1].y) : 0, 0)), 0.5);
                            tramo.push(q0);
                            for (let i = 1; i < pz.pts.length && L < lMax; i++) { const a = pz.pts[i - 1], b = pz.pts[i], d = Math.hypot(b.x - a.x, b.y - a.y); if (L + d > lMax) { const f = (lMax - L) / d; tramo.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }); L = lMax; } else { tramo.push(b); L += d; } }
                            for (let i = tramo.length - 2; i > 0; i--) if (Math.hypot(tramo[i].x - tramo[i - 1].x, tramo[i].y - tramo[i - 1].y) < 1) tramo.splice(i, 1);
                            const bajada = L * Math.tan(4 * Math.PI / 180), vueltas = Math.max(1, Math.ceil((zPrev - zPass) / (2 * Math.max(bajada, 1e-6))));
                            const dz = (zPrev - zPass) / (2 * vueltas * L); let z = zPrev;
                            for (let v = 0; v < vueltas; v++) for (const sentido of [1, -1]) {
                                const seq = sentido === 1 ? tramo.slice(1) : tramo.slice(0, -1).reverse(); let prev = sentido === 1 ? tramo[0] : tramo[tramo.length - 1];
                                seq.forEach(q => { z -= Math.hypot(q.x - prev.x, q.y - prev.y) * dz; nc += tramoXY(q, fmtZ(Math.max(zPass, z))) + '\n'; moveCur(q.x, q.y, Math.max(zPass, z)); prev = q; });
                            }
                            nc += `G1 ${fmtZ(zPass)} F${feed}     ; profundidad ${fmtNum(zPass)}\n`; moveCur(undefined, undefined, zPass);
                        } else { nc += `G1 ${fmtZ(zPass)} F${feed}     ; profundidad ${fmtNum(zPass)}\n`; moveCur(undefined, undefined, zPass); }
                        abajo = true;
                    }
                    // (el ajuste de arcos de cada trayectoria es el mismo en todas las pasadas: se calcula una vez)
                    const P0 = pz.pts, clave = `${P0.length}|${P0[0].x},${P0[0].y}|${P0[1] ? P0[1].x + ',' + P0[1].y : ''}|${P0[P0.length - 1].x},${P0[P0.length - 1].y}`;
                    let q = ajustes.get(clave); if (!q) { q = CAJ.ajustar(P0, 0.005); ajustes.set(clave, q); }
                    for (let i = 0; i + 1 < q.length; i++) {
                        const b = { x:q[i + 1][0], y:q[i + 1][1] }, bu = q[i][2];
                        if (!bu) nc += tramoXY(b) + '\n';
                        else { const c = CAJ.centro({ x:q[i][0], y:q[i][1] }, b, bu); nc += `${bu < 0 ? 'G2' : 'G3'} ${fmtXY(b.x, b.y)} I${fmtNum(c.x - cur.x)} J${fmtNum(c.y - cur.y)} F${feed}\n`; }
                        moveCur(b.x, b.y);
                    }
                });
                nc += `G0 ${fmtZ(zSafe)} F${feedPos}      ; subir a Z seguro\n`; moveCur(undefined, undefined, zSafe);
                zPrev = zPass;
            });
        }

        // Polilíneas de todos los contornos (para que la entrada de la compensación no toque los demás)
        const polDe = new Map(); [...orden, ...islasTz].forEach(t => { if (!polDe.has(t)) polDe.set(t, poliSeg(t.tramos.map(q => segmento(q.p1, q.p2, q.b)))); });
        const polOtros = t => [...polDe].filter(([o]) => o !== t).map(([, q]) => q);

        // ── Cada trazado ──
        // Cambio de herramienta: arriba (Z de seguridad), husillo parado, T… M06 y arrancar con la S de la nueva
        const cambiarHerramienta = h => {
            const T = String(Math.min(999, Math.max(1, parseInt(h.T) || 1))).padStart(3, '0');
            nc += `\n; ══════ Cambio de herramienta: T${T}${h.nombre ? ' (' + h.nombre + ')' : ''}, Ø${fmtNum(+h.d)} mm ══════\n`;
            if (compEstado !== 'G40') { nc += `G40              ; sin compensación para el cambio\n`; compEstado = 'G40'; }
            if (cur.z < zSafe - 1e-9) { nc += `G0 ${fmtZ(zSafe)} F${feedPos}      ; subir a Z seguro\n`; moveCur(undefined, undefined, zSafe); }
            nc += `M05              ; parar el husillo\n`;
            usar(h);
            nc += `T${toolStr} M06         ; cambio de herramienta\n`;
            nc += `M03 S${spindle}        ; arrancar el husillo\n`;
        };
        orden.forEach((t, ti) => {
            if (claveH(herrDe(t)) !== claveH(hActual)) cambiarHerramienta(herrDe(t));
            if (t.op === 'cajera' && !t.abierto) { bloqueCajera(t, ti); return; }
            const abierto = !!t.abierto, grabar = t.op === 'grabado' || abierto;
            let pE = t.tramos[0].p1;
            // Sentido: 'plano' respeta el dibujado; si no, exterior en concordancia = antihorario (interior al revés)
            const currentCCW = antihorario(t.tramos);
            const desiredCCW = (strategy === 'plano' || grabar) ? currentCCW : t.tipo === 'interior' ? (strategy !== 'concordancia') : (strategy === 'concordancia');
            // al invertir, el recorrido sigue empezando en la entrada
            let tramos = currentCCW !== desiredCCW ? t.tramos.slice().reverse().map(q => ({ p1:q.p2, p2:q.p1, b:-(q.b || 0) })) : t.tramos;
            const zTotalT = t.prof !== null && t.prof !== undefined ? t.prof : zTotal;
            const zDepthsT = pasadasZ(zTotalT);
            nc += `\n; ══════ Trazado ${ti + 1}/${orden.length} — ${grabar ? (abierto ? 'GRABADO (trazo abierto)' : 'GRABADO') : t.tipo === 'interior' ? 'INTERIOR' : 'EXTERIOR'} (entrada P1)${t.prof !== null && t.prof !== undefined ? ' — profundidad ' + fmtNum(zTotalT) : ''} ══════\n`;
            // «según el trazado»: la fresa por fuera de los exteriores y por dentro de los interiores
            const compT = grabar ? 'G40' : compAuto ? ((t.tipo === 'interior') === desiredCCW ? 'G41' : 'G42') : compMode;
            const conComp = compT !== 'G40', lado = compT === 'G41' ? 1 : -1;
            if (!conComp && compEstado !== 'G40') { nc += `G40              ; grabado sobre la línea: sin corrección\n`; compEstado = 'G40'; }
            let segM = tramos.map(q => segmento(q.p1, q.p2, q.b));
            // Con G41/G42 la compensación no se activa en una esquina: si P1 lo es, se entra por el centro de un lado
            // (el primero si mide al menos 2 Ø; si no, el más largo). El contorno cortado es el mismo.
            if (conComp && !abierto && segM.length >= 2) {
                const vivos = segM.filter(sg => !sg.nulo), t1 = tangenteSeg(vivos[vivos.length - 1], true), t0 = tangenteSeg(vivos[0], false);
                const cerrado = Math.hypot(tramos[0].p1.x - tramos[tramos.length - 1].p2.x, tramos[0].p1.y - tramos[tramos.length - 1].p2.y) < 1e-6;
                if (cerrado && t1.x * t0.x + t1.y * t0.y < Math.cos(Math.PI / 180)) {
                    let k = segM[0].L >= 4 * toolR && !segM[0].nulo ? 0 : segM.reduce((m, sg, i) => sg.L > segM[m].L ? i : m, 0);
                    const q = tramos[k], sg = segM[k];
                    const pm = sg.recta ? { x:(q.p1.x + q.p2.x) / 2, y:(q.p1.y + q.p2.y) / 2 } : (() => { const a = sg.a1 + sg.dir * sg.L / sg.r / 2; return { x:sg.c.x + sg.r * Math.cos(a), y:sg.c.y + sg.r * Math.sin(a) }; })();
                    const bm = sg.recta ? 0 : Math.tan(Math.atan(q.b) / 2);
                    tramos = [{ p1:pm, p2:q.p2, b:bm }, ...tramos.slice(k + 1), ...tramos.slice(0, k), { p1:q.p1, p2:pm, b:bm }];
                    segM = tramos.map(q2 => segmento(q2.p1, q2.p2, q2.b)); pE = pm;
                    nc += `; P1 es una esquina: la entrada con ${compT} se hace en el centro de un lado (X${fmtNum(pm.x)} Y${fmtNum(pm.y)})\n`;
                }
            }
            const ultimo = lista => { for (let i = lista.length - 1; i >= 0; i--) if (!lista[i].nulo) return i; return -1; };
            const marca = (lista, i) => isMix && i < ultimo(lista) ? MARCA : '';
            // Con G41/G42: aproximación fuera del contorno, entrada con la compensación y salida con G40
            const ES = conComp ? entradaSalida(segM, lado, toolR, polOtros(t)) : null;
            if (ES && ES.mala) avisos.push(`Trazado ${ti + 1}: no hay sitio para una recta de entrada/salida de la compensación sin tocar el contorno; revisa la entrada (P1)`);
            else if (ES && ES.corta) avisos.push(`Trazado ${ti + 1}: la recta de entrada/salida de la compensación es más corta que Ø + 2 mm (no cabe más)`);
            const pIni = ES ? ES.ap : pE;
            if (isIncr) nc += `G90              ; absoluto para posicionamiento\n`;
            nc += `G0 X${fmtNum(pIni.x)} Y${fmtNum(pIni.y)} F${feedPos}   ; -> ${ES ? 'aproximación (fuera del contorno) del' : 'entrada'} trazado ${ti + 1}\n`;
            moveCur(pIni.x, pIni.y);
            if (isIncr) nc += `G91              ; volver a incremental\n`;
            const entrar = (P1) => { if (!ES) return; nc += `${compT} G1 ${fmtXY(P1.x, P1.y)} F${feed}   ; entrada: activa ${compT} (fresa a la ${compT === 'G41' ? 'izquierda' : 'derecha'})\n`; moveCur(P1.x, P1.y); };
            const salir = (Q) => { if (!ES) return; nc += `G40 G1 ${fmtXY(Q.x, Q.y)} F${feed}   ; salida: anula la compensación\n`; moveCur(Q.x, Q.y); };
            const puntoEn = (sg, d) => {
                if (d >= sg.L - 1e-9) return sg.p2;
                if (sg.recta) { const f = sg.L > 0 ? d / sg.L : 0; return { x: sg.p1.x + (sg.p2.x - sg.p1.x) * f, y: sg.p1.y + (sg.p2.y - sg.p1.y) * f }; }
                const a = sg.a1 + sg.dir * d / sg.r; return { x: sg.c.x + sg.r * Math.cos(a), y: sg.c.y + sg.r * Math.sin(a) };
            };
            // Puentes: el ancho es lo que queda en la madera; la fresa se levanta ancho + Ø
            const Ltot = segM.reduce((a, sg) => a + sg.L, 0);
            const pz = t.puentes || { n:0, ancho:0, alto:0, pts:[] }, zTab = zTotalT + (+pz.alto || 0);
            const quiere = !grabar && !abierto && pz.n > 0 && pz.ancho > 0 && pz.alto > 0 && Ltot > 0;
            let tabs = [];
            if (quiere && zTab >= 0) nc += `; ⚠ Puentes omitidos: su alto (${fmtNum(pz.alto)}) no es menor que la profundidad del corte\n`;
            else if (quiere) {
                if (!(toolR > 0)) nc += `; ⚠ Sin radio de herramienta: los puentes quedarán más estrechos que su ancho (falta sumar el Ø de la fresa)\n`;
                const w = pz.ancho + 2 * Math.max(0, toolR);
                const s0s = []; let acc = 0; segM.forEach(sg => { s0s.push(acc); acc += sg.L; });
                const tangente = (sg, d) => { if (sg.recta) { const L = sg.L || 1; return { x:(sg.p2.x - sg.p1.x) / L, y:(sg.p2.y - sg.p1.y) / L }; } const a = sg.a1 + sg.dir * d / sg.r; return sg.dir > 0 ? { x:-Math.sin(a), y:Math.cos(a) } : { x:Math.sin(a), y:-Math.cos(a) }; };
                const proyectar = q => {
                    let mejor = null;
                    segM.forEach((sg, i) => {
                        let d0, p;
                        if (sg.recta) { const L = sg.L || 1e-9, tt = Math.max(0, Math.min(1, ((q.x - sg.p1.x) * (sg.p2.x - sg.p1.x) + (q.y - sg.p1.y) * (sg.p2.y - sg.p1.y)) / (L * L))); p = { x:sg.p1.x + (sg.p2.x - sg.p1.x) * tt, y:sg.p1.y + (sg.p2.y - sg.p1.y) * tt }; d0 = tt * sg.L; }
                        else { let th = Math.atan2(q.y - sg.c.y, q.x - sg.c.x) - sg.a1; th = sg.dir > 0 ? ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) : -((((-th) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)); const sw = sg.L / sg.r; let u = Math.abs(th); if (u > sw) u = (u - sw < 2 * Math.PI - u) ? sw : 0; p = puntoEn(sg, u * sg.r); d0 = u * sg.r; }
                        const d = Math.hypot(p.x - q.x, p.y - q.y); if (!mejor || d < mejor.d) mejor = { d, s: s0s[i] + d0 };
                    });
                    return mejor ? mejor.s : 0;
                };
                let centros;
                if (pz.pts && pz.pts.length) centros = pz.pts.map(proyectar);
                else {
                    const h = w / 2 + 1, malos = [];
                    segM.forEach((sg, i) => {
                        const prev = segM[(i - 1 + segM.length) % segM.length], t1 = tangente(prev, prev.L), t2 = tangente(sg, 0);
                        const ang = Math.acos(Math.max(-1, Math.min(1, t1.x * t2.x + t1.y * t2.y)));
                        if (i === 0) malos.push([s0s[i] - h - 5, s0s[i] + h + 5]);
                        else if (ang > 15 * Math.PI / 180) malos.push([s0s[i] - h, s0s[i] + h]);
                        if (!sg.recta && sg.r < Math.max(10, w)) malos.push([s0s[i] - h, s0s[i] + sg.L + h]);
                    });
                    const malo = v => malos.some(([a, b]) => [v, v + Ltot, v - Ltot].some(x => x > a && x < b));
                    centros = Array.from({ length: pz.n }, (_, k) => { const m0 = (k + 0.5) * Ltot / pz.n; if (!malo(m0)) return m0;
                        for (let d = 0.5; d <= Ltot / (2 * pz.n); d += 0.5) { if (!malo(m0 + d)) return m0 + d; if (!malo(m0 - d)) return m0 - d; } return m0; });
                }
                centros.sort((a, b) => a - b).forEach(m => { const a = m - w / 2, b = m + w / 2;
                    if (a < 0) { tabs.push([0, b]); tabs.push([Ltot + a, Ltot]); } else if (b > Ltot) { tabs.push([a, Ltot]); tabs.push([0, b - Ltot]); } else tabs.push([a, b]); });
                if (centros.length) nc += `; Puentes: ${centros.length} de ${fmtNum(pz.ancho)} de ancho en la pieza (la fresa se levanta ${fmtNum(w)}), hasta Z${fmtNum(zTab)}, en las pasadas más profundas${pz.pts && pz.pts.length ? ' · situados en el plano' : ''}\n`;
            }
            // Desbaste + acabado
            const sobre = (!grabar && !abierto) ? Math.max(0, +P.sobre || 0) : 0;
            let segR = null;
            if (sobre > 0) {
                if (tabs.length) nc += `; ⚠ Desbaste y acabado: no se aplica a un trazado con puentes (se corta como siempre)\n`;
                else {
                    const poli = []; segM.forEach(sg => { poli.push(sg.p1); if (!sg.recta) { const am = sg.a1 + sg.dir * sg.L / sg.r / 2; poli.push({ x:sg.c.x + sg.r * Math.cos(am), y:sg.c.y + sg.r * Math.sin(am) }); } });
                    let area = 0; poli.forEach((q, i) => { const r2 = poli[(i + 1) % poli.length]; area += q.x * r2.y - r2.x * q.y; });
                    const ccw = area > 0, izq = t.tipo === 'interior' ? ccw : !ccw;
                    segR = offsetRecorrido(segM, sobre, izq);
                    if (!segR) { nc += `; ⚠ No se puede dejar ${fmtNum(sobre)} mm de sobreespesor en este trazado (es demasiado estrecho o tiene un arco más pequeño): se corta sin pasada de acabado\n`; avisos.push(`Un contorno es demasiado estrecho para dejar ${fmtNum(sobre)} mm de sobreespesor: se corta sin acabado`); }
                    else nc += `; Desbaste dejando ${fmtNum(sobre)} mm de sobreespesor (${t.tipo === 'interior' ? 'hacia dentro' : 'hacia fuera'}) y acabado final por el contorno\n`;
                }
            }
            const escribirRecorrido = lista => lista.forEach((sg, i) => {
                const q = sg.p2, mk = marca(lista, i);
                if (sg.recta || Math.hypot(q.x - cur.x, q.y - cur.y) < 0.002) nc += `${mk}G1 ${fmtXY(q.x, q.y)} F${feed}\n`;
                else nc += `${mk}${sg.g} ${fmtXY(q.x, q.y)} I${fmtNum(sg.c.x - cur.x)} J${fmtNum(sg.c.y - cur.y)} F${feed}\n`;
                moveCur(q.x, q.y);
            });
            if (segR) {
                const ESR = conComp ? entradaSalida(segR, lado, toolR, polOtros(t)) : null, ini = ESR ? ESR.ap : segR[0].p1;
                zDepthsT.forEach((zPass, passIdx) => {
                    nc += `; ── Desbaste ${passIdx + 1} / ${zDepthsT.length}  (Z=${fmtNum(zPass)}, sobreespesor ${fmtNum(sobre)}) ──\n`;
                    nc += `G0 ${fmtXY(ini.x, ini.y)} F${feedPos}   ; inicio del desbaste\n`; moveCur(ini.x, ini.y);
                    nc += `G1 ${fmtZ(0)} F${feed}       ; bajar a Z0\n`; moveCur(undefined, undefined, 0);
                    nc += `G1 ${fmtZ(zPass)} F${feed}     ; profundidad ${fmtNum(zPass)}\n`; moveCur(undefined, undefined, zPass);
                    if (ESR) { nc += `${compT} G1 ${fmtXY(segR[0].p1.x, segR[0].p1.y)} F${feed}   ; entrada: activa ${compT}\n`; moveCur(segR[0].p1.x, segR[0].p1.y); }
                    escribirRecorrido(segR);
                    if (ESR) { nc += `G40 G1 ${fmtXY(ESR.sal.x, ESR.sal.y)} F${feed}   ; salida: anula la compensación\n`; moveCur(ESR.sal.x, ESR.sal.y); }
                    nc += `G0 ${fmtZ(zSafe)} F${feedPos}      ; subir a Z seguro\n`; moveCur(undefined, undefined, zSafe);
                });
                nc += `; ── Acabado (Z=${fmtNum(zTotalT)}): el contorno exacto ──\n`;
                nc += `G0 ${fmtXY(pIni.x, pIni.y)} F${feedPos}   ; volver a punto ${ES ? 'de aproximación' : 'entrada'}\n`; moveCur(pIni.x, pIni.y);
                nc += `G1 ${fmtZ(0)} F${feed}       ; bajar a Z0\n`; moveCur(undefined, undefined, 0);
                nc += `G1 ${fmtZ(zTotalT)} F${feed}     ; profundidad ${fmtNum(zTotalT)}\n`; moveCur(undefined, undefined, zTotalT);
                entrar(pE);
                escribirRecorrido(segM.filter(sg => !sg.nulo));
                if (ES) salir(ES.sal);
                nc += `G0 ${fmtZ(zSafe)} F${feedPos}      ; subir a Z seguro\n`; moveCur(undefined, undefined, zSafe);
                return;
            }
            zDepthsT.forEach((zPass, passIdx) => {
                nc += `; ── Pasada ${passIdx + 1} / ${zDepthsT.length}  (Z=${fmtNum(zPass)}) ──\n`;
                nc += `G1 ${fmtZ(0)} F${feed}       ; bajar a Z0\n`; moveCur(undefined, undefined, 0);
                nc += `G1 ${fmtZ(zPass)} F${feed}     ; profundidad ${fmtNum(zPass)}\n`; moveCur(undefined, undefined, zPass);
                entrar(pE);
                const conPuentes = tabs.length && zPass < zTab - 1e-9;
                let s0 = 0, elevado = false;
                segM.forEach((sg, iS) => {
                    if (sg.nulo) { s0 += sg.L; return; }
                    const mk = marca(segM, iS);
                    const cs = [0, sg.L];
                    if (conPuentes) tabs.forEach(([a, b]) => [a, b].forEach(v => { const t2 = v - s0; if (t2 > 1e-9 && t2 < sg.L - 1e-9) cs.push(t2); }));
                    cs.sort((a, b) => a - b);
                    for (let k = 0; k + 1 < cs.length; k++) {
                        const ta = cs[k], tb = cs[k + 1];
                        if (tb - ta < 1e-9) continue;
                        const medio = s0 + (ta + tb) / 2, enPuente = conPuentes && tabs.some(([a, b]) => medio > a && medio < b);
                        if (enPuente && !elevado) { nc += `G1 ${fmtZ(zTab)} F${feed}     ; puente\n`; moveCur(undefined, undefined, zTab); elevado = true; }
                        if (!enPuente && elevado) { nc += `G1 ${fmtZ(zPass)} F${feed}     ; fin de puente\n`; moveCur(undefined, undefined, zPass); elevado = false; }
                        const q = puntoEn(sg, tb);
                        if (sg.recta || Math.hypot(q.x - cur.x, q.y - cur.y) < 0.002) nc += `${mk}G1 ${fmtXY(q.x, q.y)} F${feed}\n`;
                        else nc += `${mk}${sg.g} ${fmtXY(q.x, q.y)} I${fmtNum(sg.c.x - cur.x)} J${fmtNum(sg.c.y - cur.y)} F${feed}\n`;
                        moveCur(q.x, q.y);
                    }
                    s0 += sg.L;
                });
                if (ES) salir(ES.sal);
                nc += `G0 ${fmtZ(zSafe)} F${feedPos}      ; subir a Z seguro\n`; moveCur(undefined, undefined, zSafe);
                if (passIdx < zDepthsT.length - 1) { nc += `G0 ${fmtXY(pIni.x, pIni.y)} F${feedPos}   ; volver a punto ${ES ? 'de aproximación' : 'entrada'}\n`; moveCur(pIni.x, pIni.y); }
            });
        });

        // ── Cierre ──
        if (isIncr) nc += `G90              ; absoluto para retorno\n`;
        nc += `\n; ── Retorno a Cero Pieza ──\n`;
        nc += `G0 X0 Y0 F${feedPos}   ; -> Cero pieza\n`;
        nc += `M05              ; parar el husillo\n`;
        nc += `M30              ; fin de programa\n`;
        if (isMix) nc = aMixta(nc);
        if (/NaN|Infinity|undefined/.test(nc)) return { error:'Error interno generando el G-code (valor inválido): revisa los datos' };
        return { nc, avisos:[...new Set(avisos)], pasadas: zDepths, herramientas: grupos.map(g => ({ ...g.h, n: g.ts.length })) };
    }
    return { generar, segmento, antihorario, fmtNum };
})();
