'use client';

import React, { useEffect } from 'react';
import { loadSettings } from '@/lib/storage';
import { getTheme } from '@/lib/themes';
import { X, Keyboard, Mouse, Monitor, Sparkles } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  neonAccent: 'orange' | 'green';
}

export function ShortcutsModal({
  isOpen,
  onClose,
}: ShortcutsModalProps) {
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

  const activeThemeId =
    typeof document !== 'undefined'
      ? document.documentElement.getAttribute('data-theme') || loadSettings().activeThemeId
      : 'theme-1-obsidian-culler';

  const isDarkMode =
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : true;

  const currentTheme = getTheme(activeThemeId, isDarkMode);
  const isLiquidGlass = currentTheme.id === 'theme-3-liquid-glass';
  const isCupertino = currentTheme.id === 'theme-2-cupertino-frosted-pro';
  const rimClass = isLiquidGlass
    ? 'liquid-specular-rim'
    : isCupertino
    ? 'cupertino-vibrancy-rim'
    : '';

  const kbdClass =
    'px-2 py-0.5 rounded theme-surface border theme-border font-mono text-[11px] font-bold theme-text shadow-sm';

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 theme-modal-backdrop animate-in fade-in duration-200"
    >
      <div
        className={`relative w-full max-w-2xl theme-modal-window overflow-hidden flex flex-col max-h-[85vh] transition-all duration-200 ${rimClass}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b theme-border theme-surface-subtle">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl theme-surface border theme-border theme-accent">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold theme-heading theme-text">
                Keyboard &amp; Mouse Shortcuts Cheatsheet
              </h2>
              <p className="text-[11px] theme-text-secondary">
                Quick reference guide for high-speed local culling and navigation
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

        {}
        <div className="p-6 overflow-y-auto space-y-6 text-left">
          {/* Slideshow Shortcuts */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold theme-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Monitor className="w-3.5 h-3.5 theme-accent" />
              Slideshow Review Shortcuts
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div
                style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                className="p-3 theme-surface-subtle border theme-border flex items-center justify-between gap-2"
              >
                <span className="theme-text font-medium">Select / Cull Slide</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <kbd className={kbdClass}>Space</kbd>
                  <span className="theme-text-muted">or</span>
                  <span className="text-[11px] theme-text-secondary flex items-center gap-1">
                    <Mouse className="w-3 h-3 theme-accent" /> Click
                  </span>
                </div>
              </div>

              <div
                style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                className="p-3 theme-surface-subtle border theme-border flex items-center justify-between gap-2"
              >
                <span className="theme-text font-medium">Next Slide</span>
                <kbd className={kbdClass}>&rarr; Right</kbd>
              </div>

              <div
                style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                className="p-3 theme-surface-subtle border theme-border flex items-center justify-between gap-2"
              >
                <span className="theme-text font-medium">Previous Slide</span>
                <kbd className={kbdClass}>&larr; Left</kbd>
              </div>

              <div
                style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                className="p-3 theme-surface-subtle border theme-border flex items-center justify-between gap-2"
              >
                <span className="theme-text font-medium">Play / Pause Slideshow</span>
                <div className="flex items-center gap-1 shrink-0">
                  <kbd className={kbdClass}>Enter</kbd>
                  <span className="theme-text-muted">or</span>
                  <kbd className={kbdClass}>P</kbd>
                </div>
              </div>

              {}
              <div
                style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                className="p-3 theme-surface-subtle border theme-border flex items-center justify-between gap-2"
              >
                <span className="theme-text font-medium">Play / Pause Video Slide</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <kbd className={kbdClass}>K</kbd>
                  <span className="theme-text-muted">or</span>
                  <span className="text-[11px] theme-text-secondary">Video Click</span>
                </div>
              </div>

              <div
                style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                className="p-3 theme-surface-subtle border theme-border flex items-center justify-between gap-2"
              >
                <span className="theme-text font-medium">Toggle Audio Mute</span>
                <kbd className={kbdClass}>M</kbd>
              </div>

              <div
                style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                className="p-3 theme-surface-subtle border theme-border flex items-center justify-between gap-2"
              >
                <span className="theme-text font-medium">Copy Selected Paths</span>
                <kbd className={kbdClass}>Cmd / Ctrl + C</kbd>
              </div>

              <div
                style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                className="p-3 theme-surface-subtle border theme-border flex items-center justify-between gap-2"
              >
                <span className="theme-text font-medium">Undo / Redo Selection</span>
                <div className="flex items-center gap-1 shrink-0">
                  <kbd className={kbdClass}>Cmd+Z</kbd>
                  <span className="theme-text-muted">/</span>
                  <kbd className={kbdClass}>Cmd+Shift+Z</kbd>
                </div>
              </div>

              <div
                style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                className="p-3 theme-surface-subtle border theme-border flex items-center justify-between gap-2"
              >
                <span className="theme-text font-medium">Toggle OS Fullscreen</span>
                <kbd className={kbdClass}>F</kbd>
              </div>

              <div
                style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                className="p-3 theme-surface-subtle border theme-border flex items-center justify-between gap-2"
              >
                <span className="theme-text font-medium">Zoom In / Out / Reset</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] theme-text-secondary flex items-center gap-0.5">
                    <Mouse className="w-3 h-3 theme-accent" /> Wheel
                  </span>
                  <span className="theme-text-muted">or</span>
                  <kbd className={kbdClass}>Cmd +/-</kbd>
                </div>
              </div>

              <div
                style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                className="p-3 theme-surface-subtle border theme-border flex items-center justify-between gap-2"
              >
                <span className="theme-text font-medium">Switch to Gallery View</span>
                <kbd className={kbdClass}>Backspace</kbd>
              </div>

              <div
                style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                className="p-3 theme-surface-subtle border theme-border flex items-center justify-between gap-2"
              >
                <span className="theme-text font-medium">Exit to Gallery / Menu</span>
                <kbd className={kbdClass}>Esc</kbd>
              </div>
            </div>
          </div>

          {}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold theme-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 theme-accent" />
              Gallery Grid Shortcuts
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div
                style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                className="p-3 theme-surface-subtle border theme-border flex items-center justify-between gap-2"
              >
                <span className="theme-text font-medium">Toggle Card Selection</span>
                <span className="text-[11px] theme-text-secondary flex items-center gap-1 shrink-0">
                  <Mouse className="w-3 h-3 theme-accent" /> Left-Click Card
                </span>
              </div>

              <div
                style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                className="p-3 theme-surface-subtle border theme-border flex items-center justify-between gap-2"
              >
                <span className="theme-text font-medium">Range Select / Deselect / Invert</span>
                <div className="flex items-center gap-1 text-[11px] theme-text-secondary shrink-0">
                  <kbd className={kbdClass}>Shift</kbd>
                  <span>/</span>
                  <kbd className={kbdClass}>Cmd</kbd>
                  <span>/</span>
                  <kbd className={kbdClass}>Cmd+Shift</kbd>
                </div>
              </div>

              <div
                style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                className="p-3 theme-surface-subtle border theme-border flex items-center justify-between gap-2"
              >
                <span className="theme-text font-medium">Quick Preview (100% Scale)</span>
                <span className="text-[11px] theme-accent font-semibold flex items-center gap-1 shrink-0">
                  Hold <kbd className={kbdClass}>Alt / Opt</kbd> + Hover
                </span>
              </div>

              <div
                style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                className="p-3 theme-surface-subtle border theme-border flex items-center justify-between gap-2"
              >
                <span className="theme-text font-medium">Marquee Box Selection</span>
                <span className="text-[11px] theme-text-secondary shrink-0">
                  Drag / Cmd+Drag / Cmd+Shift
                </span>
              </div>

              <div
                style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                className="p-3 theme-surface-subtle border theme-border flex items-center justify-between gap-2"
              >
                <span className="theme-text font-medium">Hover Video Preview</span>
                <span className="text-[11px] theme-text-secondary flex items-center gap-1 shrink-0">
                  <Mouse className="w-3 h-3 theme-accent" /> 400ms Hover
                </span>
              </div>

              <div
                style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                className="p-3 theme-surface-subtle border theme-border flex items-center justify-between gap-2"
              >
                <span className="theme-text font-medium">Page Up / Page Down</span>
                <div className="flex items-center gap-1 shrink-0">
                  <kbd className={kbdClass}>A (PgUp)</kbd>
                  <span className="theme-text-muted">/</span>
                  <kbd className={kbdClass}>Z (PgDn)</kbd>
                </div>
              </div>

              <div
                style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                className="p-3 theme-surface-subtle border theme-border flex items-center justify-between gap-2"
              >
                <span className="theme-text font-medium">Return to Dashboard</span>
                <div className="flex items-center gap-1 shrink-0">
                  <kbd className={kbdClass}>Backspace</kbd>
                  <span className="theme-text-muted">or</span>
                  <kbd className={kbdClass}>Esc</kbd>
                </div>
              </div>

              <div
                style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                className="p-3 theme-surface-subtle border theme-border flex items-center justify-between gap-2"
              >
                <span className="theme-text font-medium">Close Open Modal / Dialog</span>
                <kbd className={kbdClass}>Esc</kbd>
              </div>
            </div>
          </div>
        </div>

        {}
        <div className="px-6 py-4 border-t theme-border theme-surface-subtle flex items-center justify-between text-xs theme-text-secondary">
          <span>
            Press <kbd className={kbdClass}>?</kbd> on Dashboard to open this cheatsheet
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold theme-btn theme-surface border theme-border theme-text"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}