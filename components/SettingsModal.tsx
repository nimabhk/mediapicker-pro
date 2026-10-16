'use client';

import React, { useEffect } from 'react';
import { AppSettings } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/storage';
import { THEME_LIST, getTheme } from '@/lib/themes';
import {
  X,
  RotateCcw,
  Check,
  Sliders,
  Sparkles,
  Clipboard,
  ShieldAlert,
  Eye,
  Palette,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}: SettingsModalProps) {
  const [draft, setDraft] = React.useState<AppSettings>(settings);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const isDarkMode =
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : draft.themeMode === 'dark' || draft.themeMode === 'system';

  const currentTheme = getTheme(draft.activeThemeId, isDarkMode);
  const isLiquidGlass = currentTheme.id === 'theme-3-liquid-glass';
  const isCupertino = currentTheme.id === 'theme-2-cupertino-frosted-pro';
  const rimClass = isLiquidGlass
    ? 'liquid-specular-rim'
    : isCupertino
    ? 'cupertino-vibrancy-rim'
    : '';

  const handleReset = () => {
    setDraft(DEFAULT_SETTINGS);
  };

  const handleSave = () => {
    onSaveSettings(draft);
    onClose();
  };

  const getOptionCardStyle = (isSelected: boolean): React.CSSProperties => {
    if (!isSelected) {
      return {
        borderRadius: 'var(--theme-radius-card, 8px)',
      };
    }
    return {
      borderRadius: 'var(--theme-radius-card, 8px)',
      borderColor: `rgb(${currentTheme.palette.accentRgb})`,
      backgroundColor: `rgba(${currentTheme.palette.accentRgb}, 0.14)`,
      boxShadow: 'var(--theme-glow)',
    };
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 theme-modal-backdrop animate-in fade-in duration-200"
    >
      <div
        className={`relative w-full max-w-xl theme-modal-window overflow-hidden flex flex-col max-h-[90vh] transition-all duration-200 ${rimClass}`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b theme-border theme-surface-subtle">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl theme-surface border theme-border theme-accent">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold theme-heading theme-text">
                Studio Parameters &amp; Settings
              </h2>
              <p className="text-[11px] theme-text-secondary">
                Customize optical themes, timers, and folder scanning guardrails
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 theme-btn theme-surface border theme-border theme-text-secondary hover:theme-text"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto text-left">
          {/* Scanning & File Limits Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold theme-text-secondary uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 theme-accent" />
              Folder Scanning Limits &amp; Hidden Files
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                className="p-3.5 theme-surface-subtle border theme-border space-y-2"
              >
                <label className="text-xs font-medium theme-text block">
                  Max File Scan Limit (Files Cap)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1000"
                    max="500000"
                    step="5000"
                    value={draft.maxScanFilesLimit || 50000}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        maxScanFilesLimit: Math.max(1000, parseInt(e.target.value) || 50000),
                      })
                    }
                    className="w-full px-3 py-1.5 theme-input text-sm font-mono"
                  />
                  <span className="text-xs theme-text-muted shrink-0">files</span>
                </div>
                <p className="text-[11px] theme-text-muted">
                  Default: 50,000 files (stops scan &amp; warns if exceeded to preserve memory)
                </p>
              </div>

              <div
                style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                className="p-3.5 theme-surface-subtle border theme-border flex flex-col justify-between space-y-2"
              >
                <div>
                  <label className="text-xs font-medium theme-text block">
                    Hidden Files &amp; Folders
                  </label>
                  <p className="text-[11px] theme-text-muted mt-1">
                    Include dotfiles (e.g. .hidden) during directory traversal.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold theme-text">
                  <input
                    type="checkbox"
                    checked={draft.includeHiddenFiles !== false}
                    onChange={(e) => setDraft({ ...draft, includeHiddenFiles: e.target.checked })}
                    className="w-4 h-4 rounded theme-border accent-cyan-500 cursor-pointer"
                  />
                  <span>Show hidden files (Default: On)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Slideshow & Video Timers */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold theme-text-secondary uppercase tracking-wider flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: `rgb(${currentTheme.palette.accentRgb})` }}
              />
              Slide &amp; Video Durations
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                className="p-3.5 theme-surface-subtle border theme-border space-y-2"
              >
                <label className="text-xs font-medium theme-text block">
                  Default Slide Duration (Seconds)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    step="0.5"
                    value={draft.slideDurationSec}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        slideDurationSec: Math.max(0.5, parseFloat(e.target.value) || 3),
                      })
                    }
                    className="w-full px-3 py-1.5 theme-input text-sm font-mono"
                  />
                  <span className="text-xs theme-text-muted shrink-0">sec</span>
                </div>
                <p className="text-[11px] theme-text-muted">Default: 3.0 seconds (for photos)</p>
              </div>

              <div
                style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                className="p-3.5 theme-surface-subtle border theme-border space-y-2"
              >
                <label className="text-xs font-medium theme-text block">
                  Max Video Playback Cap
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    max="600"
                    step="5"
                    value={draft.videoMaxDurationSec}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        videoMaxDurationSec: Math.max(5, parseInt(e.target.value) || 30),
                      })
                    }
                    className="w-full px-3 py-1.5 theme-input text-sm font-mono"
                  />
                  <span className="text-xs theme-text-muted shrink-0">sec</span>
                </div>
                <p className="text-[11px] theme-text-muted">
                  Default: 30 seconds before auto-advancing
                </p>
              </div>
            </div>

            {/* Slideshow Controls Mode Option (Pinned vs Auto-Hide) */}
            <div
              style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
              className="p-3.5 theme-surface-subtle border theme-border space-y-2"
            >
              <div>
                <label className="text-xs font-medium theme-text block">
                  Default Slideshow Controls Mode
                </label>
                <p className="text-[11px] theme-text-muted mt-0.5">
                  Choose whether top and bottom toolbars remain always visible or auto-hide when
                  resting the mouse.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, slideshowControlsMode: 'pinned' })}
                  style={getOptionCardStyle(draft.slideshowControlsMode !== 'autohide')}
                  className="p-2.5 border theme-border theme-surface text-left transition-all"
                >
                  <span className="font-semibold theme-text block">Always Visible (Pinned)</span>
                  <span className="text-[10px] theme-text-muted">
                    Toolbars never fade out (Default)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, slideshowControlsMode: 'autohide' })}
                  style={getOptionCardStyle(draft.slideshowControlsMode === 'autohide')}
                  className="p-2.5 border theme-border theme-surface text-left transition-all"
                >
                  <span className="font-semibold theme-text block">Auto-Hide Mode</span>
                  <span className="text-[10px] theme-text-muted">
                    Fades out after 2.5s of mouse rest
                  </span>
                </button>
              </div>
            </div>

            {/* Mouse Wheel Zoom Option */}
            <div
              style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
              className="p-3.5 theme-surface-subtle border theme-border flex items-center justify-between"
            >
              <div>
                <label className="text-xs font-medium theme-text block">
                  Mouse Wheel Zoom in Slideshow
                </label>
                <p className="text-[11px] theme-text-muted mt-0.5">
                  Scroll mouse wheel in slideshow to zoom in/out with cursor centering (auto-pauses
                  on first zoom).
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold theme-text shrink-0 ml-4">
                <input
                  type="checkbox"
                  checked={draft.wheelZoomEnabled !== false}
                  onChange={(e) => setDraft({ ...draft, wheelZoomEnabled: e.target.checked })}
                  className="w-4 h-4 rounded theme-border accent-cyan-500 cursor-pointer"
                />
                <span>Enabled (Default: On)</span>
              </label>
            </div>
          </div>

          {/* Gallery Size Thresholds */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold theme-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 theme-accent" />
              Gallery File-Size Guardrails
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                className="p-3.5 theme-surface-subtle border theme-border space-y-2"
              >
                <label className="text-xs font-medium theme-text block">
                  Image Size Threshold (MB)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={draft.imageSizeLimitMB}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        imageSizeLimitMB: Math.max(1, parseInt(e.target.value) || 5),
                      })
                    }
                    className="w-full px-3 py-1.5 theme-input text-sm font-mono"
                  />
                  <span className="text-xs theme-text-muted shrink-0">MB</span>
                </div>
                <p className="text-[11px] theme-text-muted">
                  Default: 5 MB (larger images load on click)
                </p>
              </div>

              <div
                style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                className="p-3.5 theme-surface-subtle border theme-border space-y-2"
              >
                <label className="text-xs font-medium theme-text block">
                  Video Size Threshold (MB)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="10"
                    max="2000"
                    step="10"
                    value={draft.videoSizeLimitMB}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        videoSizeLimitMB: Math.max(10, parseInt(e.target.value) || 100),
                      })
                    }
                    className="w-full px-3 py-1.5 theme-input text-sm font-mono"
                  />
                  <span className="text-xs theme-text-muted shrink-0">MB</span>
                </div>
                <p className="text-[11px] theme-text-muted">Default: 100 MB</p>
              </div>
            </div>
          </div>

          {/* Performance & Pagination & Default Suffix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
              className="p-3.5 theme-surface-subtle border theme-border space-y-2"
            >
              <label className="text-xs font-medium theme-text block">
                Gallery Page Chunk Size
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="50"
                  max="5000"
                  step="50"
                  value={draft.itemsPerPage}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      itemsPerPage: Math.max(50, parseInt(e.target.value) || 1000),
                    })
                  }
                  className="w-full px-3 py-1.5 theme-input text-sm font-mono"
                />
                <span className="text-xs theme-text-muted shrink-0">items</span>
              </div>
              <p className="text-[11px] theme-text-muted">Default: 1000 items per page</p>
            </div>

            <div
              style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
              className="p-3.5 theme-surface-subtle border theme-border space-y-2"
            >
              <label className="text-xs font-medium theme-text block">
                Default Export Folder Suffix
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={draft.exportSuffix || '_selected'}
                  onChange={(e) => setDraft({ ...draft, exportSuffix: e.target.value })}
                  className="w-full px-3 py-1.5 theme-input text-sm font-mono"
                  placeholder="_selected"
                />
              </div>
              <p className="text-[11px] theme-text-muted">Default: _selected</p>
            </div>
          </div>

          {/* Theme Mode Selector (Dark / Light / System) */}
          <div
            style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
            className="p-4 theme-surface-subtle border theme-border space-y-3"
          >
            <label className="text-xs font-semibold theme-text flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sun className="w-4 h-4 theme-accent" />
                Color Appearance Mode (حالت تاریک / روشن)
              </span>
              <span className="text-[10px] theme-text-muted capitalize font-mono">
                Active: {draft.themeMode}
              </span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'dark', label: 'Dark Mode', labelFa: 'حالت تاریک', icon: Moon },
                { id: 'light', label: 'Light Mode', labelFa: 'حالت روشن', icon: Sun },
                { id: 'system', label: 'System (OS)', labelFa: 'سیستم‌عامل', icon: Monitor },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = draft.themeMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() =>
                      setDraft({ ...draft, themeMode: m.id as AppSettings['themeMode'] })
                    }
                    style={getOptionCardStyle(isSelected)}
                    className="flex flex-col items-center justify-center p-3 border theme-border theme-surface text-center transition-all"
                  >
                    <Icon
                      className={`w-4 h-4 mb-1.5 ${
                        isSelected ? 'theme-accent' : 'theme-text-muted'
                      }`}
                    />
                    <span className="text-xs font-semibold theme-text">{m.label}</span>
                    <span className="text-[10px] theme-text-muted mt-0.5">{m.labelFa}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Studio Visual Themes Selection */}
          <div
            style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
            className="p-4 theme-surface-subtle border theme-border space-y-3"
          >
            <label className="text-xs font-semibold theme-text flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Palette className="w-4 h-4 theme-accent" />
                Studio Optical Theme (پوسته و سیستم نوری برنامه)
              </span>
              <span className="text-[10px] theme-text-muted font-mono">
                {THEME_LIST.length} Curated Systems
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {THEME_LIST.map((theme) => {
                const isSelected =
                  (draft.activeThemeId || 'theme-1-obsidian-culler') === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      setDraft({
                        ...draft,
                        activeThemeId: theme.id,
                      });
                    }}
                    style={getOptionCardStyle(isSelected)}
                    className="flex flex-col text-left p-3.5 border theme-border theme-surface transition-all"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/30 shadow-sm shrink-0"
                          style={{ backgroundColor: `rgb(${theme.palette.accentRgb})` }}
                        />
                        <span className="text-xs font-bold theme-text">{theme.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 theme-accent" />}
                    </div>
                    <span className="text-[11px] font-semibold theme-text-secondary mt-1.5">
                      {theme.nameFa}
                    </span>
                    <p className="text-[10px] theme-text-muted mt-1 line-clamp-2">
                      {theme.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Neon Accent Selection */}
          <div
            style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
            className="p-4 theme-surface-subtle border theme-border space-y-3"
          >
            <label className="text-xs font-semibold theme-text flex items-center gap-2">
              <Sparkles className="w-4 h-4 theme-accent" />
              Secondary Status Badge Accent
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDraft({ ...draft, neonAccent: 'orange' })}
                style={getOptionCardStyle(draft.neonAccent === 'orange')}
                className="flex items-center justify-center gap-2.5 p-3 border theme-border theme-surface text-xs font-medium theme-text transition-all"
              >
                <span className="w-3.5 h-3.5 rounded-full bg-orange-500 shadow-md shadow-orange-500/50" />
                <span>Vibrant Neon Orange</span>
              </button>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, neonAccent: 'green' })}
                style={getOptionCardStyle(draft.neonAccent === 'green')}
                className="flex items-center justify-center gap-2.5 p-3 border theme-border theme-surface text-xs font-medium theme-text transition-all"
              >
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50" />
                <span>Cyber Emerald Green</span>
              </button>
            </div>
          </div>

          {/* Clipboard Copy Format */}
          <div
            style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
            className="p-4 theme-surface-subtle border theme-border space-y-3"
          >
            <label className="text-xs font-semibold theme-text flex items-center gap-2">
              <Clipboard className="w-4 h-4 theme-accent" />
              Clipboard Copy Format (Cmd + C / Ctrl + C)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { id: 'newline', label: 'One path per line (Default)' },
                { id: 'comma', label: 'Comma-separated list (, )' },
                { id: 'filenames_only', label: 'File names only (without folder path)' },
                { id: 'json', label: 'Structured JSON Array' },
              ].map((fmt) => {
                const isSelected = draft.clipboardFormat === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        clipboardFormat: fmt.id as AppSettings['clipboardFormat'],
                      })
                    }
                    style={getOptionCardStyle(isSelected)}
                    className="p-2.5 text-left border theme-border theme-surface theme-text transition-all"
                  >
                    {fmt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t theme-border theme-surface-subtle">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium theme-btn theme-surface border theme-border theme-text-secondary hover:theme-text"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium theme-btn theme-surface border theme-border theme-text-secondary hover:theme-text"
            >
              Cancel (Esc)
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold theme-btn-accent"
            >
              <Check className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}