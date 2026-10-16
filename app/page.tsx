'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FolderProject,
  MediaFileItem,
  AppSettings,
  TrashRecord,
  ViewMode,
} from '@/lib/types';
import {
  loadSettings,
  saveSettings,
  loadTrashRecords,
  saveTrashRecord,
  removeTrashRecord,
  findMatchingProject,
  persistProjectToIDB,
  DEFAULT_SETTINGS,
} from '@/lib/storage';
import { processFileList, scanDirectoryHandle } from '@/lib/file-scanner';
import { generateDemoProject } from '@/lib/demo-data';
import { isTauri, pickFolderNative, scanDirectoryNative } from '@/lib/tauri-bridge';

import { Header } from '@/components/Header';
import { ProjectList } from '@/components/ProjectList';
import { SlideshowView } from '@/components/SlideshowView';
import { GalleryView } from '@/components/GalleryView';
import { SettingsModal } from '@/components/SettingsModal';
import { TrashModal } from '@/components/TrashModal';
import { ActionModal } from '@/components/ActionModal';
import { ShortcutsModal } from '@/components/ShortcutsModal';
import { PathInputModal } from '@/components/PathInputModal';
import { DiagnosticsModal } from '@/components/DiagnosticsModal';

export default function HomePage() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    return typeof window !== 'undefined' ? loadSettings() : DEFAULT_SETTINGS;
  });
  const [projects, setProjects] = useState<FolderProject[]>(() => [generateDemoProject()]);
  const [trashRecords, setTrashRecords] = useState<TrashRecord[]>(() => {
    return typeof window !== 'undefined' ? loadTrashRecords() : [];
  });
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [slideshowStartIndex, setSlideshowStartIndex] = useState<number>(0);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isTrashOpen, setIsTrashOpen] = useState<boolean>(false);
  const [isActionOpen, setIsActionOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isPathInputOpen, setIsPathInputOpen] = useState<boolean>(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);
  const [actionProject, setActionProject] = useState<FolderProject | null>(null);

  // Load / reload demo project for instant in-browser test
  const handleLoadDemoProject = () => {
    const freshDemo = generateDemoProject();
    setProjects((prev) => {
      const filtered = prev.filter((p) => p.id !== freshDemo.id);
      return [freshDemo, ...filtered];
    });
    setActiveProjectId(freshDemo.id);
    setViewMode('gallery');
    showToast('Loaded 8-item sample media project. Ready for instant testing!');
  };

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hidden folder input fallback
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Undo stack
  const [undoHistory, setUndoHistory] = useState<
    { description: string; projectId: string; prevItems: MediaFileItem[] }[]
  >([]);

  // Update theme class on HTML element
  useEffect(() => {
    const root = document.documentElement;
    if (settings.themeMode === 'dark') {
      root.classList.add('dark');
    } else if (settings.themeMode === 'light') {
      root.classList.remove('dark');
    } else {
      // System
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const applySystemTheme = () => {
        if (mediaQuery.matches) root.classList.add('dark');
        else root.classList.remove('dark');
      };
      applySystemTheme();
      mediaQuery.addEventListener('change', applySystemTheme);
      return () => mediaQuery.removeEventListener('change', applySystemTheme);
    }
  }, [settings.themeMode]);

  // Global key listener for '?' to open shortcuts cheatsheet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElem = document.activeElement;
      const isInput = activeElem?.tagName === 'INPUT' || activeElem?.tagName === 'TEXTAREA';
      if (e.key === '?' && !isInput && viewMode === 'dashboard') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode]);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveSettings(updated);
  };

  // 1. Add folder intake logic
  const handleOpenFolderPicker = async () => {
    // If running in Tauri native runtime, use native dialog and multi-threaded Rust scanner
    if (isTauri()) {
      try {
        const selectedPath = await pickFolderNative();
        if (!selectedPath) return; // User cancelled
        showToast(`Scanning files natively in ${selectedPath}...`);
        const scanResult = await scanDirectoryNative(
          selectedPath,
          settings.maxScanFilesLimit || 50000,
          settings.includeHiddenFiles !== false
        );
        if (!scanResult) return;
        if (scanResult.limitReached) {
          showToast(
            `Limit reached: Scanned ${scanResult.totalFilesCount.toLocaleString()} files (max ${settings.maxScanFilesLimit || 50000}).`
          );
        }
        if (scanResult.items.length === 0) {
          showToast('No photos or videos found in this folder.');
          return;
        }
        integrateNewProject(
          scanResult.folderName,
          scanResult.items,
          scanResult.totalFilesCount,
          scanResult.totalSizeBytes,
          scanResult.photosCount,
          scanResult.videosCount,
          scanResult.nonMediaCount,
          scanResult.subfolders,
          scanResult.rootPath
        );
        return;
      } catch (err: any) {
        console.error('Tauri native folder picker error:', err);
        showToast(err.message || 'Error scanning folder natively');
        return;
      }
    }

    if ('showDirectoryPicker' in window) {
      try {
        // @ts-ignore
        const dirHandle: FileSystemDirectoryHandle = await window.showDirectoryPicker();
        showToast('Scanning files inside folder recursively...');

        const result = await scanDirectoryHandle(
          dirHandle,
          settings.imageSizeLimitMB,
          settings.videoSizeLimitMB,
          settings.maxScanFilesLimit || 50000,
          settings.includeHiddenFiles !== false
        );

        if (result.limitReached) {
          showToast(`Limit reached: Scanned ${result.totalFiles.toLocaleString()} files (max ${settings.maxScanFilesLimit || 50000}). Remainder skipped.`);
        }

        if (result.mediaItems.length === 0) {
          showToast('No photos or videos found in this folder.');
          return;
        }

        integrateNewProject(
          result.projectName,
          result.mediaItems,
          result.totalFiles,
          result.totalSizeBytes,
          result.photosCount,
          result.videosCount,
          result.nonMediaCount,
          result.subfolders
        );
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('showDirectoryPicker fallback to input:', err);
      }
    }

    // Universal fallback: trigger hidden directory input
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
      folderInputRef.current.click();
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    showToast('Analyzing folder tree and media files...');
    try {
      const result = await processFileList(
        files,
        settings.imageSizeLimitMB,
        settings.videoSizeLimitMB,
        settings.maxScanFilesLimit || 50000,
        settings.includeHiddenFiles !== false
      );

      if (result.limitReached) {
        showToast(`Limit reached: Scanned ${result.totalFiles.toLocaleString()} files (max ${settings.maxScanFilesLimit || 50000}). Remainder skipped.`);
      }

      if (result.mediaItems.length === 0) {
        showToast('No photos or videos found in this folder.');
        return;
      }

      integrateNewProject(
        result.projectName,
        result.mediaItems,
        result.totalFiles,
        result.totalSizeBytes,
        result.photosCount,
        result.videosCount,
        result.nonMediaCount,
        result.subfolders
      );
    } catch (err: any) {
      console.error('File scan error:', err);
      showToast(err.message || 'Error reading folder');
    }
  };

  // 2. Handle Manual Folder Path input
  const handleManualPathSubmit = async (path: string) => {
    const cleanPath = path.trim().replace(/\\/g, '/');
    const folderName = cleanPath.split('/').filter(Boolean).pop() || 'Custom Folder';

    // If running in Tauri native runtime, scan disk path directly without dialog prompt!
    if (isTauri()) {
      try {
        showToast(`Scanning path natively: ${cleanPath}...`);
        const scanResult = await scanDirectoryNative(
          path.trim(),
          settings.maxScanFilesLimit || 50000,
          settings.includeHiddenFiles !== false
        );
        if (scanResult) {
          if (scanResult.limitReached) {
            showToast(
              `Limit reached: Scanned ${scanResult.totalFilesCount.toLocaleString()} files.`
            );
          }
          if (scanResult.items.length === 0) {
            showToast('No photos or videos found at this path.');
            return;
          }
          integrateNewProject(
            scanResult.folderName,
            scanResult.items,
            scanResult.totalFilesCount,
            scanResult.totalSizeBytes,
            scanResult.photosCount,
            scanResult.videosCount,
            scanResult.nonMediaCount,
            scanResult.subfolders,
            scanResult.rootPath
          );
          return;
        }
      } catch (err: any) {
        console.error('Native path scan error:', err);
        showToast(`Failed to open path: ${err.message || err}`);
        return;
      }
    }

    // Check if this project already exists
    const existing = projects.find((p) => p.name.toLowerCase() === folderName.toLowerCase());
    if (existing) {
      showToast(`Selected existing project: ${existing.name}`);
      setActiveProjectId(existing.id);
      return;
    }

    // In browser sandbox, direct string paths require opening the folder picker to read blobs.
    // We register the name and prompt the picker
    showToast(`Registered folder path: ${folderName}. Please confirm selection in dialog.`);
    handleOpenFolderPicker();
  };

  // Helper to integrate new project with duplicate matching & trash restoration
  const integrateNewProject = (
    projectName: string,
    mediaItems: MediaFileItem[],
    totalFiles: number,
    totalSizeBytes: number,
    photosCount: number,
    videosCount: number,
    nonMediaCount: number,
    subfolders: string[],
    rootPathName?: string
  ) => {
    // Check if this folder was in 30-day trash!
    const trashMatch = trashRecords.find(
      (t) => t.projectName.toLowerCase() === projectName.toLowerCase()
    );
    if (trashMatch) {
      removeTrashRecord(trashMatch.id);
      setTrashRecords((prev) => prev.filter((t) => t.id !== trashMatch.id));
      showToast(`Restored folder from 30-day trash with prior review session (${projectName})`);
    }

    // Check if project already exists in active projects
    const existing = findMatchingProject(projects, projectName, mediaItems.length);
    if (existing) {
      const previousSelectionsMap = new Map(existing.items.map((i) => [i.relativePath, i.selected]));
      const previousViewedMap = new Map(existing.items.map((i) => [i.relativePath, i.viewed]));

      const mergedItems = mediaItems.map((item) => ({
        ...item,
        selected: previousSelectionsMap.has(item.relativePath)
          ? !!previousSelectionsMap.get(item.relativePath)
          : false,
        viewed: previousViewedMap.has(item.relativePath)
          ? !!previousViewedMap.get(item.relativePath)
          : false,
      }));

      const selectedCount = mergedItems.filter((i) => i.selected).length;
      const viewedCount = mergedItems.filter((i) => i.viewed).length;

      const updatedProject: FolderProject = {
        ...existing,
        items: mergedItems,
        mediaCount: mergedItems.length,
        totalFilesCount: totalFiles,
        totalSizeBytes,
        subfolders,
        enabledSubfolders: existing.enabledSubfolders || subfolders,
        includeRootFiles: existing.includeRootFiles !== false,
        selectedCount,
        viewedCount,
        lastAccessedAt: Date.now(),
      };

      setProjects((prev) => prev.map((p) => (p.id === existing.id ? updatedProject : p)));
      persistProjectToIDB(updatedProject);
      showToast(`Duplicate folder recognized! Previous selections and progress preserved (${projectName})`);
      return;
    }

    // New project
    const newProject: FolderProject = {
      id: 'proj_' + Date.now(),
      name: projectName,
      rootPathName: rootPathName || projectName,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      totalFilesCount: totalFiles,
      totalSizeBytes,
      mediaCount: mediaItems.length,
      photosCount,
      videosCount,
      nonMediaCount,
      viewedCount: 0,
      selectedCount: 0,
      lastViewedIndex: 0,
      subfolders,
      enabledSubfolders: subfolders,
      includeRootFiles: true,
      items: mediaItems,
    };

    setProjects((prev) => [newProject, ...prev]);
    persistProjectToIDB(newProject);
    showToast(`Loaded project with ${mediaItems.length} media items.`);
  };

  // Update a project
  const handleUpdateProject = (updated: FolderProject) => {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setActionProject((prev) => (prev && prev.id === updated.id ? updated : prev));
    persistProjectToIDB(updated);
  };

  // Delete project -> Move to 30-day trash
  const handleDeleteProject = (project: FolderProject) => {
    saveTrashRecord(project);
    setTrashRecords(loadTrashRecords());
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
    if (activeProjectId === project.id) {
      setViewMode('dashboard');
      setActiveProjectId(null);
    }
    showToast(`Folder moved to 30-day safety trash.`);
  };

  // Restore project from 30-day trash
  const handleRestoreFromTrash = (record: TrashRecord) => {
    removeTrashRecord(record.id);
    setTrashRecords((prev) => prev.filter((t) => t.id !== record.id));
    setProjects((prev) => [record.projectData, ...prev]);
    setIsTrashOpen(false);
    showToast(`Restored "${record.projectName}" to active projects.`);
  };

  // Permanent delete from trash
  const handlePermanentDelete = (recordId: string) => {
    removeTrashRecord(recordId);
    setTrashRecords((prev) => prev.filter((t) => t.id !== recordId));
    showToast('Folder permanently purged.');
  };

  // Navigation handlers
  const handleStartSlideshow = (project: FolderProject, resume: boolean = true) => {
    setActiveProjectId(project.id);
    setSlideshowStartIndex(resume ? project.lastViewedIndex || 0 : 0);
    setViewMode('slideshow');
  };

  const handleOpenGallery = (project: FolderProject) => {
    setActiveProjectId(project.id);
    setViewMode('gallery');
  };

  const handleOpenActionModal = (project: FolderProject) => {
    setActionProject(project);
    setIsActionOpen(true);
  };

  // Undo push
  const handleUndoPush = (description: string, prevItems: MediaFileItem[]) => {
    if (!activeProjectId) return;
    setUndoHistory((prev) => [
      ...prev,
      { description, projectId: activeProjectId, prevItems },
    ]);
  };

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white transition-colors duration-200">
      {/* Hidden file input with directory support */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Global Interactive Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="px-5 py-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-300 dark:border-slate-700/80 shadow-2xl backdrop-blur-xl text-xs font-medium text-slate-900 dark:text-white flex items-center gap-2.5">
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                settings.neonAccent === 'orange' ? 'bg-orange-500' : 'bg-emerald-500'
              }`}
            />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Conditional Rendering based on ViewMode */}
      {viewMode === 'slideshow' && activeProject ? (
        <SlideshowView
          project={activeProject}
          startIndex={slideshowStartIndex}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onUpdateProject={handleUpdateProject}
          onClose={() => setViewMode('gallery')}
          onOpenGallery={() => setViewMode('gallery')}
          onShowToast={showToast}
        />
      ) : viewMode === 'gallery' && activeProject ? (
        <GalleryView
          project={activeProject}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onUpdateProject={handleUpdateProject}
          onStartSlideshow={(startIdx) => {
            setSlideshowStartIndex(startIdx);
            setViewMode('slideshow');
          }}
          onClose={() => setViewMode('dashboard')}
          onOpenActionModal={() => {
            setActionProject(activeProject);
            setIsActionOpen(true);
          }}
          onShowToast={showToast}
        />
      ) : (
        <>
          {/* Main Top Header */}
          <Header
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenTrash={() => setIsTrashOpen(true)}
            onOpenShortcuts={() => setIsShortcutsOpen(true)}
            onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
            trashCount={trashRecords.length}
            onAddFolderClick={handleOpenFolderPicker}
            onReturnToDashboard={() => setViewMode('dashboard')}
            isDashboard={true}
          />

          {/* Main Content Area */}
          <main className="flex-1">
            <ProjectList
              projects={projects}
              settings={settings}
              onStartSlideshow={handleStartSlideshow}
              onOpenGallery={handleOpenGallery}
              onOpenActionModal={handleOpenActionModal}
              onDeleteProject={handleDeleteProject}
              onAddFolderClick={handleOpenFolderPicker}
              onEnterPathClick={() => setIsPathInputOpen(true)}
              onUpdateProject={handleUpdateProject}
              onLoadDemoProject={handleLoadDemoProject}
              onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
            />
          </main>
        </>
      )}

      {/* Global Modals */}
      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSaveSettings={(newS) => {
            setSettings(newS);
            saveSettings(newS);
            showToast('Settings saved successfully.');
          }}
        />
      )}

      <TrashModal
        isOpen={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
        trashRecords={trashRecords}
        onRestore={handleRestoreFromTrash}
        onPermanentDelete={handlePermanentDelete}
        neonAccent={settings.neonAccent}
      />

      {actionProject && (
        <ActionModal
          isOpen={isActionOpen}
          onClose={() => setIsActionOpen(false)}
          project={actionProject}
          settings={settings}
          onUpdateProject={handleUpdateProject}
          onShowToast={showToast}
          onUndoPush={handleUndoPush}
        />
      )}

      {/* Keyboard Shortcuts Guide Cheatsheet */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        neonAccent={settings.neonAccent}
      />

      {/* Manual Path Input Modal */}
      <PathInputModal
        isOpen={isPathInputOpen}
        onClose={() => setIsPathInputOpen(false)}
        onSubmitPath={handleManualPathSubmit}
        onBrowseNative={handleOpenFolderPicker}
        neonAccent={settings.neonAccent}
      />

      {/* Self-Test & Diagnostics Modal */}
      <DiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        settings={settings}
        onLoadDemoProject={handleLoadDemoProject}
        onShowToast={showToast}
      />
    </div>
  );
}
