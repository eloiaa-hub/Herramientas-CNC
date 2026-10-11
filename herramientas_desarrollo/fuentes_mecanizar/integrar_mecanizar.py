#!/usr/bin/env python3
"""Añade al Calcador la ventana «⚙️ Mecanizar» con el motor de G-code del Generador (en mm reales).
Uso: python3 integrar_mecanizar.py CARPETA_DE_LA_SUITE   (modifica calcador.html; después, construir_corrector.py)
Se aplica una sola vez sobre un Calcador sin la ventana (falla si ya la tiene)."""
import os, re, sys
D = sys.argv[1] if len(sys.argv) > 1 else '.'
DEV = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(D, 'calcador.html')
s = open(P, encoding='utf-8').read()
assert 'id="modalMec"' not in s, 'el Calcador ya tiene la ventana Mecanizar'
lee = lambda f: open(os.path.join(DEV, f), encoding='utf-8').read()
def rep(a, b, cnt=1):
    global s
    n = s.count(a); assert n == cnt, f'esperaba {cnt} y hay {n}: {a[:90]}'
    s = s.replace(a, b)

# ── 1. Estilos ──
rep('    .cr-modal { width: min(1280px, 96vw); height: min(860px, 92vh); display: flex; flex-direction: column; }',
    '''    .cr-modal { width: min(1280px, 96vw); height: min(860px, 92vh); display: flex; flex-direction: column; }
    .mec-cuerpo { grid-template-columns: minmax(290px, 30%) 1fr; }
    .mec-izq { overflow-y: auto; padding-right: 4px; }
    .mec-izq .mec-sec { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--text-muted); margin: 8px 0 2px; }
    .mec-izq .param-line { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 13px; }
    .mec-izq .param-line input[type=number] { width: 86px; }
    .mec-izq .param-line select { max-width: 190px; }
    #mecLienzo { flex: 1 1 52%; min-height: 220px; width: 100%; border: 1px solid var(--border-color); border-radius: 6px; }
    #mecTexto { flex: 1 1 30%; min-height: 110px; width: 100%; font: 12px/1.45 Consolas, 'DejaVu Sans Mono', monospace; border: 1px solid var(--border-color); border-radius: 6px; padding: 6px 8px; resize: none; background: var(--bg-panel); color: var(--text-main); white-space: pre; }
    .mec-resumen { font-size: 12.5px; line-height: 1.5; }
    .mec-resumen .mec-aviso { color: #b9770e; } .mec-resumen .mec-error { color: #c0392b; font-weight: 700; } .mec-resumen .mec-nota { color: var(--text-muted); font-size: 11.5px; }
    .mec-botones { display: flex; gap: 8px; flex-wrap: wrap; }
    .mec-botones .btn-action { width: auto; flex: 1 1 auto; }''')

# ── 2. Botón en el panel Exportar (también en el Corrector) ──
rep('<button class="btn-action sec" onclick="abrirEnGenerador()"',
    '<button class="btn-action" onclick="abrirMec()" title="Prepara el programa de la máquina: herramienta, pasadas, acabado, puentes, grabados y cajeras, con vista previa y descarga del .nc">⚙️ Mecanizar (G-code)…</button>\n                    <button class="btn-action sec" onclick="abrirEnGenerador()"')

