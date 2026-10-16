use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub destination_path: String,
    pub processed_count: usize,
    pub total_bytes: u64,
}

#[tauri::command]
pub fn batch_export_folder(
    source_root: String,
    files: Vec<String>,
    suffix: Option<String>,
    operation: Option<String>,
) -> Result<ExportResult, String> {
    let source_path = PathBuf::from(&source_root);
    if !source_path.exists() {
        return Err(format!("Source root path does not exist: {}", source_root));
    }

    let parent_dir = source_path
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .to_path_buf();

    let folder_name = source_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("MediaExport");

    let chosen_suffix = suffix.unwrap_or_else(|| "_selected".to_string());
    let op = operation.unwrap_or_else(|| "copy".to_string());

    // Generate non-colliding destination path
    let mut candidate_name = format!("{}{}", folder_name, chosen_suffix);
    let mut dest_dir = parent_dir.join(&candidate_name);
    let mut index = 2;

    while dest_dir.exists() {
        candidate_name = format!("{}{}_{}", folder_name, chosen_suffix, index);
        dest_dir = parent_dir.join(&candidate_name);
        index += 1;
    }

    fs::create_dir_all(&dest_dir)
        .map_err(|e| format!("Failed to create destination directory: {}", e))?;

    let mut processed_count = 0;
    let mut total_bytes = 0u64;

    for rel_or_abs in files {
        let src_file = if Path::new(&rel_or_abs).is_absolute() {
            PathBuf::from(&rel_or_abs)
        } else {
            source_path.join(&rel_or_abs)
        };

        if !src_file.exists() || !src_file.is_file() {
            continue;
        }

        let rel_file = match src_file.strip_prefix(&source_path) {
            Ok(r) => r.to_path_buf(),
            Err(_) => {
                PathBuf::from(src_file.file_name().unwrap_or_default())
            }
        };

        let target_file = dest_dir.join(&rel_file);
        if let Some(target_parent) = target_file.parent() {
            let _ = fs::create_dir_all(target_parent);
        }

        let file_size = fs::metadata(&src_file).map(|m| m.len()).unwrap_or(0);

        if op == "move" {
            match fs::rename(&src_file, &target_file) {
                Ok(_) => {
                    processed_count += 1;
                    total_bytes += file_size;
                }
                Err(_) => {
                    // Fallback to copy + delete across different devices/filesystems
                    if fs::copy(&src_file, &target_file).is_ok() {
                        let _ = fs::remove_file(&src_file);
                        processed_count += 1;
                        total_bytes += file_size;
                    }
                }
            }
        } else {
            // Default: copy
            if fs::copy(&src_file, &target_file).is_ok() {
                processed_count += 1;
                total_bytes += file_size;
            }
        }
    }

    Ok(ExportResult {
        destination_path: dest_dir.to_string_lossy().to_string(),
        processed_count,
        total_bytes,
    })
}
