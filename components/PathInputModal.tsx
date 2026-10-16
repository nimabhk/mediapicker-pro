'use client';

import React, { useState, useEffect } from 'react';
import { loadSettings } from '@/lib/storage';
import { getTheme } from '@/lib/themes';
import { X, FolderInput, ArrowRight, FolderOpen } from 'lucide-react';

interface PathInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitPath: (path: string) => void;
  onBrowseNative: () => void;
  neonAccent: 'orange' | 'green';
}

export function PathInputModal({
  isOpen,
  onClose,
  onSubmitPath,
  onBrowseNative,
}: PathInputModalProps) {
  const [folderPath, setFolderPath] = useState<string>('');

  // Close modal when Escape key is pressed
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderPath.trim()) return;
    onSubmitPath(folderPath.trim());
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 theme-modal-backdrop animate-in fade-in duration-200"
    >
      <div
        className={`relative w-full max-w-md theme-modal-window overflow-hidden flex flex-col transition-all duration-200 ${rimClass}`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b theme-border theme-surface-subtle">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl theme-surface border theme-border theme-accent">
              <FolderInput className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold theme-heading theme-text">
                Enter Folder Path Manually
              </h2>
              <p className="text-[11px] theme-text-secondary">
                Direct local directory path ingestion
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
          <p className="text-xs theme-text-secondary leading-relaxed">
            Type or paste the directory path of your photo or video collection (e.g.,{' '}
            <code className="px-1.5 py-0.5 rounded theme-surface border theme-border text-[11px] font-mono theme-accent">
              /Users/username/Pictures/Shoot1
            </code>{' '}
            or{' '}
            <code className="px-1.5 py-0.5 rounded theme-surface border theme-border text-[11px] font-mono theme-accent">
              D:\Photography\2026
            </code>
            ):
          </p>

          <div className="space-y-1.5">
            <input
              type="text"
              autoFocus
              placeholder="/Users/username/Pictures/Portfolio..."
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              className="w-full px-3.5 py-2.5 theme-input text-sm font-mono placeholder:opacity-60"
            />
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              type="submit"
              disabled={!folderPath.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 font-bold text-xs theme-btn-accent disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Add / Open Folder</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onBrowseNative();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold theme-btn theme-surface border theme-border theme-text-secondary hover:theme-text"
            >
              <FolderOpen className="w-3.5 h-3.5 theme-accent" />
              <span>Or Browse File Dialog (Native Picker)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}