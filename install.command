#!/bin/bash
# MediaPicker Pro - One-Click Installer for macOS / Linux
cd "$(dirname "$0")"

echo "=========================================================="
echo "      MediaPicker Pro - Local Studio Installation         "
echo "=========================================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed on your system."
    echo "Please download and install Node.js (LTS version) from:"
    echo "https://nodejs.org"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo "✅ Node.js detected: $(node -v)"
echo "✅ NPM detected: $(npm -v)"
echo ""
echo "📦 Installing application dependencies (this may take a minute)..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================================="
    echo "🎉 Installation complete successfully!"
    echo "You can now launch the application:"
    echo "  1) Double-click 'start.command' (Web Studio Mode - Instant)"
    echo "  2) Or double-click 'run-tauri.command' (Native Desktop App)"
    echo "=========================================================="
else
    echo "❌ Installation encountered an issue. Please check your internet connection."
fi

echo ""
read -p "Press Enter to close this window..."
