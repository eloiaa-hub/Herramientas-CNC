// Simulador G-Code 3D — versión de escritorio (Suite CNC, Eloi A.A.)
//
// La interfaz es el mismo simulador3d.html de siempre. Este programa en Rust
// solo pone la ventana nativa y lo que el navegador no puede hacer:
// abrir y guardar en el disco, modo portable, autoguardado y asociar archivos.

// En Windows, que no se abra una consola negra junto a la ventana
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod asociacion;
mod portable;

use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Mutex;
use std::time::UNIX_EPOCH;
use tauri::ipc::{InvokeBody, Request, Response};
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;

const VENTANA_PRINCIPAL: &str = "principal";
const PAGINA_PRINCIPAL: &str = "simulador3d.html";
const TITULO: &str = "Simulador G-Code 3D — Suite CNC";
const MAX_ARCHIVO: u64 = 60 * 1024 * 1024;
const ARCHIVO_RECUPERACION: &str = "recuperacion.sim3d";

/// Registro de diagnóstico en datos/registro.txt (se reinicia en cada arranque).
static REGISTRO: Mutex<Option<PathBuf>> = Mutex::new(None);

fn registrar_linea(texto: &str) {
    use std::io::Write;
    let ruta = REGISTRO.lock().unwrap().clone();
    if let Some(r) = ruta {
        if let Ok(mut f) = fs::OpenOptions::new().create(true).append(true).open(r) {
            let t = std::time::SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0);
            let _ = writeln!(f, "[{}.{:03}] {}", (t / 1000) % 100_000, t % 1000, texto);
        }
    }
}

/// La página avisa con registrar("load…") cuando termina de cargar.
static PAGINA_CARGADA: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);
const SEGUNDOS_ESPERA_PAGINA: u64 = 25;

struct Estado {
    archivo_inicial: Mutex<Option<String>>,
    datos: PathBuf,
    webview: PathBuf,
    avisos: Vec<String>,
    portable: bool,
    ventanas: AtomicUsize,
}

impl Estado {
    fn carpeta_autoguardado(&self) -> PathBuf {
        self.datos.join("autoguardado")
    }
}

/// Primer argumento que sea un archivo existente (lo que pasa el sistema al
/// hacer doble clic en un archivo asociado o al arrastrarlo sobre el .exe).
fn ruta_de_args(args: &[String], cwd: Option<&Path>) -> Option<String> {
    args.iter()
        .skip(1)
        .filter(|a| !a.starts_with('-'))
        .map(PathBuf::from)
        .map(|p| match (p.is_relative(), cwd) {
            (true, Some(c)) => c.join(p),
            _ => p,
        })
        .find(|p| p.is_file())
        .map(|p| p.to_string_lossy().into_owned())
}

fn texto_cabecera<'a>(req: &'a Request<'_>, nombre: &str) -> Result<String, String> {
    let v = req
        .headers()
        .get(nombre)
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| format!("Falta la cabecera {nombre}"))?;
    Ok(descodificar_url(v))
}

