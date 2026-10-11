"""Quita del Calcador (ya integrado con ⚙️ Mecanizar) las referencias visibles al Generador de G-Code,
que queda retirado: botón «➜ Abrir en el Generador», selector de escala del Generador y textos de ayuda.
El JSON sigue siendo el mismo (el Generador antiguo lo podría abrir), pero no se menciona.

Uso: python3 quitar_generador.py <carpeta de la suite>   (después de integrar_mecanizar.py)
"""
import os, sys
D = sys.argv[1] if len(sys.argv) > 1 else '.'
P = os.path.join(D, 'calcador.html')
s = open(P, encoding='utf-8').read()

def rep(a, b, cnt=1):
    global s
    n = s.count(a)
    assert n == cnt, f'{n} apariciones (se esperaban {cnt}) de: {a[:90]}'
    s = s.replace(a, b)

# ── Panel Exportar ──
# El botón del Generador desaparece (la función queda, sin uso)
rep('''                    <button class="btn-action sec" onclick="abrirEnGenerador()" title="Abre el Generador en otra pestaña con este proyecto, sin guardar ni buscar archivos. «⬅ Calcador» lo devuelve">➜ Abrir en el Generador</button>\n''', '')
# La escala solo servía para el Generador: se oculta (el valor se sigue guardando)
rep('<div class="param-line">Escala en el Generador\n', '<div class="param-line" style="display:none">Escala del JSON\n')
rep('title="El Generador trabaja a 1/10 y multiplica por 10 solo al mostrar cotas. «Cotas = dibujo»: sus cotas muestran los mm del plano y su G-code sale a 1/10. «1:1 interno»: su G-code sale en los mm del plano y sus cotas se ven ×10."',
    'title="Escala interna del JSON (compatibilidad con archivos antiguos)"')
rep('<div class="ctx-nota" id="notaEscala"></div>', '<div class="ctx-nota" id="notaEscala" style="display:none"></div>')
rep("""        ? 'En el Generador, su <strong>G-code</strong> coincide con la hoja de soluciones (100 mm → X100); sus cotas en pantalla se ven ×10.'
        : 'En el Generador, sus <strong>cotas</strong> coinciden con el plano; su G-code sale a 1/10 (100 mm → X10).';""",
    """        ? 'Escala interna 1:1.'
        : 'Escala interna 1/10.';""")
rep('title="Solo DXF y SVG. Desmarcado, el DXF usa el cero pieza del plano como origen. El JSON siempre envía el cero pieza al Generador."',
    'title="Solo DXF y SVG. Desmarcado, el DXF usa el cero pieza del plano como origen. El JSON siempre guarda el cero pieza del plano."')
rep('title="Guarda el proyecto en un archivo JSON: lo abren el Calcador, el Corrector, el Generador y los Simuladores (como plano del ejercicio)"',
    'title="Guarda el proyecto en un archivo JSON: lo abren el Calcador, el Corrector y los Simuladores (como plano del ejercicio)"')
rep('title="Abre un .json del Generador o de este programa"', 'title="Abre un proyecto .json del Calcador o del Corrector"')
rep("""+ ' — ábrelo con el Generador v71 o posterior');""", """);""")

# ── Base de herramientas ──
rep('title="Elige una fresa de la base de herramientas (la misma del Generador y los Simuladores)"', 'title="Elige una fresa de la base de herramientas (la misma del Corrector y los Simuladores)"')
rep('Una sola lista para el Calcador, el Corrector, el Generador y los Simuladores de este navegador.', 'Una sola lista para el Calcador, el Corrector y los Simuladores de este navegador.')

# ── Panel derecho (mecanizado de cada contorno) ──
rep('<div class="ctx-nota"><strong>Mecanizado</strong> (en ⚙️ Mecanizar y en el Generador)</div>', '<div class="ctx-nota"><strong>Mecanizado</strong> (para ⚙️ Mecanizar)</div>')
rep('Abierto: se exporta al Generador como trazo de grabado.', 'Abierto: se mecaniza como trazo de grabado (sobre la línea).')
rep('Se vacía en el Generador (v71+), antes que los cortes.', 'Se vacía en ⚙️ Mecanizar, antes que los cortes.')
rep('Vacío = la profundidad general (la de ⚙️ Mecanizar, o la del Generador)"', 'Vacío = la profundidad general de ⚙️ Mecanizar"')
rep('title="Profundidad de grabado (en ⚙️ Mecanizar y en el Generador)"', 'title="Profundidad de grabado en ⚙️ Mecanizar"')
rep("'Ancho = puente que queda en la madera (el Generador suma el Ø de la fresa).'", "'Ancho = puente que queda en la madera (⚙️ Mecanizar suma el Ø de la fresa).'")
rep("el Generador los hará como uno solo, más largo", "se mecanizarán como uno solo, más largo")
rep('Se graba sobre la línea (G40) en el Generador.', 'Se graba sobre la línea (G40) en ⚙️ Mecanizar.')
rep('snack(`Cambios traídos del Generador: ', 'snack(`Cambios traídos del archivo: ')

# ── Acerca de y ayuda ──
rep('(Calcador, Corrector, Generador y Simuladores)', '(Calcador, Corrector y Simuladores)')
rep('El resultado se guarda en el formato del Generador de G-Code, que lo abre con su escala y sus arcos exactos.',
    'El resultado se guarda en un proyecto .json con sus medidas y sus arcos exactos, y con ⚙️ Mecanizar se convierte en el programa de la máquina.')
