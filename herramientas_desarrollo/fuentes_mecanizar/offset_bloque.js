function offsetRecorrido(segs, s, izq) {
    const sg0 = segs.filter(g => !g.nulo); if (!sg0.length) return null;
    const lado = izq ? 1 : -1;
    const tgIni = g => g.recta ? { x:(g.p2.x - g.p1.x) / (g.L || 1), y:(g.p2.y - g.p1.y) / (g.L || 1) } : { x:-Math.sin(g.a1) * g.dir, y:Math.cos(g.a1) * g.dir };
    const tgFin = g => { if (g.recta) return tgIni(g); const a = g.a1 + g.dir * g.L / g.r; return { x:-Math.sin(a) * g.dir, y:Math.cos(a) * g.dir }; };
    const off = [];
    for (const g of sg0) {
        if (g.recta) { const t = tgIni(g), n = { x:-t.y * lado * s, y:t.x * lado * s }; off.push({ recta:true, p1:{ x:g.p1.x + n.x, y:g.p1.y + n.y }, p2:{ x:g.p2.x + n.x, y:g.p2.y + n.y }, L:g.L, V1:g.p1, V2:g.p2 }); continue; }
        const r2 = g.r - lado * g.dir * s; if (r2 < 0.01) return null;
        const k = r2 / g.r, a2 = g.a1 + g.dir * g.L / g.r;
        off.push({ recta:false, c:g.c, r:r2, dir:g.dir, a1:g.a1, L:r2 * g.L / g.r, g:g.g, p1:{ x:g.c.x + (g.p1.x - g.c.x) * k, y:g.c.y + (g.p1.y - g.c.y) * k }, p2:{ x:g.c.x + r2 * Math.cos(a2), y:g.c.y + r2 * Math.sin(a2) }, V1:g.p1, V2:g.p2 });
    }
    const angDir = (a, b, dir) => { let d = (b - a) * dir; d = ((d % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); return d; };
    const fijarFin = (g, X) => { if (!g.recta) g.L = g.r * angDir(g.a1, Math.atan2(X.y - g.c.y, X.x - g.c.x), g.dir); else g.L = Math.hypot(X.x - g.p1.x, X.y - g.p1.y); g.p2 = { ...X }; };
    const fijarIni = (g, X) => { if (!g.recta) { const fin = g.a1 + g.dir * g.L / g.r, a = Math.atan2(X.y - g.c.y, X.x - g.c.x); g.a1 = a; g.L = g.r * angDir(a, fin, g.dir); } else g.L = Math.hypot(g.p2.x - X.x, g.p2.y - X.y); g.p1 = { ...X }; };
    const cruce = (A, B, V) => {
        const cand = [];
        if (A.recta && B.recta) { const d1 = tgIni(A), d2 = tgIni(B), den = d1.x * d2.y - d1.y * d2.x; if (Math.abs(den) < 1e-12) return null; const w = { x:B.p1.x - A.p1.x, y:B.p1.y - A.p1.y }, t = (w.x * d2.y - w.y * d2.x) / den; cand.push({ x:A.p1.x + d1.x * t, y:A.p1.y + d1.y * t }); }
        else if (A.recta || B.recta) { const L = A.recta ? A : B, C = A.recta ? B : A, d = tgIni(L), w = { x:L.p1.x - C.c.x, y:L.p1.y - C.c.y }, bb = w.x * d.x + w.y * d.y, cc = w.x * w.x + w.y * w.y - C.r * C.r, D = bb * bb - cc; if (D < 0) return null; [-bb - Math.sqrt(D), -bb + Math.sqrt(D)].forEach(t => cand.push({ x:L.p1.x + d.x * t, y:L.p1.y + d.y * t })); }
        else { const d = Math.hypot(B.c.x - A.c.x, B.c.y - A.c.y); if (d < 1e-12 || d > A.r + B.r || d < Math.abs(A.r - B.r)) return null; const a = (A.r * A.r - B.r * B.r + d * d) / (2 * d), h = Math.sqrt(Math.max(0, A.r * A.r - a * a)), u = { x:(B.c.x - A.c.x) / d, y:(B.c.y - A.c.y) / d }, m = { x:A.c.x + u.x * a, y:A.c.y + u.y * a }; cand.push({ x:m.x - u.y * h, y:m.y + u.x * h }, { x:m.x + u.y * h, y:m.y - u.x * h }); }
        let X = null, md = Infinity; cand.forEach(q => { const dd = Math.hypot(q.x - V.x, q.y - V.y); if (dd < md) { md = dd; X = q; } });
        return X && md < 4 * s + 1e-6 ? X : null;
    };
    const out = [];
    const n = off.length, cerrado = Math.hypot(sg0[n - 1].p2.x - sg0[0].p1.x, sg0[n - 1].p2.y - sg0[0].p1.y) < 1e-6;
    // esquinas: recorte (por dentro) o arco de radio s (por fuera)
    const esquina = (A, B, V, k) => {
        if (Math.hypot(A.p2.x - B.p1.x, A.p2.y - B.p1.y) < 1e-6) return null;
        const t1 = tgFin(A), t2 = tgIni(B), giro = t1.x * t2.y - t1.y * t2.x;
        if (giro * lado > 0) { const X = cruce(A, B, V); if (X) { fijarFin(A, X); fijarIni(B, X); } else imposible = true; return null; }
        const a1 = Math.atan2(A.p2.y - V.y, A.p2.x - V.x), a2 = Math.atan2(B.p1.y - V.y, B.p1.x - V.x);
        let sw = a2 - a1; while (sw > Math.PI) sw -= 2 * Math.PI; while (sw < -Math.PI) sw += 2 * Math.PI;
        const dir = sw >= 0 ? 1 : -1;
        return { recta:false, c:V, r:s, dir, a1, L:s * Math.abs(sw), g: dir > 0 ? 'G3' : 'G2', p1:{ ...A.p2 }, p2:{ ...B.p1 }, esquina:true };
    };
    let imposible = false;           // una esquina interior cuyos caminos no se cruzan: el trazado es demasiado estrecho
    const arcosEsq = [];
    for (let k = 0; k + 1 < n; k++) arcosEsq[k] = esquina(off[k], off[k + 1], off[k].V2);
    let arcoCierre = cerrado ? esquina(off[n - 1], off[0], off[0].V1) : null;
    for (let k = 0; k < n; k++) { out.push(off[k]); if (arcosEsq[k]) out.push(arcosEsq[k]); }
    if (arcoCierre) out.push(arcoCierre);
    if (imposible || out.some(g => !(g.L > -1e-9) || !isFinite(g.L))) return null;
    const res = out.filter(g => g.L > 1e-6);
    // comprobación final: cada tramo empieza donde acaba el anterior y el recorrido se cierra
    for (let k = 0; k + 1 < res.length; k++) if (Math.hypot(res[k].p2.x - res[k + 1].p1.x, res[k].p2.y - res[k + 1].p1.y) > 1e-4) return null;
    if (cerrado && res.length && Math.hypot(res[res.length - 1].p2.x - res[0].p1.x, res[res.length - 1].p2.y - res[0].p1.y) > 1e-4) return null;
    for (const g of res) if (!g.recta) { const d1 = Math.hypot(g.p1.x - g.c.x, g.p1.y - g.c.y), d2 = Math.hypot(g.p2.x - g.c.x, g.p2.y - g.c.y); if (Math.abs(d1 - g.r) > 1e-4 || Math.abs(d2 - g.r) > 1e-4) return null; }
    return res;
}
