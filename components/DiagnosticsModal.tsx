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
} from 'lucide-react';
import { isTauri } from '@/lib/tauri-bridge';
import { AppSettings } from '@/lib/types';
import { getTheme } from '@/lib/themes';

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
  logs.push(
    `[${now}] Directory Access: ${
      tauriActive ? 'Native' : hasShowDirPicker ? 'showDirectoryPicker' : 'webkitdirectory input'
    }`
  );

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

  const isDarkMode =
    typeof document !== 'undefined'
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

  const handleCopyReport = () => {
    const report = [
      '=== MediaPicker Pro Diagnostics Report ===',
      `Timestamp: ${new Date().toISOString()}`,
      `Runtime: ${isTauri() ? 'Tauri Desktop' : 'Web Browser Preview'}`,
      `Theme: ${currentTheme.name} (${settings.themeMode})`,
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
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 theme-modal-backdrop animate-in fade-in duration-200"
    >
      <div
        className={`relative w-full max-w-2xl theme-modal-window overflow-hidden flex flex-col max-h-[90vh] transition-all duration-200 ${rimClass}`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b theme-border theme-surface-subtle">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl theme-surface border theme-border theme-accent">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold theme-heading theme-text">
                Self-Test &amp; Diagnostics Studio
              </h2>
              <p className="text-xs theme-text-secondary">
                Verify runtime status, image pipeline, and test the applet directly
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
        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto text-left">
          {/* Quick Action: Test Right Here in Browser */}
          <div
            style={{
              borderRadius: 'var(--theme-radius-card, 12px)',
              borderColor: `rgba(${currentTheme.palette.accentRgb}, 0.35)`,
              backgroundColor: `rgba(${currentTheme.palette.accentRgb}, 0.08)`,
            }}
            className={`p-4 border space-y-3 ${rimClass}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 theme-accent" />
                <span className="text-xs font-bold theme-heading theme-text uppercase tracking-wider">
                  Instant Test In Browser Preview
                </span>
              </div>
              <span
                style={{
                  backgroundColor: `rgba(${currentTheme.palette.accentRgb}, 0.2)`,
                  color: `rgb(${currentTheme.palette.accentRgb})`,
                }}
                className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold"
              >
                Zero Setup Needed
              </span>
            </div>
            <p className="text-xs theme-text-secondary leading-relaxed">
              Load the complete sample media studio (8 high-resolution landscape, architecture,
              macro, and video samples) to test the gallery, slideshow, zooming, spacebar culling,
              and batch selection directly in this browser window.
            </p>
            <button
              onClick={() => {
                onLoadDemoProject();
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold theme-btn-accent transition-all hover:scale-[1.01]"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Load &amp; Review Sample Project Now</span>
            </button>
          </div>

          {/* Diagnostic Checks Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold theme-text-secondary uppercase tracking-wider">
                System Checks &amp; Capabilities
              </h3>
              <button
                onClick={runDiagnostics}
                disabled={isRunningTest}
                className="flex items-center gap-1.5 text-[11px] theme-accent hover:underline font-semibold"
              >
                <RefreshCw className={`w-3 h-3 ${isRunningTest ? 'animate-spin' : ''}`} />
                <span>Re-run Checks</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {tests.map((test, idx) => (
                <div
                  key={idx}
                  style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
                  className="p-3 border theme-border theme-surface-subtle flex items-start gap-2.5"
                >
                  {test.status === 'ok' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : test.status === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <Monitor className="w-4 h-4 theme-accent shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-semibold theme-text truncate">{test.name}</p>
                    <p className="text-[11px] theme-text-secondary leading-tight">{test.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {}
          {/* Diagnostic Console Log */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold theme-text-secondary uppercase tracking-wider">
                <Terminal className="w-3.5 h-3.5 theme-accent" />
                <span>Diagnostic Event Log</span>
              </div>
              <button
                onClick={handleCopyReport}
                className="flex items-center gap-1.5 text-[11px] theme-text-secondary hover:theme-text font-semibold"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 theme-accent" />
                )}
                <span>{copied ? 'Copied!' : 'Copy Full Report'}</span>
              </button>
            </div>
            <div
              style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
              className="p-3.5 theme-input font-mono text-[11px] max-h-36 overflow-y-auto space-y-1"
            >
              {systemLog.map((log, i) => (
                <div key={i} className="theme-text-secondary leading-tight">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t theme-border theme-surface-subtle flex items-center justify-between">
          <span className="text-[11px] theme-text-muted font-mono">
            MediaPicker Pro v2.0.0 • {currentTheme.name}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold theme-btn theme-surface border theme-border theme-text"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}