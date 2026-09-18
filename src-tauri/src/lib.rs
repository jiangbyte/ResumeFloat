use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize};
use tauri_plugin_sql::{Migration, MigrationKind};

const DB_FILE: &str = "resume.db";
const ASSETS_DIR: &str = "assets";

#[derive(Clone, Copy)]
struct NormalGeom {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
}

fn attach_no_maximize(win: tauri::WebviewWindow) {
    let _ = win.set_maximizable(false);
    let _ = win.set_fullscreen(false);

    #[cfg(target_os = "linux")]
    {
        use gtk::prelude::GtkWindowExt;
        if let Ok(gtk_win) = win.gtk_window() {
            // Utility windows are less likely to be edge-snapped / maximized by the WM.
            gtk_win.set_type_hint(gdk::WindowTypeHint::Utility);
        }
    }

    let init = NormalGeom {
        x: win.outer_position().map(|p| p.x).unwrap_or(100),
        y: win.outer_position().map(|p| p.y).unwrap_or(100),
        width: win.outer_size().map(|s| s.width).unwrap_or(360),
        height: win.outer_size().map(|s| s.height).unwrap_or(520),
    };
    let geom = Arc::new(Mutex::new(init));
    let win2 = win.clone();
    let geom2 = geom.clone();
    let restoring = Arc::new(Mutex::new(false));
    let restoring2 = restoring.clone();

    win.on_window_event(move |event| {
        match event {
            tauri::WindowEvent::Moved(pos) => {
                if *restoring2.lock().unwrap() {
                    return;
                }
                if win2.is_maximized().unwrap_or(false) || win2.is_fullscreen().unwrap_or(false)
                {
                    return;
                }
                if let Ok(mut g) = geom2.lock() {
                    g.x = pos.x;
                    g.y = pos.y;
                }
            }
            tauri::WindowEvent::Resized(size) => {
                if *restoring2.lock().unwrap() {
                    return;
                }

                let maximized = win2.is_maximized().unwrap_or(false);
                let fullscreen = win2.is_fullscreen().unwrap_or(false);
                let snapped_large = is_monitor_filling(&win2, size);

                if maximized || fullscreen || snapped_large {
                    let g = *geom2.lock().unwrap();
                    *restoring2.lock().unwrap() = true;
                    let _ = win2.set_fullscreen(false);
                    let _ = win2.unmaximize();
                    let _ = win2.set_size(tauri::Size::Physical(PhysicalSize {
                        width: g.width.max(280),
                        height: g.height.max(320),
                    }));
                    let _ = win2.set_position(tauri::Position::Physical(PhysicalPosition {
                        x: g.x,
                        y: g.y,
                    }));
                    *restoring2.lock().unwrap() = false;
                    return;
                }

                if let Ok(mut g) = geom2.lock() {
                    if size.width >= 280 && size.height >= 320 {
                        g.width = size.width;
                        g.height = size.height;
                    }
                }
            }
            _ => {}
        }
    });
}

fn is_monitor_filling(win: &tauri::WebviewWindow, size: &PhysicalSize<u32>) -> bool {
    let Ok(Some(monitor)) = win.current_monitor() else {
        return false;
    };
    let m = monitor.size();
    // Treat near-monitor size as snap-maximize (work around WMs that don't set maximized).
    let w_fill = size.width + 16 >= m.width;
    let h_fill = size.height + 48 >= m.height;
    w_fill && h_fill
}

fn app_config_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map_err(|e| format!("app config dir: {e}"))
}

fn ensure_data_layout(app: &AppHandle) -> Result<(PathBuf, PathBuf), String> {
    let root = app_config_dir(app)?;
    fs::create_dir_all(&root).map_err(|e| format!("create config dir: {e}"))?;
    let assets = root.join(ASSETS_DIR);
    fs::create_dir_all(&assets).map_err(|e| format!("create assets dir: {e}"))?;
    Ok((root, assets))
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    if !src.exists() {
        fs::create_dir_all(dst).map_err(|e| format!("create dest: {e}"))?;
        return Ok(());
    }
    fs::create_dir_all(dst).map_err(|e| format!("create dest: {e}"))?;
    for entry in fs::read_dir(src).map_err(|e| format!("read_dir: {e}"))? {
        let entry = entry.map_err(|e| format!("dir entry: {e}"))?;
        let ty = entry.file_type().map_err(|e| format!("file_type: {e}"))?;
        let to = dst.join(entry.file_name());
        if ty.is_dir() {
            copy_dir_recursive(&entry.path(), &to)?;
        } else {
            fs::copy(entry.path(), &to).map_err(|e| format!("copy file: {e}"))?;
        }
    }
    Ok(())
}

