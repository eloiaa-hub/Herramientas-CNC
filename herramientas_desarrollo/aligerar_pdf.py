"""Aligera un PDF de manual: las imágenes guardadas sin pérdida (capturas de pantalla) pasan a JPEG de calidad 85.
Uso: python3 aligerar_pdf.py entrada.pdf salida.pdf"""
import sys, io, zlib
import pikepdf
from pikepdf import PdfImage, Name
from PIL import Image
ent, sal = sys.argv[1:3]
pdf = pikepdf.open(ent)
n = antes = despues = 0
vistas = set()
for pag in pdf.pages:
    for nombre, obj in (pag.images.items() if not hasattr(pag, 'get_images') else pag.get_images().items()):
        if obj.objgen in vistas: continue
        vistas.add(obj.objgen)
        if obj.get('/Filter') == Name.DCTDecode or '/SMask' in obj: continue
        try: im = PdfImage(obj).as_pil_image()
        except Exception: continue
        if im.width * im.height < 40000: continue
        if im.mode not in ('RGB', 'L'): im = im.convert('RGB')
        b = io.BytesIO(); im.save(b, 'JPEG', quality=85, optimize=True, subsampling=0)
        viejo = len(obj.read_raw_bytes())
        if len(b.getvalue()) >= viejo * 0.9: continue
        obj.write(b.getvalue(), filter=Name.DCTDecode)
        obj.ColorSpace = Name.DeviceRGB if im.mode == 'RGB' else Name.DeviceGray
        obj.BitsPerComponent = 8
        for k in ('/DecodeParms', '/Predictor'):
            if k in obj: del obj[k]
        n += 1; antes += viejo; despues += len(b.getvalue())
pdf.save(sal, object_stream_mode=pikepdf.ObjectStreamMode.generate, compress_streams=True)
print(f'{sal}: {n} imágenes, {antes / 1048576:.1f} → {despues / 1048576:.1f} MB en imágenes')
