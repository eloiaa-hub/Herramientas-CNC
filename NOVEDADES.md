# Novedades de la Suite CNC

La versión de la suite es **año.mes** (por ejemplo, 2026.10). Cada programa conserva además su propio número junto a su título.

## Suite CNC 2026.10

Primera versión publicada. Versiones de los programas: **Calcador v70 · Corrector v17 · Generador v79 · Simulador 3D V31 · Simulador del profesor V31**.

### Calcador de contornos
- Dibujo y calco de piezas con cotas automáticas en cadena (sin números que se pisen), cotas manuales, tangencias (recta tangente y arco de radio R), corte y unión de contornos, cajeras con islas y puentes de sujeción.
- Entrada de coordenadas absolutas, incrementales, polares y en ISO (G1, G2 y G3 con I J o R).
- Ajuste de medidas con el centro de los arcos en la rejilla (I y J exactos).
- Hoja de ejercicio, tabla de soluciones (con el programa ISO y sus alturas de seguridad), variantes para examen y biblioteca de ejercicios con copia de seguridad.
- Corrección de programas, uno a uno o de toda la clase: geometría, seguridad (incluido el rápido sin subir la herramienta), lo pedido y la compensación de radio G40/G41/G42 según el tipo de cada trazado (interior o exterior).
- Simulación del programa del alumno bloque a bloque, con la trayectoria real de la fresa, y reproductor del programa de la pieza en la barra superior.
- «➜ Abrir en el Generador» y «➜ Abrir en el Simulador» con un clic.
- Aviso de cambios sin guardar en archivo.

### Corrector
- El Calcador sin herramientas de dibujo, solo para corregir, imprimir, exportar y enviar al Generador. Se genera a partir del Calcador.

### Generador de G-Code
- Cortes, grabados, cajeras y puentes; G-code con 3 decimales.
- **Desbaste y acabado**: las pasadas dejan un sobreespesor y una pasada final recorre el contorno exacto.

### Simulador 3D (alumnado y profesorado)
- Vista 3D y **vista 2D** en planta (arranca en 2D si el equipo no tiene 3D).
- **Plano del ejercicio**: abre el JSON del Calcador y colorea el recorrido del programa (autocorrección).
- Grosor del tablero para cortes no pasantes y vaciados.
- Compensación G41/G42 con las esquinas interiores bien resueltas; ejemplos de corte interior y exterior.
- Coordenadas polares (G16) y coma decimal interpretadas igual que en el Calcador.

### En toda la suite
- **Base de herramientas** compartida (T101…T999), con importación y exportación en JSON y CSV.
- Ventana «Créditos y licencias» en cada programa (EUPL-1.2 y licencias de terceros).

### Revisión de robustez
Pruebas de estrés con miles de programas, proyectos y archivos aleatorios, rotos y extremos en todos los programas. Corregido:
- **Simuladores**: un programa con coordenadas enormes (por ejemplo, un radio de un kilómetro por un cero de más) podía colgar el simulador al dibujar la cuadrícula; ahora la cuadrícula se adapta al tamaño de la escena. Mismo tope en la evaluación del plano.
- **Calcador y Corrector**: la corrección de un programa con un tramo de kilómetros podía tardar más de un minuto (ahora, milisegundos); al seleccionar el aviso de un arco imposible, o uno de «lo pedido», el dibujo de la corrección fallaba; un arco de radio nulo (I0 J0) con G41/G42 rompía la simulación.
- **Generador**: con desbaste y acabado, un trazado demasiado estrecho para el sobreespesor (por ejemplo, una media luna fina) generaba arcos imposibles; ahora se corta sin acabado y el G-code lo avisa. Mensaje más claro al abrir un archivo que no es un proyecto.

