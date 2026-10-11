// ════════════════════════════════════════════════
//  CAJERAS (vaciados): trayectorias del centro de la fresa
//  Región = contorno de la cajera menos sus islas. Las pasadas son contornos
//  paralelos (concéntrica) o líneas (zigzag) dentro de la región reducida en
//  el radio de la herramienta, con Clipper (offset y operaciones booleanas).
// ════════════════════════════════════════════════
const CAJ = (() => {
    const SC = 1e4, CL = ClipperLib;
    const aInt = pts => pts.map(p => ({ X: Math.round(p.x * SC), Y: Math.round(p.y * SC) }));
    const aReal = path => path.map(p => ({ x: p.X / SC, y: p.Y / SC }));
    const areaI = path => CL.Clipper.Area(path) / SC / SC;
    function region(contorno, islas) {
        const c = new CL.Clipper();
        c.AddPath(aInt(contorno), CL.PolyType.ptSubject, true);
        islas.forEach(i => c.AddPath(aInt(i), CL.PolyType.ptClip, true));
        const sol = new CL.Paths();
        c.Execute(CL.ClipType.ctDifference, sol, CL.PolyFillType.pftNonZero, CL.PolyFillType.pftNonZero);
        return sol;
    }
    function offset(paths, d) {
        const co = new CL.ClipperOffset(2, 0.002 * SC);
        co.AddPaths(paths, CL.JoinType.jtRound, CL.EndType.etClosedPolygon);
        const sol = new CL.Paths(); co.Execute(sol, d * SC);
        return sol.filter(p => Math.abs(areaI(p)) > 1e-4);
    }
    // ¿Está el punto dentro de la zona (contornos exteriores con sus huecos)? El borde cuenta como dentro.
    function dentro(p, zona) {
        const P = { X: Math.round(p.x * SC), Y: Math.round(p.y * SC) };
        let w = 0;
        for (const path of zona) { const r = CL.Clipper.PointInPolygon(P, path); if (r === -1) return true; if (r === 1) w += areaI(path) > 0 ? 1 : -1; }
        return w > 0;
    }
    function segmentoDentro(a, b, zona) {
        const L = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(2, Math.ceil(L / 0.25));
        for (let k = 0; k <= n; k++) if (!dentro({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n }, zona)) return false;
        return true;
    }
    // Zigzag: intervalos de cada línea horizontal dentro de la zona (regla par-impar sobre todos sus contornos)
    function barrido(zona, paso) {
        const pts = zona.flatMap(aReal), y0 = Math.min(...pts.map(p => p.y)), y1 = Math.max(...pts.map(p => p.y));
        const lineas = [];
        const n = Math.max(1, Math.ceil((y1 - y0) / paso)), dy = (y1 - y0) / n;
        for (let k = 0; k <= n; k++) {
            const y = Math.min(y1 - 1e-4, Math.max(y0 + 1e-4, y0 + k * dy));
            const xs = [];
            zona.forEach(path => { const r = aReal(path); for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; if ((a.y <= y) !== (b.y <= y)) xs.push(a.x + (y - a.y) * (b.x - a.x) / (b.y - a.y)); } });
            xs.sort((a, b) => a - b);
            const iv = []; for (let i = 0; i + 1 < xs.length; i += 2) if (xs[i + 1] - xs[i] > 1e-3) iv.push([{ x:xs[i], y }, { x:xs[i + 1], y }]);
            if (iv.length) lineas.push(iv);
        }
        return lineas;
    }
    // Calcula las pasadas. Devuelve { pasadas:[{ pts, cerrado }], zonaEnlace, avisos }
    function calcular(contorno, islas, R, paso, estrategia, concordancia) {
        const avisos = [];
        const MAXC = 0.5, MAXZ = 0.8;
        if (estrategia !== 'zigzag' && paso > 2 * MAXC * R + 1e-9) { avisos.push(`Paso lateral reducido a ${+(2 * MAXC * R).toFixed(3)} (${Math.round(MAXC * 100)} % del diámetro): con más, la estrategia concéntrica deja restos sin vaciar`); paso = 2 * MAXC * R; }
        if (estrategia === 'zigzag' && paso > 2 * MAXZ * R + 1e-9) { avisos.push(`Paso lateral reducido a ${+(2 * MAXZ * R).toFixed(3)} (${Math.round(MAXZ * 100)} % del diámetro)`); paso = 2 * MAXZ * R; }
        const reg = region(contorno, islas);
        if (!reg.length) return { pasadas:[], avisos:['La cajera no tiene superficie'] };
        const C0 = offset(reg, -R);
        if (!C0.length) return { pasadas:[], avisos:[`La fresa (Ø${+(2 * R).toFixed(3)}) no cabe en la cajera`] };
        const zonaEnlace = offset(reg, -(R - Math.min(0.02, R * 0.1)));
        const orientar = path => { let r = aReal(path); if (concordancia) r = r.reverse(); return r; };
        const pasadas = [];
        if (estrategia === 'zigzag') {
            barrido(C0, paso).forEach((iv, k) => iv.forEach(([a, b]) => pasadas.push({ pts: k % 2 ? [b, a] : [a, b], cerrado:false })));
            C0.forEach(p => pasadas.push({ pts: orientar(p), cerrado:true }));     // acabado de las paredes
        } else {
            const niveles = [];
            for (let k = 0; k < 2000; k++) { const P = k ? offset(reg, -(R + k * paso)) : C0; if (!P.length) break; niveles.push(P); }
            // centro que pueda quedar sin barrer (paso grande): medio paso más
            const dUlt = R + (niveles.length - 1) * paso;
            for (const f of [0.5]) { const P = offset(reg, -(dUlt + paso * f)); if (P.length) niveles.push(P); }
            for (let k = niveles.length - 1; k >= 0; k--) niveles[k].forEach(p => pasadas.push({ pts: orientar(p), cerrado:true }));
        }
        return { pasadas, zonaEnlace, C0, avisos };
    }
    // Ordena las pasadas por cercanía (manteniendo los niveles concéntricos de dentro a fuera) y elige su punto de inicio
    function ordenar(pasadas, desde) {
        const out = []; let cur = desde;
        pasadas.forEach(pz => {
            if (pz.cerrado) {
                let k = 0, md = Infinity; pz.pts.forEach((p, i) => { const d = Math.hypot(p.x - cur.x, p.y - cur.y); if (d < md) { md = d; k = i; } });
                const pts = pz.pts.slice(k).concat(pz.pts.slice(0, k)); pts.push({ ...pts[0] });
                out.push({ pts, cerrado:true }); cur = pts[pts.length - 1];
            } else { out.push(pz); cur = pz.pts[pz.pts.length - 1]; }
        });
        return out;
    }
    // Rectas y arcos a partir de una polilínea (voraz). Devuelve [[x, y, bulge], …, [x, y, 0]]
    function ajustar(pts, tol) {
        const P = pts.map(p => [p.x, p.y]), n = P.length; if (n < 2) return P.map(p => [p[0], p[1], 0]);
        const d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
        const distRecta = (p, a, b) => { const vx = b[0] - a[0], vy = b[1] - a[1], L = Math.hypot(vx, vy); if (L < 1e-12) return d2(p, a); let t = ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / (L * L); t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - a[0] - t * vx, p[1] - a[1] - t * vy); };
        const circ3 = (a, b, c) => { const D = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1])); if (Math.abs(D) < 1e-12) return null;
            const s = p => p[0] * p[0] + p[1] * p[1]; return { x:(s(a) * (b[1] - c[1]) + s(b) * (c[1] - a[1]) + s(c) * (a[1] - b[1])) / D, y:(s(a) * (c[0] - b[0]) + s(b) * (a[0] - c[0]) + s(c) * (b[0] - a[0])) / D }; };
        const probar = (i, j) => {
            let ok = true; for (let k = i + 1; k < j; k++) if (distRecta(P[k], P[i], P[j]) > tol) { ok = false; break; }
            if (ok) return 0;
            // un arco solo si lo respaldan varios puntos próximos (por tres puntos pasa siempre una circunferencia)
            if (j - i < 4) return null;
            const c = circ3(P[i], P[(i + j) >> 1], P[j]); if (!c) return null;
            const r = Math.hypot(P[i][0] - c.x, P[i][1] - c.y); if (r > 1e5) return null;
            for (let k = i + 1; k < j; k++) if (Math.abs(Math.hypot(P[k][0] - c.x, P[k][1] - c.y) - r) > tol) return null;
            // …y también entre los puntos: la flecha del arco sobre cada tramo no puede pasar de la tolerancia
            for (let k = i; k < j; k++) { const L = d2(P[k], P[k + 1]); if (L >= 2 * r || r - Math.sqrt(r * r - L * L / 4) > tol) return null; }
            let tot = 0; for (let k = i; k < j; k++) { let d = Math.atan2(P[k + 1][1] - c.y, P[k + 1][0] - c.x) - Math.atan2(P[k][1] - c.y, P[k][0] - c.x); while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; if (Math.abs(d) > Math.PI / 12) return null; tot += d; }
            if (Math.abs(tot) > Math.PI * 1.5 || Math.abs(tot) < 1e-6) return null;
            return Math.tan(tot / 4);
        };
        const out = []; let i = 0;
        while (i < n - 1) {
            let paso = 1, lo = i + 1, bb = probar(i, i + 1) ?? 0;
            // (los tramos de menos de 4 puntos solo pueden ser rectas: si fallan, se sigue probando más largo por si es un arco)
            while (i + paso * 2 <= n - 1) { const r = probar(i, i + paso * 2); if (r === null) { if (paso * 2 < 4) { paso *= 2; continue; } break; } paso *= 2; lo = i + paso; bb = r; }
            let hi = Math.min(n - 1, i + paso * 2);
            while (hi - lo > 1) { const mid = (lo + hi) >> 1, r = probar(i, mid); if (r === null) hi = mid; else { lo = mid; bb = r; } }
            if (hi > lo) { const r = probar(i, hi); if (r !== null) { lo = hi; bb = r; } }
            out.push([P[i][0], P[i][1], bb]); i = lo;
        }
        out.push([P[n - 1][0], P[n - 1][1], 0]);
        return out;
    }
    // Centro del arco de a a b con bulge (b>0: antihorario)
    function centro(a, b, bu) {
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
        const f = (1 - bu * bu) / (4 * bu);   // distancia del centro a la cuerda, en cuerdas
        return { x: mx - dy * f, y: my + dx * f, r: L * (1 + bu * bu) / (4 * Math.abs(bu)) };
    }
    return { calcular, ordenar, ajustar, centro, segmentoDentro, dentro, region, offset, aReal, SC };
})();
