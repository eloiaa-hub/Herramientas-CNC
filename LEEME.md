# Herramientas CNC — Por Eloi A.A.

**Suite CNC 2026.10** · novedades en [NOVEDADES.md](NOVEDADES.md)

Herramientas para aprender y enseñar a programar CNC en código ISO (G-code).
Cada una es **un único archivo HTML**: funciona en el navegador (Chrome, Edge o Firefox),
sin instalar nada y también sin conexión a internet.

| Archivo | Herramienta | Versión |
|---|---|---|
| `index.html` | Portada con enlaces a todo | — |
| `calcador.html` | Calcador de contornos: diseñar ejercicios, hojas, soluciones, corrección y biblioteca. Genera el G-code de la máquina (⚙️ Mecanizar) | v80 |
| `corrector.html` | Corrector: el Calcador sin dibujo, para corregir, simular, imprimir, exportar y generar el G-code con ⚙️ Mecanizar (se genera a partir del Calcador) | v28 |
| `manual_calcador.html` / `.pdf` | Manual del Calcador | — |
| `manual_corrector.html` / `.pdf` | Manual del Corrector (profesorado) | — |
| `manual_anidador.html` / `.pdf` | Manual del Anidador de tableros (profesorado) | — |
| `manual_calculadora.html` / `.pdf` | Manual de la Calculadora de taller (alumnado) | — |
| `guia_simulador.pdf` | Guía del Simulador para el alumnado | — |
| `anidador.html` | Anidador de tableros: coloca piezas del Calcador (.json) o de un despiece (.csv) en tableros con colocación a mano, giro y escala con el ratón, y los devuelve como proyectos del Calcador o en PNG, SVG y DXF (profesorado) | v6 |
| `simulador3d.html` | Simulador G-Code 3D, con vista 2D en planta (alumnado) | V38 |
| `simulador3d_profesor.html` | Simulador G-Code 3D con editor y vista 2D (profesorado) | V38 |
| `calculadora.html` | Calculadora de taller: recta inclinada, polares, arcos (centro, I J y R), G90 ↔ G91 y velocidades de corte (alumnado) | v4 |
| `licencias.html` | Créditos y licencias (fuentes y bibliotecas de terceros) | — |
| `LICENSE` | Licencia de los programas (EUPL-1.2) | — |
| `LICENCIA-MANUAL.txt` | Licencia del manual (CC BY-SA 4.0) | — |

La versión de cada programa se ve junto a su título; la de la suite («Suite CNC año.mes»), en la portada y en la ventana «Créditos y licencias» de cada programa. El símbolo ⌂ vuelve a la portada.

## Usarlas desde el disco

Deja todos los archivos **juntos en la misma carpeta** y abre `index.html` (o directamente
el programa que quieras) con doble clic. Los enlaces entre archivos son relativos.

## Publicarlas en GitHub Pages

1. Crea un repositorio en GitHub y sube todos estos archivos a su raíz.
2. En el repositorio: *Settings → Pages → Build and deployment → Source: Deploy from a branch*,
   rama `main`, carpeta `/ (root)`, y guarda.
3. En unos minutos estarán en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPOSITORIO/`.

Para actualizar un programa basta con sustituir su archivo (manteniendo el mismo nombre).

## A tener en cuenta

- **Tus datos no salen del navegador**: dibujos, programas y correcciones se procesan en el
  propio ordenador; no se envían a ningún servidor.
- Lo que cada herramienta recuerda (último trabajo, biblioteca de ejercicios) se guarda en el
  navegador **por sitio**: la versión del disco y la publicada en la web no comparten esos datos.
- No publiques los **JSON de tus ejercicios** en un sitio abierto: contienen la pieza y, con
  ella, el Calcador genera la tabla de soluciones.
- Fuentes de una línea incluidas en el Calcador: EMS Readability, Tech, Osmotron, Nixish y
  Allure (Evil Mad Scientist, SIL Open Font License 1.1) y Hershey Sans y Script (licencia
  liberal con reconocimiento). Lector de fuentes: opentype.js (licencia MIT). Todos los avisos
  están en `licencias.html` y en la ventana «Créditos y licencias» del Calcador.
- Otras fuentes de una línea (por ejemplo, las gratuitas de k40lasercutter.com) se cargan en
  el Calcador con «Cargar fuente…» y quedan guardadas en el navegador; no se incluyen en el
  programa porque no indican una licencia que permita redistribuirlas.

## Licencia

- **Programas** (`calcador.html`, `corrector.html`, `simulador3d.html`, `simulador3d_profesor.html`, `calculadora.html`, `anidador.html`
  e `index.html`): © 2026 Eloi A.A. — **European Union Public Licence v. 1.2 (EUPL-1.2)**,
  archivo `LICENSE`. Puedes usarlos, estudiarlos, modificarlos y redistribuirlos; si distribuyes
  una versión modificada, debe publicarse también con la EUPL (o una licencia compatible) y con
  su código. La EUPL tiene la misma validez en todas las lenguas oficiales de la UE; la versión
  en castellano está en el Diario Oficial de la UE (Decisión de Ejecución (UE) 2017/863).
- **Manual y guías** (`manual_calcador`, `manual_corrector`, `manual_anidador`, `manual_calculadora` y `guia_simulador`): © 2026 Eloi A.A. — **Creative Commons
  Atribución-CompartirIgual 4.0 (CC BY-SA 4.0)**, archivo `LICENCIA-MANUAL.txt`.
- Los **componentes de terceros** (fuentes EMS y Hershey, opentype.js, Clipper, three.js) conservan sus
  propias licencias, todas compatibles: ver `licencias.html`.


## Herramientas de desarrollo

La carpeta `herramientas_desarrollo/` no se usa en clase: guarda los scripts que construyen el Corrector a partir del Calcador, las fuentes del motor de ⚙️ Mecanizar y las pruebas automáticas. Ver su `LEEME.md`.
