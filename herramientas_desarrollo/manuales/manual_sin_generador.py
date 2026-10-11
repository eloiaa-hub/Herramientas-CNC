"""Manual del Calcador sin el Generador: el capítulo 21 pasa a ser ⚙️ Mecanizar, y se cambian las
menciones sueltas y las capturas del panel Exportar y del mecanizado de un contorno.
Uso: python3 manual_sin_generador.py <manual_calcador.html> <carpeta de capturas>"""
import sys, re, base64, io
from PIL import Image
P, IMG = sys.argv[1], sys.argv[2]
s = open(P, encoding='utf-8').read()

def rep(a, b, cnt=1):
    global s
    n = s.count(a)
    assert n == cnt, f'{n} apariciones (se esperaban {cnt}) de: {a[:100]}'
    s = s.replace(a, b)

def webp(nombre, q=88):
    im = Image.open(f'{IMG}/{nombre}').convert('RGB'); b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()

def cambiar_img(alt_inicio, nombre, alt_nuevo=None, q=88):
    global s
    m = re.search(r'<img src="data:image/[^"]+" alt="' + re.escape(alt_inicio), s)
    assert m, alt_inicio
    i = m.start(); j = s.index('"', i + 10)                                      # fin del src
    s = s[:i] + '<img src="' + webp(nombre, q) + s[j:]
    if alt_nuevo:
        k = s.index('alt="', i); k2 = s.index('"', k + 5); viejo = s[k + 5:k2]
        s = s[:k + 5] + alt_nuevo + s[k2:]
        s = s.replace('<figcaption>' + viejo + '</figcaption>', '<figcaption>' + alt_nuevo + '</figcaption>', 1)

# ── Portada, índice y presentación ──
s, n = re.subn(r'Calcador de contornos v\d+ · Generador de G-Code v\d+ · Por Eloi A\.A\. · [^·]+ · ', 'Calcador de contornos v77 · Por Eloi A.A. · Octubre de 2026 · ', s); assert n == 1
rep('<a href="#generador">Del Calcador al Generador de G-Code</a>', '<a href="#mecanizar">⚙️ Mecanizar: el programa de la máquina</a>')
rep('<span>Del Calcador al Generador de G-Code</span>', '<span>⚙️ Mecanizar: el programa de la máquina</span>')
rep('<li>Pasar la pieza al <strong>Generador de G-Code</strong> con su cero pieza, sus puntos de entrada, su sentido de mecanizado y su profundidad, para generar el programa y simularlo.</li>',
    '<li>Obtener el <strong>programa de la máquina</strong> con <strong>⚙️ Mecanizar</strong>: pasadas, puentes, grabados, cajeras y compensación G41/G42, desde el cero pieza del plano, y verlo en el Simulador.</li>')
rep('con enlaces al Calcador, al Generador de G-Code, a los dos simuladores 3D', 'con enlaces al Calcador, al Corrector, a los dos simuladores 3D')
rep('llevarlo a otro ordenador o abrirlo en el Generador, guárdalo', 'llevarlo a otro ordenador o abrirlo en el Simulador, guárdalo')
rep('<li>Abre el JSON en el Generador de G-Code con su botón 📂: la pieza llega con su cero, sus entradas y su sentido (capítulo 21).</li>',
    '<li>Pulsa <span class="boton">⚙️ Mecanizar (G-code)…</span> para obtener el programa de la máquina, con su cero, sus entradas y su sentido, y míralo mecanizado con <span class="boton">➜ Abrir en el Simulador</span> (capítulo 21).</li>')
rep('que usan la tabla de soluciones y el Generador.', 'que usan la tabla de soluciones y ⚙️ Mecanizar.')
rep('(un trazo, que el Generador mecaniza como grabado)', '(un trazo, que ⚙️ Mecanizar hace como grabado)')
rep('<h3>En el Generador y en las hojas</h3>', '<h3>En ⚙️ Mecanizar y en las hojas</h3>')
rep('<li>Cada trazo viaja en el JSON como un <strong>grabado</strong>: se mecaniza sobre la línea,', '<li>Cada trazo es un <strong>grabado</strong>: ⚙️ Mecanizar lo hace sobre la línea,')
rep('que el Generador mecaniza como grabado.</p>', 'que ⚙️ Mecanizar hace como grabado.</p>')
rep('Su <span class="boton">➜ Abrir en el Generador</span> envía el ejercicio sin vuelta.', 'También tiene <span class="boton">⚙️ Mecanizar (G-code)…</span> (capítulo 21).')
rep('el Generador vacía todo su interior', '⚙️ Mecanizar vacía todo su interior')
rep('No llevan marca de entrada: el Generador calcula el punto de entrada del vaciado.', 'No llevan marca de entrada: ⚙️ Mecanizar calcula el punto de entrada del vaciado.')
rep('Si la fresa no cabe en alguna parte de la cajera, el Generador lo avisa.', 'Si la fresa no cabe en alguna parte de la cajera, ⚙️ Mecanizar lo avisa.')

