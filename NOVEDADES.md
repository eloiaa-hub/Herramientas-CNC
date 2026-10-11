# Novedades de la Suite CNC

La versión de la suite es **año.mes** (por ejemplo, 2026.10). Cada programa conserva además su propio número junto a su título.

## Suite CNC 2026.10

Versiones de los programas: **Calcador v80 · Corrector v28 · Simulador 3D V38 · Simulador del profesor V38 · Calculadora de taller v4 · Anidador de tableros v6**.

### Calcador de contornos
- Dibujo y calco de piezas con cotas automáticas en cadena (sin números que se pisen), cotas manuales, tangencias (recta tangente y arco de radio R), corte y unión de contornos, cajeras con islas y puentes de sujeción.
- Entrada de coordenadas absolutas, incrementales, polares y en ISO (G1, G2 y G3 con I J o R).
- Ajuste de medidas con el centro de los arcos en la rejilla (I y J exactos).
- Hoja de ejercicio, tabla de soluciones (con el programa ISO y sus alturas de seguridad), variantes para examen y biblioteca de ejercicios con copia de seguridad.
- Corrección de programas, uno a uno o de toda la clase: geometría, seguridad (incluido el rápido sin subir la herramienta), lo pedido y la compensación de radio G40/G41/G42 según el tipo de cada trazado (interior o exterior).
- Simulación del programa del alumno bloque a bloque, con la trayectoria real de la fresa, y reproductor del programa de la pieza en la barra superior.
- «➜ Abrir en el Simulador» con un clic.
- Aviso de cambios sin guardar en archivo.

### Varias herramientas y cambio con M06 (Calcador, Corrector y Simuladores)
- Cada contorno puede llevar **su herramienta** (de la base compartida): campo «Herramienta» en el Mecanizado del panel derecho. En el plano, la entrada lo indica (`E2 · T102`) y la hoja de ejercicio dice qué herramienta corta cada contorno.
- ⚙️ Mecanizar mecaniza por herramientas, con un **cambio como en la norma ISO** entre una y otra: `G0 Z` de seguridad · `M05` · `T102 M06` · `M03 S…`, y el avance, las revoluciones, el paso y el radio de cada fresa. El programa empieza con `T101 M06` y `M03`.
- La corrección comprueba que cada contorno se corte con su herramienta (cuenta como «lo pedido») y el cambio: M06 con la fresa abajo o cortar sin M03 después del cambio son errores de seguridad; que falte M05 o usar G28 (depende del control) son avisos. La compensación usa el radio de la herramienta de cada tramo.
- La **tabla de soluciones** también lo hace: su programa ISO lleva el cambio (`M05` · `T102 M06` · `M03 S…`) antes del primer contorno de cada herramienta, ya a la altura de seguridad (v79).
- La **simulación del plano** dibuja la huella y la fresa con el diámetro de la herramienta de cada contorno (antes, siempre con el de la general), y se rehace al cambiar la herramienta de un contorno (v80).
- Los Simuladores cambian de fresa al leer `T… M06` (diámetro y tipo de la base): el corte, la compensación y la fresa dibujada; el panel muestra la herramienta activa y la revisión avisa de los mismos errores.

### DXF de fondo con acentos (Calcador v79)
- Los textos de un DXF de fondo se leen con sus acentos, eñes y símbolos, venga de donde venga: DXF 2007 o posteriores (en UTF-8), DXF antiguos en su página de códigos (`$DWGCODEPAGE`, normalmente Windows-1252) y los códigos `\U+XXXX` (así escribe el Anidador los nombres) y `%%nnn`, además de `%%c` (Ø), `%%d` (°) y `%%p` (±).

