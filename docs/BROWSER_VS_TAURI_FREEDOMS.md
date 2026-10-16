# Browser Sandbox Restrictions vs. Tauri Native Freedoms
> **Technical Audit & Architectural Comparison for MediaPicker Pro**  
> **Prepared for:** Migration to Tauri v2 + Rust Core  
> **Date:** October 2026

---

## 1. Overview & Purpose

During the initial browser-based prototype phase of MediaPicker Pro, several engineering guardrails, artificial limits, and architectural workarounds had to be implemented solely due to the **Web Sandbox Security Model** enforced by web browsers (Chromium, WebKit, Gecko).

This document serves as the **definitive audit** of:
1. Every restriction that existed in the browser environment.
2. The exact mechanism that makes that restriction obsolete in Tauri v2.
3. How we can design the native Tauri codebase freely without carrying forward these unnecessary web constraints.

---

## 2. Comprehensive Comparison Matrix

| Capability / Domain | Browser Sandbox (Current Prototype) | Tauri v2 + Rust Native (New Target) | Action in New Stack |
| :--- | :--- | :--- | :--- |
| **Filesystem Access** | Restricted to `showDirectoryPicker()` (Chromium only) or `<input webkitdirectory>` fallback. Cannot open pasted paths directly without manual prompt. | Direct, unprompted access to any local or network path via Rust `std::fs` and `PathBuf`. | **Remove fallback input logic.** Allow instant scanning of any pasted path or native dialog pick. |
| **Absolute Paths** | Masked by browser for privacy (only `webkitRelativePath` is exposed). Fake paths simulated. | Real OS absolute paths (`/Users/...`, `D:\Photos\...`, `/mnt/...`) are directly available. | **Expose true OS paths** everywhere (metadata bar, clipboard, file operations). |
| **Large Media Memory Footprint** | Blobs (`URL.createObjectURL(file)`) reside in browser RAM. Large images (>5MB) or 4K videos (>100MB) can cause browser tab OOM crashes. | Custom protocol (`mediapicker://` or `asset://`) streams directly from NVMe/SSD via HTTP 206 Range requests. Zero RAM bloat. | **Eliminate the 5MB / 100MB size blocks.** All media loads instantly without manual "reveal" eye buttons. |
| **Gallery Pagination** | Forced pagination chunking (1,000 items/page) to prevent browser DOM and garbage collector choking. | Native thumbnail caching + virtualized windowing can easily render 50,000+ items continuously. | **Make pagination optional or seamless infinite scroll.** No memory ceiling. |
| **Trash & File Deletion** | "Virtual" 30-day soft deletion stored only in IndexedDB. Actual files on disk remained untouched! | Real OS Trash via `trash` crate (`trash::delete(&path)`). Moves actual files to macOS Trash / Windows Recycle Bin. | **True native deletion.** Files go to OS Trash, restorable via OS or app `Cmd+Z`. |
| **Exporting & Suffix Folders** | Must create in-memory ZIP archives (`JSZip`) and force browser download, because JS cannot write to disk without file picker handles. | Direct atomic filesystem operations (`std::fs::copy`, `std::fs::rename`, or hardlinks). Takes ~10ms for 1,000 files. | **Eliminate browser ZIP workarounds.** Direct creation of `FolderName_selected/` on disk. |
| **Audio Autoplay Policy** | Browser blocks audio autoplay until user clicks (`NotAllowedError`). Muted state forced on initial mount. | Tauri webviews do not enforce browser autoplay restrictions. Audio plays immediately if desired. | **Seamless audio playback** without browser gesture barriers. |
| **Clipboard Integration** | `navigator.clipboard` restricted to plain text, requires window focus, and triggers security prompts. | Native OS clipboard manager can copy real OS file objects and paths for pasting into Finder/Explorer/Photoshop. | **Native file clipboard.** Paste culled files directly into creative apps. |
| **Fullscreen & Hotkeys** | `requestFullscreen()` displays intrusive browser prompt ("Press Esc to exit"). Browser steals `Esc` before app logic. | Native windowing (`Window::set_fullscreen(true)`). Frameless windows, no browser banners, full keyboard capture. | **True fullscreen experience.** Clean borderless canvas with zero browser chrome. |
| **Data Persistence** | 5MB `localStorage` limit; IndexedDB can be purged by OS when disk is low; wiped in Incognito mode. | Embedded SQLite or native JSON files in `~/.config/mediapicker-pro` or `%APPDATA%`. Unlimited quota, zero eviction risk. | **Rock-solid local persistence.** Projects and culling states never get wiped. |

---

## 3. Detailed Audit of Browser Limitations Eliminated

### 3.1. File System Sandboxing & Path Resolution
- **In Browser:**
  - Modern web browsers intentionally hide real OS file paths to prevent fingerprinting and security attacks.
  - When the user manually entered a text path in our `PathInputModal`, the browser could not read that folder without invoking an explicit file picker.
