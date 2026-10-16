'use client';

import React, { useState } from 'react';
import { FolderProject, AppSettings } from '@/lib/types';
import {
  Play,
  RotateCcw,
  LayoutGrid,
  Archive,
  Trash2,
  FolderOpen,
  Image as ImageIcon,
  Film,
  FileQuestion,
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
  Check,
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
  onOpenDiagnostics,
}: ProjectListProps) {
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<FolderProject | null>(null);
  const [expandedSubfoldersProjId, setExpandedSubfoldersProjId] = useState<string | null>(null);

  const isOrange = settings.neonAccent === 'orange';

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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-100 via-slate-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-xl dark:shadow-2xl transition-colors duration-200">
        <div className="relative z-10 max-w-3xl space-y-4 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300">
            <Sparkles className={`w-3.5 h-3.5 ${isOrange ? 'text-orange-500' : 'text-emerald-500'}`} />
            <span>100% Client-Side Local Culling & Reviewer · Zero Uploads</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            High-Speed Photo & Video Culling, Fullscreen Slideshow & Gallery
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Pick any local folder on your computer to instantly review photos and videos at 100% native
            scale. Select key items with Spacebar or Left-Click, copy paths with Cmd+C, and export ZIP packages.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onAddFolderClick}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm text-white shadow-lg transition-all hover:scale-[1.02] ${
                isOrange
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 shadow-orange-600/30'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30'
              }`}
            >
              <FolderPlus className="w-5 h-5" />
              <span>Open Local Folder</span>
            </button>

            <button
              onClick={onEnterPathClick}
              className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors"
              title="Paste or enter a folder path manually"
            >
              <FolderInput className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Enter Path Manually</span>
            </button>

            {onLoadDemoProject && (
              <button
                onClick={onLoadDemoProject}
                className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 transition-all hover:scale-[1.02]"
                title="Instant Test with 8 sample photos and videos"
              >
                <Sparkles className="w-4 h-4 text-orange-500" />
                <span>Instant Test (Sample Photos)</span>
              </button>
            )}
          </div>
        </div>

        {/* Ambient decorative background glow */}
        <div
          className={`absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none ${
            isOrange ? 'bg-orange-500' : 'bg-emerald-500'
          }`}
        />
      </div>

      {/* Projects Grid Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4 text-left">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Projects & Folders</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Progress, review sessions, and cull selections persist automatically in your browser database
          </p>
        </div>
        <span className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-300 dark:border-slate-800">
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

          const hasSubfolders = (project.subfolders && project.subfolders.length > 0);
          const isExpanded = expandedSubfoldersProjId === project.id;
          const activeSubfolderCount = project.enabledSubfolders?.length ?? project.subfolders?.length ?? 0;

          return (
            <div
              key={project.id}
              className="group relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 p-5 shadow-sm dark:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4"
            >
              {/* Card Top: Folder Name & Big Percentage Metric */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FolderOpen className={`w-5 h-5 shrink-0 ${isOrange ? 'text-orange-500' : 'text-emerald-500'}`} />
                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate" title={project.name}>
                      {project.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Last active: {formatDate(project.lastAccessedAt)}</span>
                  </div>
                </div>

                {/* Big Percentage View Circle / Badge */}
                <div
                  className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl border text-center shrink-0 ${
                    isOrange
                      ? 'border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-300'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                  }`}
                  title={`${project.viewedCount} of ${project.mediaCount} media reviewed`}
                >
                  <span className="text-lg font-black tracking-tight tabular-nums font-mono leading-none">
                    {viewedPercent}%
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">viewed</span>
                </div>
              </div>

              {/* Card Metrics & Stats Breakdown */}
              <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                {/* Visual Progress Bar for Viewed Media */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Culling Progress:</span>
                    <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {project.viewedCount} / {project.mediaCount} media
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isOrange ? 'bg-orange-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${viewedPercent}%` }}
                    />
                  </div>
                </div>

                {/* Folder Size & Total Files Banner */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-0.5">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block flex items-center gap-1">
                      <HardDrive className="w-3 h-3 text-slate-400" />
                      Total Size:
                    </span>
                    <span className="font-mono tabular-nums font-bold text-slate-800 dark:text-slate-200">
                      {formatBytes(project.totalSizeBytes || 0)}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-0.5">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block flex items-center gap-1">
                      <Layers className="w-3 h-3 text-slate-400" />
                      Total Files:
                    </span>
                    <span className="font-mono tabular-nums font-bold text-slate-800 dark:text-slate-200">
                      {project.totalFilesCount?.toLocaleString() || project.mediaCount} files
                    </span>
                  </div>
                </div>

                {/* Media Types & Selected Breakdown Pills */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Playable media count */}
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-1">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Media Breakdown:</span>
                    <div className="flex items-center gap-3 font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                      <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
                        <ImageIcon className="w-3 h-3" /> {project.photosCount}
                      </span>
                      <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                        <Film className="w-3 h-3" /> {project.videosCount}
                      </span>
                    </div>
                  </div>

                  {/* Selected items count */}
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-1">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Selected (Culled):</span>
                    <div className="flex items-center gap-2 font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${isOrange ? 'text-orange-500' : 'text-emerald-500'}`} />
                      <span>{project.selectedCount}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({selectedPercent}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subfolder Toggle Accordion if project has subfolders */}
                {hasSubfolders && (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                    <button
                      onClick={() => setExpandedSubfoldersProjId(isExpanded ? null : project.id)}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950/80 flex items-center justify-between text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-900 transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span>Subfolders ({activeSubfolderCount} / {project.subfolders.length} active)</span>
                      </span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="p-3 bg-white dark:bg-slate-900 space-y-2 max-h-40 overflow-y-auto">
                        {/* Root files toggle */}
                        <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={project.includeRootFiles !== false}
                            onChange={() => toggleRootFiles(project)}
                            className="rounded border-slate-300 text-orange-600 focus:ring-0"
                          />
                          <span>Root-level files</span>
                        </label>

                        {/* Each Subfolder toggle */}
                        {project.subfolders.map((sf) => {
                          const isChecked = project.enabledSubfolders?.includes(sf) ?? true;
                          return (
                            <label
                              key={sf}
                              className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-700 dark:text-slate-300"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSubfolder(project, sf)}
                                className="rounded border-slate-300 text-orange-600 focus:ring-0"
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
              <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-slate-800/80">
                {/* Slideshow Actions Row */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onStartSlideshow(project, true)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-md ${
                      isOrange
                        ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/30'
                        : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                    }`}
                    title={project.lastViewedIndex > 0 ? `Resume at slide ${project.lastViewedIndex + 1}` : 'Play Slideshow'}
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{project.lastViewedIndex > 0 ? 'Resume Slideshow' : 'Play Slideshow'}</span>
                  </button>

                  <button
                    onClick={() => onOpenGallery(project)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 transition-colors"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Open Gallery</span>
                  </button>
                </div>

                {/* Secondary Row: Start from beginning & Action modal & Delete */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  {project.lastViewedIndex > 0 && (
                    <button
                      onClick={() => onStartSlideshow(project, false)}
                      className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                      title="Restart slideshow from first slide"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Start from First</span>
                    </button>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    {/* Action Center (ZIP, Copy/Move to Suffix Folder, Export TXT, Clipboard) */}
                    <button
                      onClick={() => onOpenActionModal(project)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                      title="Export ZIP, Copy/Move to Suffix Folder or Batch Actions"
                    >
                      <Archive className="w-3.5 h-3.5 text-orange-500" />
                      <span>Actions & Exports</span>
                    </button>

                    {/* Delete Folder */}
                    <button
                      onClick={() => setDeleteConfirmProject(project)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 text-left shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Move folder to Trash Bin?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{deleteConfirmProject.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80">
              This folder and all its selections and stats will be preserved safely in the **Trash Bin for 30 days**.
              If you re-add this folder later, previous selections and progress will be automatically recognized and restored.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmProject(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel (Esc)
              </button>
              <button
                onClick={() => {
                  onDeleteProject(deleteConfirmProject);
                  setDeleteConfirmProject(null);
                }}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 transition-colors"
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
