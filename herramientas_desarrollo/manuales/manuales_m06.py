"""Manuales: herramienta por contorno y cambio con M06 (Calcador v78, Corrector v26). Ya aplicado."""
import sys, os
D = sys.argv[1] if len(sys.argv) > 1 else '.'
def editar(nombre, pares):
    p = os.path.join(D, nombre); s = open(p, encoding='utf-8').read()
    for a, b in pares:
        assert s.count(a) == 1, (nombre, s.count(a), a[:90]); s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s); print('manual:', nombre)

M06 = ('<pre style="page-break-inside:avoid;break-inside:avoid;background:#f4f6f8;border:1px solid #d7dee7;border-radius:6px;padding:6px 10px;font-size:9.5pt;line-height:1.4">G0 Z20          ; subir a la altura de seguridad\n'
       'M05             ; parar el husillo\n'
       'T102 M06        ; cambio a la herramienta T102\n'
       'M03 S16000      ; arrancar con las revoluciones de la nueva fresa</pre>')

editar('manual_calcador.html', [
  # panel derecho: fila Herramienta
  ('</td></tr><tr><td>Profundidad (mm)</td><td>Positiva. Vacía = la profundidad general de ⚙️ Mecanizar.</td></tr>',
   '</td></tr><tr><td>Herramienta</td><td>La fresa de la base con la que se mecaniza este contorno. <strong>La general</strong> es la de ⚙️ Mecanizar. Si el ejercicio usa más de una, ver «Varias herramientas en un ejercicio».</td></tr><tr><td>Profundidad (mm)</td><td>Positiva. Vacía = la profundidad general de ⚙️ Mecanizar.</td></tr>'),
  # nueva sección
  ('<h3>Puentes de sujeción</h3>',
   '<h3>Varias herramientas en un ejercicio</h3>\n'
   '<p>Cada contorno puede llevar su propia herramienta: por ejemplo, el contorno exterior con una fresa de Ø6 (T101) y un agujero pequeño con una de Ø3 (T102). Elígela en el campo <strong>Herramienta</strong> del Mecanizado del contorno. Cuando el ejercicio usa más de una:</p>\n'
   '<ul><li>En el plano, la entrada de cada contorno lleva su herramienta: <code>E2 · T102</code>. La hoja de ejercicio dice qué herramienta corta cada contorno.</li>'
   '<li>⚙️ Mecanizar mecaniza por herramientas y hace un <strong>cambio de herramienta</strong> entre ellas, como en la norma ISO:</li></ul>\n'
   + M06 + '\n'
   '<ul><li>La corrección comprueba que el alumno corte cada contorno con la herramienta pedida y que haga bien el cambio (capítulo 20).</li>'
   '<li>Los Simuladores cambian de fresa al leer <code>T… M06</code>, con el diámetro de la base de herramientas.</li></ul>\n'
   '<div class="nota consejo"><strong>Consejo.</strong> No uses G28 para subir antes del cambio: depende del control (en Fanuc vuelve al punto de referencia; en Fagor es otra cosa). Con <code>G0 Z…</code> el programa sirve en cualquier máquina.</div>\n'
   '<h3>Puentes de sujeción</h3>'),
  # ⚙️ Mecanizar: herramienta general
  ('<tr><td>Base</td><td>Elige una fresa de la base de herramientas (capítulo 16): rellena el número T, el diámetro, el avance, las revoluciones y el paso en Z. El botón 🧰 abre la base.</td></tr>',
   '<tr><td>Base</td><td>Elige una fresa de la base de herramientas (capítulo 16): rellena el número T, el diámetro, el avance, las revoluciones y el paso en Z. El botón 🧰 abre la base. Es la herramienta <strong>general</strong>: los contornos con herramienta propia usan la suya, con su avance, sus revoluciones y su paso.</td></tr>'),
  # cómo es el programa
  ('<li>Empieza con las unidades, las coordenadas, la herramienta, el giro del cabezal y <strong>G40</strong>, sube a la altura de seguridad y va al <strong>cero pieza</strong>.</li>',
   '<li>Empieza con las unidades, las coordenadas, la herramienta (<code>T101 M06</code>), el giro del cabezal (<code>M03 S…</code>) y <strong>G40</strong>, sube a la altura de seguridad y va al <strong>cero pieza</strong>.</li>'),
  ('<li>Termina volviendo al cero pieza, con <code>M5</code> y <code>M30</code>. Las coordenadas llevan hasta 3 decimales.</li>',
   '<li>Con <strong>varias herramientas</strong>, mecaniza todos los contornos de cada una seguidos y entre una y otra sube a la altura de seguridad, para el husillo (<code>M05</code>), cambia (<code>T102 M06</code>) y arranca con las revoluciones de la nueva (<code>M03 S…</code>).</li>\n'
   '<li>Termina volviendo al cero pieza, con <code>M05</code> y <code>M30</code>. Las coordenadas llevan hasta 3 decimales.</li>'),
  # corrección: observaciones
  ('<tr><td>Arco imposible</td>',
   '<tr><td>Herramienta</td><td>Si el ejercicio usa varias herramientas: el contorno se corta con una distinta de la que pide el plano, o el programa no indica ninguna. Cuenta como «lo pedido»: la pieza puede salir, pero no con la herramienta pedida.</td></tr><tr><td>Arco imposible</td>'),
  ('<tr><td>Seguridad</td><td>Bajar en rápido (G0) por debajo de la superficie, o desplazarse en rápido dentro del material.',
   '<tr><td>Seguridad</td><td>Bajar en rápido (G0) por debajo de la superficie, o desplazarse en rápido dentro del material. Hacer el cambio de herramienta (M06) con la fresa abajo o volver a cortar después del cambio sin arrancar el husillo (M03). Que falte M05 antes del M06, o usar G28, es solo un aviso.'),
  ('<tr><td>Lo pedido (2)</td><td>Completos si cumple la programación pedida y, si se exigen, la entrada y el sentido; si no, 0.</td></tr>',
   '<tr><td>Lo pedido (2)</td><td>Completos si cumple la programación pedida, si se exigen la entrada y el sentido, y si corta cada contorno con su herramienta; si no, 0.</td></tr>'),
])
editar('manual_corrector.html', [
  ('<tr><td><strong>Seguridad</strong></td><td>Rápidos (G0) que bajan por debajo de la superficie o se mueven dentro del material. En un programa sin ninguna Z, cualquier G0 después de haber cortado sin subir antes.</td></tr>',
   '<tr><td><strong>Seguridad</strong></td><td>Rápidos (G0) que bajan por debajo de la superficie o se mueven dentro del material. En un programa sin ninguna Z, cualquier G0 después de haber cortado sin subir antes. El cambio de herramienta (M06) con la fresa abajo, o cortar después del cambio sin arrancar el husillo (M03).</td></tr>'),
  ('<tr><td><strong>Lo pedido</strong></td><td>La programación exigida (por ejemplo, solo G91) y, si lo marcas, la entrada y el sentido del plano.</td></tr>',
   '<tr><td><strong>Lo pedido</strong></td><td>La programación exigida (por ejemplo, solo G91) y, si lo marcas, la entrada y el sentido del plano. Si el ejercicio usa varias herramientas, que cada contorno se corte con la suya (la que indica el plano en su entrada: <code>E2 · T102</code>).</td></tr>'),
  ('falta de F en el primer corte, coma decimal, la compensación que no se anula al final…</td></tr>',
   'falta de F en el primer corte, coma decimal, la compensación que no se anula al final, falta M05 antes del M06, G28 (depende del control)…</td></tr>'),
  ('herramienta de la base, pasadas, acabado, puentes, grabados, cajeras y compensación (G41/G42 según el trazado),',
   'herramienta de la base (y la de cada contorno, con su cambio <code>T… M06</code>), pasadas, acabado, puentes, grabados, cajeras y compensación (G41/G42 según el trazado),'),
])