# ── Capítulo 16: preparar el mecanizado ──
rep('Es <strong>la misma lista</strong> en el Calcador, el Corrector, el Generador y los Simuladores de este navegador: en el Generador rellena T, radio, avance, revoluciones y paso Z;',
    'Es <strong>la misma lista</strong> en el Calcador, el Corrector y los Simuladores de este navegador: en ⚙️ Mecanizar rellena T, diámetro, avance, revoluciones y paso Z;')
rep('cada contorno tiene su sección <strong>Mecanizado</strong>, que viaja al Generador en el JSON:', 'cada contorno tiene su sección <strong>Mecanizado</strong>, que usa ⚙️ Mecanizar y se guarda en el JSON:')
cambiar_img('Mecanizado de un contorno', 'mecanizado_contorno.png')
rep('<strong>Corte</strong>, con la corrección de herramienta que elijas en el Generador;', '<strong>Corte</strong>, con G41/G42 según el trazado (o la corrección que elijas en ⚙️ Mecanizar);')
rep('<td>Positiva. Vacía = la profundidad general del Generador.</td>', '<td>Positiva. Vacía = la profundidad general de ⚙️ Mecanizar.</td>')
rep('El Generador le suma el diámetro de la fresa,', '⚙️ Mecanizar le suma el diámetro de la fresa,')
rep('y viajan al Generador en su posición exacta: lo que ves es lo que se mecaniza, aunque en el Generador cambies el punto de entrada o el sentido de corte. Si pones dos puentes tan cerca que la fresa no llega a bajar entre ellos, el Calcador avisa: el Generador los hará como uno solo, más largo.',
    'y ⚙️ Mecanizar los hace en su posición exacta: lo que ves es lo que se mecaniza, aunque cambies la estrategia de corte. Si pones dos puentes tan cerca que la fresa no llega a bajar entre ellos, el Calcador avisa: se mecanizarán como uno solo, más largo.')
rep('<p>El Generador mecaniza primero los grabados (con la pieza aún bien sujeta), luego los contornos exteriores y luego los interiores. Las entradas E1, E2… del plano siguen ese mismo orden.</p>',
    '<p>⚙️ Mecanizar hace primero los grabados (con la pieza aún bien sujeta), luego las cajeras, los contornos exteriores y por último los interiores. Las entradas E1, E2… del plano siguen ese mismo orden.</p>')

# ── Capítulo 17: guardar y exportar ──
cambiar_img('El panel Exportar.', 'exportar.png')
rep('<h3>JSON para el Generador</h3>', '<h3>JSON</h3>')
rep('<li>Para el Generador: el <strong>cero pieza</strong>, los <strong>puntos de entrada</strong>, el <strong>sentido</strong> y la <strong>escala</strong>.</li>',
    '<li>El <strong>cero pieza</strong>, los <strong>puntos de entrada</strong> y el <strong>sentido</strong> de cada contorno, y los ajustes de <strong>⚙️ Mecanizar</strong>.</li>')
rep('vuelve a abrirlo en el programa, y también abre los JSON guardados por el Generador.', 'vuelve a abrirlo en el programa (y en el Corrector).')
rep('En el mismo panel están <span class="boton">➜ Abrir en el Generador</span> y <span class="boton">➜ Abrir en el Simulador</span> (capítulo 21),',
    'En el mismo panel están <span class="boton">⚙️ Mecanizar (G-code)…</span> y <span class="boton">➜ Abrir en el Simulador</span> (capítulo 21),')
i = s.index('<h3>La escala en el Generador</h3>'); j = s.index('<h3>DXF y SVG</h3>', i)
s = s[:i] + s[j:]

