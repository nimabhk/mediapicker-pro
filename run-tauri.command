#!/bin/bash
# MediaPicker Pro — One-Click Native Desktop Launcher
cd "$(dirname "$0")"

echo "========================================================"
echo "    Launching MediaPicker Pro Desktop (Tauri v2 + Rust) "
echo "========================================================"

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not found. Please install Node.js from https://nodejs.org"
    read -p "Press enter to exit..."
    exit 1
fi

# Check if cargo is installed
if ! command -v cargo &> /dev/null; then
    if [ -f "$HOME/.cargo/env" ]; then
        source "$HOME/.cargo/env"
    else
        echo "Warning: Rust/Cargo not found in PATH."
        echo "If you have not installed Rust yet, run: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
        echo "Attempting to launch standard browser mode instead..."
        npm run dev
        exit 0
    fi
fi

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Starting Tauri Desktop App..."
npm run tauri:dev

if [ $? -ne 0 ]; then
    echo ""
    echo "--------------------------------------------------------"
    echo "Process finished with an exit code. Press Enter to exit..."
    read -r
fi