- **In Tauri:**
  - Rust has direct access to the operating system's filesystem via standard POSIX and Win32 APIs.
  - A user can paste any valid path string (e.g. `/Volumes/T7_Shield/Wedding_RAWs` or `E:\Footage\Drone_4K`), and the Rust backend will immediately traverse, index, and stream files without any browser prompt.

### 3.2. Memory Management & The 5MB / 100MB Guardrails
- **In Browser:**
  - In our web prototype, we added:
    ```typescript
    const isImageOver = item.type === 'image' && item.size > imageLimitBytes; // 5MB
    const isVideoOver = item.type === 'video' && item.size > videoLimitBytes; // 100MB
    ```
    and hid these files behind an Eye ("Reveal") button.
  - This was necessary because creating thousands of `blob:http://...` URLs holding 50MB RAW files or 500MB ProRes video files in browser JavaScript heap memory causes immediate browser tab crashes.
- **In Tauri:**
  - The frontend never reads the file bytes into JavaScript memory.
  - Instead, the frontend asks for `mediapicker://path/to/file.mov`.
  - The Rust backend implements `tauri::protocol::register_uri_scheme_protocol` which serves the media using kernel zero-copy or chunked streaming with `Range: bytes=0-1048576`.
  - **Verdict:** The 5MB image and 100MB video restrictions are **no longer required**! They can be removed entirely, or kept purely as an optional warning badge if a user wants to spot large files.

### 3.3. True OS Trash vs. Simulated Browser Trash
- **In Browser:**
  - Because a web page cannot delete files on a computer's drive, our "Move to Trash" feature was merely a database flag (`deletedAt: Date.now()`) with an expiry timer of 30 days stored in `IndexedDB`. The actual files sat untouched on the user's hard drive.
- **In Tauri:**
  - We use the battle-tested Rust crate `trash`:
    ```rust
    pub fn move_to_trash(paths: Vec<String>) -> Result<(), String> {
        for path in paths {
            trash::delete(&path).map_err(|e| e.to_string())?;
        }
        Ok(())
    }
    ```
  - This moves the physical file into the macOS Trash / Windows Recycle Bin. The file disappears from the source directory, frees up display space, and can be retrieved directly from the operating system's Trash can or via the app's `Cmd+Z` undo history.

### 3.4. Export Operations: Instant Suffix Folders vs. ZIP Archives
- **In Browser:**
  - To give the user their culled files, we had to compress them into a `.zip` file using `JSZip` in JavaScript and trigger a browser download. Compressing 100 RAW files in JS takes 30–60 seconds and consumes huge CPU and memory.
- **In Tauri:**
  - The user can click **"Copy Selected to Folder"** or **"Move Selected to Folder"**.
  - Rust creates `SourceFolder_selected/` right next to the source folder on disk, mirroring subfolder structures.
  - On APFS (macOS) or ReFS/Btrfs (Linux/Windows), Rust can even use **copy-on-write clones or hardlinks**, meaning 50GB of culled media is copied into the destination folder in **under 100 milliseconds without using any extra disk space**!

### 3.5. Gallery Virtualization & Pagination
- **In Browser:**
  - We enforced `itemsPerPage = 1000` to prevent rendering 20,000 DOM nodes at once.
- **In Tauri:**
  - With native fast streaming and lightweight webview rendering, pagination can either be removed in favor of infinite virtualized scrolling (only rendering what is currently visible in the viewport), or kept as a lightweight user preference.

### 3.6. Fullscreen & Keyboard Traps
- **In Browser:**
  - Browser fullscreen (`requestFullscreen`) displays browser security warnings and intercepts the `Escape` key to exit browser fullscreen before the application's handlers can run.
  - Up and Down arrow keys sometimes scroll the browser window.
- **In Tauri:**
  - The native window can be configured as `fullscreen: true`, `decorations: false`, or borderless window.
  - The application has 100% control over all key events (`Escape`, `ArrowUp`, `ArrowDown`, `Space`, `Enter`, `Cmd+C`, `Cmd+Z`) without browser interference.

---

## 4. Architectural Directives for the Tauri v2 Implementation

When we build the Tauri v2 codebase in the next step:

1. **Do NOT carry forward the Blob URL memory workarounds:**
   - Use the native streaming asset protocol for ultra-fast media loading.
2. **Do NOT limit path entry to file dialogs:**
   - Enable direct path strings, drag-and-dropped folders from the desktop, and native folder picker dialogs.
3. **Do NOT restrict file sizes:**
   - Show all media immediately regardless of size; add fast hardware-accelerated video decoding.
4. **Implement Real OS File Actions:**
   - Real OS Trash via `trash` crate.
   - Real disk copy/move to suffix folders (`_selected`) with atomic collision resolution.
5. **Keep the UI/UX & Hotkeys Pristine:**
   - Retain the exact neon glow aesthetic (Vibrant Orange & Cyber Emerald), instant Space/Click selection, center HUD splash icons, shortcuts cheatsheet, and dark/light modes.