# ── Capítulo 21: ⚙️ Mecanizar ──
i = s.index('<section class="capitulo" id="generador">'); j = s.index('</section>', i) + len('</section>')
viejo = s[i:j]
k = viejo.index('<p><span class="boton">➜ Abrir en el Simulador</span> abre el Simulador del profesor'); k2 = viejo.index('</p>', k) + 4
p_simulador = viejo[k:k2]
cota = re.search(r'<svg class="cota".*?</svg>', viejo, flags=re.S).group(0)
nuevo = f'''<section class="capitulo" id="mecanizar"><h2><span class="num">21</span>⚙️ Mecanizar: el programa de la máquina</h2>{cota}
<p>El botón <span class="boton">⚙️ Mecanizar (G-code)…</span> del panel Exportar abre una ventana que convierte los contornos en el <strong>programa ISO de la máquina</strong>, en milímetros reales y desde el cero pieza del plano. Usa el mecanizado de cada contorno del panel derecho (capítulo 16): operación, profundidad, puentes y cajeras. El programa se rehace solo al cambiar cualquier dato. El Corrector tiene la misma ventana.</p>
<figure class="ancha"><img src="{webp('mecanizar.png', 84)}" alt="La placa del tutorial en ⚙️ Mecanizar: dos pasadas de 5 mm hasta 10, con G41/G42 según el trazado, la vista previa con el ancho de la fresa y el programa."><figcaption>La placa del tutorial en ⚙️ Mecanizar: dos pasadas de 5 mm hasta 10, con G41/G42 según el trazado, la vista previa con el ancho de la fresa y el programa.</figcaption></figure>
<h3>Herramienta</h3>
<table class="dos"><tbody><tr><td>Base</td><td>Elige una fresa de la base de herramientas (capítulo 16): rellena el número T, el diámetro, el avance, las revoluciones y el paso en Z. El botón 🧰 abre la base.</td></tr><tr><td>Número T</td><td>Herramienta de la máquina, de tres cifras (T101 a T999).</td></tr><tr><td>Diámetro (mm)</td><td>El mismo que el del panel Fresa: al cambiar uno cambia el otro.</td></tr><tr><td>Avance F, rápido G0 y revoluciones S</td><td>Avance de corte y de los desplazamientos en vacío (mm/min) y giro del cabezal (rpm).</td></tr></tbody></table>
<h3>Profundidad</h3>
<table class="dos"><tbody><tr><td>Altura de seguridad</td><td>La Z a la que la fresa se desplaza entre contornos.</td></tr><tr><td>Profundidad</td><td>La general, en positivo. Un contorno con profundidad propia (panel derecho) usa la suya.</td></tr><tr><td>Paso en Z</td><td>Lo que baja cada pasada: con profundidad 10 y paso 5 hace dos pasadas, a −5 y a −10.</td></tr><tr><td>Acabado</td><td>Sobreespesor que dejan las pasadas de desbaste; al final, una pasada recorre el contorno exacto. Con 0 no hay acabado. No se aplica a un contorno con puentes.</td></tr></tbody></table>
<h3>Recorrido</h3>
<table class="dos"><tbody><tr><td>Coordenadas</td><td><strong>G90</strong> (absolutas), <strong>G91</strong> (incrementales) o <strong>mixta</strong>: G90 en la entrada y el cierre de cada contorno y G91 en el recorrido, como en la tabla de soluciones.</td></tr><tr><td>Compensación</td><td><strong>G41/G42 según el trazado</strong>: la fresa por fuera de los exteriores y por dentro de los interiores, según el sentido de cada uno. También <strong>G41</strong> o <strong>G42</strong> para todos, o <strong>G40</strong> (la fresa va sobre la línea). Los grabados y las cajeras van siempre en G40.</td></tr><tr><td>Estrategia</td><td><strong>Según el plano</strong> respeta el sentido dibujado; <strong>Concordancia</strong> y <strong>Oposición</strong> eligen el sentido de cada contorno para cortar así.</td></tr><tr><td>Unidades</td><td>G71 (mm) o G70 (pulgadas).</td></tr></tbody></table>
<h3>Cómo es el programa</h3>
<ul>
<li>Empieza con las unidades, las coordenadas, la herramienta, el giro del cabezal y <strong>G40</strong>, sube a la altura de seguridad y va al <strong>cero pieza</strong>.</li>
<li>Mecaniza primero los <strong>grabados</strong>, luego las <strong>cajeras</strong>, los contornos <strong>exteriores</strong> y por último los <strong>interiores</strong>, en el orden de las entradas E1, E2…</li>
<li>Con <strong>G41/G42</strong>, la fresa baja fuera del contorno, a Ø + 2 mm y por el lado de la fresa, activa la compensación en una <strong>recta de entrada</strong> perpendicular al contorno, lo recorre y la anula con <strong>G40</strong> en una <strong>recta de salida</strong>. La bajada nunca toca otro contorno de la pieza; si no cabe una entrada tan larga, se acorta y se avisa.</li>
<li>Si la entrada P1 es una <strong>esquina</strong>, con G41/G42 se entra por el centro de un lado: el contorno cortado es el mismo y el programa lo indica en un comentario.</li>
<li>En las pasadas más profundas, la fresa <strong>sube en cada puente</strong> hasta su alto y vuelve a bajar al pasarlo.</li>
<li>Las <strong>cajeras</strong> se vacían en concéntrico o en zigzag, con entrada vertical o en rampa, y en G40: la trayectoria del centro de la fresa ya está calculada. Entre zonas, la fresa va directa si el camino queda dentro de la cajera y, si no, sube y vuelve a bajar.</li>
<li>Termina volviendo al cero pieza, con <code>M5</code> y <code>M30</code>. Las coordenadas llevan hasta 3 decimales.</li>
</ul>
<div class="nota consejo"><strong>Consejo.</strong> Pon la entrada (P1) en el centro de un lado. Es lo que piden los controles para activar la compensación y lo que enseñan los ejemplos del Simulador.</div>
<h3>Vista previa, resumen y avisos</h3>
<p>A la derecha se ve el recorrido: los cortes con colores por profundidad y, con <strong>Ancho de la fresa</strong> marcado, la banda que quita la fresa (con G41/G42, ya compensada). Debajo, el resumen: número de cortes, pasadas en Z, recorrido de corte y en rápido, tiempo estimado y número de bloques. Los avisos señalan lo que hay que revisar: una cajera donde no cabe la fresa, un contorno demasiado estrecho para el acabado, un paso en Z demasiado pequeño o una entrada de la compensación que no cabe.</p>
<h3>Descargar, copiar y simular</h3>
<table class="dos"><tbody><tr><td>⬇ Descargar .nc</td><td>Guarda el programa con el nombre del proyecto.</td></tr><tr><td>Copiar</td><td>Lo copia al portapapeles.</td></tr><tr><td>➜ Abrir en el Simulador</td><td>Abre el Simulador del profesor con el programa y el plano del ejercicio. El ancho del corte se pone en «Real», para que el borde del corte coincida con la pieza.</td></tr></tbody></table>
<figure class="ancha"><img src="{webp('simulador.png', 84)}" alt="El programa de la placa en el Simulador del profesor: el corte con su ancho real, los puentes y el taladro."><figcaption>El programa de la placa en el Simulador del profesor: el corte con su ancho real, los puentes y el taladro.</figcaption></figure>
<p>Los ajustes de la ventana se guardan con el proyecto, en el JSON, y en la sesión del navegador.</p>
<div class="nota atencion"><strong>Atención.</strong> Antes de cortar, comprueba el programa en el Simulador y que tu control acepta la activación de G41/G42 en una recta G1, que es lo habitual.</div>
<h3>El Simulador con la solución del ejercicio</h3>
{p_simulador}
</section>'''
s = s[:i] + nuevo + s[j:]

