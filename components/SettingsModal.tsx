'use client';

import React, { useEffect } from 'react';
import { AppSettings } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/storage';
import { X, RotateCcw, Check, Sliders, Sparkles, Clipboard, ShieldAlert, Eye, FolderPlus } from 'lucide-react';

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

  const handleReset = () => {
    setDraft(DEFAULT_SETTINGS);
  };

  const handleSave = () => {
    onSaveSettings(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl text-slate-900 dark:text-slate-100 overflow-hidden flex flex-col max-h-[90vh] transition-colors duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-orange-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Studio Parameters & Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto text-left">
          {/* Scanning & File Limits Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-orange-500" />
              Folder Scanning Limits & Hidden Files
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-200 block">
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
                      setDraft({ ...draft, maxScanFilesLimit: Math.max(1000, parseInt(e.target.value) || 50000) })
                    }
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-xs text-slate-400 shrink-0">files</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Default: 50,000 files (stops scan &amp; warns if exceeded to preserve memory)
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl flex flex-col justify-between space-y-2">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-200 block">
                    Hidden Files &amp; Folders
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Include dotfiles (e.g. .hidden) during directory traversal.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={draft.includeHiddenFiles !== false}
                    onChange={(e) => setDraft({ ...draft, includeHiddenFiles: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Show hidden files (Default: On)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Slideshow & Video Timers */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              Slide &amp; Video Durations
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-200 block">
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
                      setDraft({ ...draft, slideDurationSec: Math.max(0.5, parseFloat(e.target.value) || 3) })
                    }
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-xs text-slate-400 shrink-0">sec</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Default: 3.0 seconds (for photos)</p>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-200 block">
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
                      setDraft({ ...draft, videoMaxDurationSec: Math.max(5, parseInt(e.target.value) || 30) })
                    }
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-xs text-slate-400 shrink-0">sec</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Default: 30 seconds before auto-advancing</p>
              </div>
            </div>

            {/* Mouse Wheel Zoom Option */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl flex items-center justify-between">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-200 block">
                  Mouse Wheel Zoom in Slideshow
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Scroll mouse wheel in slideshow to zoom in/out with cursor centering (auto-pauses on first zoom).
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200 shrink-0 ml-4">
                <input
                  type="checkbox"
                  checked={draft.wheelZoomEnabled !== false}
                  onChange={(e) => setDraft({ ...draft, wheelZoomEnabled: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-0 cursor-pointer"
                />
                <span>Enabled (Default: On)</span>
              </label>
            </div>
          </div>

          {/* Gallery Size Thresholds */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-orange-500" />
              Gallery File-Size Guardrails
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-200 block">
                  Image Size Threshold (MB)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={draft.imageSizeLimitMB}
                    onChange={(e) =>
                      setDraft({ ...draft, imageSizeLimitMB: Math.max(1, parseInt(e.target.value) || 5) })
                    }
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-xs text-slate-400 shrink-0">MB</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Default: 5 MB (larger images load on click)</p>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-200 block">
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
                      setDraft({ ...draft, videoSizeLimitMB: Math.max(10, parseInt(e.target.value) || 100) })
                    }
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-xs text-slate-400 shrink-0">MB</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Default: 100 MB</p>
              </div>
            </div>
          </div>

          {/* Performance & Pagination & Default Suffix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-200 block">
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
                    setDraft({ ...draft, itemsPerPage: Math.max(50, parseInt(e.target.value) || 1000) })
                  }
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
                <span className="text-xs text-slate-400 shrink-0">items</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Default: 1000 items per page</p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-200 block">
                Default Export Folder Suffix
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={draft.exportSuffix || '_selected'}
                  onChange={(e) => setDraft({ ...draft, exportSuffix: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                  placeholder="_selected"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Default: _selected</p>
            </div>
          </div>

          {/* Neon Accent Selection */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-3">
            <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-500" />
              Selection Magic Glow Accent
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDraft({ ...draft, neonAccent: 'orange' })}
                className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                  draft.neonAccent === 'orange'
                    ? 'border-orange-500 bg-orange-500/15 text-orange-600 dark:text-orange-300 ring-2 ring-orange-500/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-orange-500 shadow-md shadow-orange-500/50"></span>
                <span>Vibrant Neon Orange</span>
              </button>

              <button
                type="button"
                onClick={() => setDraft({ ...draft, neonAccent: 'green' })}
                className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                  draft.neonAccent === 'green'
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 ring-2 ring-emerald-500/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50"></span>
                <span>Cyber Emerald Green</span>
              </button>
            </div>
          </div>

          {/* Clipboard Copy Format */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-3">
            <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Clipboard className="w-4 h-4 text-orange-500" />
              Clipboard Copy Format (Cmd + C / Ctrl + C)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { id: 'newline', label: 'One path per line (Default)' },
                { id: 'comma', label: 'Comma-separated list (, )' },
                { id: 'filenames_only', label: 'File names only (without folder path)' },
                { id: 'json', label: 'Structured JSON Array' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() =>
                    setDraft({ ...draft, clipboardFormat: fmt.id as AppSettings['clipboardFormat'] })
                  }
                  className={`p-2.5 text-left rounded-lg border transition-all ${
                    draft.clipboardFormat === fmt.id
                      ? 'border-orange-500/60 bg-orange-500/10 text-orange-600 dark:text-orange-300 font-medium'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel (Esc)
            </button>
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white shadow-md transition-colors ${
                draft.neonAccent === 'orange'
                  ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
              }`}
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
