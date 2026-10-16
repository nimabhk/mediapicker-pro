# MediaPicker Pro — Technical Architecture & Tauri Migration Blueprint
> **Version:** 2.0.0-Blueprint  
> **Target Stack:** Tauri v2 (Rust Backend) + Next.js 15 (React 19 App Router + Tailwind CSS v4)  
> **Security Profile:** 100% Offline, Zero-Network, Principle of Least Privilege, Sandboxed IPC  
> **Date:** October 2026  

---

## 1. Executive Summary

**MediaPicker Pro** is a high-speed, local-first photo and video culling studio and fullscreen presentation engine designed for photographers, videographers, visual curators, and creative directors. It replaces cumbersome desktop culling tools by providing:

1. **Native-Speed Ingestion & Scanning:** Instant recursive traversal of folders with subfolder tagging and memory safeguards (50,000 files safeguard limit).
2. **Zero-Lag Fullscreen Slideshow:** 100% uncompressed native scale viewing bounded to display bounds, auto-advancing timers, video auto-playback up to 30s with pause override, auto-hiding controls HUD, and real-time center splash indicators for Play/Pause and Mute/Unmute.
3. **Lightning Culling Engine:** Instant selection tagging via Spacebar or Left-Click with an animated magic neon glow (Vibrant Orange or Cyber Emerald), instant `Cmd+C` clipboard export, and `Cmd+Z` undo history.
4. **Smart Paginated Gallery:** 1,000 items per page chunking to eliminate memory exhaustion, automatic size guardrails (>5MB images / >100MB videos with manual reveal eye button), hover video previews, and multi-criteria sorting.
5. **OS-Level File Operations:** In the Tauri stack, direct native moves to the OS Recycle Bin/Trash (via the `trash` crate), atomic batch copy/move to suffix folders (`_selected`), and ZIP compilation.

---