rep('<tr><td>5. Guardar</td><td>💾 Guardar (.json): lo abren el Calcador, el Corrector, el Generador y los Simuladores.</td></tr>',
    '<tr><td>5. Guardar</td><td>💾 Guardar (.json): lo abren el Calcador, el Corrector y los Simuladores.</td></tr>')
rep('''<p>En el panel derecho, cada contorno tiene su <strong>mecanizado</strong>, que viaja en el JSON al Generador (v71 o posterior, que también vacía las cajeras): <strong>corte</strong> (con la corrección elegida en el Generador) o <strong>grabado</strong> (sobre la línea, sin corrección), <strong>profundidad</strong> propia (vacío = la general) y <strong>puentes</strong> (número, ancho y alto) para que la pieza no se suelte al cortarla. Los contornos abiertos se exportan como trazos de grabado. El Generador mecaniza primero los grabados, luego los exteriores y luego los interiores; las entradas E1, E2… siguen ese orden.</p>''',
    '''<p>En el panel derecho, cada contorno tiene su <strong>mecanizado</strong>, que usa ⚙️ Mecanizar y se guarda en el JSON: <strong>corte</strong> (con G41/G42 según el trazado o la corrección elegida en ⚙️ Mecanizar), <strong>grabado</strong> (sobre la línea, sin corrección), <strong>cajera</strong> (vaciado, con sus <strong>islas</strong>), <strong>profundidad</strong> propia (vacío = la general) y <strong>puentes</strong> (número, ancho y alto) para que la pieza no se suelte al cortarla. Los contornos abiertos se mecanizan como trazos de grabado. ⚙️ Mecanizar hace primero los grabados, luego las cajeras, los exteriores y por último los interiores; las entradas E1, E2… siguen ese orden.</p>''')
rep('''<p><strong>Cero pieza, entradas y sentido en el Generador:</strong> el JSON lleva el cero pieza del plano como cero pieza (W) activo del Generador, cada contorno empezando en su punto de entrada y en su sentido dibujado, y activa en el Generador la estrategia «Según el plano» para que respete ese sentido. El Generador mecaniza primero los grabados, luego los exteriores y luego los interiores; las entradas E1, E2… del plano y la tabla de soluciones siguen ese orden. La compensación G41/G42 se sigue eligiendo en el Generador.</p>''',
    '''<p><strong>Cero pieza, entradas y sentido:</strong> el JSON guarda el cero pieza del plano, cada contorno empezando en su punto de entrada y en su sentido dibujado. ⚙️ Mecanizar programa desde ese cero pieza y, con la estrategia «Según el plano», respeta ese sentido; las entradas E1, E2… del plano y la tabla de soluciones siguen su orden.</p>''')
rep('''            <p><strong>Escala en el Generador:</strong> el Generador trabaja internamente a 1/10 y solo multiplica por 10 las cotas que muestra. «Cotas = dibujo» hace que sus cotas coincidan con el plano (y su G-code sale a 1/10); «1:1 interno» hace que su G-code coincida con la hoja de soluciones (y sus cotas se ven ×10). La nota bajo el selector lo recuerda, y el programa guarda la última opción elegida.</p>\n''', '')
rep('''<p><strong>JSON para el Generador</strong>: la vía exacta. Conserva las medidas, los arcos con su ángulo y el tipo exterior/interior. «Cotas = dibujo» hace que las cotas del Generador muestren las mismas medidas que el plano (el Generador trabaja internamente a 1/10). Los contornos abiertos viajan como trazos de grabado. Usa el Generador v71 o posterior.</p>''',
    '''<p><strong>JSON</strong>: el proyecto completo y exacto. Conserva las medidas, los arcos con su ángulo, el tipo exterior/interior y el mecanizado de cada contorno. Lo abren el Calcador, el Corrector y los Simuladores (como plano del ejercicio).</p>''')
rep(' El Generador (v63 o posterior) también lo importa a sus medidas, pero sin cero pieza, entradas ni mecanizado: para eso usa el JSON.', ' No lleva cero pieza, entradas ni mecanizado: para eso usa el JSON.')
rep(' El Generador (v63 o posterior) también lo importa, pero la vía completa es el JSON.', ' La vía completa es el JSON.')

# ── Mensajes del enlace antiguo (solo salen si el Generador retirado devuelve un proyecto) ──
rep("snack(VISOR ? 'Abriendo el proyecto en el Generador…' : 'Abriendo el proyecto en el Generador… Al terminar, «⬅ Calcador» lo devuelve aquí');", "snack('Abriendo el proyecto en otra pestaña…');")
rep("'Proyecto devuelto por el Generador (Ctrl+Z para volver a como estaba)'", "'Proyecto recibido de otra pestaña (Ctrl+Z para volver a como estaba)'")
rep("'Proyecto abierto desde el Generador (Ctrl+Z vuelve a lo que tenías)'", "'Proyecto abierto desde otra pestaña (Ctrl+Z vuelve a lo que tenías)'")
rep("'No se pudo leer el proyecto del Generador'", "'No se pudo leer el proyecto recibido'")

open(P, 'w', encoding='utf-8').write(s)
import re
quedan = [m for m in re.findall(r'[^\n]{0,70}[Gg]enerador[^\n]{0,50}', s) if not re.search(r'^\s*//|// |mecAGenerador|aTrazadoGenerador|Generador\(|paraGenerador|desdeGenerador|DelGenerador|DesdeGenerador|generador\.html|generador-listo|proyecto-generador', m)]
print(f'Calcador sin referencias visibles al Generador · quedan {len(quedan)} (revisar):')
for q in quedan: print('   ', q.strip()[:140])