### ⚙️ Mecanizar: el programa de la máquina (Calcador y Corrector)
- El G-code de la máquina se genera dentro del Calcador, en milímetros reales y desde el cero pieza del plano.
- Cortes, grabados, cajeras con islas (concéntricas o en zigzag, entrada vertical o en rampa), puentes, pasadas en Z, desbaste y acabado; estrategia según el plano, en concordancia o en oposición; coordenadas G90, G91 o **mixtas** (G90 en la entrada y el cierre de cada contorno, G91 en el recorrido, como en la tabla de soluciones); G71 o G70. G-code con 3 decimales.
- Herramienta de la base compartida (T, diámetro, F, S y paso se rellenan solos).
- Compensación **G41/G42 según el trazado**: por fuera de los exteriores y por dentro de los interiores.
- Con G41/G42, cada contorno se mecaniza como en los ejemplos del Simulador: la fresa baja fuera del contorno (a Ø + 2 mm, por el lado de la fresa), activa la compensación en una recta de entrada perpendicular y la anula con **G40** en una recta de salida. El programa empieza y termina en G40. Si la entrada P1 es una esquina, se entra por el centro de un lado; la bajada no toca ningún otro contorno de la pieza.
- Vista previa con la banda de la fresa y colores por profundidad, resumen (pasadas, longitud, tiempo) y avisos.
- Descargar .nc, copiar y «➜ Abrir en el Simulador» con un clic. Los ajustes se guardan en la sesión y en el JSON.

### Corrector
- El Calcador sin herramientas de dibujo: abre un ejercicio, corrige, simula, imprime, exporta y genera el G-code con ⚙️ Mecanizar, sin riesgo de modificarlo. Se genera a partir del Calcador.

### Simulador 3D (alumnado y profesorado)
- Vista 3D y **vista 2D** en planta (arranca en 2D si el equipo no tiene 3D).
- **Plano del ejercicio**: abre el JSON del Calcador y colorea el recorrido del programa (autocorrección).
- Grosor del tablero para cortes no pasantes y vaciados.
- Compensación G41/G42 con las esquinas interiores bien resueltas; ejemplos de corte interior y exterior.
- Coordenadas polares (G16) y coma decimal interpretadas igual que en el Calcador.
- **Corte suave en 3D**: las paredes siguen el círculo de la fresa (plana, de bola o en V) en lugar de ir en dientes de sierra, con 400 puntos por lado.
- **Ancho del corte «Real» automático** al cargar un programa con G41/G42 o hecho con ⚙️ Mecanizar: el borde del corte coincide con la pieza. Se puede volver a cambiar a mano.
- El programa que llega desde ⚙️ Mecanizar conserva el nombre del archivo («… (mecanizado).nc»).

### En toda la suite
- **Base de herramientas** compartida (T101…T999), con importación y exportación en JSON y CSV.
- Ventana «Créditos y licencias» en cada programa (EUPL-1.2 y licencias de terceros).

### Revisión de robustez
Pruebas de estrés con miles de programas, proyectos y archivos aleatorios, rotos y extremos en todos los programas. Corregido:
- **Simuladores**: un programa con coordenadas enormes (por ejemplo, un radio de un kilómetro por un cero de más) podía colgar el simulador al dibujar la cuadrícula; ahora la cuadrícula se adapta al tamaño de la escena. Mismo tope en la evaluación del plano.
- **Calcador y Corrector**: la corrección de un programa con un tramo de kilómetros podía tardar más de un minuto (ahora, milisegundos); al seleccionar el aviso de un arco imposible, o uno de «lo pedido», el dibujo de la corrección fallaba; un arco de radio nulo (I0 J0) con G41/G42 rompía la simulación.
- **⚙️ Mecanizar**: con desbaste y acabado, un trazado demasiado estrecho para el sobreespesor (por ejemplo, una media luna fina) se corta sin acabado y el G-code lo avisa.

