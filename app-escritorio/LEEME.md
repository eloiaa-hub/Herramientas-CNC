# Simulador 3D — versión de escritorio (Tauri + Rust)

Convierte `simulador3d.html` de la Suite CNC en una **app de escritorio portable** para Windows y Linux, **sin tocar el HTML**. Al compilar se le añade una sola línea (`<script src="tauri/puente.js">`) que solo actúa dentro de la app. En el navegador, el simulador sigue funcionando igual que siempre.

## Qué añade la versión de escritorio

| | |
|---|---|
| **Portable** | Todo se guarda en `datos/`, junto al `.exe` o al `.AppImage`. Se copia la carpeta a un USB y funciona. |
| **Proyectos `.sim3d`** | G-code + plano del Calcador + herramienta + material en un solo archivo (JSON por dentro). |
| **Guardar de verdad** | Ctrl+S guarda en el mismo archivo abierto (`.sim3d` o `.nc`), sin diálogo. Ctrl+Mayús+S es «Guardar como». Ctrl+O abre. |
| **Autoguardado** | Cada 20 s se guarda una copia de recuperación. Si la app se cierra de golpe, al abrirla ofrece recuperar el trabajo. Opcional: guardar solo el propio `.sim3d`. |
| **Aviso al cerrar** | Si hay cambios sin guardar: Guardar / No guardar / Cancelar. |
| **Doble clic** | Menú 🗂️ Archivo → «Asociar archivos…»: los `.sim3d` se abren con la app y los `.nc .gcode .tap .ngc` la tienen en «Abrir con». Sin permisos de administrador; se puede quitar. |
| **Una sola ventana** | Si la app ya está abierta, el archivo nuevo se abre en ella (y pregunta si hay cambios). |
| **Diálogos nativos** | Abrir, guardar, exportar G-code, guardar vídeo, informe PDF… con el diálogo del sistema. |
| **Arrastrar y soltar** | Se recuerda la ruta del archivo, así que Ctrl+S guarda en él. |
| **Guía y licencias** | Las páginas se abren en otra ventana y los PDF con el visor del sistema. |

## Estructura

```
(raíz del repo Herramientas-CNC)
├── simulador3d.html, guia_simulador.html…   ← la suite de siempre (no se toca)
├── .github/workflows/simulador-escritorio.yml  ← compila en GitHub
└── app-escritorio/
    ├── puente/puente.js        ← une el HTML con la app (JavaScript)
    ├── scripts/preparar.mjs    ← copia el HTML de la raíz y añade el puente
    ├── portable/LEEME_portable.txt  ← instrucciones que van dentro del ZIP
    └── src-tauri/              ← la parte en Rust
        ├── src/main.rs         ← ventana, abrir/guardar, autoguardado
        ├── src/portable.rs     ← carpeta datos/ junto al ejecutable
        ├── src/asociacion.rs   ← asociar extensiones (Windows y Linux)
        ├── tauri.conf.json     ← nombre, versión, icono
        └── icons/
```

`preparar.mjs` coge los archivos de la **raíz del repo** (`../simulador3d.html`). Si no los encuentra ahí, los busca en `app-escritorio/herramientas/`. Así la app siempre usa la última versión del simulador que subas.

## Ponerlo en marcha en GitHub (sin instalar nada en tu PC)

1. Copia las carpetas `app-escritorio/` y `.github/` a la raíz de tu repo y súbelas (commit + push).
2. En GitHub, ve a **Releases → Draft a new release**. En «Choose a tag» escribe `simulador-v0.1.0` y pulsa **Publish release**.
3. En la pestaña **Actions** verás la compilación (unos 10–15 min la primera vez). Al terminar, la release tendrá:
   - `Simulador3D_portable_windows_x64.zip`
   - `Simulador3D_portable_linux_x86_64.AppImage`

Para probar sin publicar nada: **Actions → «Simulador 3D (escritorio)» → Run workflow**. Los archivos quedan en «Artifacts» de esa ejecución.

## Sacar una versión nueva

1. Actualiza `simulador3d.html` en la raíz, como siempre.
2. Sube el número de versión en `src-tauri/tauri.conf.json` (`"version"`). Es el que se ve en «Acerca de».
3. Publica una release con una etiqueta nueva: `simulador-v0.2.0`.

## Probar en tu ordenador (opcional)

Necesitas [Rust](https://rustup.rs) y [Node.js](https://nodejs.org). En Windows, Rust pide además las «Build Tools» de Visual Studio, y el instalador te guía.

```
cd app-escritorio
npm install
npm run dev        ← abre la app en modo desarrollo
npm run portable   ← crea src-tauri/target/release/Simulador3D(.exe)
```

## Formato `.sim3d`

Es JSON, legible con cualquier editor:

```json
{
 "formato": "sim3d", "version": 1,
 "nombrePrograma": "pieza.nc",
 "gcode": "G71 G90\nT101 M06\n…",
 "borradorEditor": null,
 "ajustes": { "tipoFresa": "plana", "diamHerramienta": "6", "matModo": "auto", … },
 "plano": { "nombre": "Inicio 101.json", "datos": { …el JSON del Calcador… } },
 "guardado": "2026-10-18T09:31:07.019Z"
}
```

`borradorEditor` guarda lo escrito en el editor que aún no se ha aplicado.

## Pruebas hechas

En Linux, con la app real compilada:

- abrir un `.nc` desde la línea de comandos (con ñ en el nombre y en el texto);
- editar y autoguardar;
- Ctrl+S en el mismo archivo, con saltos de línea de Windows;
- «Guardar como» `.sim3d` con el diálogo nativo;
- recuperar el trabajo tras matar el proceso;
- reabrir el `.sim3d` con su herramienta y material;
- una sola instancia;
- aviso al cerrar (Guardar / No guardar);
- exportar G-code;
- asociar y quitar la asociación (`gio open` abre la app);
- enlace a la guía en otra ventana;
- AppImage portable;
- pruebas unitarias de Rust.

**Windows no se ha podido compilar aquí.** El código específico de Windows (registro, WebView2) se ha revisado contra las librerías, pero la primera compilación real será la de GitHub Actions. Si falla, el registro de Actions dirá dónde.

## Siguientes pasos posibles

- **Toda la suite en una app:** `index.html` como portada, y el Calcador → Simulador comunicándose dentro de la app.
- **Flatpak** para Linux (la app ya detecta Flatpak y guarda los datos donde corresponde).
- **Instaladores** `.msi` / `.exe` además del portable (ya configurados en `tauri.conf.json`: bastaría quitar `--no-bundle`).
- **Firmar el `.exe`** para evitar el aviso de SmartScreen (requiere un certificado de pago).

Licencia: EUPL-1.2, como la suite.