/// Las rutas viajan en una cabecera HTTP codificadas con encodeURIComponent
/// (para que las tildes y la ñ lleguen bien).
fn descodificar_url(s: &str) -> String {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            if let Ok(n) = u8::from_str_radix(&s[i + 1..i + 3], 16) {
                out.push(n);
                i += 3;
                continue;
            }
        }
        out.push(b[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn cuerpo_binario<'a>(req: &'a Request<'_>) -> Result<&'a [u8], String> {
    match req.body() {
        InvokeBody::Raw(d) => Ok(d),
        _ => Err("Se esperaban datos binarios".into()),
    }
}

// ─────────────────────────── Comandos para la página ───────────────────────────

#[tauri::command]
fn registrar(texto: String) {
    if texto.starts_with("load") {
        PAGINA_CARGADA.store(true, Ordering::Relaxed);
    }
    registrar_linea(&format!("página: {}", texto.chars().take(2000).collect::<String>()));
}

#[tauri::command]
fn archivo_inicial(estado: State<Estado>) -> Option<String> {
    estado.archivo_inicial.lock().unwrap().take()
}

#[tauri::command]
fn leer_archivo(ruta: String) -> Result<Response, String> {
    let meta = fs::metadata(&ruta).map_err(|e| format!("No se encuentra el archivo: {e}"))?;
    if meta.len() > MAX_ARCHIVO {
        return Err(format!("Archivo demasiado grande ({} MB)", meta.len() / 1_048_576));
    }
    fs::read(&ruta).map(Response::new).map_err(|e| format!("No se pudo leer: {e}"))
}

#[tauri::command]
fn escribir_texto(ruta: String, contenido: String) -> Result<(), String> {
    portable::escribir_atomico(Path::new(&ruta), contenido.as_bytes())
}

#[tauri::command]
fn escribir_binario(request: Request<'_>) -> Result<(), String> {
    let ruta = texto_cabecera(&request, "x-ruta")?;
    portable::escribir_atomico(Path::new(&ruta), cuerpo_binario(&request)?)
}

#[tauri::command]
fn autoguardar(estado: State<Estado>, contenido: String) -> Result<(), String> {
    let r = estado.carpeta_autoguardado().join(ARCHIVO_RECUPERACION);
    portable::escribir_atomico(&r, contenido.as_bytes())
}

#[derive(Serialize)]
struct Recuperacion {
    contenido: String,
    /// milisegundos desde 1970 (para `new Date(fecha)` en JavaScript)
    fecha: u64,
}

#[tauri::command]
fn leer_autoguardado(estado: State<Estado>) -> Option<Recuperacion> {
    let r = estado.carpeta_autoguardado().join(ARCHIVO_RECUPERACION);
    let contenido = fs::read_to_string(&r).ok()?;
    let fecha = fs::metadata(&r)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    Some(Recuperacion { contenido, fecha })
}

#[tauri::command]
fn borrar_autoguardado(estado: State<Estado>) {
    let _ = fs::remove_file(estado.carpeta_autoguardado().join(ARCHIVO_RECUPERACION));
}

#[derive(Serialize)]
struct InfoApp {
    version: String,
    portable: bool,
    datos: String,
    webview: String,
    avisos: Vec<String>,
    ejecutable: String,
    sistema: &'static str,
    asociado: bool,
}

#[tauri::command]
fn info_app(app: AppHandle, estado: State<Estado>) -> InfoApp {
    let exe = portable::ejecutable_visible().unwrap_or_default();
    InfoApp {
        version: app.package_info().version.to_string(),
        portable: estado.portable,
        datos: estado.datos.to_string_lossy().into_owned(),
        webview: estado.webview.to_string_lossy().into_owned(),
        avisos: estado.avisos.clone(),
        ejecutable: exe.to_string_lossy().into_owned(),
        sistema: std::env::consts::OS,
        asociado: asociacion::estado(&exe),
    }
}

#[tauri::command]
fn asociar_extensiones() -> Result<String, String> {
    let exe = portable::ejecutable_visible().ok_or("No se encontró el ejecutable")?;
    asociacion::asociar(&exe)
}

#[tauri::command]
fn quitar_asociacion() -> Result<String, String> {
    asociacion::quitar()
}

#[tauri::command]
fn abrir_carpeta_datos(app: AppHandle, estado: State<Estado>) -> Result<(), String> {
    app.opener()
        .open_path(estado.datos.to_string_lossy(), None::<&str>)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn abrir_url(app: AppHandle, url: String) -> Result<(), String> {
    if !(url.starts_with("https://") || url.starts_with("http://") || url.starts_with("mailto:")) {
        return Err("Enlace no permitido".into());
    }
    app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
}

/// Documentos incluidos en la app que no son páginas (PDF, licencias…):
/// la página los envía, se copian a datos/documentos y se abren con el
/// programa del sistema (visor de PDF, bloc de notas…).
#[tauri::command]
fn abrir_documento(app: AppHandle, estado: State<Estado>, request: Request<'_>) -> Result<(), String> {
    let nombre = texto_cabecera(&request, "x-nombre")?;
    let nombre: String = Path::new(&nombre)
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .ok_or("Nombre no válido")?;
    let nombre = if Path::new(&nombre).extension().is_none() { format!("{nombre}.txt") } else { nombre };
    let destino = estado.datos.join("documentos").join(nombre);
    portable::escribir_atomico(&destino, cuerpo_binario(&request)?)?;
    app.opener()
        .open_path(destino.to_string_lossy(), None::<&str>)
        .map_err(|e| e.to_string())
}

/// Abre otra página de la app (la guía, las licencias…) en una ventana aparte.
#[tauri::command]
fn abrir_ventana(app: AppHandle, estado: State<Estado>, pagina: String, titulo: Option<String>) -> Result<(), String> {
    if pagina.contains("://") || pagina.starts_with('/') || pagina.contains("..") {
        return Err("Página no válida".into());
    }
    let n = estado.ventanas.fetch_add(1, Ordering::Relaxed);
    let titulo = titulo.filter(|t| !t.trim().is_empty()).unwrap_or_else(|| TITULO.into());
    crear_ventana(&app, &format!("doc{n}"), &pagina, &titulo, &estado.webview)
        .map(|_| ())
        .map_err(|e| e.to_string())
}

fn crear_ventana(
    app: &AppHandle,
    etiqueta: &str,
    pagina: &str,
    titulo: &str,
    webview: &Path,
) -> tauri::Result<tauri::WebviewWindow> {
    let b = WebviewWindowBuilder::new(app, etiqueta, WebviewUrl::App(pagina.into()))
        .title(titulo)
        .inner_size(1360.0, 860.0)
        .min_inner_size(820.0, 560.0)
        .center()
        .on_page_load(|w, p| {
            registrar_linea(&format!("ventana «{}»: {:?} {}", w.label(), p.event(), p.url()));
        });
    // Toda la memoria de la página (localStorage) va a la carpeta de datos:
    // en modo portable viaja con la app.
    #[cfg(any(windows, target_os = "linux"))]
    let b = b.data_directory(webview.to_path_buf());
    #[cfg(not(any(windows, target_os = "linux")))]
    let _ = webview;
    let r = b.build();
    match &r {
        Ok(_) => registrar_linea(&format!("ventana «{etiqueta}» creada ({pagina})")),
        Err(e) => registrar_linea(&format!("ERROR al crear la ventana «{etiqueta}»: {e}")),
    }
    r
}

#[cfg(test)]
mod pruebas {
    use super::*;

    #[test]
    fn rutas_con_tildes_y_espacios() {
        // Lo que produce encodeURIComponent("C:\\Clase 1º\\pieza_ñ.nc") en JavaScript
        let codificada = "C%3A%5CClase%201%C2%BA%5Cpieza_%C3%B1.nc";
        assert_eq!(descodificar_url(codificada), "C:\\Clase 1º\\pieza_ñ.nc");
        assert_eq!(descodificar_url("/home/eloi/Mecanizado%20%C3%81rea/a%25b.nc"), "/home/eloi/Mecanizado Área/a%b.nc");
        assert_eq!(descodificar_url("sin%2"), "sin%2"); // secuencia cortada: se deja tal cual
    }

    #[test]
    fn archivo_de_los_argumentos() {
        let dir = std::env::temp_dir().join("prueba_args_sim3d");
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("pieza ñ.sim3d"), "{}").unwrap();
        let args = vec!["Simulador3D.exe".into(), "--algo".into(), "pieza ñ.sim3d".into()];
        let r = ruta_de_args(&args, Some(&dir)).unwrap();
        assert!(r.ends_with("pieza ñ.sim3d"));
        assert_eq!(ruta_de_args(&["exe".into(), "no_existe.nc".into()], Some(&dir)), None);
    }

    #[test]
    fn escritura_segura_sobrescribe() {
        let f = std::env::temp_dir().join("prueba_atomico_sim3d").join("a.sim3d");
        portable::escribir_atomico(&f, b"uno").unwrap();
        portable::escribir_atomico(&f, b"dos").unwrap();
        assert_eq!(fs::read(&f).unwrap(), b"dos");
        assert!(!f.with_extension("sim3d.guardando~").exists());
    }
}

fn main() {
    std::panic::set_hook(Box::new(|info| registrar_linea(&format!("PÁNICO: {info}"))));
    portable::usar_webview2_incluido();

    let args: Vec<String> = std::env::args().collect();
    let inicial = ruta_de_args(&args, std::env::current_dir().ok().as_deref());

    tauri::Builder::default()
        // Una sola ventana: si ya está abierta y se hace doble clic en otro
        // archivo, se abre en la ventana que ya existe.
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            if let Some(r) = ruta_de_args(&args, Some(Path::new(&cwd))) {
                let _ = app.emit_to(VENTANA_PRINCIPAL, "abrir-archivo", r);
            }
            if let Some(w) = app.get_webview_window(VENTANA_PRINCIPAL) {
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(move |app| {
            let alternativa = app.path().app_local_data_dir().ok();
            let (datos, es_portable) = portable::carpeta_datos(|| alternativa.clone());
            let _ = fs::write(datos.join("registro.txt"), "");
            *REGISTRO.lock().unwrap() = Some(datos.join("registro.txt"));
            registrar_linea(&format!(
                "Simulador 3D {} · {} {} · portable={} · datos={} · exe={:?} · WEBVIEW2_BROWSER_EXECUTABLE_FOLDER={:?}",
                app.package_info().version, std::env::consts::OS, std::env::consts::ARCH, es_portable,
                datos.display(), std::env::current_exe().ok(), std::env::var_os("WEBVIEW2_BROWSER_EXECUTABLE_FOLDER")
            ));
            registrar_linea(&format!("archivo inicial: {:?}", inicial));
            let (webview, motivo) = portable::carpeta_webview(&datos, alternativa);
            registrar_linea(&format!("perfil del motor web: {}", webview.display()));
            if let Some(m) = &motivo {
                registrar_linea(&format!("AVISO: {m}"));
            }
            let mut avisos = Vec::new();
            if portable::en_carpeta_temporal() {
                registrar_linea("AVISO: se está ejecutando desde la carpeta temporal (¿dentro del ZIP?)");
                avisos.push("Parece que has abierto el simulador DENTRO del archivo ZIP, sin descomprimirlo.\n\n\
                    Funciona, pero al cerrarlo Windows borrará tus ajustes y las copias de recuperación.\n\n\
                    Cierra la app, haz clic derecho en el ZIP → «Extraer todo…» y abre Simulador3D.exe desde la carpeta extraída."
                    .to_string());
            }
            // Red de seguridad: si la página no carga, que no quede una ventana en blanco sin explicación
            {
                use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
                let h = app.handle().clone();
                let registro = datos.join("registro.txt");
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(SEGUNDOS_ESPERA_PAGINA));
                    if PAGINA_CARGADA.load(Ordering::Relaxed) {
                        return;
                    }
                    registrar_linea(&format!("ERROR: la página no ha terminado de cargar en {SEGUNDOS_ESPERA_PAGINA} s"));
                    h.dialog()
                        .message(format!(
                            "El simulador no ha podido mostrar su ventana.\n\n\
                             Prueba a mover la carpeta de la app a una ruta corta, por ejemplo C:\\Simulador3D, \
                             y vuelve a abrirla.\n\n\
                             Si sigue sin funcionar, envía este archivo a tu profesor:\n{}",
                            registro.display()
                        ))
                        .title("Simulador 3D")
                        .kind(MessageDialogKind::Warning)
                        .show(|_| {});
                });
            }
            app.manage(Estado {
                archivo_inicial: Mutex::new(inicial.clone()),
                datos: datos.clone(),
                webview: webview.clone(),
                avisos,
                portable: es_portable,
                ventanas: AtomicUsize::new(1),
            });
            crear_ventana(app.handle(), VENTANA_PRINCIPAL, PAGINA_PRINCIPAL, TITULO, &webview)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            registrar,
            archivo_inicial,
            leer_archivo,
            escribir_texto,
            escribir_binario,
            autoguardar,
            leer_autoguardado,
            borrar_autoguardado,
            info_app,
            asociar_extensiones,
            quitar_asociacion,
            abrir_carpeta_datos,
            abrir_url,
            abrir_documento,
            abrir_ventana,
        ])
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| {
            registrar_linea(&format!("ERROR al iniciar: {e}"));
            panic!("error al iniciar el Simulador 3D: {e}");
        });
}
