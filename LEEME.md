# Herramientas CNC — Por Eloi A.A.

**Suite CNC 2026.10** · novedades en [NOVEDADES.md](NOVEDADES.md)

Herramientas para aprender y enseñar a programar CNC en código ISO (G-code).
Cada una es **un único archivo HTML**: funciona en el navegador (Chrome, Edge o Firefox),
sin instalar nada y también sin conexión a internet.

| Archivo | Herramienta | Versión |
|---|---|---|
| `index.html` | Portada con enlaces a todo | — |
| `calcador.html` | Calcador de contornos: diseñar ejercicios, hojas, soluciones, corrección y biblioteca | v70 |
| `corrector.html` | Corrector: el Calcador sin dibujo, solo para corregir, imprimir, exportar y enviar al Generador (se genera a partir del Calcador) | v17 |
| `manual_calcador.html` / `.pdf` | Manual del Calcador | — |
| `generador.html` | Generador de G-Code 2D (cortes, grabados, cajeras, puentes, desbaste y acabado) | v79 |
| `simulador3d.html` | Simulador G-Code 3D, con vista 2D en planta (alumnado) | V31 |
| `simulador3d_profesor.html` | Simulador G-Code 3D con editor y vista 2D (profesorado) | V31 |
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

- **Programas** (`calcador.html`, `generador.html`, `simulador3d.html`, `simulador3d_profesor.html`
  e `index.html`): © 2026 Eloi A.A. — **European Union Public Licence v. 1.2 (EUPL-1.2)**,
  archivo `LICENSE`. Puedes usarlos, estudiarlos, modificarlos y redistribuirlos; si distribuyes
  una versión modificada, debe publicarse también con la EUPL (o una licencia compatible) y con
  su código. La EUPL tiene la misma validez en todas las lenguas oficiales de la UE; la versión
  en castellano está en el Diario Oficial de la UE (Decisión de Ejecución (UE) 2017/863).
- **Manual** (`manual_calcador.html` y `.pdf`): © 2026 Eloi A.A. — **Creative Commons
  Atribución-CompartirIgual 4.0 (CC BY-SA 4.0)**, archivo `LICENCIA-MANUAL.txt`.
- Los **componentes de terceros** (fuentes EMS y Hershey, opentype.js, Clipper, three.js) conservan sus
  propias licencias, todas compatibles: ver `licencias.html`.