## 2. System Architecture: Tauri v2 + Next.js

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Tauri Native Window                             │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Frontend UI (Webview)                         │  │
│  │  - Next.js 15 (React 19) + Tailwind CSS v4                        │  │
│  │  - Fonts: Plus Jakarta Sans (Display) + JetBrains Mono (Data)    │  │
│  │  - Views: Project Hub | Slideshow Studio | Paginated Gallery     │  │
│  │  - State: In-Memory Zustand/React + IndexedDB + LocalStorage     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                  │                                     │
│                         IPC Bridge (invoke)                            │
│                                  │                                     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     Rust Core (Tauri v2)                         │  │
│  │  - Multi-threaded Directory Walker (walkdir + rayon)              │  │
│  │  - OS Trash Integration (trash crate)                            │  │
│  │  - Batch File System Operations (std::fs, atomic copy/move)       │  │
│  │  - Native Folder Picker Dialog (tauri-plugin-dialog / rfd)        │  │
│  │  - Streaming Custom Media Protocol (tauri://media-stream)        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Why Tauri v2 over Electron?
- **Binary Footprint:** ~10–15 MB executable size (vs ~150 MB for Electron).
- **RAM Footprint:** ~30–50 MB idle memory (vs ~250–400 MB for Chromium).
- **Filesystem Throughput:** Multi-threaded metadata scanning in Rust walks 50,000 files in under 200 milliseconds.
- **Native OS Trash:** Directly calls macOS `NSFileManager trashItemAtURL` and Windows `IFileOperation` without external binary dependencies.

---

## 3. Data Models & Rust Contracts

### 3.1. Media Item Model
```rust
// Rust Definition
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaFileItem {
    pub id: String,
    pub name: String,
    pub relative_path: String,
    pub absolute_path: String,
    pub subfolder: String,
    pub size: u64,
    pub last_modified: i64,
    pub media_type: String, // "image" | "video"
    pub mime_type: String,
    pub viewed: bool,
    pub selected: bool,
    pub is_over_limit: bool,
    pub is_manually_revealed: bool,
}
```

```typescript
// TypeScript Contract
export type MediaType = 'image' | 'video';

export interface MediaFileItem {
  id: string;
  name: string;
  relativePath: string;
  absolutePath: string;
  subfolder: string;
  size: number;
  lastModified: number;
  type: MediaType;
  mimeType: string;
  viewed: boolean;
  selected: boolean;
  isOverLimit?: boolean;
  isManuallyRevealed?: boolean;
}
```

### 3.2. Project Model
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderProject {
    pub id: String,
    pub name: String,
    pub root_path: String,
    pub created_at: i64,
    pub last_accessed_at: i64,
    pub total_files_count: usize,
    pub total_size_bytes: u64,
    pub media_count: usize,
    pub photos_count: usize,
    pub videos_count: usize,
    pub non_media_count: usize,
    pub viewed_count: usize,
    pub selected_count: usize,
    pub last_viewed_index: usize,
    pub subfolders: Vec<String>,
    pub enabled_subfolders: Vec<String>,
    pub include_root_files: bool,
    pub items: Vec<MediaFileItem>,
    pub deleted_at: Option<i64>,
}
```

### 3.3. Application Settings Model
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub slide_duration_sec: f32,       // Default: 3.0
    pub video_max_duration_sec: u32,   // Default: 30
    pub image_size_limit_mb: u32,      // Default: 5
    pub video_size_limit_mb: u32,      // Default: 100
    pub items_per_page: usize,         // Default: 1000
    pub controls_auto_hide_ms: u32,    // Default: 2500
    pub neon_accent: String,           // "orange" | "green"
    pub theme_mode: String,            // "dark" | "light" | "system"
    pub clipboard_format: String,      // "newline" | "comma" | "filenames_only" | "json"
    pub global_muted: bool,            // Default: true
    pub max_scan_files_limit: usize,   // Default: 50000
    pub include_hidden_files: bool,    // Default: true
    pub export_suffix: String,         // Default: "_selected"
}
```

---

## 4. Rust Core Commands (IPC API)

### 4.1. Directory Scanning (`scan_directory`)
- **Input:**
  - `path: String`: Root folder path.
  - `max_files: usize`: File limit ceiling (e.g., 50,000).
  - `include_hidden: bool`: Whether to traverse files starting with `.`.
  - `img_limit_mb: u32`: Threshold for heavy image badge (5MB).
  - `vid_limit_mb: u32`: Threshold for heavy video badge (100MB).
- **Execution:**
  - Uses `walkdir` to traverse recursively.
  - Skips hidden files if `include_hidden == false`.
  - Terminates immediately if `file_count >= max_files` and sets `limit_reached: true`.
  - Extracts relative path, detects extension (`jpg`, `jpeg`, `png`, `webp`, `gif`, `avif`, `heic`, `mp4`, `webm`, `mov`, `m4v`, `mkv`), calculates total bytes.
- **Output:** `ScanResult` containing metadata, items vector, subfolders list, and counts.

### 4.2. Native OS Trash Move (`move_to_trash`)
- **Input:** `paths: Vec<String>`
- **Execution:**
  - Calls `trash::delete(&path)` for each file.
  - Non-destructive: Files appear in macOS Trash or Windows Recycle Bin.
  - Reversible via OS Trash or via application Undo (`Cmd+Z`).

### 4.3. Batch Suffix Folder Copy/Move (`batch_export_folder`)
- **Input:**
  - `source_root: String`
  - `suffix: String` (e.g., `_selected`)
  - `files: Vec<String>` (relative paths)
  - `operation: String` ("copy" | "move")
- **Execution:**
  - Determines destination directory: `<parent_dir>/<folder_name><suffix>`.
  - Collision check: if folder exists, appends numerical index (`<folder_name><suffix>_2`).
  - Mirrors subfolder directory tree inside destination.
  - Performs atomic copy (`std::fs::copy`) or rename (`std::fs::rename`).

### 4.4. Streaming Media Protocol (`mediapicker://`)
- Registers a custom Tauri URI protocol (`tauri.protocol("mediapicker", ...)`) allowing the webview to stream multi-gigabyte 4K/8K images and 60fps MP4/WebM videos directly from the NVMe/SSD with byte-range requests (`HTTP 206 Partial Content`), without reading full files into RAM.

---

## 5. View Specifications & User Interaction Matrix

### 5.1. Dashboard (Projects Hub)
- **Folder Intake:**
  - Button 1: **Open Local Folder** (triggers `tauri-plugin-dialog::FileDialogBuilder::pick_folder`).
  - Button 2: **Enter Path Manually** (opens text modal to paste directory paths).
- **Folder Cards:**
  - Folder Name & Path.
  - Last activity date.
  - Prominent percentage metric circle (Viewed / Total).
  - Two-tone progress bar.
  - Total Folder Size (`total_size_bytes` formatted as MB/GB).
  - Total Files Count (e.g., `14,250 files`).
  - Media Breakdown badges (`Photos` vs `Videos`).
  - Selected (Culled) counter badge.
  - Collapsible Subfolder Filter checklist (toggle subfolders or root files).
  - Actions: **Resume Slideshow**, **Start from First**, **Open Gallery**, **Actions & Exports**, **Move to Trash**.

### 5.2. Fullscreen Slideshow Studio
- **Display Constraint:** Viewport-bounded `object-contain` at 100% native aspect ratio.
- **Auto-Hide HUD:** Cursor stillness for `controls_auto_hide_ms` (2.5s) fades out all navigation and metadata bars.
- **Navigation Controls:**
  - `ArrowRight`: Next slide.
  - `ArrowLeft`: Previous slide.
  - *`ArrowUp` & `ArrowDown` are explicitly disabled to prevent accidental skipping.*
- **Play/Pause Controls:**
  - `Enter` or `P`: Toggles auto-advance.
  - Shows animated center splash HUD indicator (`Play` or `Pause` icon).
- **Audio Controls:**
  - `M`: Toggles sound mute/unmute.
  - Shows animated center splash HUD indicator (`Volume2` or `VolumeX` icon).
- **Culling Selection:**
  - `Spacebar` or `Left-Click`: Toggles selection state.
  - Applies magic neon glow border and drop-shadow (`#f97316` or `#10b981`).
- **Completion End Screen:**
  - Reaching the end of the slide deck does NOT loop. It transitions to the completion card.
  - Displays summary: Total reviewed, Total culled/selected.
  - Action buttons: Restart from beginning, Open Gallery, Return to Dashboard.
  - Pressing `ArrowRight` on this screen navigates directly to Gallery.
  - Pressing `ArrowLeft` returns to the final slide.
- **Navigation Shortcuts:**
  - `Backspace`: Navigates to Gallery.
  - `Cmd+C` / `Ctrl+C`: Copies all culled paths to clipboard.
  - `Cmd+Z` / `Ctrl+Z`: Undoes last selection.
  - `F`: Toggles OS Fullscreen.
  - `Esc`: Exits to Dashboard.

### 5.3. Paginated Grid Gallery
- **Pagination Chunking:** 1,000 items per page by default.
- **Memory Guardrails:**
  - Files exceeding `image_size_limit_mb` (5MB) or `video_size_limit_mb` (100MB) display an alert badge and an Eye ("Reveal") button to prevent memory spikes.
- **Hover Video Preview:** Mouse hover triggers auto-play with audio conforming to global mute setting.
- **Sorting Options:**
  1. Name (A to Z)
  2. Name (Z to A)
  3. Folder & Name
  4. Date Modified (Newest)
  5. Date Modified (Oldest)
  6. File Size (Largest)
  7. File Size (Smallest)
  8. Media Type (Images first / Videos first)
- **Instant Slideshow Entry:** Clicking play icon on any thumbnail launches the slideshow starting from that exact item.
- **Navigation:** `Backspace` or `Esc` returns to Dashboard.

### 5.4. Action & Export Center
- Invert Selections / Clear All Selections.
- Download ZIP archive of Selected (or Unselected) media.
- Download Text List (`.txt`) with relative paths or filenames only.
- Copy paths to system clipboard.
- Copy or Move to Suffix Folder (e.g., `<name>_selected`) with collision index incrementing.

### 5.5. Safety Trash Bin (30-Day Retention)
- In-app soft deletion preserves folder metadata, reviewed percentages, and culled items for 30 days.
- Purged automatically on day 31 (`Date.now() > expiresAt`).
- Re-adding a previously deleted folder automatically detects the signature and restores the prior culling state.

---

## 6. Tauri v2 Project Structure Plan

```
/
├── src-tauri/                       <-- Rust Native Engine
│   ├── Cargo.toml                   <-- Rust Dependencies
│   ├── tauri.conf.json              <-- Tauri v2 Config & Window Setup
│   ├── capabilities/
│   │   └── default.json             <-- Scoped Least-Privilege Permissions
│   ├── icons/                       <-- App Icons (.icns, .ico, .png)
│   └── src/
│       ├── main.rs                  <-- Tauri Entry Point
│       ├── lib.rs                   <-- Tauri Builder & Plugin Registrations
│       ├── commands/
│       │   ├── mod.rs
│       │   ├── scanner.rs           <-- walkdir + rayon fast directory scanner
│       │   ├── file_ops.rs          <-- copy, move, suffix folder logic
│       │   └── trash.rs             <-- OS trash integration
│       └── protocol.rs              <-- mediapicker:// custom media streaming
├── app/                             <-- Next.js 15 App Router
│   ├── globals.css                  <-- Tailwind CSS v4 + Dark Mode
│   ├── layout.tsx                   <-- Typography & Root Providers
│   └── page.tsx                     <-- View Orchestrator
├── components/                      <-- Modular Frontend Components
│   ├── Header.tsx                   <-- Navigation, Sound, Theme, Modals
│   ├── ProjectList.tsx              <-- Projects Dashboard & Subfolder Filters
│   ├── SlideshowView.tsx            <-- Fullscreen Slideshow & End Screen
│   ├── GalleryView.tsx              <-- Paginated Grid & Sort Controls
│   ├── SettingsModal.tsx            <-- Parameter Tuning
│   ├── TrashModal.tsx               <-- 30-Day Soft Retention
│   ├── ActionModal.tsx              <-- ZIP, Suffix Folder Copy/Move
│   ├── ShortcutsModal.tsx           <-- Cheatsheet Guide
│   └── PathInputModal.tsx           <-- Manual Path Entry
├── lib/
│   ├── types.ts                     <-- Shared TypeScript Interfaces
│   ├── tauri-bridge.ts              <-- Typed IPC invoke wrapper
│   ├── storage.ts                   <-- Local persistence & 30-day purge
│   ├── zip-exporter.ts              <-- In-browser ZIP fallback
│   └── demo-data.ts                 <-- Demo project for instant testing
├── package.json
└── tsconfig.json
```

---

## 7. Cargo.toml Dependencies (Rust)

```toml
[package]
name = "mediapicker-pro"
version = "2.0.0"
description = "Local Media Culling & Slideshow Studio"
edition = "2021"

[dependencies]
tauri = { version = "2.0", features = ["protocol-asset"] }
tauri-plugin-dialog = "2.0"
tauri-plugin-fs = "2.0"
tauri-plugin-clipboard-manager = "2.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
walkdir = "2.5"
rayon = "1.10"
trash = "5.1"
zip = { version = "2.2", default-features = false, features = ["deflate"] }
chrono = { version = "0.4", features = ["serde"] }

[build-dependencies]
tauri-build = { version = "2.0", features = [] }
```

---

## 8. Security & Least Privilege Discipline

1. **Zero Outbound Network Traffic:**
   - The app makes zero external network calls.
   - External network permissions in `capabilities/default.json` are completely disabled.
2. **Local-Only Sandboxing:**
   - Filesystem reads are restricted to user-selected directories.
   - Shell execution (`Command::new`) is strictly forbidden.
3. **Safe Deletions:**
   - "Delete" operations are routed through the OS Trash system (`trash` crate). No permanent `std::fs::remove_file` calls are made unless explicitly purged from the 30-day trash view.

---

## 9. Verification & Execution Status

- **Archive Created:** Complete project backup saved at `/mediapicker-pro-v1-archive.zip` (149.8 KB).
- **Existing App Health:** Fully compiling and linting with 0 errors (`Build succeeded`).
- **Blueprint Ready:** `BLUEPRINT.md` established as the authoritative specification.

*The codebase is now fully documented, archived, and primed for the Tauri v2 implementation phase upon your prompt.*