# ── 3. La ventana ──
OPC_COMP = '<option value="G40">G40 · la fresa por el contorno</option><option value="auto">G41/G42 según el trazado</option><option value="G41">G41 en todos</option><option value="G42">G42 en todos</option>'
OPC_ESTR = '<option value="plano">Según el plano (sentido dibujado)</option><option value="concordancia">Concordancia</option><option value="oposicion">Oposición</option>'
VENTANA = f'''<div class="modal-overlay" id="modalMec" onclick="if(event.target===this)cerrarMec()">
    <div class="help-modal cr-modal">
        <div class="help-header"><h2>⚙️ Mecanizar</h2><button class="help-close" onclick="cerrarMec()">✕</button></div>
        <div class="cr-cuerpo mec-cuerpo">
            <div class="cr-izq mec-izq">
                <div class="mec-sec">Herramienta</div>
                <div class="param-line">Base <span style="display:flex;gap:4px;align-items:center"><select id="mecHerr" style="max-width:150px" title="Una fresa de la base de herramientas: pone el número T, el diámetro, el avance, las revoluciones y el paso en Z"></select><button type="button" onclick="HB.abrir(h => {{ document.getElementById('mecHerr').value = h.id; document.getElementById('mecHerr').dispatchEvent(new Event('change')); }})" title="Base de herramientas: añadir, editar, exportar…" style="border:1px solid var(--border-color);background:transparent;border-radius:6px;padding:2px 6px;cursor:pointer">🧰</button></span></div>
                <div class="param-line" title="Número de herramienta de la máquina (tres cifras, como en TpaCAD)">Número T <input type="number" id="mecT" min="1" max="999" step="1"></div>
                <div class="param-line" title="El mismo de la sección Fresa del panel izquierdo">Diámetro (mm) <input type="number" id="mecD" min="0.1" step="0.5"></div>
                <div class="param-line">Avance de corte F (mm/min) <input type="number" id="mecF" min="1" step="50"></div>
                <div class="param-line">Rápido G0 (mm/min) <input type="number" id="mecF0" min="1" step="100"></div>
                <div class="param-line">Revoluciones S (rpm) <input type="number" id="mecS" min="1" step="500"></div>
                <div class="mec-sec">Profundidad</div>
                <div class="param-line" title="Altura a la que sube la fresa para desplazarse en rápido">Altura de seguridad (mm) <input type="number" id="mecZseg" min="0" step="1"></div>
                <div class="param-line" title="Profundidad de corte de los contornos que no tienen la suya (en el panel derecho, Mecanizado)">Profundidad (mm) <input type="number" id="mecProf" min="0.1" step="0.5"></div>
                <div class="param-line" title="Profundidad máxima de cada pasada">Paso en Z (mm) <input type="number" id="mecPaso" min="0.1" step="0.5"></div>
                <div class="param-line" title="Sobreespesor que dejan las pasadas de desbaste; una última pasada a la profundidad total recorre el contorno exacto. 0 = sin acabado">Acabado (mm) <input type="number" id="mecAcab" min="0" step="0.1"></div>
                <div class="mec-sec">Recorrido</div>
                <div class="param-line">Coordenadas <select id="mecCoord"><option value="G90">G90 · absolutas</option><option value="G91">G91 · incrementales</option><option value="mixta" title="G90 en la entrada y el cierre de cada contorno, G91 en el recorrido">G90/G91 · mixta</option></select></div>
                <div class="param-line" title="«Según el trazado»: G41 o G42 en cada contorno para que la fresa vaya por fuera de los exteriores y por dentro de los interiores">Compensación <select id="mecComp">{OPC_COMP}</select></div>
                <div class="param-line" title="Sentido de corte: el dibujado en el plano, o el que da fresado en concordancia u oposición">Estrategia <select id="mecEstr">{OPC_ESTR}</select></div>
                <div class="param-line">Unidades <select id="mecUnid"><option value="G71">G71 · mm</option><option value="G70">G70 · pulgadas</option></select></div>
                <div class="ctx-nota">La operación de cada contorno (corte, grabado, cajera o isla), su profundidad y sus puentes se eligen en el panel derecho, en <strong>Mecanizado</strong>. Se mecanizan primero los grabados, después las cajeras, los exteriores y por último los interiores.</div>
            </div>
            <div class="cr-der">
                <canvas id="mecLienzo"></canvas>
                <label style="font-size:12px;display:flex;gap:6px;align-items:center"><input type="checkbox" id="mecAncho"> Ancho de la fresa</label>
                <div class="mec-resumen" id="mecResumen"></div>
                <textarea id="mecTexto" readonly spellcheck="false"></textarea>
                <div class="mec-botones">
                    <button class="btn-action" id="mecDescargar" onclick="descargarMec()">⬇ Descargar .nc</button>
                    <button class="btn-action sec" id="mecCopiar" onclick="copiarMec()">Copiar</button>
                    <button class="btn-action sec" id="mecSimular" onclick="simularMec()" title="Abre el Simulador del profesor con el plano y este programa, para verlo mecanizado en 3D o en 2D">➜ Abrir en el Simulador</button>
                </div>
            </div>
        </div>
    </div>
</div>
'''
rep('<div class="modal-overlay" id="modalCorregir"', VENTANA + '<div class="modal-overlay" id="modalCorregir"')

# ── 4. Guardar los parámetros en la sesión y en el JSON ──
# (cfgMec se declara junto a las demás configuraciones: la sesión se restaura durante el arranque)
rep("let cfgFresa = { ver:false, d:6, herr:null };", "let cfgFresa = { ver:false, d:6, herr:null };\nlet cfgMec = { T:101, F:1000, F0:5000, S:12000, zSeg:20, prof:3, paso:3, acab:0, coord:'G90', comp:'G40', estr:'plano', unid:'G71', ancho:true };   // ⚙️ Mecanizar")
rep('cfgCotaMan, cfgHoja,', 'cfgCotaMan, cfgHoja, cfgMec,')
rep('asignarCfg(cfgCotaMan, d.cfgCotaMan); asignarCfg(cfgHoja, d.cfgHoja);', 'asignarCfg(cfgCotaMan, d.cfgCotaMan); asignarCfg(cfgHoja, d.cfgHoja); asignarCfg(cfgMec, d.cfgMec);')
rep('cfgHoja: JSON.parse(JSON.stringify(cfgHoja)) }\n    };', 'cfgHoja: JSON.parse(JSON.stringify(cfgHoja)), cfgMec: JSON.parse(JSON.stringify(cfgMec)) }\n    };')
rep('            if (esObj(d.calcador.cfgHoja)) asignarCfg(cfgHoja, d.calcador.cfgHoja);', '            if (esObj(d.calcador.cfgHoja)) asignarCfg(cfgHoja, d.calcador.cfgHoja);\n            if (esObj(d.calcador.cfgMec)) asignarCfg(cfgMec, d.calcador.cfgMec);')

