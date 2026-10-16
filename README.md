# MediaPicker Pro - Local Media Culling & Slideshow Studio

High-speed local photo and video reviewer, fullscreen slideshow, and gallery culling studio. Completely runs in your browser with 100% offline security and zero external uploads.

## Quick Start (macOS / Linux / Windows)

1. Double-click `install.command` (or run `npm install`) to install dependencies.
2. Double-click `start.command` (or run `npm run dev`) to launch the app offline.
3. Open `http://localhost:3000` in your browser. (To use a custom port offline, run `PORT=54382 npm run dev`).

## Key Shortcuts & New Features

- **Spacebar / Left-Click**: Select / Deselect current photo or video with vibrant neon glow
- **Right Arrow**: Next slide (navigates to gallery on completion)
- **Left Arrow**: Previous slide
- **Enter / P**: Play / Pause slideshow (with animated center splash HUD; pause state persists across views)
- **Mouse Wheel Zoom (Slideshow)**: Center-focused zoom in/out in slideshow (auto-pauses on first zoom; toggleable in Settings)
- **Cmd + / Cmd - / Cmd 0**: Zoom in, zoom out, or reset zoom to 100%
- **Gallery Grid Controls**:
  - **Natural Aspect Ratio (Default)** vs **Square Grid** toggle
  - **Thumbnails Per Row Slider (1 to 10)**: Real-time resize with anchor preservation
  - **Container Width Slider (20% to 100%)**: Adjust viewport container on ultrawide monitors
  - **Gallery Zoom Buttons (+, -, Reset)**: Dedicated step zoom controls
  - **Jump to Last Reviewed**: Instant smooth-scroll to last active slide with glowing highlight
  - **Per-Folder Memory**: All columns, container widths, layout modes, sort options, and paused state are automatically saved per folder
- **Gallery Selection Features**:
  - **Marquee Drag-Selection Box**: Click and drag across thumbnails to draw a selection rectangle
    - **Normal Drag**: Selects all cards inside the box
    - **Ctrl + Drag**: Deselects all cards inside the box
    - **Ctrl + Shift + Drag**: Inverts selection for cards inside the box
  - **Shift-Click Range Selection**: Shift-click an item to set range start (marked with animated cyan border), then Shift-click another item to select all items in between
  - **Batch Selection Buttons**: Select All, Clear, and Invert buttons equipped with confirmation dialogs ("Are you sure?")
- **Navigation Flow**:
  - Closing slideshow (via **Esc** or **X**) returns directly to the gallery at the exact slide position with an animated amber halo and "Last Slide" badge
  - Esc or Backspace in Gallery returns to the Dashboard
- **M**: Toggle Sound Mute / Unmute
- **Cmd + C / Ctrl + C**: Copy all selected paths to clipboard
- **Cmd + Z / Ctrl + Z**: Undo last selection
- **F**: Toggle OS Fullscreen
- **?**: Open Keyboard & Mouse Shortcuts cheatsheet

## 📚 Documentation & Desktop Migration

Detailed architectural documentation and guides are organized in the [`docs/`](./docs) directory:
- [`docs/BLUEPRINT.md`](./docs/BLUEPRINT.md): Architecture blueprint and module specifications
- [`docs/BROWSER_VS_TAURI_FREEDOMS.md`](./docs/BROWSER_VS_TAURI_FREEDOMS.md): Comparison of browser limitations vs native Tauri capabilities
- [`docs/TAURI_SETUP_GUIDE.md`](./docs/TAURI_SETUP_GUIDE.md): Complete Tauri desktop setup guide
- For launching native desktop mode: double-click `run-tauri.command` (macOS) or `run-tauri.bat` (Windows).

