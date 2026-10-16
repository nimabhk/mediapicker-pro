pub mod commands;
pub mod protocol;

use commands::{batch_export_folder, scan_directory, move_to_trash};
use protocol::handle_media_protocol;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .register_uri_scheme_protocol("mediapicker", |_ctx, request| {
            handle_media_protocol(request)
        })
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            move_to_trash,
            batch_export_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MediaPicker Pro application");
}
