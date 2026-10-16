'use client';

import React, { useState, useEffect } from 'react';
import { FolderProject, MediaFileItem, AppSettings } from '@/lib/types';
import { downloadZip, exportTextList, formatClipboardPaths } from '@/lib/zip-exporter';
import {
  isTauri,
  batchExportFolderNative,
  copyToClipboardNative,
} from '@/lib/tauri-bridge';
import { getTheme } from '@/lib/themes';
import {
  X,
  Archive,
  FileText,
  Copy,
  Trash2,
  CheckCircle,
  RefreshCw,
  FolderSync,
  FolderPlus,
  Terminal,
  AlertTriangle,
} from 'lucide-react';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FolderProject;
  settings: AppSettings;
  onUpdateProject: (updatedProject: FolderProject) => void;
  onShowToast: (message: string) => void;
  onUndoPush?: (actionDescription: string, previousState: MediaFileItem[]) => void;
}

export function ActionModal({
  isOpen,
  onClose,
  project,
  settings,
  onUpdateProject,
  onShowToast,
  onUndoPush,
}: ActionModalProps) {
  const [targetGroup, setTargetGroup] = useState<'selected' | 'unselected'>('selected');
  const [includeFullPath, setIncludeFullPath] = useState<boolean>(true);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [zipProgress, setZipProgress] = useState<number>(0);
  const [zipStatusText, setZipStatusText] = useState<string>('');

  // Suffix folder copy/move settings
  const [folderSuffix, setFolderSuffix] = useState<string>(settings.exportSuffix || '_selected');
  const [folderOpMode, setFolderOpMode] = useState<'copy' | 'move'>('copy');
  const [suffixVersion, setSuffixVersion] = useState<number>(1);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'invert' | 'clear' | null;
    title: string;
    description: string;
  }>({
    isOpen: false,
    type: null,
    title: '',
    description: '',
  });

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (confirmModal.isOpen) {
          setConfirmModal({ isOpen: false, type: null, title: '', description: '' });
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, confirmModal.isOpen]);

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

  const targetItems = project.items.filter((item) =>
    targetGroup === 'selected' ? item.selected : !item.selected
  );
  const selectedCount = project.items.filter((i) => i.selected).length;
  const unselectedCount = project.items.length - selectedCount;

  // 1. Download ZIP
  const handleDownloadZip = async () => {
    if (targetItems.length === 0) {
      onShowToast('No files in this group to package into a ZIP.');
      return;
    }
    setIsZipping(true);
    setZipProgress(0);
    setZipStatusText('Preparing files in browser...');
    try {
      const zipName = `${project.name}_${
        targetGroup === 'selected' ? 'Selected' : 'Unselected'
      }_${targetItems.length}files.zip`;
      await downloadZip(targetItems, zipName, (percent, status) => {
        setZipProgress(percent);
        setZipStatusText(status);
      });
      onShowToast(`Downloaded ZIP containing ${targetItems.length} file(s)!`);
      onClose();
    } catch (err) {
      console.error('ZIP error:', err);
      onShowToast('Error creating ZIP file. Please try again.');
    } finally {
      setIsZipping(false);
    }
  };

  // 2. Export TXT
  const handleExportTxt = () => {
    if (targetItems.length === 0) {
      onShowToast('No files to export in this group.');
      return;
    }
    const txtName = `${project.name}_${
      targetGroup === 'selected' ? 'Selected' : 'Unselected'
    }_paths.txt`;
    exportTextList(targetItems, txtName, includeFullPath);
    onShowToast(`Downloaded text list with ${targetItems.length} file paths.`);
    onClose();
  };

  // 3. Copy to Clipboard
  const handleCopyClipboard = async () => {
    if (targetItems.length === 0) {
      onShowToast('No files to copy.');
      return;
    }
    const text = formatClipboardPaths(targetItems, settings.clipboardFormat);
    const success = await copyToClipboardNative(text);
    if (success) {
      onShowToast(`Copied ${targetItems.length} file path(s) to clipboard.`);
    } else {
      onShowToast('Clipboard access was denied.');
    }
  };

  // 4. Invert Selection
  const promptInvertSelection = () => {
    setConfirmModal({
      isOpen: true,
      type: 'invert',
      title: 'Invert Selection?',
      description: `Are you sure you want to invert all selections in project "${project.name}"? Currently selected items (${selectedCount}) will be deselected, and unselected items (${unselectedCount}) will be selected.`,
    });
  };

  const executeInvertSelection = () => {
    const prevState = [...project.items];
    const updatedItems = project.items.map((i) => ({ ...i, selected: !i.selected }));
    const newSelectedCount = updatedItems.filter((i) => i.selected).length;
    onUpdateProject({
      ...project,
      items: updatedItems,
      selectedCount: newSelectedCount,
    });
    if (onUndoPush) {
      onUndoPush('Inverted selection', prevState);
    }
    setConfirmModal({ isOpen: false, type: null, title: '', description: '' });
    onShowToast(
      `Inverted selections: ${newSelectedCount} items are now selected (Cmd+Z to undo).`
    );
  };

  // 5. Clear All Selections
  const promptClearSelection = () => {
    if (selectedCount === 0) {
      onShowToast('There are no selected items to clear.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      type: 'clear',
      title: 'Clear All Selections?',
      description: `Are you sure you want to clear all ${selectedCount} selected item(s) in "${project.name}"? This action can also be undone with Cmd+Z.`,
    });
  };

  const executeClearSelection = () => {
    const prevState = [...project.items];
    const updatedItems = project.items.map((i) => ({ ...i, selected: false }));
    onUpdateProject({
      ...project,
      items: updatedItems,
      selectedCount: 0,
    });
    if (onUndoPush) {
      onUndoPush('Cleared selections', prevState);
    }
    setConfirmModal({ isOpen: false, type: null, title: '', description: '' });
    onShowToast('Cleared all selections.');
  };

  // 6. Generate Suffix Folder Batch Script (.command / .bat) & Native Disk Copy/Move
  const handleCreateSuffixFolder = async () => {
    if (targetItems.length === 0) {
      onShowToast('No files in this group to copy or move.');
      return;
    }

    const effectiveSuffix = suffixVersion > 1 ? `${folderSuffix}_${suffixVersion}` : folderSuffix;
    const destFolderName = `${project.name}${effectiveSuffix}`;

    if (isTauri()) {
      try {
        const rootPath = project.rootPathName || project.name;
        const filePaths = targetItems.map((i) => i.absolutePath || i.relativePath);
        const res = await batchExportFolderNative(
          rootPath,
          filePaths,
          effectiveSuffix,
          folderOpMode
        );
        if (res) {
          onShowToast(
            `Successfully ${folderOpMode === 'move' ? 'moved' : 'copied'} ${
              res.processedCount
            } files to: ${res.destinationPath}`
          );
          onClose();
          return;
        }
      } catch (err: any) {
        console.error('Native export error:', err);
        onShowToast(`Native export error: ${err.message || err}`);
      }
    }

    const command = folderOpMode === 'move' ? 'mv' : 'cp';
    const lines = [
      '#!/bin/bash',
      `# Auto-generated script for ${project.name}`,
      `echo "Creating destination folder: ${destFolderName}..."`,
      `mkdir -p "../${destFolderName}"`,
      ...targetItems.map((item) => {
        return `${command} "${item.name}" "../${destFolderName}/"`;
      }),
      `echo "Done! Processed ${targetItems.length} files."`,
    ];

    const scriptBlob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(scriptBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folderOpMode}_to_${destFolderName}.command`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onShowToast(
      `Generated executable script: ${destFolderName}. Also packaging ZIP archive...`
    );
    handleDownloadZip();
  };

  const currentDestFolderName =
    suffixVersion > 1
      ? `${project.name}${folderSuffix}_${suffixVersion}`
      : `${project.name}${folderSuffix}`;

  const getSelectableCardStyle = (isActive: boolean): React.CSSProperties => {
    if (!isActive) {
      return { borderRadius: 'var(--theme-radius-card, 8px)' };
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
        if (e.target === e.currentTarget && !isZipping) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 theme-modal-backdrop animate-in fade-in duration-200"
    >
      <div
        className={`relative w-full max-w-xl theme-modal-window overflow-hidden flex flex-col max-h-[90vh] transition-all duration-200 ${rimClass}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b theme-border theme-surface-subtle">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl theme-surface border theme-border theme-accent">
              <Archive className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold theme-heading theme-text">
                Batch Actions &amp; Export Center
              </h2>
              <p className="text-[11px] theme-text-secondary">
                Project: <span className="theme-text font-semibold">{project.name}</span>
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

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-left">
          {/* Target Group Selector (Selected vs Unselected) */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold theme-text-secondary uppercase tracking-wider block">
              Which group of files do you want to target?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTargetGroup('selected')}
                style={getSelectableCardStyle(targetGroup === 'selected')}
                className="p-3.5 border theme-border theme-surface text-xs font-medium flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle
                    className={`w-4 h-4 ${
                      targetGroup === 'selected' ? 'theme-accent' : 'theme-text-muted'
                    }`}
                  />
                  <span className="font-semibold theme-text">Selected Files</span>
                </div>
                <span
                  className="px-2 py-0.5 rounded text-[11px] font-mono tabular-nums font-bold"
                  style={{
                    backgroundColor: `rgba(${currentTheme.palette.accentRgb}, 0.2)`,
                    color: `rgb(${currentTheme.palette.accentRgb})`,
                  }}
                >
                  {selectedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTargetGroup('unselected')}
                style={getSelectableCardStyle(targetGroup === 'unselected')}
                className="p-3.5 border theme-border theme-surface text-xs font-medium flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2">
                  <FolderSync
                    className={`w-4 h-4 ${
                      targetGroup === 'unselected' ? 'theme-accent' : 'theme-text-muted'
                    }`}
                  />
                  <span className="font-semibold theme-text">Unselected (Inverse)</span>
                </div>
                <span className="px-2 py-0.5 rounded theme-surface-subtle border theme-border theme-text-secondary text-[11px] font-mono tabular-nums font-bold">
                  {unselectedCount}
                </span>
              </button>
            </div>
          </div>

          {/* Quick Selection Helpers */}
          <div className="flex items-center gap-2.5 pt-1 border-t theme-border">
            <button
              onClick={promptInvertSelection}
              className="flex items-center gap-1.5 px-3 py-1.5 theme-btn theme-surface border theme-border text-xs font-medium theme-text"
            >
              <RefreshCw className="w-3.5 h-3.5 theme-accent" />
              <span>Invert Selection</span>
            </button>
            <button
              onClick={promptClearSelection}
              className="flex items-center gap-1.5 px-3 py-1.5 theme-btn theme-surface border theme-border text-xs font-medium theme-text hover:!text-rose-500 hover:!border-rose-500/40"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Clear All Selections</span>
            </button>
          </div>

          {/* Suffix Folder Copy / Move Section */}
          <div
            style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
            className="p-4 theme-surface-subtle border theme-border space-y-3.5"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-bold theme-heading theme-text">
                    Copy or Move to New Suffix Folder
                  </span>
                </div>
                <p className="text-xs theme-text-secondary mt-0.5">
                  Export target files to a sibling folder beside original (e.g.{' '}
                  <span className="font-mono theme-accent font-semibold">
                    {currentDestFolderName}
                  </span>
                  )
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-medium theme-text-secondary block mb-1">
                  Folder Suffix:
                </label>
                <input
                  type="text"
                  value={folderSuffix}
                  onChange={(e) => setFolderSuffix(e.target.value)}
                  className="w-full px-3 py-1.5 theme-input text-xs font-mono"
                  placeholder="_selected"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium theme-text-secondary block mb-1">
                  Operation Mode:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setFolderOpMode('copy')}
                    style={getSelectableCardStyle(folderOpMode === 'copy')}
                    className="py-1.5 px-2 border theme-border theme-surface text-center font-semibold theme-text transition-all"
                  >
                    Copy (Duplicate)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFolderOpMode('move')}
                    style={getSelectableCardStyle(folderOpMode === 'move')}
                    className="py-1.5 px-2 border theme-border theme-surface text-center font-semibold theme-text transition-all"
                  >
                    Move (Cut)
                  </button>
                </div>
              </div>
            </div>

            {/* Collision detection option */}
            <div className="flex items-center justify-between text-xs pt-2 border-t theme-border">
              <span className="theme-text-secondary flex items-center gap-1.5 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  Target folder:{' '}
                  <strong className="theme-text font-mono">{currentDestFolderName}</strong>
                </span>
              </span>
              <button
                type="button"
                onClick={() => setSuffixVersion((v) => v + 1)}
                className="text-[11px] font-semibold theme-accent hover:underline"
              >
                + Increment index ({suffixVersion})
              </button>
            </div>

            <div className="pt-1">
              <button
                disabled={targetItems.length === 0}
                onClick={handleCreateSuffixFolder}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold theme-btn-accent disabled:opacity-40"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Export &amp; Generate Script for &quot;{currentDestFolderName}&quot;</span>
              </button>
            </div>
          </div>

          {/* Action Options */}
          <div className="space-y-3 pt-1">
            <h3 className="text-xs font-semibold theme-text-secondary uppercase tracking-wider">
              Export &amp; Packaging Options
            </h3>

            {/* ZIP Download Card */}
            <div
              style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
              className="p-4 theme-surface-subtle border theme-border space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Archive className="w-4 h-4 theme-accent" />
                    <span className="text-sm font-bold theme-heading theme-text">
                      Download ZIP Package (.ZIP)
                    </span>
                  </div>
                  <p className="text-xs theme-text-secondary mt-0.5">
                    Bundles all files directly in-browser with folder tree hierarchy intact.
                  </p>
                </div>
                <button
                  disabled={isZipping || targetItems.length === 0}
                  onClick={handleDownloadZip}
                  className="px-4 py-2 text-xs font-bold theme-btn-accent shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isZipping ? 'Zipping...' : 'Download ZIP'}
                </button>
              </div>

              {isZipping && (
                <div className="space-y-1.5 pt-2">
                  <div className="w-full h-2 theme-surface rounded-full overflow-hidden border theme-border">
                    <div
                      className="h-full transition-all duration-200"
                      style={{
                        width: `${zipProgress}%`,
                        backgroundColor: `rgb(${currentTheme.palette.accentRgb})`,
                        boxShadow: 'var(--theme-glow)',
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] theme-text-secondary">
                    <span>{zipStatusText}</span>
                    <span className="font-mono tabular-nums theme-text font-bold">
                      {zipProgress}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* TXT Export Card */}
            <div
              style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
              className="p-4 theme-surface-subtle border theme-border space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 theme-accent" />
                    <span className="text-sm font-bold theme-heading theme-text">
                      Download Text List (.TXT)
                    </span>
                  </div>
                  <p className="text-xs theme-text-secondary mt-0.5">
                    Exports one file path per line, ready for batch scripts, terminal commands or
                    notes.
                  </p>
                </div>
                <button
                  disabled={targetItems.length === 0}
                  onClick={handleExportTxt}
                  className="px-4 py-2 text-xs font-semibold theme-btn theme-surface border theme-border theme-text shrink-0 disabled:opacity-40"
                >
                  Download TXT
                </button>
              </div>

              <div className="flex items-center gap-4 pt-1 text-xs theme-text-secondary">
                <label className="flex items-center gap-1.5 cursor-pointer hover:theme-text">
                  <input
                    type="radio"
                    name="txtFormat"
                    checked={includeFullPath}
                    onChange={() => setIncludeFullPath(true)}
                    className="accent-cyan-500 cursor-pointer"
                  />
                  <span>Full relative path (Folder/Sub/file)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer hover:theme-text">
                  <input
                    type="radio"
                    name="txtFormat"
                    checked={!includeFullPath}
                    onChange={() => setIncludeFullPath(false)}
                    className="accent-cyan-500 cursor-pointer"
                  />
                  <span>Filename only</span>
                </label>
              </div>
            </div>

            {/* Copy Clipboard Card */}
            <div
              style={{ borderRadius: 'var(--theme-radius-card, 8px)' }}
              className="p-4 theme-surface-subtle border theme-border flex items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Copy className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-bold theme-heading theme-text">
                    Copy Paths to Clipboard
                  </span>
                </div>
                <p className="text-xs theme-text-secondary mt-0.5">
                  Instant clipboard copy adhering to your configured format.
                </p>
              </div>
              <button
                disabled={targetItems.length === 0}
                onClick={handleCopyClipboard}
                className="px-4 py-2 text-xs font-semibold theme-btn theme-surface border theme-border theme-text shrink-0 disabled:opacity-40"
              >
                Copy Paths
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t theme-border theme-surface-subtle flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold theme-btn theme-surface border theme-border theme-text"
          >
            Close (Esc)
          </button>
        </div>

        {/* Confirmation Modal for Invert & Clear Selections */}
        {confirmModal.isOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 theme-modal-backdrop animate-in fade-in zoom-in-95 duration-150">
            <div
              className={`w-full max-w-md theme-modal-window p-6 text-left space-y-4 ${rimClass}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl border ${
                    confirmModal.type === 'clear'
                      ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                      : 'theme-surface-subtle theme-accent theme-border'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold theme-heading theme-text">
                    {confirmModal.title}
                  </h3>
                  <p className="text-xs theme-text-muted">Please confirm before proceeding</p>
                </div>
              </div>

              <p className="text-xs theme-text-secondary leading-relaxed theme-surface-subtle p-3 rounded-xl border theme-border">
                {confirmModal.description}
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t theme-border">
                <button
                  type="button"
                  onClick={() =>
                    setConfirmModal({ isOpen: false, type: null, title: '', description: '' })
                  }
                  className="px-4 py-2 text-xs font-medium theme-btn theme-surface border theme-border theme-text"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmModal.type === 'invert') executeInvertSelection();
                    if (confirmModal.type === 'clear') executeClearSelection();
                  }}
                  className={`px-4 py-2 text-xs font-bold transition-all ${
                    confirmModal.type === 'clear'
                      ? 'theme-btn bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30'
                      : 'theme-btn-accent'
                  }`}
                >
                  {confirmModal.type === 'clear' ? 'Yes, Clear All' : 'Yes, Invert Selection'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}