fn remove_dir_contents(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }
    for entry in fs::read_dir(path).map_err(|e| format!("read_dir: {e}"))? {
        let entry = entry.map_err(|e| format!("dir entry: {e}"))?;
        let p = entry.path();
        if p.is_dir() {
            fs::remove_dir_all(&p).map_err(|e| format!("remove_dir_all: {e}"))?;
        } else {
            fs::remove_file(&p).map_err(|e| format!("remove_file: {e}"))?;
        }
    }
    Ok(())
}

#[derive(Serialize)]
struct PathsInfo {
    config_dir: String,
    db_path: String,
    assets_dir: String,
}

#[tauri::command]
fn get_paths(app: AppHandle) -> Result<PathsInfo, String> {
    let (root, assets) = ensure_data_layout(&app)?;
    Ok(PathsInfo {
        config_dir: root.to_string_lossy().into_owned(),
        db_path: root.join(DB_FILE).to_string_lossy().into_owned(),
        assets_dir: assets.to_string_lossy().into_owned(),
    })
}

#[tauri::command]
fn save_asset(app: AppHandle, bytes: Vec<u8>, ext: String) -> Result<String, String> {
    let (_, assets) = ensure_data_layout(&app)?;
    let safe_ext = ext
        .trim()
        .trim_start_matches('.')
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect::<String>();
    let ext = if safe_ext.is_empty() {
        "bin".to_string()
    } else {
        safe_ext
    };
    let name = format!(
        "{}.{}",
        uuid_simple(),
        ext.to_lowercase()
    );
    let path = assets.join(&name);
    fs::write(&path, bytes).map_err(|e| format!("write asset: {e}"))?;
    Ok(format!("{ASSETS_DIR}/{name}"))
}

fn uuid_simple() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    format!("{nanos:x}-{:x}", std::process::id())
}

#[tauri::command]
fn resolve_asset_path(app: AppHandle, relative: String) -> Result<String, String> {
    let root = app_config_dir(&app)?;
    let rel = relative.trim_start_matches(['/', '\\']);
    let path = root.join(rel);
    if !path.exists() {
        return Err(format!("asset not found: {relative}"));
    }
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
fn export_bundle(app: AppHandle, dest_dir: String) -> Result<(), String> {
    let (root, assets) = ensure_data_layout(&app)?;
    let dest = PathBuf::from(&dest_dir);
    fs::create_dir_all(&dest).map_err(|e| format!("create dest: {e}"))?;

    let db_src = root.join(DB_FILE);
    if db_src.exists() {
        fs::copy(&db_src, dest.join(DB_FILE)).map_err(|e| format!("copy db: {e}"))?;
    } else {
        return Err("database file not found".into());
    }

    let assets_dest = dest.join(ASSETS_DIR);
    if assets_dest.exists() {
        fs::remove_dir_all(&assets_dest).map_err(|e| format!("clear assets dest: {e}"))?;
    }
    copy_dir_recursive(&assets, &assets_dest)?;
    Ok(())
}

#[tauri::command]
fn import_bundle(app: AppHandle, src_dir: String) -> Result<(), String> {
    let (root, assets) = ensure_data_layout(&app)?;
    let src = PathBuf::from(&src_dir);

    let db_src = if src.is_file() && src.extension().and_then(|e| e.to_str()) == Some("db") {
        src.clone()
    } else {
        let candidate = src.join(DB_FILE);
        if candidate.exists() {
            candidate
        } else {
            return Err("resume.db not found in selected path".into());
        }
    };

    let assets_src = if src.is_file() {
        src.parent()
            .map(|p| p.join(ASSETS_DIR))
            .unwrap_or_else(|| PathBuf::from(ASSETS_DIR))
    } else {
        src.join(ASSETS_DIR)
    };

    let db_dst = root.join(DB_FILE);
    fs::copy(&db_src, &db_dst).map_err(|e| format!("replace db: {e}"))?;

    remove_dir_contents(&assets)?;
    if assets_src.exists() {
        copy_dir_recursive(&assets_src, &assets)?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "create_items_and_blocks",
        sql: r#"
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY NOT NULL,
  item_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('plain', 'markdown', 'rich', 'image')),
  content TEXT NOT NULL DEFAULT '',
  asset_path TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_blocks_item ON blocks(item_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_items_sort ON items(sort_order);
"#,
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:resume.db", migrations)
                .build(),
        )
        .setup(|app| {
            let _ = ensure_data_layout(app.handle());
            if let Some(win) = app.get_webview_window("main") {
                attach_no_maximize(win);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_paths,
            save_asset,
            resolve_asset_path,
            export_bundle,
            import_bundle
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
