'use client';

import React, { useState, useEffect } from 'react';
import { TrashRecord } from '@/lib/types';
import { loadSettings } from '@/lib/storage';
import { getTheme } from '@/lib/themes';
import { X, Trash2, Undo2, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  trashRecords: TrashRecord[];
  onRestore: (record: TrashRecord) => void;
  onPermanentDelete: (recordId: string) => void;
  neonAccent: 'orange' | 'green';
}

export function TrashModal({
  isOpen,
  onClose,
  trashRecords,
  onRestore,
  onPermanentDelete,
}: TrashModalProps) {
  const [currentTime] = useState(() => Date.now());

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

  const calculateDaysLeft = (expiresAt: number) => {
    const diffMs = expiresAt - currentTime;
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  };

  const formatDate = (ms: number) => {
    return new Date(ms).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold theme-heading theme-text">
                Safety Trash Bin (30-Day Retention)
              </h2>
              <p className="text-[11px] theme-text-secondary">
                Deleted folders and their culled selections are safely retained for 30 days and
                permanently pruned on day 31.
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

        {/* List */}
        <div className="p-6 overflow-y-auto space-y-3 text-left">
          {trashRecords.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl theme-surface-subtle border theme-border flex items-center justify-center mx-auto theme-accent">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold theme-heading theme-text">Trash Bin is Empty</p>
              <p className="text-xs theme-text-secondary max-w-sm mx-auto">
                No folders or projects currently in the trash bin. Everything is safe!
              </p>
            </div>
          ) : (
            trashRecords.map((record) => {
              const daysLeft = calculateDaysLeft(record.expiresAt);
              return (
                <div
                  key={record.id}
                  style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                  className={`p-4 theme-surface-subtle border theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:theme-surface ${rimClass}`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-bold theme-heading theme-text">
                        {record.projectName}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold theme-surface border theme-border theme-text-secondary">
                        {record.itemCount} media
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs theme-text-muted flex-wrap">
                      <span suppressHydrationWarning>Deleted: {formatDate(record.deletedAt)}</span>
                      <span className="opacity-30">•</span>
                      <span className="flex items-center gap-1 text-amber-500 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        {daysLeft} days until permanent purge
                      </span>
                    </div>
                  </div>

                  {}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onRestore(record)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold theme-btn-accent"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Restore Folder</span>
                    </button>
                    <button
                      onClick={() => onPermanentDelete(record.id)}
                      className="px-3 py-1.5 theme-btn theme-surface border theme-border text-xs font-medium text-rose-500 hover:!bg-rose-500/15 hover:!border-rose-500/40 transition-all"
                      title="Permanently remove now"
                    >
                      Delete Now
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t theme-border theme-surface-subtle flex items-center justify-between gap-4 text-xs theme-text-secondary">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              Re-adding this folder will automatically recognize and restore previous session data.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold theme-btn theme-surface border theme-border theme-text shrink-0"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}