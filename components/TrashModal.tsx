'use client';

import React from 'react';
import { TrashRecord } from '@/lib/types';
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
  neonAccent,
}: TrashModalProps) {
  const [currentTime] = React.useState(() => Date.now());

  React.useEffect(() => {
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

  const calculateDaysLeft = (expiresAt: number) => {
    const diffMs = expiresAt - currentTime;
    const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    return days;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl text-slate-900 dark:text-slate-100 overflow-hidden flex flex-col max-h-[85vh] transition-colors duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Safety Trash Bin (30-Day Retention)</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Deleted folders and their culled selections are safely retained for 30 days and permanently pruned on day 31.
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

        {/* List */}
        <div className="p-6 overflow-y-auto space-y-3 text-left">
          {trashRecords.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Trash Bin is Empty</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No folders or projects currently in the trash bin. Everything is safe!
              </p>
            </div>
          ) : (
            trashRecords.map((record) => {
              const daysLeft = calculateDaysLeft(record.expiresAt);
              return (
                <div
                  key={record.id}
                  className="p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{record.projectName}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {record.itemCount} media
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>Deleted: {formatDate(record.deletedAt)}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        {daysLeft} days until permanent purge
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onRestore(record)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all shadow-sm ${
                        neonAccent === 'orange'
                          ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/30'
                          : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                      }`}
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Restore Folder</span>
                    </button>
                    <button
                      onClick={() => onPermanentDelete(record.id)}
                      className="px-2.5 py-1.5 rounded-lg text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 transition-colors"
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
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span>Re-adding this folder will automatically recognize and restore previous session data.</span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