### Manuales y ayudas
- **Manual del Calcador** (82 páginas): capítulo nuevo **«⚙️ Mecanizar: el programa de la máquina»** (herramienta, profundidad, recorrido, cómo es el programa, vista previa y Simulador); capturas al día (la pantalla con sus zonas, el panel Exportar, el mecanizado de un contorno, el Corrector y el reproductor); la barra superior descrita con la biblioteca, el reproductor y el aviso de cambios sin guardar; dudas nuevas en «Problemas frecuentes».
- **Manual de la Calculadora de taller** (`manual_calculadora.html` y `.pdf`, 12 páginas, para el alumnado): cada pestaña con un ejemplo de taller resuelto paso a paso, sus fórmulas, las líneas ISO y los errores típicos (ángulos, R negativo, el polo de G16).
- **Manual del Anidador de tableros** (`manual_anidador.html` y `.pdf`, 14 páginas, para el profesorado): el tablero, la fresa, las piezas y la lista de despiece, colocar a mano con el ratón, del tablero al Calcador y a la máquina, guardar y reabrir, y exportar. Los dos, enlazados desde la portada y desde la ayuda de cada programa.
- **Manual del Calcador**: el cambio de herramienta en la tabla de soluciones, la fresa de cada contorno en el recorrido de la pieza y los acentos de los textos DXF.
- **Ayuda de los Simuladores**: el botón «📂 Cargar G-code / plano».
- **Guía del Simulador para el alumnado** (`guia_simulador.pdf`, 17 páginas): para qué sirve, la pantalla, cargar el programa, la simulación, 2D o 3D, la revisión y sus mensajes, la herramienta, el tablero, la compensación G41/G42, el plano del ejercicio (autocorrección), el vídeo para Aules, problemas frecuentes y una lista de comprobación antes de entregar. Enlazada desde la portada y desde la ayuda de los simuladores.
- **Simuladores**: la cabecera cabía mal en pantallas de menos de 1600 píxeles (desaparecían los ajustes ⚙️ y parte de la ayuda); ahora los botones se compactan y caben de 1024 a 1920 píxeles.
- **Manual del Corrector** (`manual_corrector.html` y `.pdf`, 16 páginas, para el profesorado): abrir un ejercicio, corregir un programa, qué se comprueba, la simulación, la corrección de toda la clase con la nota orientativa, demostrar los errores en clase, hojas, variantes, ⚙️ Mecanizar y el Simulador, y problemas frecuentes. El botón «📖 Manual» del Corrector abre ahora su propio manual.
- **Corrección masiva**: con la compensación del lado equivocado, el programa salía «no sale bien» pero con un 10; ahora los errores de compensación cuentan como cortes que dañan la pieza (el del lado, uno por cada corte afectado).

### Interfaz
- **Calcador**: si la pantalla es baja (portátil apaisado, pantalla táctil o zoom del navegador), la barra de herramientas se reparte sola en dos o más columnas y ya no queda cortada por abajo.
- **Calcador**: el panel izquierdo es un poco más ancho y el botón 🧰 de la base de herramientas se ve entero.
- **Calcador**: el botón **«💾 Guardar (.json)»** guarda el proyecto: ese archivo lo abren todos los programas de la suite.

### Compensación con fresas grandes
- **Calcador, Corrector y Simuladores**: con G41/G42 y una fresa más grande que un arco cóncavo o que un hueco de la pieza, el camino de la fresa formaba bucles que se metían en la pieza. Ahora esos bucles se quitan, como haría un CAM: la fresa pasa de largo y deja ese material sin cortar.
- **Corrección**: aviso en la línea del arco cóncavo donde la fresa no cabe («la máquina daría una alarma de interferencia o dejaría ese material sin cortar»), con el diámetro máximo que cabría. La revisión de los Simuladores ya lo marcaba como error.

### Calculadora de taller (nueva, alumnado)
- **Recta inclinada**: de longitud y ángulo a ΔX y ΔY (y al revés, o con una proyección y el ángulo), con el punto final en G90 y en G91.
- **Polares**: de radio y ángulo a X Y y al revés, con el polo en el cero pieza o donde se indique; da también la línea con G16.
- **Arco**: con el inicio, el final, el sentido y el radio (corto o largo) o el centro, saca el centro, I J, R (negativo si pasa de 180°), el ángulo y la longitud. Avisa si el radio no llega o si el centro no está a la misma distancia de los dos puntos.
- **G90 ↔ G91**: convierte un programa entero a absolutas, a incrementales o a mixta (G0 y Z en G90, cortes en G91), sin tocar I J ni R.
- **Velocidades de corte**: revoluciones, velocidad de corte, avance y avance por diente, y el tiempo de mecanizado.
- Cada cálculo con su dibujo, con el símbolo del cero pieza de los planos del Calcador, y las líneas ISO listas para copiar.
- v4: en el móvil, la pestaña del arco (y la de G90 ↔ G91) ya no se sale por la derecha; en el dibujo de la recta, la cota ΔY ya no se corta cuando el punto final queda en el borde.
- Ayudas emergentes en todos los campos, opciones, resultados y botones, y ❓ Ayuda (o F1) con la explicación de cada pestaña. Funciona en el móvil y recuerda los últimos datos.

