'use client';

import React, { useEffect } from 'react';
import { X, Keyboard, Mouse, Monitor, Sparkles } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  neonAccent: 'orange' | 'green';
}

export function ShortcutsModal({
  isOpen,
  onClose,
  neonAccent,
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

  const isOrange = neonAccent === 'orange';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl text-slate-900 dark:text-slate-100 overflow-hidden flex flex-col max-h-[85vh] transition-colors duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <Keyboard className={`w-5 h-5 ${isOrange ? 'text-orange-500' : 'text-emerald-500'}`} />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Keyboard &amp; Mouse Shortcuts Cheatsheet</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Quick reference guide for high-speed local culling and navigation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-left">
          {/* Slideshow Shortcuts */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Monitor className="w-3.5 h-3.5 text-orange-500" />
              Slideshow Review Shortcuts
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Select / Cull Slide</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px] font-bold">Space</kbd>
                  <span className="text-slate-400">or</span>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1"><Mouse className="w-3 h-3" /> Click</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Next Slide</span>
                <kbd className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px] font-bold">&rarr; Right</kbd>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Previous Slide</span>
                <kbd className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px] font-bold">&larr; Left</kbd>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Play / Pause Slideshow</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px] font-bold">Enter</kbd>
                  <span className="text-slate-400">or</span>
                  <kbd className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px] font-bold">P</kbd>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Toggle Audio Mute</span>
                <kbd className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px] font-bold">M</kbd>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Copy Selected Paths</span>
                <kbd className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px] font-bold">Cmd / Ctrl + C</kbd>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Undo Selection</span>
                <kbd className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px] font-bold">Cmd / Ctrl + Z</kbd>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Toggle OS Fullscreen</span>
                <kbd className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px] font-bold">F</kbd>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Zoom In / Out / Reset</span>
                <div className="flex gap-1 items-center">
                  <span className="text-[11px] text-slate-500 flex items-center gap-0.5"><Mouse className="w-3 h-3" /> Wheel</span>
                  <span className="text-slate-400">or</span>
                  <kbd className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px] font-bold">Cmd +/-</kbd>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Switch to Gallery View</span>
                <kbd className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px] font-bold">Backspace</kbd>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Exit to Dashboard</span>
                <kbd className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px] font-bold">Esc</kbd>
              </div>
            </div>
          </div>

          {/* Gallery View Shortcuts */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              Gallery Grid Shortcuts
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Toggle Card Selection</span>
                <span className="text-[11px] text-slate-500 flex items-center gap-1"><Mouse className="w-3 h-3" /> Left-Click Card</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Range Select (Start to End)</span>
                <span className="text-[11px] text-slate-500 flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px] font-bold">Shift</kbd> + Click</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Marquee Box Select</span>
                <span className="text-[11px] text-slate-500">Drag mouse across cards</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Marquee Deselect / Invert</span>
                <span className="text-[11px] text-slate-500">Ctrl + Drag / Ctrl+Shift + Drag</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Hover Video Preview</span>
                <span className="text-[11px] text-slate-500 flex items-center gap-1"><Mouse className="w-3 h-3" /> Mouse Hover</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Return to Dashboard</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px] font-bold">Backspace</kbd>
                  <span className="text-slate-400">or</span>
                  <kbd className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px] font-bold">Esc</kbd>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Close Open Modal / Dialog</span>
                <kbd className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px] font-bold">Esc</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-between text-xs text-slate-500">
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">?</kbd> anywhere to open this cheatsheet</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}
