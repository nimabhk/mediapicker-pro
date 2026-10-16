'use client';

import React from 'react';
import { AppSettings } from '@/lib/types';
import { getTheme, THEME_LIST } from '@/lib/themes';
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
  Palette,
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
  const isClient = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const isDarkMode =
    isClient && typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : settings.themeMode === 'dark' || settings.themeMode === 'system';

  const currentTheme = getTheme(settings.activeThemeId, isDarkMode);
  const isLiquidGlass = currentTheme.id === 'theme-3-liquid-glass';
  const isCupertino = currentTheme.id === 'theme-2-cupertino-frosted-pro';
  const isPaperAtelier = currentTheme.id === 'theme-4-paper-atelier';
  const rimClass = isLiquidGlass
    ? 'liquid-specular-rim'
    : isCupertino
    ? 'cupertino-vibrancy-rim'
    : isPaperAtelier
    ? 'paper-editorial-rim'
    : 'obsidian-console-rim';

  const toggleMute = () => {
    onUpdateSettings({ globalMuted: !settings.globalMuted });
  };

  // 1. Cycle Theme Mode: dark -> light -> system -> dark
  const cycleThemeMode = () => {
    const nextMode: AppSettings['themeMode'] =
      settings.themeMode === 'dark'
        ? 'light'
        : settings.themeMode === 'light'
        ? 'system'
        : 'dark';
    onUpdateSettings({ themeMode: nextMode });
  };

  // 2. Cycle Theme Preset across the 4 curated themes
  const cycleThemePreset = () => {
    const currentId = settings.activeThemeId || 'theme-1-obsidian-culler';
    const currentIndex = THEME_LIST.findIndex((t) => t.id === currentId);
    const nextIndex = (currentIndex + 1) % THEME_LIST.length;
    const nextTheme = THEME_LIST[nextIndex];
    onUpdateSettings({
      activeThemeId: nextTheme.id,
    });
  };

  const getModeIcon = () => {
    if (!isClient) return <Moon className="w-3.5 h-3.5 theme-accent" />;
    if (settings.themeMode === 'dark') return <Moon className="w-3.5 h-3.5 theme-accent" />;
    if (settings.themeMode === 'light') return <Sun className="w-3.5 h-3.5 text-amber-500" />;
    return <Monitor className="w-3.5 h-3.5 theme-text-secondary" />;
  };

  const getModeLabel = () => {
    if (!isClient) return 'Dark';
    if (settings.themeMode === 'dark') return 'Dark';
    if (settings.themeMode === 'light') return 'Light';
    return 'System';
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b theme-border theme-header px-4 sm:px-6 py-3 transition-all duration-200 ${rimClass}`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onReturnToDashboard}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
            title="Return to Main Dashboard"
          >
            <div
              suppressHydrationWarning
              className="w-8 h-8 flex items-center justify-center font-bold text-sm theme-btn-accent transition-transform group-hover:scale-105"
            >
              M
            </div>
            <div className="flex flex-col text-left">
              <span
                suppressHydrationWarning
                className="text-base font-bold tracking-tight theme-heading theme-text group-hover:opacity-85 transition-opacity"
              >
                MediaPicker{' '}
                <span suppressHydrationWarning className="theme-accent">
                  Pro
                </span>
              </span>
              <span className="text-[11px] theme-text-muted font-normal">
                Local Media Culling &amp; Slideshow
              </span>
            </div>
          </button>
        </div>

        {}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap justify-end">
          {isDashboard && (
            <button
              onClick={onAddFolderClick}
              suppressHydrationWarning
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold theme-btn-accent active:scale-95"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Open Local Folder</span>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={toggleMute}
            suppressHydrationWarning
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border theme-border theme-surface theme-btn ${rimClass} ${
              settings.globalMuted ? 'theme-text-muted' : 'theme-accent'
            }`}
            title={
              settings.globalMuted
                ? 'Audio Muted (Click to Unmute)'
                : 'Audio Active (Click to Mute)'
            }
          >
            {settings.globalMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden md:inline theme-text">Audio On</span>
              </>
            )}
          </button>

          {}
          {/* Theme Preset Selector (Cycles 4 Curated Themes) */}
          <button
            onClick={cycleThemePreset}
            suppressHydrationWarning
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border theme-border theme-surface theme-btn theme-text ${rimClass}`}
            title={isClient ? `Theme: ${currentTheme.name} (Click to Cycle)` : 'Theme'}
          >
            <Palette className="w-3.5 h-3.5 theme-accent" />
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/25 shadow-sm shrink-0"
              style={{
                backgroundColor: `rgb(${currentTheme.palette.accentRgb})`,
                boxShadow: 'var(--theme-glow)',
              }}
            />
            <span className="hidden xl:inline font-semibold">
              {isClient ? currentTheme.name : 'Theme'}
            </span>
          </button>

          {/* Theme Mode 3-way toggle (Dark / Light / System) */}
          <button
            onClick={cycleThemeMode}
            suppressHydrationWarning
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border theme-border theme-surface theme-btn theme-text ${rimClass}`}
            title={
              isClient
                ? `Mode: ${getModeLabel()} (Click to toggle Dark/Light/System)`
                : 'Mode'
            }
          >
            {getModeIcon()}
            <span className="hidden md:inline">{isClient ? getModeLabel() : 'Dark'}</span>
          </button>

          {}
          {/* Trash Bin with 30-day retention count */}
          <button
            onClick={onOpenTrash}
            suppressHydrationWarning
            className={`relative flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border theme-border theme-surface theme-btn theme-text ${rimClass}`}
            title="30-Day Trash Bin"
          >
            <Trash2 className={`w-3.5 h-3.5 ${trashCount > 0 ? 'text-amber-500' : 'theme-text-muted'}`} />
            <span className="hidden md:inline">Trash Bin</span>
            {trashCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/40 font-mono font-bold tabular-nums">
                {trashCount}
              </span>
            )}
          </button>

          {/* Shortcuts Guide Toggle */}
          <button
            onClick={onOpenShortcuts}
            suppressHydrationWarning
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border theme-border theme-surface theme-btn theme-text ${rimClass}`}
            title="Keyboard & Mouse Shortcuts Guide (?)"
          >
            <Keyboard className="w-3.5 h-3.5 theme-text-muted" />
            <span className="hidden md:inline">Shortcuts</span>
          </button>

          {/* Settings Modal Toggle */}
          <button
            onClick={onOpenSettings}
            suppressHydrationWarning
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border theme-border theme-surface theme-btn theme-text group ${rimClass}`}
            title="Configure Timers & Studio Themes"
          >
            <Settings className="w-3.5 h-3.5 theme-text-muted group-hover:rotate-45 transition-transform" />
            <span className="hidden md:inline">Settings</span>
          </button>

          {/* Self-Test & Diagnostics */}
          <button
            onClick={onOpenDiagnostics}
            suppressHydrationWarning
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold border theme-border theme-surface-subtle theme-btn theme-accent ${rimClass}`}
            title="Self-Test, Image Diagnostics & Environment Checks"
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Diagnostics &amp; Test</span>
          </button>
        </div>
      </div>
    </header>
  );
}