### Anidador de tableros (nuevo, profesorado)
- Coloca varias piezas en un tablero para cortarlas de una vez: **piezas del Calcador** (.json, con sus arcos, agujeros, cajeras, grabados y puentes) y **listas de despiece** (.csv: nombre; largo; ancho; cantidad; veta), o rectángulos añadidos a mano.
- Tablero con sus medidas, grosor, margen del borde y cero pieza en la esquina que se elija. Separación entre piezas = Ø de la fresa (de la base compartida) + holgura.
- **Veta**: las piezas con veta no se giran; las demás se giran 90° si caben mejor. Si no caben en un tablero, se usan más; las que no caben ni en uno vacío se marcan.
- Cada tablero sale como **proyecto del Calcador** (➜ Abrir en el Calcador o 💾 .json; con el Calcador v80, «➜ Abrir en el Calcador» funciona también en Firefox con los archivos en el ordenador), con la fresa y la profundidad (grosor + corte pasante) ya puestas en ⚙️ Mecanizar.
- **Colocar a mano con el ratón** (v3), sobre el rectángulo de cada pieza: **arrastrar** la deja fijada 📌 donde se suelta (se pega a los márgenes y a las demás piezas, a la distancia de separación) y el anidador coloca las demás alrededor; **doble clic** la gira 90° sobre su centro (Mayús: al otro lado; también la tecla R); las **asas** de la pieza seleccionada cambian su escala en proporción (esquinas) o, en los rectángulos, su largo o su ancho (lados). Clic en la chincheta para soltarla, o 📌 Soltar todas.
- **Reabrir un tablero guardado** (v4): el .json de 💾 Guardar tablero se abre con sus piezas por separado, cada una colocada donde estaba (📌) y con su giro y su escala, y con las medidas del tablero, para seguir editándolo. Las piezas iguales vuelven a ser una con sus unidades. También los tableros guardados con versiones anteriores.
- En la lista, **Giro** (Auto, 0°, 90°, 180°, 270°) y **Color** de cada pieza: se dibuja con él en el tablero, el PNG y el SVG, y cada pieza nueva sale de un color distinto (v3).
- **Pasar una pieza a otro tablero** (v6): se arrastra hasta la pestaña de ese tablero, o hasta «＋ Tablero nuevo», que aparece mientras se arrastra; queda colocada (📌) en el primer hueco libre. Un tablero que se queda sin piezas desaparece.
- **El color de cada pieza en el DXF** (v6): el corte exterior y el nombre de cada pieza llevan su color (el de AutoCAD más parecido); interiores, grabados y cajeras, el color de su capa.
- **v5**: el SVG y el PNG dibujaban algunos arcos hacia el lado contrario (el DXF estaba bien); los nombres de las piezas pequeñas se ajustan a su recuadro, en pantalla y en lo exportado; la pieza que arrastras o escalas se dibuja por encima de las demás y, si ahí no cabe, se pone roja entera.
- **Exportar el tablero que se ve** (v2): ⬇ PNG (imagen), ⬇ SVG (vectorial a escala real en mm, con los arcos de verdad) y ⬇ DXF (R12, en mm, con el cero pieza del proyecto como origen y una capa por tipo: TABLERO, EXTERIOR, INTERIOR, GRABADO, CAJERA y NOMBRES). En el tablero y en lo exportado, cada tipo con su color: corte exterior azul, interior rojo, grabado verde y cajera naranja.
