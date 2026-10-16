#!/bin/bash
# MediaPicker Pro - One-Click Launcher for macOS / Linux
cd "$(dirname "$0")"

echo "=========================================================="
echo "      Starting MediaPicker Pro Local Studio...            "
echo "=========================================================="
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "⚠️ Dependencies not found. Running installer first..."
    npm install
fi

echo "🚀 Launching development server on http://localhost:3000..."
echo "Opening your default browser in 3 seconds..."

# Automatically open browser in background
(
  sleep 3
  if command -v open &> /dev/null; then
    open "http://localhost:3000"
  elif command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:3000"
  fi
) &

# Run Next.js local server
npm run dev
