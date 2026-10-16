'use client';

import React, { useState } from 'react';
import { FolderProject, AppSettings } from '@/lib/types';
import { getTheme } from '@/lib/themes';
import {
  Play,
  RotateCcw,
  LayoutGrid,
  Archive,
  Trash2,
  FolderOpen,
  Image as ImageIcon,
  Film,
  CheckCircle2,
  Clock,
  Sparkles,
  FolderPlus,
  AlertTriangle,
  HardDrive,
  Layers,
  ChevronDown,
  ChevronUp,
  FolderInput,
} from 'lucide-react';

interface ProjectListProps {
  projects: FolderProject[];
  settings: AppSettings;
  onStartSlideshow: (project: FolderProject, resume: boolean) => void;
  onOpenGallery: (project: FolderProject) => void;
  onOpenActionModal: (project: FolderProject) => void;
  onDeleteProject: (project: FolderProject) => void;
  onAddFolderClick: () => void;
  onEnterPathClick: () => void;
  onUpdateProject: (updated: FolderProject) => void;
  onLoadDemoProject?: () => void;
  onOpenDiagnostics?: () => void;
}

export function ProjectList({
  projects,
  settings,
  onStartSlideshow,
  onOpenGallery,
  onOpenActionModal,
  onDeleteProject,
  onAddFolderClick,
  onEnterPathClick,
  onUpdateProject,
  onLoadDemoProject,
}: ProjectListProps) {
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<FolderProject | null>(null);
  const [expandedSubfoldersProjId, setExpandedSubfoldersProjId] = useState<string | null>(null);

  const isClient = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const isDarkMode =
    isClient && typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : settings.themeMode === 'dark' || settings.themeMode === 'system';

  const currentTheme = getTheme(settings.activeThemeId, isDarkMode);
  const isLiquidGlass = currentTheme.id === 'theme-3-liquid-glass';
  const isCupertino = currentTheme.id === 'theme-2-cupertino-frosted-pro';
  const rimClass = isLiquidGlass
    ? 'liquid-specular-rim'
    : isCupertino
    ? 'cupertino-vibrancy-rim'
    : '';

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (ms: number) => {
    return new Date(ms).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleSubfolder = (project: FolderProject, subfolderName: string) => {
    const currentEnabled = project.enabledSubfolders || project.subfolders || [];
    let updated: string[];
    if (currentEnabled.includes(subfolderName)) {
      updated = currentEnabled.filter((s) => s !== subfolderName);
    } else {
      updated = [...currentEnabled, subfolderName];
    }
    onUpdateProject({
      ...project,
      enabledSubfolders: updated,
    });
  };

  const toggleRootFiles = (project: FolderProject) => {
    const current = project.includeRootFiles !== false;
    onUpdateProject({
      ...project,
      includeRootFiles: !current,
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Hero Banner Section */}
      <div
        suppressHydrationWarning
        className={`relative overflow-hidden theme-surface border theme-border p-6 sm:p-10 shadow-xl transition-colors duration-200 ${rimClass}`}
        style={{ borderRadius: 'var(--theme-radius-panel, 12px)' }}
      >
        <div className="relative z-10 max-w-3xl space-y-4 text-left">
          <div
            suppressHydrationWarning
            style={{ borderRadius: 'var(--theme-radius-btn, 9999px)' }}
            className="inline-flex items-center gap-2 px-3 py-1 theme-surface-subtle border theme-border text-xs font-medium theme-text-secondary"
          >
            <Sparkles className="w-3.5 h-3.5 theme-accent" />
            <span>100% Client-Side Local Culling &amp; Reviewer • Zero Uploads</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold theme-heading theme-text tracking-tight leading-tight">
            High-Speed Photo &amp; Video Culling, Fullscreen Slideshow &amp; Gallery
          </h1>
          <p className="text-sm sm:text-base theme-text-secondary leading-relaxed">
            Pick any local folder on your computer to instantly review photos and videos at 100% native
            scale. Select key items with Spacebar or Left-Click, copy paths with Cmd+C, and export ZIP packages.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onAddFolderClick}
              suppressHydrationWarning
              style={{
                borderRadius: 'var(--theme-radius-btn, 4px)',
                backgroundColor: `rgb(${currentTheme.palette.accentRgb})`,
                color: currentTheme.palette.accentContrast,
              }}
              className="flex items-center gap-2.5 px-5 py-3 font-bold text-sm shadow-lg transition-all hover:opacity-90 active:scale-95"
            >
              <FolderPlus className="w-5 h-5" />
              <span>Open Local Folder</span>
            </button>
            <button
              onClick={onEnterPathClick}
              suppressHydrationWarning
              style={{ borderRadius: 'var(--theme-radius-btn, 4px)' }}
              className="flex items-center gap-2 px-4 py-3 font-semibold text-sm border theme-border theme-surface theme-btn theme-text"
              title="Paste or enter a folder path manually"
            >
              <FolderInput className="w-4 h-4 theme-text-muted" />
              <span>Enter Path Manually</span>
            </button>
            {onLoadDemoProject && (
              <button
                onClick={onLoadDemoProject}
                suppressHydrationWarning
                style={{ borderRadius: 'var(--theme-radius-btn, 4px)' }}
                className="flex items-center gap-2 px-4 py-3 font-semibold text-sm border theme-border theme-surface theme-btn theme-text transition-all active:scale-95"
                title="Instant Test with 8 sample photos and videos"
              >
                <Sparkles className="w-4 h-4 theme-accent" />
                <span>Instant Test (Sample Photos)</span>
              </button>
            )}
          </div>
        </div>

        {/* Ambient decorative background glow */}
        <div
          className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: `rgb(${currentTheme.palette.accentRgb})` }}
        />
      </div>

      {/* Projects Grid Header */}
      <div className="flex items-center justify-between border-b theme-border pb-4 text-left">
        <div>
          <h2 className="text-lg font-bold theme-heading theme-text">Active Projects &amp; Folders</h2>
          <p className="text-xs theme-text-secondary">
            Progress, review sessions, and cull selections persist automatically in your browser database
          </p>
        </div>
        <span className="text-xs font-mono theme-text px-3 py-1 rounded-full theme-surface border theme-border">
          {projects.length} Folders
        </span>
      </div>

      {/* Projects Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
        {projects.map((project) => {
          const viewedPercent =
            project.mediaCount > 0 ? Math.round((project.viewedCount / project.mediaCount) * 100) : 0;
          const selectedPercent =
            project.mediaCount > 0 ? Math.round((project.selectedCount / project.mediaCount) * 100) : 0;
          const hasSubfolders = project.subfolders && project.subfolders.length > 0;
          const isExpanded = expandedSubfoldersProjId === project.id;
          const activeSubfolderCount =
            project.enabledSubfolders?.length ?? project.subfolders?.length ?? 0;

          return (
            <div
              key={project.id}
              suppressHydrationWarning
              style={{
                borderRadius: 'var(--theme-radius-card, 4px)',
                borderColor: `rgba(${currentTheme.palette.accentRgb}, 0.25)`,
              }}
              className={`group relative theme-card border p-5 shadow-sm transition-all duration-300 flex flex-col justify-between space-y-4 ${rimClass}`}
            >
              {/* Card Top: Folder Name & Big Percentage Metric */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 shrink-0 theme-accent" />
                    <h3 className="text-base font-bold theme-heading theme-text truncate" title={project.name}>
                      {project.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs theme-text-muted">
                    <Clock className="w-3 h-3 theme-text-muted" />
                    <span suppressHydrationWarning>Last active: {formatDate(project.lastAccessedAt)}</span>
                  </div>
                </div>

                {/* Big Percentage View Circle / Badge */}
                <div
                  suppressHydrationWarning
                  style={{
                    borderRadius: 'var(--theme-radius-btn, 4px)',
                    borderColor: `rgba(${currentTheme.palette.accentRgb}, 0.35)`,
                    backgroundColor: `rgba(${currentTheme.palette.accentRgb}, 0.12)`,
                    color: `rgb(${currentTheme.palette.accentRgb})`,
                  }}
                  className="flex flex-col items-center justify-center w-16 h-16 border text-center shrink-0 shadow-inner"
                  title={`${project.viewedCount} of ${project.mediaCount} media reviewed`}
                >
                  <span className="text-lg font-black tracking-tight tabular-nums font-mono leading-none">
                    {viewedPercent}%
                  </span>
                  <span className="text-[10px] theme-text-muted font-normal mt-0.5">viewed</span>
                </div>
              </div>

              {/* Card Metrics & Stats Breakdown */}
              <div className="space-y-3 pt-1 border-t theme-border">
                {/* Visual Progress Bar for Viewed Media */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs theme-text-secondary">
                    <span>Culling Progress:</span>
                    <span className="font-mono tabular-nums theme-text">
                      {project.viewedCount} / {project.mediaCount} media
                    </span>
                  </div>
                  <div className="w-full h-1.5 theme-surface-subtle rounded-full overflow-hidden border theme-border">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${viewedPercent}%`,
                        backgroundColor: `rgb(${currentTheme.palette.accentRgb})`,
                        boxShadow: 'var(--theme-glow)',
                      }}
                    />
                  </div>
                </div>

                {/* Folder Size & Total Files Banner */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg theme-surface-subtle border theme-border space-y-0.5">
                    <span className="text-[11px] theme-text-muted block flex items-center gap-1">
                      <HardDrive className="w-3 h-3 theme-text-muted" />
                      Total Size:
                    </span>
                    <span className="font-mono tabular-nums font-bold theme-text">
                      {formatBytes(project.totalSizeBytes || 0)}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg theme-surface-subtle border theme-border space-y-0.5">
                    <span className="text-[11px] theme-text-muted block flex items-center gap-1">
                      <Layers className="w-3 h-3 theme-text-muted" />
                      Total Files:
                    </span>
                    <span className="font-mono tabular-nums font-bold theme-text">
                      {project.totalFilesCount?.toLocaleString() || project.mediaCount} files
                    </span>
                  </div>
                </div>

                {/* Media Types & Selected Breakdown Pills */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg theme-surface-subtle border theme-border space-y-1">
                    <span className="text-[11px] theme-text-muted block">Media Breakdown:</span>
                    <div className="flex items-center gap-3 font-mono tabular-nums font-semibold theme-text">
                      <span className="flex items-center gap-1 text-sky-500">
                        <ImageIcon className="w-3 h-3" /> {project.photosCount}
                      </span>
                      <span className="flex items-center gap-1 text-purple-500">
                        <Film className="w-3 h-3" /> {project.videosCount}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg theme-surface-subtle border theme-border space-y-1">
                    <span className="text-[11px] theme-text-muted block">Selected (Culled):</span>
                    <div className="flex items-center gap-2 font-mono tabular-nums font-bold theme-text">
                      <CheckCircle2 className="w-3.5 h-3.5 theme-accent" />
                      <span>{project.selectedCount}</span>
                      <span className="text-[10px] theme-text-muted font-normal">
                        ({selectedPercent}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subfolder Toggle Accordion if project has subfolders */}
                {hasSubfolders && (
                  <div className="border theme-border rounded-xl overflow-hidden text-xs theme-surface-subtle">
                    <button
                      onClick={() => setExpandedSubfoldersProjId(isExpanded ? null : project.id)}
                      className="w-full px-3 py-2 flex items-center justify-between theme-text font-medium theme-btn transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 theme-text-muted" />
                        <span>Subfolders ({activeSubfolderCount} / {project.subfolders.length} active)</span>
                      </span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {isExpanded && (
                      <div className="p-3 theme-surface space-y-2 max-h-40 overflow-y-auto border-t theme-border">
                        <label className="flex items-center gap-2 cursor-pointer text-[11px] theme-text">
                          <input
                            type="checkbox"
                            checked={project.includeRootFiles !== false}
                            onChange={() => toggleRootFiles(project)}
                            className="rounded theme-border theme-accent accent-cyan-500 cursor-pointer"
                          />
                          <span>Root-level files</span>
                        </label>
                        {project.subfolders.map((sf) => {
                          const isChecked = project.enabledSubfolders?.includes(sf) ?? true;
                          return (
                            <label
                              key={sf}
                              className="flex items-center gap-2 cursor-pointer text-[11px] theme-text"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSubfolder(project, sf)}
                                className="rounded theme-border theme-accent accent-cyan-500 cursor-pointer"
                              />
                              <span className="truncate">{sf}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card Action Buttons */}
              <div className="pt-2 space-y-2 border-t theme-border">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onStartSlideshow(project, true)}
                    suppressHydrationWarning
                    style={{
                      borderRadius: 'var(--theme-radius-btn, 4px)',
                      backgroundColor: `rgb(${currentTheme.palette.accentRgb})`,
                      color: currentTheme.palette.accentContrast,
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all shadow-md hover:opacity-90 active:scale-95"
                    title={project.lastViewedIndex > 0 ? `Resume at slide ${project.lastViewedIndex + 1}` : 'Play Slideshow'}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{project.lastViewedIndex > 0 ? 'Resume Slideshow' : 'Play Slideshow'}</span>
                  </button>
                  <button
                    onClick={() => onOpenGallery(project)}
                    suppressHydrationWarning
                    style={{ borderRadius: 'var(--theme-radius-btn, 4px)' }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold border theme-border theme-surface theme-btn theme-text"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Open Gallery</span>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  {project.lastViewedIndex > 0 && (
                    <button
                      onClick={() => onStartSlideshow(project, false)}
                      className="flex items-center gap-1 text-[11px] theme-text-muted hover:theme-text transition-colors"
                      title="Restart slideshow from first slide"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Start from First</span>
                    </button>
                  )}
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => onOpenActionModal(project)}
                      suppressHydrationWarning
                      style={{ borderRadius: 'var(--theme-radius-btn, 4px)' }}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium border theme-border theme-surface theme-btn theme-text"
                      title="Export ZIP, Copy/Move to Suffix Folder or Batch Actions"
                    >
                      <Archive className="w-3.5 h-3.5 theme-accent" />
                      <span>Actions &amp; Exports</span>
                    </button>
                    <button
                      onClick={() => setDeleteConfirmProject(project)}
                      suppressHydrationWarning
                      style={{ borderRadius: 'var(--theme-radius-btn, 4px)' }}
                      className="p-1.5 theme-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="Move Folder to 30-Day Trash Bin"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmProject && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteConfirmProject(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 theme-modal-backdrop animate-in fade-in duration-200"
        >
          <div className={`theme-modal-window w-full max-w-md p-6 space-y-4 text-left shadow-2xl ${rimClass}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold theme-heading theme-text">Move folder to Trash Bin?</h3>
                <p className="text-xs theme-text-muted mt-0.5">{deleteConfirmProject.name}</p>
              </div>
            </div>
            <p className="text-xs theme-text-secondary leading-relaxed theme-surface-subtle p-3 rounded-xl border theme-border">
              This folder and all its selections and stats will be preserved safely in the <strong>Trash Bin for 30 days</strong>.
              If you re-add this folder later, previous selections and progress will be automatically recognized and restored.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmProject(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium theme-text-secondary hover:theme-text theme-surface theme-btn border theme-border transition-colors"
              >
                Cancel (Esc)
              </button>
              <button
                onClick={() => {
                  onDeleteProject(deleteConfirmProject);
                  setDeleteConfirmProject(null);
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 transition-colors"
              >
                Move to Trash Bin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}