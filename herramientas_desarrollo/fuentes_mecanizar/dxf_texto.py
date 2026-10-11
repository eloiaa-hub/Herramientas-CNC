"""Calcador: los textos de un DXF con acentos y ñ se leen bien.

- El archivo se decodifica según su versión: los DXF 2007 o posteriores (AC1021+) están en UTF-8; los anteriores, en
  la página de códigos de su cabecera ($DWGCODEPAGE, normalmente ANSI_1252). Si un DXF antiguo ya viene en UTF-8
  válido (lo hacen algunos programas), se respeta.
- En los textos (TEXT y MTEXT) se traducen los códigos \\U+XXXX (Unicode) y %%nnn (carácter por su número), además
  de los de siempre (%%c, %%d, %%p).

Uso: python3 dxf_texto.py <carpeta de la suite>
"""
import sys, os
P = os.path.join(sys.argv[1] if len(sys.argv) > 1 else '.', 'calcador.html')
s = open(P, encoding='utf-8').read()
def rep(a, b, cnt=1):
    global s
    n = s.count(a)
    assert n == cnt, f'{n} apariciones (se esperaban {cnt}) de: {a[:100]}'
    s = s.replace(a, b)

rep("""        reader.onload = e => { try { crearFondoDXF(e.target.result, file.name, null); encuadrar(); } catch (err) { console.error(err); snack('Error al leer el DXF: ' + err.message); } };
        reader.readAsText(file);""",
    """        reader.onload = e => { try { crearFondoDXF(decodificarDXF(e.target.result), file.name, null); encuadrar(); } catch (err) { console.error(err); snack('Error al leer el DXF: ' + err.message); } };
        reader.readAsArrayBuffer(file);""")
rep("""function cargarFondo(input) {""", """// Texto de un DXF con sus acentos: DXF 2007 o posterior (AC1021+) en UTF-8; los anteriores, en la página de
// códigos de su cabecera ($DWGCODEPAGE, casi siempre ANSI_1252), salvo que ya vengan en UTF-8 válido
function decodificarDXF(buf) {
    const bytes = new Uint8Array(buf);
    const cab = new TextDecoder('windows-1252').decode(bytes.subarray(0, Math.min(bytes.length, 40000)));
    const ver = (cab.match(/\\$ACADVER\\s*\\r?\\n\\s*1\\s*\\r?\\n\\s*AC(\\d{4})/) || [])[1];
    if (ver && +ver >= 1021) return new TextDecoder('utf-8').decode(bytes);
    try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch (e) { /* no es UTF-8: su página de códigos */ }
    const cp = ((cab.match(/\\$DWGCODEPAGE\\s*\\r?\\n\\s*3\\s*\\r?\\n\\s*(\\S+)/) || [])[1] || 'ANSI_1252').toUpperCase();
    const m = cp.match(/^(ANSI|DOS)_?(\\d+)$/), nombre = m ? (m[1] === 'ANSI' ? 'windows-' : 'ibm') + m[2] : 'windows-1252';
    try { return new TextDecoder(nombre).decode(bytes); } catch (e) { return new TextDecoder('windows-1252').decode(bytes); }
}
function cargarFondo(input) {""")
rep("""    const especiales = s => s.replace(/%%[cC]/g, 'Ø').replace(/%%[dD]/g, '°').replace(/%%[pP]/g, '±').replace(/%%[uUoO]/g, '');""",
    """    // Códigos de los textos: \\U+XXXX (Unicode: «Z\\U+00F3calo» → «Zócalo»), %%nnn (carácter por su número), %%c Ø, %%d °, %%p ±
    const especiales = s => s.replace(/\\\\U\\+([0-9A-Fa-f]{4})/g, (m, h) => String.fromCodePoint(parseInt(h, 16)))
        .replace(/%%(\\d{3})/g, (m, n) => String.fromCharCode(+n))
        .replace(/%%[cC]/g, 'Ø').replace(/%%[dD]/g, '°').replace(/%%[pP]/g, '±').replace(/%%[uUoO]/g, '');""")
open(P, 'w', encoding='utf-8').write(s)
print('DXF: textos con acentos (\\\\U+, %%nnn y página de códigos):', P)
