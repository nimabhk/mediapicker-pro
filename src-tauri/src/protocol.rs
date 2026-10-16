use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::PathBuf;
use tauri::http::{header::*, status::StatusCode, Request, Response};

pub fn handle_media_protocol(
    request: Request<Vec<u8>>,
) -> Response<Vec<u8>> {
    let uri = request.uri().to_string();

    // Strip scheme prefixes
    let mut raw_path = uri.as_str();
    for prefix in &[
        "mediapicker://localhost/",
        "mediapicker://localhost",
        "mediapicker:///",
        "mediapicker://",
        "http://mediapicker.localhost/",
        "https://mediapicker.localhost/",
    ] {
        if raw_path.starts_with(prefix) {
            raw_path = &raw_path[prefix.len()..];
            break;
        }
    }

    // Strip redundant leading "localhost/" or "localhost"
    if raw_path.starts_with("localhost/") {
        raw_path = &raw_path["localhost/".len()..];
    } else if raw_path.starts_with("localhost") {
        raw_path = &raw_path["localhost".len()..];
    }

    // Decode percent-encoded path
    let mut decoded = percent_encoding::percent_decode_str(raw_path)
        .decode_utf8_lossy()
        .to_string();

    // Platform-specific normalization
    #[cfg(windows)]
    {
        // On Windows: If decoded starts with "/C:/" or "\\C:\\", strip leading slash
        if (decoded.starts_with('/') || decoded.starts_with('\\'))
            && decoded.len() > 2
            && decoded.chars().nth(2) == Some(':')
        {
            decoded = decoded[1..].to_string();
        }
    }
    #[cfg(not(windows))]
    {
        // On macOS / Linux: ensure leading slash
        if !decoded.starts_with('/') {
            decoded = format!("/{}", decoded);
        }
    }

    let path = PathBuf::from(&decoded);
    if !path.exists() || !path.is_file() {
        eprintln!("[MediaPicker Protocol] 404: File {:?} not found (from URI: {})", path, uri);
        return Response::builder()
            .status(StatusCode::NOT_FOUND)
            .header(ACCESS_CONTROL_ALLOW_ORIGIN, "*")
            .body(b"File Not Found".to_vec())
            .unwrap_or_else(|_| Response::new(Vec::new()));
    }

    let Ok(mut file) = File::open(&path) else {
        return Response::builder()
            .status(StatusCode::NOT_FOUND)
            .header(ACCESS_CONTROL_ALLOW_ORIGIN, "*")
            .body(b"Failed to open file".to_vec())
            .unwrap_or_else(|_| Response::new(Vec::new()));
    };

    let Ok(metadata) = file.metadata() else {
        return Response::builder()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .header(ACCESS_CONTROL_ALLOW_ORIGIN, "*")
            .body(b"Failed to read file metadata".to_vec())
            .unwrap_or_else(|_| Response::new(Vec::new()));
    };
    let total_len = metadata.len();

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let content_type = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        "avif" => "image/avif",
        "heic" | "heif" => "image/heic",
        "mp4" => "video/mp4",
        "webm" => "video/webm",
        "mov" => "video/quicktime",
        "m4v" => "video/x-m4v",
        "mkv" => "video/x-matroska",
        _ => "application/octet-stream",
    };

    // Range request handling for video streaming
    if let Some(range_header) = request.headers().get(RANGE) {
        if let Ok(range_str) = range_header.to_str() {
            if range_str.starts_with("bytes=") {
                let range = &range_str[6..];
                let parts: Vec<&str> = range.split('-').collect();
                let start: u64 = parts[0].parse().unwrap_or(0);
                let end: u64 = if parts.len() > 1 && !parts[1].is_empty() {
                    parts[1].parse().unwrap_or(total_len.saturating_sub(1))
                } else {
                    total_len.saturating_sub(1)
                };

                let length = end.saturating_sub(start) + 1;
                if file.seek(SeekFrom::Start(start)).is_ok() {
                    let mut buffer = vec![0u8; length as usize];
                    if file.read_exact(&mut buffer).is_ok() {
                        return Response::builder()
                            .status(StatusCode::PARTIAL_CONTENT)
                            .header(CONTENT_TYPE, content_type)
                            .header(CONTENT_LENGTH, length.to_string())
                            .header(
                                CONTENT_RANGE,
                                format!("bytes {}-{}/{}", start, end, total_len),
                            )
                            .header(ACCEPT_RANGES, "bytes")
                            .header(ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                            .body(buffer)
                            .unwrap_or_else(|_| Response::new(Vec::new()));
                    }
                }
            }
        }
    }

    // Default full content
    let mut buffer = Vec::new();
    if file.read_to_end(&mut buffer).is_ok() {
        Response::builder()
            .status(StatusCode::OK)
            .header(CONTENT_TYPE, content_type)
            .header(CONTENT_LENGTH, total_len.to_string())
            .header(ACCEPT_RANGES, "bytes")
            .header(ACCESS_CONTROL_ALLOW_ORIGIN, "*")
            .body(buffer)
            .unwrap_or_else(|_| Response::new(Vec::new()))
    } else {
        Response::builder()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .header(ACCESS_CONTROL_ALLOW_ORIGIN, "*")
            .body(b"Failed to read file".to_vec())
            .unwrap_or_else(|_| Response::new(Vec::new()))
    }
}
