use std::path::PathBuf;

#[tauri::command]
pub fn move_to_trash(paths: Vec<String>) -> Result<usize, String> {
    let mut success_count = 0;
    let mut errors = Vec::new();

    for path_str in paths {
        let path = PathBuf::from(&path_str);
        if !path.exists() {
            continue;
        }

        match trash::delete(&path) {
            Ok(_) => {
                success_count += 1;
            }
            Err(e) => {
                errors.push(format!("Failed to move '{}' to trash: {}", path_str, e));
            }
        }
    }

    if !errors.is_empty() && success_count == 0 {
        return Err(errors.join("; "));
    }

    Ok(success_count)
}
