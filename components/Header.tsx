'use client';

import React from 'react';
import { AppSettings } from '@/lib/types';
import {
  Volume2,
  VolumeX,
  Settings,
  Trash2,
  Sun,
  Moon,
  Monitor,
  FolderOpen,
  Keyboard,
  Activity,
} from 'lucide-react';

interface HeaderProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenSettings: () => void;
  onOpenTrash: () => void;
  onOpenShortcuts: () => void;
  trashCount: number;
  onAddFolderClick: () => void;
  onOpenDiagnostics: () => void;
  onReturnToDashboard?: () => void;
  isDashboard: boolean;
}

export function Header({
  settings,
  onUpdateSettings,
  onOpenSettings,
  onOpenTrash,
  onOpenShortcuts,
  onOpenDiagnostics,
  trashCount,
  onAddFolderClick,
  onReturnToDashboard,
  isDashboard,
}: HeaderProps) {
  const toggleMute = () => {
    onUpdateSettings({ globalMuted: !settings.globalMuted });
  };

  const cycleTheme = () => {
    const nextTheme: AppSettings['themeMode'] =
      settings.themeMode === 'dark'
        ? 'light'
        : settings.themeMode === 'light'
        ? 'system'
        : 'dark';
    onUpdateSettings({ themeMode: nextTheme });
  };

  const getThemeIcon = () => {
    if (settings.themeMode === 'dark') return <Moon className="w-4 h-4 text-sky-400" />;
    if (settings.themeMode === 'light') return <Sun className="w-4 h-4 text-amber-500" />;
    return <Monitor className="w-4 h-4 text-slate-400" />;
  };

  const getThemeLabel = () => {
    if (settings.themeMode === 'dark') return 'Dark';
    if (settings.themeMode === 'light') return 'Light';
    return 'System';
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 py-3 transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onReturnToDashboard}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
            title="Return to Main Dashboard"
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg text-white shadow-lg transition-transform group-hover:scale-105 ${
                settings.neonAccent === 'orange'
                  ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-orange-500/20'
                  : 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20'
              }`}
            >
              M
            </div>
            <div className="flex flex-col text-left">
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors">
                MediaPicker <span className={settings.neonAccent === 'orange' ? 'text-orange-500' : 'text-emerald-500'}>Pro</span>
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                Local Media Culling & Slideshow
              </span>
            </div>
          </button>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isDashboard && (
            <button
              onClick={onAddFolderClick}
              className={`hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium text-white transition-all shadow-sm ${
                settings.neonAccent === 'orange'
                  ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Open Local Folder</span>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={toggleMute}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              settings.globalMuted
                ? 'border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                : settings.neonAccent === 'orange'
                ? 'border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400'
                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}
            title={settings.globalMuted ? 'Audio Muted (Click to Unmute)' : 'Audio Active (Click to Mute)'}
          >
            {settings.globalMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Audio On</span>
              </>
            )}
          </button>

          {/* Theme 3-way toggle */}
          <button
            onClick={cycleTheme}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            title={`Switch Theme (Current: ${getThemeLabel()})`}
          >
            {getThemeIcon()}
            <span className="hidden md:inline">{getThemeLabel()}</span>
          </button>

          {/* Trash Bin with 30-day retention count */}
          <button
            onClick={onOpenTrash}
            className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors ${
              trashCount > 0 ? 'text-amber-600 dark:text-amber-400 border-amber-500/40' : ''
            }`}
            title="30-Day Trash Bin"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Trash Bin</span>
            {trashCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 tabular-nums">
                {trashCount}
              </span>
            )}
          </button>

          {/* Shortcuts Guide Toggle */}
          <button
            onClick={onOpenShortcuts}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Keyboard & Mouse Shortcuts Guide (?)"
          >
            <Keyboard className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden md:inline">Shortcuts</span>
          </button>

          {/* Settings Modal Toggle */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Configure Timers & Shortcuts"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 group-hover:rotate-45 transition-transform" />
            <span className="hidden md:inline">Settings</span>
          </button>

          {/* Self-Test & Diagnostics */}
          <button
            onClick={onOpenDiagnostics}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 transition-colors"
            title="Self-Test, Image Diagnostics & Environment Checks"
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Diagnostics & Test</span>
          </button>
        </div>
      </div>
    </header>
  );
}
