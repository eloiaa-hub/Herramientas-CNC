#!/usr/bin/env python3
"""Genera corrector.html a partir de calcador.html (el Corrector es el Calcador en modo visor).
Uso: python3 construir_corrector.py CARPETA_DE_LA_SUITE"""
import re, sys, os
VERSION_CORRECTOR = 'v28'
d = sys.argv[1] if len(sys.argv) > 1 else '.'
s = open(os.path.join(d, 'calcador.html'), encoding='utf-8').read()
vcal = re.search(r'vertical-align:middle">(v\d+)</span></span>', s).group(1)
def rep(a, b, cnt=1):
    global s
    n = s.count(a)
    assert n == cnt, f'esperaba {cnt} y hay {n}: {a[:80]}'
    s = s.replace(a, b)
assert s.startswith('<!DOCTYPE html>\n<html lang="es">'), 'cabecera inesperada'
s = s.replace('<html lang="es">', '<html lang="es" data-visor="1">', 1)      # solo la del propio documento
rep('<title>Calcador de contornos — Por Eloi A.A.</title>', '<title>Corrector — Por Eloi A.A.</title>')
rep(f'⬡ Calcador de contornos — Por Eloi A.A.<span class="ver-suite" title="Versión del programa" style="font-size:11px;font-weight:600;padding:1px 7px;margin-left:8px;border-radius:9px;background:rgba(0,90,156,.12);color:#005A9C;vertical-align:middle">{vcal}</span>',
    f'✅ Corrector — Por Eloi A.A.<span class="ver-suite" title="Versión del programa (generado a partir del Calcador {vcal})" style="font-size:11px;font-weight:600;padding:1px 7px;margin-left:8px;border-radius:9px;background:rgba(0,90,156,.12);color:#005A9C;vertical-align:middle">{VERSION_CORRECTOR}</span>')
rep('<a class="btn-manual" href="manual_calcador.html"', '<a class="btn-manual" href="manual_corrector.html"')
rep('El <a href="manual_calcador.html" target="_blank" rel="noopener"><strong>📖 manual completo</strong></a> lo explica todo paso a paso, con imágenes (archivo <em>manual_calcador.html</em>',
    'El <a href="manual_corrector.html" target="_blank" rel="noopener"><strong>📖 manual del Corrector</strong></a> lo explica todo paso a paso, con imágenes (archivo <em>manual_corrector.html</em>')
# sesión propia: el Corrector no pisa lo que haya abierto en el Calcador
n = s.count("'calcador_estado")
s = s.replace("'calcador_estado", "'corrector_estado")
assert n == 6, f'claves de sesión: {n}'
open(os.path.join(d, 'corrector.html'), 'w', encoding='utf-8').write(s)
print(f'corrector.html generado desde el Calcador {vcal} → Corrector {VERSION_CORRECTOR}')
