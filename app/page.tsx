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
import { getTheme } from '@/lib/themes';
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
    if (typeof window !== 'undefined') {
      return loadSettings();
    }
    return DEFAULT_SETTINGS;
  });

  const [projects, setProjects] = useState<FolderProject[]>(() => [generateDemoProject()]);
  const [trashRecords, setTrashRecords] = useState<TrashRecord[]>(() => {
    if (typeof window !== 'undefined') {
      return loadTrashRecords();
    }
    return [];
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
  const [, setUndoHistory] = useState<
    { description: string; projectId: string; prevItems: MediaFileItem[] }[]
  >([]);

  // Track effective Dark / Light mode state
  const [isDark, setIsDark] = useState<boolean>(true);

  // Update theme class and data-theme on HTML element
  useEffect(() => {
    const root = document.documentElement;
    const currentTheme = getTheme(settings.activeThemeId);
    root.setAttribute('data-theme', currentTheme.id);

    const applyDark = (dark: boolean) => {
      setIsDark(dark);
      if (dark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    if (settings.themeMode === 'dark') {
      applyDark(true);
    } else if (settings.themeMode === 'light') {
      applyDark(false);
    } else {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyDark(mediaQuery.matches);
      const applySystemTheme = () => applyDark(mediaQuery.matches);
      mediaQuery.addEventListener('change', applySystemTheme);
      return () => mediaQuery.removeEventListener('change', applySystemTheme);
    }
  }, [settings.themeMode, settings.activeThemeId]);

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

  const handleOpenFolderPicker = async () => {
    if (isTauri()) {
      try {
        const selectedPath = await pickFolderNative();
        if (!selectedPath) return;
        showToast(`Scanning files natively in ${selectedPath}...`);

        const scanResult = await scanDirectoryNative(
          selectedPath,
          settings.maxScanFilesLimit || 50000,
          settings.includeHiddenFiles !== false
        );

        if (!scanResult) return;

        if (scanResult.limitReached) {
          showToast(
            `Limit reached: Scanned ${scanResult.totalFilesCount.toLocaleString()} files (max ${
              settings.maxScanFilesLimit || 50000
            }).`
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
          showToast(
            `Limit reached: Scanned ${result.totalFiles.toLocaleString()} files (max ${
              settings.maxScanFilesLimit || 50000
            }). Remainder skipped.`
          );
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
        showToast(
          `Limit reached: Scanned ${result.totalFiles.toLocaleString()} files (max ${
            settings.maxScanFilesLimit || 50000
          }). Remainder skipped.`
        );
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

  const handleManualPathSubmit = async (path: string) => {
    const cleanPath = path.trim().replace(/\\/g, '/');
    const folderName = cleanPath.split('/').filter(Boolean).pop() || 'Custom Folder';

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

    const existing = projects.find((p) => p.name.toLowerCase() === folderName.toLowerCase());
    if (existing) {
      showToast(`Selected existing project: ${existing.name}`);
      setActiveProjectId(existing.id);
      return;
    }

    showToast(`Registered folder path: ${folderName}. Please confirm selection in dialog.`);
    handleOpenFolderPicker();
  };

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
    const trashMatch = trashRecords.find(
      (t) => t.projectName.toLowerCase() === projectName.toLowerCase()
    );

    if (trashMatch) {
      removeTrashRecord(trashMatch.id);
      setTrashRecords((prev) => prev.filter((t) => t.id !== trashMatch.id));
      showToast(`Restored folder from 30-day trash with prior review session (${projectName})`);
    }

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
      showToast(
        `Duplicate folder recognized! Previous selections and progress preserved (${projectName})`
      );
      return;
    }

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

  const handleUpdateProject = (updated: FolderProject) => {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setActionProject((prev) => (prev && prev.id === updated.id ? updated : prev));
    persistProjectToIDB(updated);
  };

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

  const handleRestoreFromTrash = (record: TrashRecord) => {
    removeTrashRecord(record.id);
    setTrashRecords((prev) => prev.filter((t) => t.id !== record.id));
    setProjects((prev) => [record.projectData, ...prev]);
    setIsTrashOpen(false);
    showToast(`Restored "${record.projectName}" to active projects.`);
  };

  const handlePermanentDelete = (recordId: string) => {
    removeTrashRecord(recordId);
    setTrashRecords((prev) => prev.filter((t) => t.id !== recordId));
    showToast('Folder permanently purged.');
  };

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

  const handleUndoPush = (description: string, prevItems: MediaFileItem[]) => {
    if (!activeProjectId) return;
    setUndoHistory((prev) => [...prev, { description, projectId: activeProjectId, prevItems }]);
  };

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];
  const currentTheme = getTheme(settings.activeThemeId, isDark);
  const isLiquidGlass = currentTheme.id === 'theme-3-liquid-glass';
  const isCupertino = currentTheme.id === 'theme-2-cupertino-frosted-pro';
  const rimClass = isLiquidGlass
    ? 'liquid-specular-rim'
    : isCupertino
    ? 'cupertino-vibrancy-rim'
    : '';

  return (
    <div
      className={`relative min-h-screen flex flex-col font-sans transition-colors duration-200 theme-bg ${
        isLiquidGlass
          ? 'liquid-glass-backdrop'
          : isCupertino
          ? 'cupertino-frosted-backdrop'
          : ''
      }`}
    >
      {/* Ambient Optical Light Mesh for Dashboard in Cupertino & Liquid Glass */}
      {(isLiquidGlass || isCupertino) && viewMode === 'dashboard' && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {isLiquidGlass ? (
            <>
              <div
                className="absolute -top-36 left-1/4 w-[650px] h-[380px] rounded-full blur-[115px] opacity-35"
                style={{
                  background:
                    'radial-gradient(circle, rgba(0, 210, 255, 0.55) 0%, rgba(56, 189, 248, 0.15) 60%, transparent 100%)',
                }}
              />
              <div
                className="absolute top-1/3 -right-24 w-[550px] h-[550px] rounded-full blur-[130px] opacity-25"
                style={{
                  background:
                    'radial-gradient(circle, rgba(99, 102, 241, 0.45) 0%, rgba(0, 210, 255, 0.18) 65%, transparent 100%)',
                }}
              />
              <div
                className="absolute -bottom-32 left-10 w-[600px] h-[420px] rounded-full blur-[120px] opacity-25"
                style={{
                  background:
                    'radial-gradient(circle, rgba(125, 235, 255, 0.4) 0%, transparent 75%)',
                }}
              />
            </>
          ) : (
            <>
              <div
                className="absolute -top-40 left-1/3 w-[700px] h-[360px] rounded-full blur-[120px] opacity-30"
                style={{
                  background:
                    'radial-gradient(circle, rgba(10, 132, 255, 0.45) 0%, transparent 75%)',
                }}
              />
              <div
                className="absolute bottom-10 right-1/4 w-[600px] h-[400px] rounded-full blur-[130px] opacity-20"
                style={{
                  background:
                    'radial-gradient(circle, rgba(94, 92, 230, 0.4) 0%, transparent 75%)',
                }}
              />
            </>
          )}
        </div>
      )}

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

      {/* Global Interactive Toast Notification (Bottom Center Glass/Ice Capsule) */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div
            className={`px-5 py-2.5 theme-hud-dock text-xs font-semibold theme-text flex items-center gap-2.5 ${rimClass}`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full animate-pulse shrink-0"
              style={{
                backgroundColor: `rgb(${currentTheme.palette.accentRgb})`,
                boxShadow: 'var(--theme-glow)',
              }}
            />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Conditional Rendering based on ViewMode */}
      {viewMode === 'dashboard' || !activeProject ? (
        <div className="relative z-10 flex-1 flex flex-col">
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
        </div>
      ) : (
        <div
          className={`w-full min-h-screen transition-all duration-300 ${
            viewMode === 'slideshow'
              ? 'pointer-events-none select-none filter blur-[4px] opacity-80 scale-[0.995]'
              : ''
          }`}
        >
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
            onOpenShortcuts={() => setIsShortcutsOpen(true)}
            onShowToast={showToast}
          />
        </div>
      )}

      {/* Floating Translucent Glass / Ice Slideshow Overlay */}
      {viewMode === 'slideshow' && activeProject && (
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

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        neonAccent={settings.neonAccent}
      />

      <PathInputModal
        isOpen={isPathInputOpen}
        onClose={() => setIsPathInputOpen(false)}
        onSubmitPath={handleManualPathSubmit}
        onBrowseNative={handleOpenFolderPicker}
        neonAccent={settings.neonAccent}
      />

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