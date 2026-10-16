'use client';

import React, { useState, useEffect } from 'react';
import { FolderProject, MediaFileItem, AppSettings } from '@/lib/types';
import { downloadZip, exportTextList, formatClipboardPaths } from '@/lib/zip-exporter';
import {
  isTauri,
  batchExportFolderNative,
  copyToClipboardNative,
} from '@/lib/tauri-bridge';
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

  // Confirmation modal state for Invert & Clear
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
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

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
      const zipName = `${project.name}_${targetGroup === 'selected' ? 'Selected' : 'Unselected'}_${targetItems.length}files.zip`;
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
    const txtName = `${project.name}_${targetGroup === 'selected' ? 'Selected' : 'Unselected'}_paths.txt`;
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
    onShowToast(`Inverted selections: ${newSelectedCount} items are now selected (Cmd+Z to undo).`);
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

    // If running in native Tauri, execute direct OS atomic copy/move!
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
          onShowToast(`Successfully ${folderOpMode === 'move' ? 'moved' : 'copied'} ${res.processedCount} files to: ${res.destinationPath}`);
          onClose();
          return;
        }
      } catch (err: any) {
        console.error('Native export error:', err);
        onShowToast(`Native export error: ${err.message || err}`);
      }
    }

    // Web fallback: Generate Bash / Command script for macOS & Windows
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

    // Also download ZIP with that suffix name
    handleDownloadZip();
  };

  const currentDestFolderName = suffixVersion > 1
    ? `${project.name}${folderSuffix}_${suffixVersion}`
    : `${project.name}${folderSuffix}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl text-slate-900 dark:text-slate-100 overflow-hidden flex flex-col max-h-[90vh] transition-colors duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-orange-500" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Batch Actions & Export Center</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Project: <span className="text-slate-800 dark:text-slate-200 font-medium">{project.name}</span>
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
        <div className="p-6 space-y-6 overflow-y-auto text-left">
          {/* Target Group Selector (Selected vs Unselected) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Which group of files do you want to target?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTargetGroup('selected')}
                className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
                  targetGroup === 'selected'
                    ? 'border-orange-500 bg-orange-500/15 text-orange-600 dark:text-orange-300 ring-1 ring-orange-500/40'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-orange-500" />
                  <span>Selected Files</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-700 dark:text-orange-200 text-[11px] tabular-nums font-bold">
                  {selectedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTargetGroup('unselected')}
                className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
                  targetGroup === 'unselected'
                    ? 'border-orange-500 bg-orange-500/15 text-orange-600 dark:text-orange-300 ring-1 ring-orange-500/40'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FolderSync className="w-4 h-4 text-slate-400" />
                  <span>Unselected Files (Inverse)</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] tabular-nums font-bold">
                  {unselectedCount}
                </span>
              </button>
            </div>
          </div>

          {/* Quick Selection Helpers */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-800/80">
            <button
              onClick={promptInvertSelection}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Invert Selection</span>
            </button>
            <button
              onClick={promptClearSelection}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Clear All Selections</span>
            </button>
          </div>

          {/* Suffix Folder Copy / Move Section */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">Copy or Move to New Suffix Folder</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Export target files to a new sibling folder beside original (e.g. <span className="font-mono">{currentDestFolderName}</span>)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Folder Suffix:
                </label>
                <input
                  type="text"
                  value={folderSuffix}
                  onChange={(e) => setFolderSuffix(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                  placeholder="_selected"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Operation Mode:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setFolderOpMode('copy')}
                    className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                      folderOpMode === 'copy'
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Copy (Duplicate)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFolderOpMode('move')}
                    className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                      folderOpMode === 'move'
                        ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Move (Cut)
                  </button>
                </div>
              </div>
            </div>

            {/* Collision detection option */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-800/80">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Target folder name: <strong className="text-slate-800 dark:text-slate-200 font-mono">{currentDestFolderName}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSuffixVersion((v) => v + 1)}
                className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline"
              >
                + Increment index ({suffixVersion})
              </button>
            </div>

            <div className="pt-2">
              <button
                disabled={targetItems.length === 0}
                onClick={handleCreateSuffixFolder}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition-colors disabled:opacity-50"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Export & Generate Script for &quot;{currentDestFolderName}&quot;</span>
              </button>
            </div>
          </div>

          {/* Action Options */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Export & Packaging Options
            </h3>

            {/* ZIP Download Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Archive className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-bold text-slate-900 dark:text-white">Download ZIP Package (.ZIP)</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Bundles all files directly in-browser with folder tree hierarchy intact.
                  </p>
                </div>
                <button
                  disabled={isZipping || targetItems.length === 0}
                  onClick={handleDownloadZip}
                  className={`px-4 py-2 rounded-lg text-xs font-medium text-white transition-all shadow-md shrink-0 ${
                    settings.neonAccent === 'orange'
                      ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isZipping ? 'Zipping...' : 'Download ZIP'}
                </button>
              </div>

              {isZipping && (
                <div className="space-y-1.5 pt-2">
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 transition-all duration-200"
                      style={{ width: `${zipProgress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{zipStatusText}</span>
                    <span className="font-mono tabular-nums">{zipProgress}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* TXT Export Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-sky-500" />
                    <span className="text-sm font-bold text-slate-900 dark:text-white">Download Text List (.TXT)</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Exports one file path per line, ready for batch scripts, terminal commands or notes.
                  </p>
                </div>
                <button
                  disabled={targetItems.length === 0}
                  onClick={handleExportTxt}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white transition-all shadow-md shadow-sky-600/30 shrink-0 disabled:opacity-50"
                >
                  Download TXT
                </button>
              </div>

              <div className="flex items-center gap-3 pt-1 text-xs text-slate-600 dark:text-slate-300">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="txtFormat"
                    checked={includeFullPath}
                    onChange={() => setIncludeFullPath(true)}
                    className="accent-orange-500"
                  />
                  <span>Full relative path (Folder/Sub/file)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="txtFormat"
                    checked={!includeFullPath}
                    onChange={() => setIncludeFullPath(false)}
                    className="accent-orange-500"
                  />
                  <span>Filename only</span>
                </label>
              </div>
            </div>

            {/* Copy Clipboard Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Copy className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">Copy Paths to Clipboard</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Instant clipboard copy adhering to your configured format.
                </p>
              </div>
              <button
                disabled={targetItems.length === 0}
                onClick={handleCopyClipboard}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 transition-colors shrink-0 disabled:opacity-50"
              >
                Copy Paths
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
          >
            Close (Esc)
          </button>
        </div>

        {/* Confirmation Modal for Invert & Clear Selections */}
        {confirmModal.isOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-6 shadow-2xl text-left space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl ${
                    confirmModal.type === 'clear'
                      ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                      : 'bg-orange-500/15 text-orange-500 border border-orange-500/30'
                  }`}
                >
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {confirmModal.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Please confirm before proceeding
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {confirmModal.description}
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setConfirmModal({ isOpen: false, type: null, title: '', description: '' })}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmModal.type === 'invert') executeInvertSelection();
                    if (confirmModal.type === 'clear') executeClearSelection();
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-md transition-colors ${
                    confirmModal.type === 'clear'
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                      : 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/30'
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
