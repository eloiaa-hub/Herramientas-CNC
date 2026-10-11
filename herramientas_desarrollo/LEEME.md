# Herramientas de desarrollo de la Suite CNC

Esta carpeta no se usa en clase y no hace falta subirla a Aules. Sirve para mantener la suite sin perder trabajo.

## Construir el Corrector

El Corrector es el Calcador en modo visor. Después de cualquier cambio en `calcador.html`:

```
python3 construir_corrector.py ..
```

(el argumento es la carpeta de la suite). Para subir la versión del Corrector, cambia `VERSION_CORRECTOR` dentro del script.

## Fuentes de ⚙️ Mecanizar (`fuentes_mecanizar/`)

Copia de referencia de lo que se integró en el Calcador (v74 y v75). **El Calcador ya lo lleva dentro**: los cambios nuevos se hacen directamente en `calcador.html`.

- `motor_mecanizado.js`: motor de G-code (adaptación fiel del Generador v81 a mm reales).
- `adaptador_calcador.js`: convierte los contornos del Calcador en trazados para el motor.
- `mecanizar_ui.js`: ventana ⚙️ Mecanizar (campos, vista previa, descargar, simulador).
- `caj_bloque.js`, `offset_bloque.js`, `clipper_bloque.js`: cajeras, desbaste/acabado y Clipper 6.4.2 (licencia Boost), sacados del Generador.
- `integrar_mecanizar.py` + `quitar_generador.py` + `multiherramienta.py` + `dxf_texto.py` + `recibir_proyecto.py` + `calcador_v73_original.html`: rehacen el Calcador actual desde el v73 (la versión resultante está en `VERSION_CALCADOR`). Desde esta carpeta:

  ```
  cp calcador_v73_original.html ../../calcador.html
  python3 integrar_mecanizar.py ../..
  python3 quitar_generador.py ../..
  python3 multiherramienta.py ../..
  python3 dxf_texto.py ../..
  python3 recibir_proyecto.py ../..
  python3 ../construir_corrector.py ../..
  ```

  `quitar_generador.py` quita del Calcador las referencias visibles al Generador (botón, escala y textos). `multiherramienta.py` añade la herramienta por contorno: el campo del panel, el cambio con M06 en el intérprete, la compensación con el radio de cada tramo, la corrección de la herramienta y el cambio en el programa de la tabla de soluciones. `recibir_proyecto.py` recibe el proyecto del Anidador también sin almacén compartido (por mensaje). `dxf_texto.py` lee los textos de los DXF de fondo con sus acentos (UTF-8, página de códigos, `\U+XXXX` y `%%nnn`). El Generador está retirado: `generador.html` se conserva sin actualizar y solo lo usan las pruebas de referencia.

## Manuales

Las fuentes originales de los manuales no están: se editan directamente `manual_calcador.html` y `manual_corrector.html`, y los PDF se rehacen con

```
node generar_pdf_manuales.js ..
```

(Chromium y Playwright; con Python, pikepdf y Pillow, `aligerar_pdf.py` pasa después las capturas a JPEG y el PDF pesa menos de la mitad; en el del Calcador recalcula las páginas del índice impreso; `SOLO=manual_anidador` imprime solo ese). En `manuales/` están los scripts que quitaron el Generador de los dos manuales (ya aplicados: no se vuelven a ejecutar), y `manuales_m06.py`, que añadió la herramienta por contorno y el M06.

Los manuales de la **Calculadora** y del **Anidador** sí tienen fuentes, en `manuales/anidador_calculadora/`: el texto en `fuentes/` (con `{{img:captura.png}}` donde va cada imagen), los guiones que hacen las capturas con ejemplos (`capt_calc.js`, `capt_anid.js`; el del Anidador usa ejercicios de la carpeta `EJERCICIOS`) y `construir_manual.py`, que incrusta las capturas en WebP con el estilo del manual del Corrector. Después, el PDF con `generar_pdf_manuales.js`.

## Simuladores

`simulador3d.html` y `simulador3d_profesor.html` se editan directamente (no se generan). Comparten el intérprete ISO, la compensación G41/G42 y el material 3D: un cambio en uno se copia al otro. `simulador_m06.py` (ya aplicado) es el cambio de herramienta con T… M06 en los dos.

## Pruebas automáticas (`pruebas/`)

Requieren Node.js y Playwright con Chromium. Variables opcionales: `SUITE` (carpeta de la suite, por defecto `../..`), `EJERCICIOS` (carpeta con JSON de ejercicios) y `CHROME` (ruta del navegador).

| Prueba | Qué comprueba |
|---|---|
| `arranque.js` | Todos los programas abren sin errores y muestran su versión |
| `regresion_basica.js` | Todos los ejercicios abren y se corrigen en Calcador y Corrector |
| `motor_vs_generador.js` | El motor de Mecanizar da el mismo G-code que el Generador (`referencia_generador.json`, 390 casos). Desde el Calcador v75 los 65 casos con G41/G42 (`comp_oposic`) salen distintos a propósito: entrada y salida de la compensación |
| `referencia_generador.js` | Regenera esa referencia con el Generador |
| `comp_simulador.js` | Programas con G41/G42 en el Simulador (`SIM=simulador3d_profesor.html` para el del profesor): la trayectoria compensada corta todo el contorno sin meterse en la pieza (con `Prueba01.json`) |
| `corpus_comp.js` | `comp_simulador.js` sobre todos los ejercicios (quedan avisos esperables: detalles más pequeños que la fresa y huecos que se solapan) |
| `calculadora.js` | Calculadora de taller: resultados con valores conocidos, conversión G90 ↔ G91 (ida y vuelta), guardado, móvil (las cinco pestañas sin salirse) y capturas |
| `anidador.js` | Anidador: sin solapes y dentro del margen, veta, varios tableros, CSV con coma decimal, piezas reales; el tablero se abre en el Calcador y ⚙️ Mecanizar genera el programa; colocar a mano con el ratón (arrastrar, doble clic para girar, asas para la escala, chincheta, pasar a otro tablero por su pestaña o a uno nuevo; los tableros vacíos se quitan), giro y color en la lista; reabrir un tablero guardado (también de versiones anteriores, `anidado_v3_usuario.json`) con las piezas por separado; exportar PNG, SVG y DXF (en el SVG y el DXF se comprueba que cada arco va hacia su lado, y en el DXF el color de cada pieza; el DXF se valida con `validar_dxf.py`, que necesita `pip install ezdxf`) |
| `dxf_texto.js` | Calcador: textos de DXF de fondo con acentos (R12 en Windows-1252 y en UTF-8, DXF 2010, `\U+XXXX`, `%%nnn`); crea los DXF con ezdxf |
| `multiherr.js` | Herramienta por contorno: panel, plano, ⚙️ Mecanizar con M06, corrección de los errores típicos del cambio y nota |
| `sim_m06.js` | Simuladores con T… M06: compensación y corte con el radio de cada herramienta, fresa dibujada y revisión |
| `mecanizar_ui.js` | La ventana ⚙️ Mecanizar: herramienta, opciones, guardado, descarga y simulador |
| `interp_corpus.js`, `interp_cmp.js` | Intérprete ISO de los simuladores frente al corpus de programas |
| `estres_mecanizar.js`, `perfil_*.js`, `mec_vista.js` | Casos extremos y medidas de tiempo |

Ejemplo: `cd pruebas && node arranque.js`
