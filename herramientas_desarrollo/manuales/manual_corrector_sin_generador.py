"""Manual del Corrector sin el Generador: el capítulo 11 pasa a ⚙️ Mecanizar y Simulador, y se cambia la captura de la pantalla.
Uso: python3 manual_corrector_sin_generador.py <manual_corrector.html> <captura de la pantalla (png)>"""
import sys, re, base64, io
from PIL import Image
P, IMG = sys.argv[1], sys.argv[2]
s = open(P, encoding='utf-8').read()
def rep(a, b, cnt=1):
    global s
    n = s.count(a); assert n == cnt, f'{n} de: {a[:90]}'; s = s.replace(a, b)
rep('<li>Enviar al Generador o al Simulador</li>', '<li>⚙️ Mecanizar y Simulador</li>')
rep('<li><strong>Envía</strong> el ejercicio al Generador de G-Code o al Simulador.</li>', '<li><strong>Genera</strong> el programa de la máquina con ⚙️ Mecanizar y abre el ejercicio en el Simulador.</li>')
rep('corrección masiva, hojas, variantes, enviar al Generador o al Simulador, y exportar DXF y SVG.', 'corrección masiva, hojas, variantes, ⚙️ Mecanizar, abrir en el Simulador y exportar DXF y SVG.')
rep('abre un ejercicio guardado desde el Calcador (o desde el Generador).', 'abre un ejercicio guardado desde el Calcador.')
rep('<span>11</span>Enviar al Generador o al Simulador</h2>', '<span>11</span>⚙️ Mecanizar y Simulador</h2>')
rep('<li><span class="boton">➜ Abrir en el Generador</span>: abre el Generador de G-Code con el ejercicio, sin guardar archivos, para preparar el programa de la máquina.</li>',
    '<li><span class="boton">⚙️ Mecanizar (G-code)…</span>: prepara el programa de la máquina, igual que en el Calcador: herramienta de la base, pasadas, acabado, puentes, grabados, cajeras y compensación (G41/G42 según el trazado), con vista previa, descarga del .nc y <span class="boton">➜ Abrir en el Simulador</span>. Está explicado en el manual del Calcador (capítulo 21).</li>')
# captura de la pantalla
m = re.search(r'<img src="data:image/[^"]+"( style="width:100%")?><figcaption>El Corrector con un ejercicio abierto\.', s); assert m
im = Image.open(IMG).convert('RGB'); b = io.BytesIO(); im.save(b, 'WEBP', quality=88, method=6)
i = m.start(); j = s.index('"', i + 10)
s = s[:i] + '<img src="data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode() + s[j:]
open(P, 'w', encoding='utf-8').write(s)
print('manual_corrector: quedan', re.findall(r'[^<>]{0,50}[Gg]enerador[^<>]{0,30}', re.sub(r'data:[^"]+', '', s)))
