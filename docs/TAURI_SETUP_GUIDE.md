# MediaPicker Pro — Local Tauri Desktop Setup & Run Guide
> **Version:** 2.0.0 (Native Tauri v2 + Rust Core)  
> **Target OS:** macOS (Apple Silicon & Intel), Windows 10/11, Linux (Ubuntu/Debian/Arch)  
> **Status:** 100% Offline, Zero Telemetry, Sandboxed Least-Privilege  

---

## 1. Quick Start (If You Already Have Rust & Node)

If you have Node.js (v18+) and Rust installed, open your terminal in the project directory and run:

```bash
# 1. Install frontend dependencies
npm install

# 2. Run the desktop app in live-reloading dev mode
npm run tauri:dev
```
A native desktop window will launch instantly with the complete application running at native speed!

---

## 2. Prerequisites by Operating System

### 🍎 macOS
1. **Xcode Command Line Tools:**
   Open Terminal and run:
   ```bash
   xcode-select --install
   ```
2. **Rust:**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   # Press Enter for default installation
   source "$HOME/.cargo/env"
   ```
3. **Node.js (v18+ or v20+):**
   Install via [nodejs.org](https://nodejs.org) or `brew install node`.

---

### 🪟 Windows (10 or 11)
1. **C++ Build Tools:**
   Install the "Desktop development with C++" workload from Visual Studio Build Tools:
   👉 [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
2. **WebView2:**
   Windows 10/11 already includes WebView2 by default.
3. **Rust:**
   Download and run `rustup-init.exe` from [rustup.rs](https://rustup.rs).
4. **Node.js:**
   Install Node.js LTS from [nodejs.org](https://nodejs.org).

---

### 🐧 Linux (Ubuntu / Debian / Mint)
Install system webview2 and GTK libraries:
```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```
Install Rust:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

---

## 3. Running MediaPicker Pro

### Mode A: Native Desktop App (Recommended)
```bash
npm run tauri:dev
```
- Opens a dedicated, hardware-accelerated desktop window.
- Directly invokes Rust for scanning, real OS Trash deletion, and atomic folder copying/moving.
- Custom streaming protocol (`mediapicker://`) streams 4K/8K images and videos directly from your SSD.

### Mode B: Standard Web Browser Mode
```bash
npm run dev
```
- Open `http://localhost:3000` in Chrome, Edge, or Brave.
- Operates using the web File System Access API and browser local database.

---

## 4. Building the Standalone Production App (.dmg, .exe, .deb)

To compile a distributable production installer or executable that doesn't need a terminal:

```bash
npm run tauri:build
```

The compiled binaries will be generated in:
- **macOS:** `src-tauri/target/release/bundle/dmg/MediaPicker Pro.dmg` and `.app`
- **Windows:** `src-tauri/target/release/bundle/msi/MediaPicker Pro.msi` and `.exe`
- **Linux:** `src-tauri/target/release/bundle/deb/` or `AppImage`

---

## 5. Keyboard & Mouse Shortcuts Cheat Sheet

| Key / Action | Context | Function |
| :--- | :--- | :--- |
| **Spacebar** or **Left-Click** | Slideshow & Gallery | Toggle Select / Cull with glowing neon border |
| **Arrow Right** | Slideshow | Next slide (or jump to Gallery from finished card) |
| **Arrow Left** | Slideshow | Previous slide |
| **Enter** or **P** | Slideshow | Toggle Auto-Advance Play / Pause (shows splash HUD) |
| **M** | Slideshow & Gallery | Toggle Global Sound Mute / Unmute (shows splash HUD) |
| **Backspace** | Everywhere | Return back (Slideshow → Gallery → Dashboard) |
| **Escape (Esc)** | Modals & Fullscreen | Dismiss open dialogs, cancel prompts, exit fullscreen |
| **Cmd+C / Ctrl+C** | Everywhere | Instant copy of all selected file paths to clipboard |
| **Cmd+Z / Ctrl+Z** | Dashboard & Slideshow | Undo last selection or action |
| **F** | Slideshow | Toggle True Fullscreen display |
| **?** | Dashboard | Open Keyboard Shortcuts modal guide |
