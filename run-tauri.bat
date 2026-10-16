@echo off
title MediaPicker Pro - Tauri Desktop Launcher
echo ========================================================
echo    Launching MediaPicker Pro Desktop (Tauri v2 + Rust)
echo ========================================================

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed. Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo Warning: Rust/Cargo is not installed or not in PATH.
    echo Please install Rust from https://rustup.rs
    echo Launching standard browser mode instead...
    npm run dev
    pause
    exit /b 0
)

if not exist node_modules (
    echo Installing node dependencies...
    call npm install
)

echo Launching Tauri Desktop Dev App...
call npm run tauri:dev
pause