# ── Problemas frecuentes ──
rep('<dt>En el Generador la fresa no respeta el sentido del plano.</dt>\n<dd>Comprueba que su estrategia es «Según el plano». El JSON del Calcador la activa al abrirse.</dd>',
    '<dt>En ⚙️ Mecanizar la fresa no respeta el sentido del plano.</dt>\n<dd>Comprueba que la estrategia es «Según el plano»: «Concordancia» y «Oposición» eligen ellas el sentido de cada contorno.</dd>')
rep('<dt>El G-code del Generador no coincide con la hoja de soluciones.</dt>\n<dd>Con «Cotas = dibujo» el G-code sale a 1/10. Exporta con «1:1 interno» (capítulo 17).</dd>',
    '<dt>El G-code de ⚙️ Mecanizar no coincide con la hoja de soluciones.</dt>\n<dd>Las coordenadas del contorno son las mismas, pero ⚙️ Mecanizar añade las alturas, las pasadas y, con G41/G42, las rectas de entrada y salida; si P1 es una esquina, entra por el centro de un lado. Para comparar, usa G40 y la estrategia «Según el plano».</dd>')
rep('<dt>El Generador avisa «No se puede dejar', '<dt>⚙️ Mecanizar avisa «No se puede dejar')
rep('<dt>«➜ Abrir en el Generador» o «➜ Abrir en el Simulador» no abre nada.</dt>', '<dt>«➜ Abrir en el Simulador» no abre nada.</dt>')

open(P, 'w', encoding='utf-8').write(s)
quedan = re.findall(r'[^<>]{0,60}[Gg]enerador[^<>]{0,40}', re.sub(r'data:[^"]+', '', s))
print('manual_calcador: quedan', len(quedan), quedan[:10])

# ── Captura del Corrector (sin el selector de escala ni el botón del Generador) ──
def cambiar_corrector(ruta_manual, img):
    global s
    s = open(ruta_manual, encoding='utf-8').read()
    m = re.search(r'<img src="data:image/[^"]+" alt="El Corrector: el plano a la vista', s)
    if m:
        i = m.start(); j = s.index('"', i + 10); s = s[:i] + '<img src="' + webp(img, 84) + s[j:]
        open(ruta_manual, 'w', encoding='utf-8').write(s); print('captura del Corrector cambiada en', ruta_manual)
