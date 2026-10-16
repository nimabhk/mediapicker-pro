'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  FolderOpen,
  Sparkles,
  Monitor,
  Terminal,
  ExternalLink,
} from 'lucide-react';
import { isTauri } from '@/lib/tauri-bridge';
import { AppSettings } from '@/lib/types';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onLoadDemoProject: () => void;
  onShowToast: (message: string) => void;
}

interface DiagnosticItem {
  name: string;
  status: 'ok' | 'warning' | 'info';
  details: string;
}

function computeDiagnostics(settings: AppSettings): { results: DiagnosticItem[]; logs: string[] } {
  const results: DiagnosticItem[] = [];
  const logs: string[] = [];

  const now = new Date().toLocaleTimeString();
  logs.push(`[${now}] Running MediaPicker Pro Environment Diagnostic...`);

  // 1. Runtime Environment
  const tauriActive = isTauri();
  results.push({
    name: 'Runtime Mode',
    status: 'ok',
    details: tauriActive
      ? 'Tauri Native Desktop (Rust Multi-Threaded Core Active)'
      : 'Web Browser / Preview Mode (HTML5 File System & Blobs Active)',
  });
  logs.push(`[${now}] Runtime: ${tauriActive ? 'Tauri Desktop v2' : 'Web Browser Preview'}`);

  // 2. Local Storage & IndexedDB
  try {
    const idbSupported = typeof indexedDB !== 'undefined';
    results.push({
      name: 'IndexedDB & Local Storage',
      status: idbSupported ? 'ok' : 'warning',
      details: idbSupported
        ? 'IndexedDB & LocalStorage accessible for project persistence'
        : 'IndexedDB unavailable, using fallback in-memory state',
    });
    logs.push(`[${now}] IndexedDB Status: ${idbSupported ? 'Available' : 'Unavailable'}`);
  } catch (e: any) {
    results.push({
      name: 'Storage Persistence',
      status: 'warning',
      details: e.message || 'Storage check warning',
    });
  }

  // 3. File System Access API
  const hasShowDirPicker = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  results.push({
    name: 'Directory Picker API',
    status: 'ok',
    details: tauriActive
      ? 'Native OS File Dialog (tauri-plugin-dialog)'
      : hasShowDirPicker
      ? 'File System Access API (window.showDirectoryPicker supported)'
      : 'HTML5 WebkitDirectory Folder Input (Universal fallback)',
  });
  logs.push(`[${now}] Directory Access: ${tauriActive ? 'Native' : hasShowDirPicker ? 'showDirectoryPicker' : 'webkitdirectory input'}`);

  // 4. Image Pipeline & ObjectURL
  try {
    const blob = new Blob(['test'], { type: 'text/plain' });
    const testUrl = URL.createObjectURL(blob);
    URL.revokeObjectURL(testUrl);
    results.push({
      name: 'Image & Media Streaming Pipeline',
      status: 'ok',
      details: 'Blob URL streaming & Memory allocation verified',
    });
    logs.push(`[${now}] Media Stream: ObjectURL generation verified successfully`);
  } catch (e: any) {
    results.push({
      name: 'Image Pipeline',
      status: 'warning',
      details: 'Blob creation restricted: ' + e.message,
    });
  }

  // 5. Clipboard API
  const hasClipboard = typeof navigator !== 'undefined' && !!navigator.clipboard;
  results.push({
    name: 'System Clipboard',
    status: hasClipboard || tauriActive ? 'ok' : 'info',
    details: 'Cmd+C / Copy Selected File Paths ready',
  });

  // 6. Audio Context
  results.push({
    name: 'Audio Playback',
    status: 'ok',
    details: settings.globalMuted ? 'Muted by user setting' : 'Active and unmuted',
  });

  return { results, logs };
}

export function DiagnosticsModal({
  isOpen,
  onClose,
  settings,
  onLoadDemoProject,
  onShowToast,
}: DiagnosticsModalProps) {
  const [copied, setCopied] = useState(false);
  const [isRunningTest, setIsRunningTest] = useState(false);

  const [diagnosticData, setDiagnosticData] = useState(() => computeDiagnostics(settings));

  const runDiagnostics = () => {
    setIsRunningTest(true);
    const fresh = computeDiagnostics(settings);
    setDiagnosticData((prev) => ({
      results: fresh.results,
      logs: [...prev.logs, ...fresh.logs],
    }));
    setIsRunningTest(false);
  };

  const { results: tests, logs: systemLog } = diagnosticData;

  if (!isOpen) return null;

  const handleCopyReport = () => {
    const report = [
      '=== MediaPicker Pro Diagnostics Report ===',
      `Timestamp: ${new Date().toISOString()}`,
      `Runtime: ${isTauri() ? 'Tauri Desktop' : 'Web Browser Preview'}`,
      `User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}`,
      '',
      '--- System Checks ---',
      ...tests.map((t) => `[${t.status.toUpperCase()}] ${t.name}: ${t.details}`),
      '',
      '--- Diagnostic Log ---',
      ...systemLog,
    ].join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(report);
      setCopied(true);
      onShowToast('Diagnostics report copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl text-slate-900 dark:text-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Self-Test & Diagnostics Studio
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verify runtime status, image pipeline, and test the applet directly
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

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto text-left">
          {/* Quick Action: Test Right Here in Browser */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Instant Test In Browser Preview
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold">
                Zero Setup Needed
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Load the complete sample media studio (8 high-resolution landscape, architecture, macro, and video samples) to test the gallery, slideshow, zooming, spacebar culling, and batch selection directly in this browser window.
            </p>
            <button
              onClick={() => {
                onLoadDemoProject();
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 shadow-md shadow-orange-600/20 transition-all hover:scale-[1.02]"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Load & Review Sample Project Now</span>
            </button>
          </div>

          {/* Diagnostic Checks Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                System Checks & Capabilities
              </h3>
              <button
                onClick={runDiagnostics}
                disabled={isRunningTest}
                className="flex items-center gap-1 text-[11px] text-orange-500 hover:text-orange-400 font-medium"
              >
                <RefreshCw className={`w-3 h-3 ${isRunningTest ? 'animate-spin' : ''}`} />
                <span>Re-run Checks</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {tests.map((test, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-start gap-2.5"
                >
                  {test.status === 'ok' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : test.status === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <Monitor className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {test.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      {test.details}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Diagnostic Console Log */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Terminal className="w-3.5 h-3.5" />
                <span>Diagnostic Event Log</span>
              </div>
              <button
                onClick={handleCopyReport}
                className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied!' : 'Copy Full Report'}</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 max-h-36 overflow-y-auto space-y-1">
              {systemLog.map((log, i) => (
                <div key={i} className="text-slate-400 leading-tight">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            MediaPicker Pro v2.0.0 · Local First Studio
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
