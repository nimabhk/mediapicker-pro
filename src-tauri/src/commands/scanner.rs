use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaFileItem {
    pub id: String,
    pub name: String,
    pub relative_path: String,
    pub absolute_path: String,
    pub subfolder: String,
    pub size: u64,
    pub last_modified: i64,
    pub r#type: String, // "image" | "video"
    pub mime_type: String,
    pub viewed: bool,
    pub selected: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub root_path: String,
    pub folder_name: String,
    pub total_files_count: usize,
    pub total_size_bytes: u64,
    pub media_count: usize,
    pub photos_count: usize,
    pub videos_count: usize,
    pub non_media_count: usize,
    pub subfolders: Vec<String>,
    pub items: Vec<MediaFileItem>,
    pub limit_reached: bool,
    pub max_limit: usize,
}

fn get_mime_type(ext: &str) -> &'static str {
    match ext {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        "avif" => "image/avif",
        "heic" | "heif" => "image/heic",
        "tiff" | "tif" => "image/tiff",
        "mp4" => "video/mp4",
        "webm" => "video/webm",
        "mov" => "video/quicktime",
        "m4v" => "video/x-m4v",
        "mkv" => "video/x-matroska",
        "avi" => "video/x-msvideo",
        _ => "application/octet-stream",
    }
}

#[tauri::command]
pub fn scan_directory(
    path: String,
    max_files: Option<usize>,
    include_hidden: Option<bool>,
) -> Result<ScanResult, String> {
    let root = PathBuf::from(&path);
    if !root.exists() || !root.is_dir() {
        return Err(format!("Specified path is not a valid directory: {}", path));
    }

    let folder_name = root
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Folder")
        .to_string();

    let max_limit = max_files.unwrap_or(50_000);
    let allow_hidden = include_hidden.unwrap_or(false);

    let image_extensions: HashSet<&str> = [
        "jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "avif", "ico", "tiff", "tif", "heic",
    ]
    .iter()
    .cloned()
    .collect();

    let video_extensions: HashSet<&str> = ["mp4", "webm", "mov", "m4v", "mkv", "avi", "ogv"]
        .iter()
        .cloned()
        .collect();

    let mut total_files_count = 0;
    let mut total_size_bytes = 0u64;
    let mut media_items = Vec::new();
    let mut subfolders_set = HashSet::new();
    let mut photos_count = 0;
    let mut videos_count = 0;
    let mut non_media_count = 0;
    let mut limit_reached = false;

    for entry in WalkDir::new(&root).into_iter().filter_entry(|e| {
        if !allow_hidden {
            let is_hidden = e
                .file_name()
                .to_str()
                .map(|s| s.starts_with('.'))
                .unwrap_or(false);
            !is_hidden
        } else {
            true
        }
    }) {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let file_type = entry.file_type();
        if file_type.is_dir() {
            if entry.path() != root {
                if let Ok(rel) = entry.path().strip_prefix(&root) {
                    if let Some(rel_str) = rel.to_str() {
                        subfolders_set.insert(rel_str.replace('\\', "/"));
                    }
                }
            }
            continue;
        }

        if !file_type.is_file() {
            continue;
        }

        total_files_count += 1;
        if total_files_count > max_limit {
            limit_reached = true;
            break;
        }

        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        let file_size = metadata.len();
        total_size_bytes += file_size;

        let last_modified = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0);

        let file_name = entry
            .file_name()
            .to_str()
            .unwrap_or("unnamed")
            .to_string();

        let ext = entry
            .path()
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        let is_image = image_extensions.contains(ext.as_str());
        let is_video = video_extensions.contains(ext.as_str());

        if !is_image && !is_video {
            non_media_count += 1;
            continue;
        }

        let media_type = if is_image {
            photos_count += 1;
            "image"
        } else {
            videos_count += 1;
            "video"
        };

        let relative_path = entry
            .path()
            .strip_prefix(&root)
            .map(|p| p.to_str().unwrap_or("").replace('\\', "/"))
            .unwrap_or_else(|_| file_name.clone());

        let subfolder = Path::new(&relative_path)
            .parent()
            .and_then(|p| p.to_str())
            .unwrap_or("")
            .replace('\\', "/");

        let absolute_path = entry.path().to_string_lossy().to_string();
        let mime_type = get_mime_type(&ext).to_string();

        media_items.push(MediaFileItem {
            id: format!("{}_{}", media_items.len(), relative_path),
            name: file_name,
            relative_path,
            absolute_path,
            subfolder,
            size: file_size,
            last_modified,
            r#type: media_type.to_string(),
            mime_type,
            viewed: false,
            selected: false,
        });
    }

    let mut subfolders: Vec<String> = subfolders_set.into_iter().collect();
    subfolders.sort();

    Ok(ScanResult {
        root_path: path,
        folder_name,
        total_files_count,
        total_size_bytes,
        media_count: media_items.len(),
        photos_count,
        videos_count,
        non_media_count,
        subfolders,
        items: media_items,
        limit_reached,
        max_limit,
    })
}
