'use client';

import React, { useState, useEffect } from 'react';
import { X, FolderInput, ArrowRight, FolderOpen, Check } from 'lucide-react';

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
  neonAccent,
}: PathInputModalProps) {
  const [folderPath, setFolderPath] = useState<string>('');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderPath.trim()) return;
    onSubmitPath(folderPath.trim());
    onClose();
  };

  const isOrange = neonAccent === 'orange';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl text-slate-900 dark:text-slate-100 overflow-hidden flex flex-col transition-colors duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2">
            <FolderInput className={`w-5 h-5 ${isOrange ? 'text-orange-500' : 'text-emerald-500'}`} />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Enter Folder Path Manually</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Type or paste the directory path of your photo or video collection (e.g., <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-mono">/Users/username/Pictures/Shoot1</code> or <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-mono">D:\Photography\2026</code>):
          </p>

          <div className="space-y-1.5">
            <input
              type="text"
              autoFocus
              placeholder="/Users/username/Pictures/Portfolio..."
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              disabled={!folderPath.trim()}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition-all disabled:opacity-50 ${
                isOrange
                  ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
              }`}
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
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>Or Browse File Dialog (Native Picker)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
