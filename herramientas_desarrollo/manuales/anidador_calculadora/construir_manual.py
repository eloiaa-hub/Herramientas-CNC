"""Construye un manual HTML de la suite a partir de su fuente (cuerpo HTML) y sus capturas.

En la fuente, {{img:archivo.png}} o {{img:archivo.png|60%}} se sustituye por la imagen incrustada en WebP
(anchura máxima 1800 px). El estilo es el del manual del Corrector (se copia de manual_corrector.html).
Uso (desde esta carpeta, después de node capt_calc.js y node capt_anid.js, que dejan las imágenes en capturas/):
  python3 construir_manual.py fuentes/manual_calculadora.html capturas ../../../manual_calculadora.html "Calculadora de taller — Manual para el alumnado"
  python3 construir_manual.py fuentes/manual_anidador.html capturas ../../../manual_anidador.html "Anidador de tableros — Manual para el profesorado"
"""
import sys, re, io, base64
from PIL import Image
fuente, capt, salida, titulo = sys.argv[1:5]
estilo = re.search(r'<style>(.*?)</style>', open(sys.argv[5] if len(sys.argv) > 5 else __import__('os').path.join(__import__('os').path.dirname(__file__), '..', '..', '..', 'manual_corrector.html'), encoding='utf-8').read(), re.S).group(1)
cuerpo = open(fuente, encoding='utf-8').read()
cache = {}
def img(m):
    nombre, ancho = m.group(1), (m.group(2) or '100%')
    if nombre not in cache:
        im = Image.open(f'{capt}/{nombre}').convert('RGB')
        if im.width > 1800: im = im.resize((1800, round(im.height * 1800 / im.width)), Image.LANCZOS)
        b = io.BytesIO(); im.save(b, 'WEBP', quality=82, method=6)
        cache[nombre] = 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
    return f'<img src="{cache[nombre]}" style="width:{ancho}">'
cuerpo = re.sub(r'\{\{img:([^}|]+)(?:\|([^}]+))?\}\}', img, cuerpo)
html = f'<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>{titulo}</title><style>{estilo}\nh3 {{ break-after: avoid-page; page-break-after: avoid; }}\nfigure {{ text-align: center; }} figure img {{ margin: 0 auto; }} figcaption {{ text-align: center; }}\n.formula {{ font-family: Consolas, "DejaVu Sans Mono", monospace; background: #f4f6f8; border: 1px solid #e3e8ee; border-radius: 5px; padding: 2mm 3mm; margin: 2mm 0; page-break-inside: avoid; }}\n</style></head><body>\n{cuerpo}\n</body></html>\n'
open(salida, 'w', encoding='utf-8').write(html)
print(f'{salida}: {len(html) // 1024} KB, {len(cache)} imágenes')
