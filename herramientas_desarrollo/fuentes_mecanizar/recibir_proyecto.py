"""Calcador: recibir un proyecto de otra pestaña (Anidador, «➜ Abrir en el Calcador») también cuando el navegador no
comparte el almacén entre archivos locales (Firefox con file://): si no está en localStorage, se pide a la pestaña que
lo ha abierto con un mensaje (como ya hace el Simulador con el Calcador).

Uso: python3 recibir_proyecto.py <carpeta de la suite>
"""
import sys, os
P = os.path.join(sys.argv[1] if len(sys.argv) > 1 else '.', 'calcador.html')
s = open(P, encoding='utf-8').read()
def rep(a, b, cnt=1):
    global s
    n = s.count(a)
    assert n == cnt, f'{n} apariciones (se esperaban {cnt}) de: {a[:100]}'
    s = s.replace(a, b)
rep("""// ── Proyecto enviado por el Generador («➜ CALCADOR») ──
window.addEventListener('load', () => setTimeout(() => {
    if (location.hash !== '#desdeGenerador') return;
    try { const x = JSON.parse(localStorage.getItem('suiteCNC:paraCalcador') || 'null');
        if (x && Date.now() - x.t < 120000) { guardarUndo(); abrirJSONDatos(JSON.parse(x.json)); setTimeout(() => SG.cambio(), 700); snack('Proyecto abierto desde otra pestaña (Ctrl+Z vuelve a lo que tenías)'); }
        localStorage.removeItem('suiteCNC:paraCalcador'); history.replaceState(null, '', location.pathname + location.search);
    } catch (e) { snack('No se pudo leer el proyecto recibido'); }
}, 400));""",
"""// ── Proyecto enviado desde otra pestaña (Anidador: «➜ Abrir en el Calcador») ──
// Primero por el almacén del navegador; si no está (Firefox no lo comparte entre archivos locales), se pide a la
// pestaña que ha abierto esta, que lo envía con un mensaje ('proyecto-generador', que recibe recibirDelGenerador)
window.addEventListener('load', () => setTimeout(() => {
    if (location.hash !== '#desdeGenerador') return;
    let x = null;
    try { x = JSON.parse(localStorage.getItem('suiteCNC:paraCalcador') || 'null'); localStorage.removeItem('suiteCNC:paraCalcador'); } catch (e) {}
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    if (x && Date.now() - x.t < 120000) {
        try { guardarUndo(); abrirJSONDatos(JSON.parse(x.json)); setTimeout(() => SG.cambio(), 700); snack('Proyecto abierto desde otra pestaña (Ctrl+Z vuelve a lo que tenías)'); }
        catch (e) { snack('No se pudo leer el proyecto recibido'); }
        return;
    }
    let recibido = false;
    window.addEventListener('message', e => { if (e.data && e.data.tipo === 'proyecto-generador') recibido = true; });
    try { if (window.opener) window.opener.postMessage({ tipo:'calcador-listo' }, '*'); } catch (e) {}
    setTimeout(() => { if (!recibido) snack('No ha llegado el proyecto de la otra pestaña: guárdalo allí como .json y ábrelo aquí con 📂 Abrir'); }, 4000);
}, 400));""")
open(P, 'w', encoding='utf-8').write(s)
print('Calcador: recibir proyecto por mensaje:', P)