# ── 5. «Abrir en el Simulador» admite otro programa (el de la máquina) ──
rep('function abrirEnSimulador() {\n    const datos = exportarJSON(true); if (!datos) return;',
    'function abrirEnSimulador(programaMaquina, archivo) {\n    const datos = exportarJSON(true); if (!datos) return;')
rep("    try { selC.innerHTML = '<option value=\"todos\">Todos</option>'; selC.value = 'todos'; programa = textoTabla('iso'); } finally { selC.innerHTML = prevH; selC.value = prevV; }",
    "    if (typeof programaMaquina === 'string') programa = programaMaquina;\n    else try { selC.innerHTML = '<option value=\"todos\">Todos</option>'; selC.value = 'todos'; programa = textoTabla('iso'); } finally { selC.innerHTML = prevH; selC.value = prevV; }")
rep("    paraSimulador = { tipo:'plano-calcador', json: JSON.stringify(datos), programa, nombre: nombreProyecto(),",
    "    paraSimulador = { tipo:'plano-calcador', json: JSON.stringify(datos), programa, archivo: archivo || null, nombre: nombreProyecto(),")

# ── 6. El panel derecho ya no remite al Generador ──
rep('<div class="ctx-nota"><strong>Mecanizado</strong> (en el Generador)</div>', '<div class="ctx-nota"><strong>Mecanizado</strong> (en ⚙️ Mecanizar y en el Generador)</div>')

# ── 6b. Ayuda rápida ──
rep('<tr><td>5. Guardar</td><td>💾 Guardar (.json) y ábrelo en el Generador con su botón 📂 (o pulsa ➜ Abrir en el Generador).</td></tr>',
    '<tr><td>5. Guardar</td><td>💾 Guardar (.json): lo abren el Calcador, el Corrector, el Generador y los Simuladores.</td></tr>\n                <tr><td>6. Mecanizar</td><td>⚙️ Mecanizar (G-code): herramienta de la base, pasadas, acabado, puentes, grabados y cajeras; vista previa, descarga del .nc y ➜ Simulador. La operación de cada contorno se elige en el panel derecho (Mecanizado).</td></tr>')

# ── 7. Créditos: Clipper ──
g = open(os.path.join(D, 'generador.html'), encoding='utf-8').read()
boost = re.search(r'<pre>(Boost Software License[^<]*)</pre>', g).group(1)
i = s.find('<h3>Lector de fuentes</h3>'); j = s.find('</pre>', i) + len('</pre>')
s = s[:j] + f'''

<h3>Cálculo de cajeras</h3>
<p><strong>Clipper</strong> 6.4.2 (© 2010-2017 Angus Johnson), para calcular el vaciado de las cajeras al mecanizar, con licencia Boost Software License 1.0:</p>
<pre>{boost}</pre>''' + s[j:]

# ── 8. El motor y la ventana, al final ──
codigo = '\n'.join([lee('caj_bloque.js'), lee('offset_bloque.js'), lee('motor_mecanizado.js'), lee('adaptador_calcador.js'), lee('mecanizar_ui.js')])
fin = s.rindex('</body>')
s = s[:fin] + '<script>\n' + lee('clipper_bloque.js') + '</script>\n<script>\n' + codigo + '\n</script>\n' + s[fin:]

# ── 8b. Ayudas emergentes de la profundidad: la general es la de ⚙️ Mecanizar ──
rep('title="Positiva. Vacío = la profundidad general del Generador"', 'title="Profundidad de corte de este contorno, en positivo. Vacío = la profundidad general (la de ⚙️ Mecanizar, o la del Generador)"')
rep('title="Profundidad de grabado en el Generador"', 'title="Profundidad de grabado (en ⚙️ Mecanizar y en el Generador)"')

# ── 9. Versión ──
VERSION_CALCADOR = 80   # v74: Mecanizar · v75: entrada/salida de G41/G42 y coordenadas mixtas · v76: ayudas de la profundidad · v77: sin el Generador · v78: herramienta por contorno (M06) · v79: acentos de los textos DXF · v80: fresa de cada tramo en la simulación del plano y proyecto del Anidador por mensaje
v = int(re.search(r'vertical-align:middle">v(\d+)</span></span>', s).group(1))
s = s.replace(f'vertical-align:middle">v{v}</span></span>', f'vertical-align:middle">v{VERSION_CALCADOR}</span></span>', 1)
open(P, 'w', encoding='utf-8').write(s)
print(f'Calcador v{v} → v{VERSION_CALCADOR}: ventana Mecanizar integrada ({len(s) // 1024} KB)')
