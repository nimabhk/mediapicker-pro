'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { FolderProject, MediaFileItem, AppSettings, GallerySortOption } from '@/lib/types';
import { naturalSortCompare } from '@/lib/file-scanner';
import { formatClipboardPaths } from '@/lib/zip-exporter';
import { getMediaSourceUrl, isTauri } from '@/lib/tauri-bridge';
import {
  Search,
  Play,
  CheckCircle2,
  Eye,
  AlertCircle,
  Film,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  X,
  Archive,
  ArrowUpDown,
  Filter,
  Grid,
  Square,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  SlidersHorizontal,
  BookmarkCheck,
  Maximize,
  CheckCheck,
  CheckSquare,
  Sparkles,
} from 'lucide-react';

interface GalleryViewProps {
  project: FolderProject;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onUpdateProject: (updatedProject: FolderProject) => void;
  onStartSlideshow: (startIndex: number) => void;
  onClose: () => void;
  onOpenActionModal: () => void;
  onShowToast: (message: string) => void;
}

export function GalleryView({
  project,
  settings,
  onUpdateSettings,
  onUpdateProject,
  onStartSlideshow,
  onClose,
  onOpenActionModal,
  onShowToast,
}: GalleryViewProps) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'selected' | 'unselected' | 'images' | 'videos'>('all');

  // Per-folder saved defaults or initial fallback
  const [sortOption, setSortOption] = useState<GallerySortOption>(
    () => project.gallerySortOption || 'folder_name'
  );
  const [columns, setColumns] = useState<number>(() => project.galleryColumns || 6);
  const [containerWidthPercent, setContainerWidthPercent] = useState<number>(
    () => project.galleryContainerWidthPercent || 100
  );
  const [layoutMode, setLayoutMode] = useState<'aspect' | 'square'>(
    () => project.galleryLayoutMode || 'aspect'
  );

  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [rangeStartId, setRangeStartId] = useState<string | null>(null);

  // Confirmation Modal state for bulk selection actions
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'select_all' | 'clear' | 'invert';
    title: string;
    description: string;
  } | null>(null);

  // Marquee drag-selection box state
  const [dragBox, setDragBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isCtrl: boolean;
    isShift: boolean;
  } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const anchorItemIdRef = useRef<string | null>(null);

  const itemsPerPage = settings.itemsPerPage || 1000;

  // Persist per-folder preferences whenever they change
  const updateProjectPreferences = useCallback(
    (overrides: Partial<FolderProject>) => {
      onUpdateProject({
        ...project,
        ...overrides,
      });
    },
    [project, onUpdateProject]
  );

  // Sync state changes with persistence
  const handleSortChange = (newSort: GallerySortOption) => {
    setSortOption(newSort);
    updateProjectPreferences({ gallerySortOption: newSort });
  };

  const handleColumnsChange = (newCols: number) => {
    // Preserve top visible item scroll anchor before change
    recordScrollAnchor();
    setColumns(newCols);
    updateProjectPreferences({ galleryColumns: newCols });
  };

  const handleWidthChange = (newWidth: number) => {
    recordScrollAnchor();
    setContainerWidthPercent(newWidth);
    updateProjectPreferences({ galleryContainerWidthPercent: newWidth });
  };

  const handleLayoutModeChange = (newMode: 'aspect' | 'square') => {
    recordScrollAnchor();
    setLayoutMode(newMode);
    updateProjectPreferences({ galleryLayoutMode: newMode });
  };

  // Find topmost visible card element to preserve anchor
  const recordScrollAnchor = useCallback(() => {
    if (typeof window === 'undefined') return;
    const cards = document.querySelectorAll<HTMLElement>('[data-gallery-item-id]');
    const viewportTop = 130; // approx below sticky toolbar
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      if (rect.bottom >= viewportTop) {
        anchorItemIdRef.current = cards[i].getAttribute('data-gallery-item-id');
        break;
      }
    }
  }, []);

  // Restore scroll anchor after real-time column or width slider changes
  useEffect(() => {
    if (!anchorItemIdRef.current) return;
    const targetId = anchorItemIdRef.current;
    // Short requestAnimationFrame delay so layout recalculation is done
    const raf = requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-gallery-item-id="${targetId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'auto', block: 'nearest' });
      }
      anchorItemIdRef.current = null;
    });
    return () => cancelAnimationFrame(raf);
  }, [columns, containerWidthPercent, layoutMode]);

  // Filter items by project active subfolders first
  const baseItems = useMemo(() => {
    return project.items.filter((item) => {
      if (!item.subfolder) {
        return project.includeRootFiles !== false;
      }
      return project.enabledSubfolders?.includes(item.subfolder) ?? true;
    });
  }, [project.items, project.enabledSubfolders, project.includeRootFiles]);

  // Generate or get objectUrl for media
  const getMediaUrl = useCallback((item: MediaFileItem): string => {
    return getMediaSourceUrl(item);
  }, []);

  // Filtered and Sorted items
  const processedItems = useMemo(() => {
    const filtered = baseItems.filter((item) => {
      if (searchQuery.trim() && !item.name.toLowerCase().includes(searchQuery.toLowerCase().trim())) {
        return false;
      }
      if (filterType === 'selected') return item.selected;
      if (filterType === 'unselected') return !item.selected;
      if (filterType === 'images') return item.type === 'image';
      if (filterType === 'videos') return item.type === 'video';
      return true;
    });

    // Sorting
    return filtered.sort((a, b) => {
      switch (sortOption) {
        case 'name_asc':
          return naturalSortCompare(a.name, b.name);
        case 'name_desc':
          return naturalSortCompare(b.name, a.name);
        case 'folder_name':
          return naturalSortCompare(a.relativePath, b.relativePath);
        case 'date_newest':
          return (b.lastModified || 0) - (a.lastModified || 0);
        case 'date_oldest':
          return (a.lastModified || 0) - (b.lastModified || 0);
        case 'size_desc':
          return b.size - a.size;
        case 'size_asc':
          return a.size - b.size;
        case 'type':
          return a.type === b.type ? naturalSortCompare(a.name, b.name) : a.type === 'image' ? -1 : 1;
        default:
          return naturalSortCompare(a.relativePath, b.relativePath);
      }
    });
  }, [baseItems, searchQuery, filterType, sortOption]);

  const totalPages = Math.max(1, Math.ceil(processedItems.length / itemsPerPage));

  // Current page slice
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedItems.slice(start, start + itemsPerPage);
  }, [processedItems, currentPage, itemsPerPage]);

  // Toggle selection
  const toggleSelect = useCallback(
    (id: string) => {
      const newItems = project.items.map((item) => {
        if (item.id === id) {
          return { ...item, selected: !item.selected };
        }
        return item;
      });
      const selectedCount = newItems.filter((i) => i.selected).length;
      onUpdateProject({
        ...project,
        items: newItems,
        selectedCount,
      });
    },
    [project, onUpdateProject]
  );

  // Track whether we've already auto-scrolled on mount to avoid infinite loops
  const hasAutoScrolledOnMountRef = useRef<boolean>(false);

  // Jump to Last Reviewed Slide (Manual Button Click)
  const handleJumpToLastReviewed = useCallback(() => {
    const lastIdx = project.lastViewedIndex || 0;
    const targetItem = baseItems[lastIdx];
    if (!targetItem) {
      onShowToast('No reviewed items found yet.');
      return;
    }

    // Check if item is in processed list
    const foundProcessedIdx = processedItems.findIndex((i) => i.id === targetItem.id);
    if (foundProcessedIdx === -1) {
      onShowToast(`Item "${targetItem.name}" is filtered out in current filter.`);
      return;
    }

    // Switch to page containing this item
    const targetPage = Math.floor(foundProcessedIdx / itemsPerPage) + 1;
    if (targetPage !== currentPage) {
      setCurrentPage(targetPage);
    }

    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-gallery-item-id="${targetItem.id}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedItemId(targetItem.id);
        setTimeout(() => setHighlightedItemId(null), 2500);
      }
    }, 120);

    onShowToast(`Jumped to last reviewed item: ${targetItem.name}`);
  }, [project.lastViewedIndex, baseItems, processedItems, itemsPerPage, currentPage, onShowToast]);

  // Auto-scroll ONCE on mount to last reviewed slide if present (silent, zero loop)
  useEffect(() => {
    if (hasAutoScrolledOnMountRef.current) return;
    if (project.lastViewedIndex !== undefined && project.lastViewedIndex > 0) {
      hasAutoScrolledOnMountRef.current = true;
      const lastIdx = project.lastViewedIndex || 0;
      const targetItem = baseItems[lastIdx];
      if (!targetItem) return;

      const foundProcessedIdx = processedItems.findIndex((i) => i.id === targetItem.id);
      if (foundProcessedIdx === -1) return;

      const targetPage = Math.floor(foundProcessedIdx / itemsPerPage) + 1;

      const timer = setTimeout(() => {
        if (targetPage !== currentPage) {
          setCurrentPage(targetPage);
        }
        requestAnimationFrame(() => {
          const el = document.querySelector<HTMLElement>(`[data-gallery-item-id="${targetItem.id}"]`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedItemId(targetItem.id);
            setTimeout(() => setHighlightedItemId(null), 2500);
          }
        });
      }, 150);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shift-click range selection or normal click selection
  const handleItemClick = useCallback(
    (id: string, e: React.MouseEvent) => {
      if (isDraggingRef.current) return;

      if (e.shiftKey) {
        if (!rangeStartId) {
          setRangeStartId(id);
          onShowToast('Range start set. Shift+Click another image to complete range.');
        } else {
          const idxA = processedItems.findIndex((i) => i.id === rangeStartId);
          const idxB = processedItems.findIndex((i) => i.id === id);
          if (idxA !== -1 && idxB !== -1) {
            const minIdx = Math.min(idxA, idxB);
            const maxIdx = Math.max(idxA, idxB);
            const rangeIds = new Set(processedItems.slice(minIdx, maxIdx + 1).map((i) => i.id));
            const newItems = project.items.map((item) => {
              if (rangeIds.has(item.id)) {
                return { ...item, selected: true };
              }
              return item;
            });
            const newSelectedCount = newItems.filter((i) => i.selected).length;
            onUpdateProject({
              ...project,
              items: newItems,
              selectedCount: newSelectedCount,
            });
            onShowToast(`Selected ${rangeIds.size} files in range.`);
          }
          setRangeStartId(null);
        }
      } else {
        // Normal click: clear range start and toggle select
        setRangeStartId(null);
        toggleSelect(id);
      }
    },
    [rangeStartId, processedItems, project, onUpdateProject, onShowToast, toggleSelect]
  );

  // Bulk Selection Confirmation Prompts
  const promptSelectAll = () => {
    setConfirmModal({
      isOpen: true,
      type: 'select_all',
      title: 'Select All Files?',
      description: `Are you sure you want to select all ${processedItems.length} media files in this project?`,
    });
  };

  const promptClearSelection = () => {
    if (selectedCount === 0) {
      onShowToast('No selected files to clear.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      type: 'clear',
      title: 'Clear All Selections?',
      description: `Are you sure you want to deselect all media files in this project?`,
    });
  };

  const promptInvertSelection = () => {
    setConfirmModal({
      isOpen: true,
      type: 'invert',
      title: 'Invert Selection?',
      description: `Are you sure you want to invert selections for all files in this project? Currently ${selectedCount} of ${project.items.length} files are selected.`,
    });
  };

  const handleConfirmAction = () => {
    if (!confirmModal) return;
    if (confirmModal.type === 'select_all') {
      const targetIds = new Set(processedItems.map((i) => i.id));
      const updated = project.items.map((i) => (targetIds.has(i.id) ? { ...i, selected: true } : i));
      const newCount = updated.filter((i) => i.selected).length;
      onUpdateProject({ ...project, items: updated, selectedCount: newCount });
      onShowToast(`Selected all ${targetIds.size} files.`);
    } else if (confirmModal.type === 'clear') {
      const updated = project.items.map((i) => ({ ...i, selected: false }));
      onUpdateProject({ ...project, items: updated, selectedCount: 0 });
      onShowToast('Cleared all selections.');
    } else if (confirmModal.type === 'invert') {
      const targetIds = new Set(processedItems.map((i) => i.id));
      const updated = project.items.map((i) => (targetIds.has(i.id) ? { ...i, selected: !i.selected } : i));
      const newCount = updated.filter((i) => i.selected).length;
      onUpdateProject({ ...project, items: updated, selectedCount: newCount });
      onShowToast(`Inverted selections: ${newCount} files are now selected.`);
    }
    setConfirmModal(null);
  };

  // Marquee Drag Selection Handlers
  const handleGridMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('select')
    ) {
      return;
    }
    setDragBox({
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      isCtrl: e.ctrlKey || e.metaKey,
      isShift: e.shiftKey,
    });
    isDraggingRef.current = false;
  };

  useEffect(() => {
    if (!dragBox) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = Math.abs(e.clientX - dragBox.startX);
      const dy = Math.abs(e.clientY - dragBox.startY);
      if (dx > 6 || dy > 6) {
        isDraggingRef.current = true;
        setIsDragging(true);
      }
      setDragBox((prev) =>
        prev
          ? {
              ...prev,
              currentX: e.clientX,
              currentY: e.clientY,
              isCtrl: e.ctrlKey || e.metaKey,
              isShift: e.shiftKey,
            }
          : null
      );
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDraggingRef.current && dragBox) {
        const minX = Math.min(dragBox.startX, e.clientX);
        const maxX = Math.max(dragBox.startX, e.clientX);
        const minY = Math.min(dragBox.startY, e.clientY);
        const maxY = Math.max(dragBox.startY, e.clientY);

        const cards = document.querySelectorAll<HTMLElement>('[data-gallery-item-id]');
        const targetIds = new Set<string>();

        cards.forEach((card) => {
          const rect = card.getBoundingClientRect();
          if (
            rect.right >= minX &&
            rect.left <= maxX &&
            rect.bottom >= minY &&
            rect.top <= maxY
          ) {
            const id = card.getAttribute('data-gallery-item-id');
            if (id) targetIds.add(id);
          }
        });

        if (targetIds.size > 0) {
          const isCtrl = e.ctrlKey || e.metaKey || dragBox.isCtrl;
          const isShift = e.shiftKey || dragBox.isShift;

          let updated = [...project.items];
          let actionLabel = '';

          if (isCtrl && isShift) {
            // Invert files inside box
            updated = updated.map((i) =>
              targetIds.has(i.id) ? { ...i, selected: !i.selected } : i
            );
            actionLabel = `Inverted ${targetIds.size} files in selection box`;
          } else if (isCtrl) {
            // Deselect files inside box
            updated = updated.map((i) =>
              targetIds.has(i.id) ? { ...i, selected: false } : i
            );
            actionLabel = `Deselected ${targetIds.size} files in selection box`;
          } else {
            // Select files inside box
            updated = updated.map((i) =>
              targetIds.has(i.id) ? { ...i, selected: true } : i
            );
            actionLabel = `Selected ${targetIds.size} files in selection box`;
          }

          const newSelectedCount = updated.filter((i) => i.selected).length;
          onUpdateProject({
            ...project,
            items: updated,
            selectedCount: newSelectedCount,
          });
          onShowToast(actionLabel);
        }
      }

      setDragBox(null);
      setIsDragging(false);
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 60);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragBox, project, onUpdateProject, onShowToast]);

  // Manual reveal of >5MB or >100MB files
  const revealMedia = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  // Copy selected paths to clipboard
  const handleCopyClipboard = useCallback(async () => {
    const selected = project.items.filter((i) => i.selected);
    if (selected.length === 0) {
      onShowToast('No media selected yet.');
      return;
    }
    const text = formatClipboardPaths(selected, settings.clipboardFormat);
    try {
      await navigator.clipboard.writeText(text);
      onShowToast(`Copied ${selected.length} path(s) to clipboard.`);
    } catch {
      onShowToast('Clipboard access was denied by browser.');
    }
  }, [project.items, settings.clipboardFormat, onShowToast]);

  // Keyboard shortcuts in gallery
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElem = document.activeElement;
      const isInput = activeElem?.tagName === 'INPUT' || activeElem?.tagName === 'TEXTAREA';

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopyClipboard();
        return;
      }
      if (e.key === 'Backspace' && !isInput) {
        e.preventDefault();
        onClose(); // Backspace returns to Dashboard from Gallery
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopyClipboard, onClose]);

  const isOrange = settings.neonAccent === 'orange';
  const selectedCount = project.items.filter((i) => i.selected).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* 1. STICKY TOP TOOLBAR */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-2.5 transition-colors shadow-sm">
        <div className="max-w-[1920px] mx-auto flex flex-col gap-2.5">
          {/* Top Row: Title, Filters, Search & Primary Actions */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Left: Project title & Back button */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Return to Dashboard (Backspace / Esc)"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="text-left">
                <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-xs">{project.name}</h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {processedItems.length} media · {columns} per row · {containerWidthPercent}% width
                </p>
              </div>
            </div>

            {/* Center: Search, Filters, and Sorting Dropdown */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-center flex-wrap">
              {/* Search Input */}
              <div className="relative min-w-[130px] sm:w-40">
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'selected', label: `Selected (${selectedCount})` },
                  { id: 'images', label: 'Photos' },
                  { id: 'videos', label: 'Videos' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setFilterType(tab.id as any);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                      filterType === tab.id
                        ? isOrange
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-emerald-500 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Batch Selection Helpers with Confirmation */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={promptSelectAll}
                  className="px-2 py-1 rounded text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                  title="Select All files in current view (confirmation prompt)"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={promptClearSelection}
                  className="px-2 py-1 rounded text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                  title="Deselect all files in project (confirmation prompt)"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={promptInvertSelection}
                  className="px-2 py-1 rounded text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                  title="Invert current file selections (confirmation prompt)"
                >
                  Invert
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-300">
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                <select
                  value={sortOption}
                  onChange={(e) => handleSortChange(e.target.value as GallerySortOption)}
                  className="bg-transparent border-none text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="folder_name" className="bg-white dark:bg-slate-900">Folder & Name</option>
                  <option value="name_asc" className="bg-white dark:bg-slate-900">Name (A-Z)</option>
                  <option value="name_desc" className="bg-white dark:bg-slate-900">Name (Z-A)</option>
                  <option value="date_newest" className="bg-white dark:bg-slate-900">Date Modified (Newest)</option>
                  <option value="date_oldest" className="bg-white dark:bg-slate-900">Date Modified (Oldest)</option>
                  <option value="size_desc" className="bg-white dark:bg-slate-900">Size (Largest)</option>
                  <option value="size_asc" className="bg-white dark:bg-slate-900">Size (Smallest)</option>
                  <option value="type" className="bg-white dark:bg-slate-900">Media Type</option>
                </select>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Jump to Last Reviewed */}
              <button
                onClick={handleJumpToLastReviewed}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Scroll to last reviewed media slide"
              >
                <BookmarkCheck className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Last Reviewed</span>
              </button>

              {/* Sound toggle */}
              <button
                onClick={() => onUpdateSettings({ globalMuted: !settings.globalMuted })}
                className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                title={settings.globalMuted ? 'Audio Muted (M)' : 'Audio Active (M)'}
              >
                {settings.globalMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-emerald-500" />}
              </button>

              {/* Quick Actions modal */}
              <button
                onClick={onOpenActionModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Export ZIP and Batch Actions"
              >
                <Archive className="w-3.5 h-3.5 text-orange-500" />
                <span>Actions & Export</span>
              </button>

              {/* Start Slideshow from beginning */}
              <button
                onClick={() => onStartSlideshow(0)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all shadow-sm ${
                  isOrange
                    ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>Play Slideshow</span>
              </button>
            </div>
          </div>

          {/* Bottom Sub-Toolbar: Layout Controls, Column Slider, Container Width Slider & Zoom Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/80 dark:border-slate-800/80 text-xs">
            {/* Left: Layout Mode Toggle (Natural Aspect Ratio vs Uniform Square) */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Layout:</span>
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => handleLayoutModeChange('aspect')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    layoutMode === 'aspect'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Natural Aspect Ratio (Default: preserves real photo proportions)"
                >
                  <Grid className="w-3 h-3 text-orange-500" />
                  <span>Natural Aspect</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLayoutModeChange('square')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    layoutMode === 'square'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Square Grid (Cropped 1:1 thumbnails)"
                >
                  <Square className="w-3 h-3 text-slate-400" />
                  <span>Square</span>
                </button>
              </div>
            </div>

            {/* Center-Left: Thumbnails Per Row Slider (1 to 10, default 6) */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1">
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Thumbnails / Row:</span>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={columns}
                onChange={(e) => handleColumnsChange(parseInt(e.target.value) || 6)}
                className="w-24 sm:w-32 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums min-w-[20px] text-center">
                {columns}
              </span>
            </div>

            {/* Center-Right: Container Width Slider (20% to 100%, default 100%) */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1">
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Container Width:</span>
              <input
                type="range"
                min="20"
                max="100"
                step="5"
                value={containerWidthPercent}
                onChange={(e) => handleWidthChange(parseInt(e.target.value) || 100)}
                className="w-24 sm:w-32 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums min-w-[35px] text-center">
                {containerWidthPercent}%
              </span>
            </div>

            {/* Right: Dedicated Gallery Zoom Step Controls (+, -, Reset) */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => handleColumnsChange(Math.min(10, columns + 1))}
                disabled={columns >= 10}
                className="p-1 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                title="Decrease Thumbnail Size (More columns)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  handleColumnsChange(6);
                  handleWidthChange(100);
                }}
                className="px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                title="Reset Grid & Container Width to Defaults"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => handleColumnsChange(Math.max(1, columns - 1))}
                disabled={columns <= 1}
                className="p-1 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                title="Increase Thumbnail Size (Fewer columns)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Pagination Bar (if multiple pages of 1000 items) */}
        {totalPages > 1 && (
          <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 max-w-[1920px] mx-auto">
            <span>
              Showing items {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, processedItems.length)} of {processedItems.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="p-1 rounded bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono tabular-nums text-slate-900 dark:text-white">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="p-1 rounded bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. MEDIA GRID CONTAINER (Responsive Centered Width Container) */}
      <div
        ref={gridContainerRef}
        onMouseDown={handleGridMouseDown}
        className="flex-1 mx-auto w-full p-4 sm:p-6 transition-all duration-150 ease-out select-none"
        style={{ width: `${containerWidthPercent}%`, maxWidth: `${containerWidthPercent}%` }}
      >
        {pageItems.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <AlertCircle className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
            <p className="text-sm text-slate-600 dark:text-slate-300">No media found matching current filter.</p>
          </div>
        ) : (
          <div
            className="grid gap-3 sm:gap-4 transition-all duration-150"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {pageItems.map((item) => {
              const isSelected = item.selected;
              const isHighlighted = highlightedItemId === item.id;
              const isLastViewed = baseItems[project.lastViewedIndex || 0]?.id === item.id;
              const isRangeStart = rangeStartId === item.id;

              const sizeMB = item.size / (1024 * 1024);
              const limitMB = item.type === 'image' ? (settings.imageSizeLimitMB || 5) : (settings.videoSizeLimitMB || 100);
              const isHeavy = sizeMB > limitMB;
              const isRevealed = isTauri() || revealedIds.has(item.id) || !isHeavy;

              let cardRingStyle = 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700';

              if (isRangeStart) {
                cardRingStyle = 'border-2 border-dashed border-sky-400 ring-4 ring-sky-400/50 shadow-[0_0_25px_rgba(56,189,248,0.7)] animate-pulse';
              } else if (isHighlighted) {
                cardRingStyle = 'ring-4 ring-amber-300 scale-[1.02] shadow-[0_0_35px_rgba(251,191,36,0.9)] border-amber-300';
              } else if (isLastViewed) {
                cardRingStyle = isSelected
                  ? (isOrange
                      ? 'ring-2 ring-orange-500 shadow-[0_0_22px_rgba(249,115,22,0.8)] border-amber-400'
                      : 'ring-2 ring-emerald-500 shadow-[0_0_22px_rgba(16,185,129,0.8)] border-amber-400')
                  : 'ring-2 ring-amber-400/90 shadow-[0_0_20px_rgba(251,191,36,0.6)] border-amber-400/90';
              } else if (isSelected) {
                cardRingStyle = isOrange
                  ? 'ring-2 ring-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.6)] border-orange-500'
                  : 'ring-2 ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.6)] border-emerald-500';
              }

              return (
                <div
                  key={item.id}
                  data-gallery-item-id={item.id}
                  onClick={(e) => handleItemClick(item.id, e)}
                  onMouseEnter={() => {
                    if (item.type === 'video') setHoveredVideoId(item.id);
                  }}
                  onMouseLeave={() => {
                    if (item.type === 'video') setHoveredVideoId(null);
                  }}
                  className={`group relative rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-900 border transition-all cursor-pointer flex flex-col justify-between ${cardRingStyle} ${
                    layoutMode === 'square' ? 'aspect-square' : 'min-h-[160px]'
                  }`}
                >
                  {/* Media Content or Heavy File Badge */}
                  {!isRevealed ? (
                    <div className="w-full h-full min-h-[180px] flex flex-col items-center justify-center p-3 text-center bg-slate-100 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 space-y-2">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                        {item.type === 'video' ? <Film className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                      </div>
                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        Size: {sizeMB.toFixed(1)} MB
                      </span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {item.type === 'image' ? `Over ${settings.imageSizeLimitMB} MB limit` : `Over ${settings.videoSizeLimitMB} MB limit`}
                      </p>
                      <button
                        onClick={(e) => revealMedia(item.id, e)}
                        className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-[11px] text-slate-900 dark:text-white flex items-center gap-1 transition-colors border border-slate-300 dark:border-slate-700 shadow-sm"
                        title="Load and reveal media"
                      >
                        <Eye className="w-3 h-3 text-sky-500" />
                        <span>Reveal</span>
                      </button>
                    </div>
                  ) : item.type === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getMediaUrl(item)}
                      alt={item.name}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (isTauri() && item.absolutePath && !target.dataset.triedFallback) {
                          target.dataset.triedFallback = 'true';
                          const clean = item.absolutePath.replace(/^[/\\]+/, '');
                          target.src = `mediapicker://localhost/${encodeURIComponent(clean)}`;
                          return;
                        }
                        if (!target.dataset.fallbackSvg && item.demoSvgUrl) {
                          target.dataset.fallbackSvg = 'true';
                          target.src = item.demoSvgUrl;
                        }
                      }}
                      className={`w-full ${
                        layoutMode === 'square'
                          ? 'h-full object-cover'
                          : 'h-auto max-h-[460px] object-contain bg-slate-900/40'
                      } transition-transform duration-300 group-hover:scale-105`}
                    />
                  ) : (
                    <video
                      src={getMediaUrl(item)}
                      muted={settings.globalMuted}
                      loop
                      playsInline
                      autoPlay={hoveredVideoId === item.id}
                      className={`w-full ${
                        layoutMode === 'square'
                          ? 'h-full object-cover'
                          : 'h-auto max-h-[460px] object-contain bg-slate-900/40'
                      }`}
                    />
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10 gap-1">
                    <div className="flex items-center gap-1">
                      <div className="p-1 rounded bg-black/60 backdrop-blur-sm text-slate-200">
                        {item.type === 'video' ? <Film className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                      </div>

                      {isRangeStart && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500 text-white shadow-md animate-pulse">
                          Range Start
                        </span>
                      )}

                      {isLastViewed && !isRangeStart && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-400 text-slate-950 shadow-md flex items-center gap-0.5">
                          <BookmarkCheck className="w-2.5 h-2.5 text-slate-950" />
                          Last Slide
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <div
                        className={`p-1 rounded-full text-white shadow-md animate-in zoom-in-75 ${
                          isOrange ? 'bg-orange-500 shadow-orange-500/50' : 'bg-emerald-500 shadow-emerald-500/50'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Play Slideshow from this specific item */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-auto">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const originalIndex = baseItems.findIndex((i) => i.id === item.id);
                        onStartSlideshow(originalIndex >= 0 ? originalIndex : 0);
                      }}
                      className="p-2.5 rounded-full bg-white/90 hover:bg-white text-slate-900 shadow-xl transition-transform hover:scale-110"
                      title="Play slideshow starting from this slide"
                    >
                      <Play className="w-4 h-4 fill-slate-900" />
                    </button>
                  </div>

                  {/* Bottom Filename Overlay */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 text-left pointer-events-none z-10">
                    <p className="text-[11px] font-medium text-white truncate">{item.name}</p>
                    <div className="flex justify-between items-center text-[10px] text-slate-300 font-mono tabular-nums">
                      <span>{(item.size / (1024 * 1024)).toFixed(1)} MB</span>
                      {item.subfolder && <span className="opacity-75 truncate max-w-[80px]">{item.subfolder}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. MARQUEE DRAG-SELECTION BOX OVERLAY */}
      {dragBox && isDragging && (
        <div
          className={`fixed pointer-events-none z-50 border-2 rounded ${
            dragBox.isCtrl && dragBox.isShift
              ? 'border-purple-500 bg-purple-500/20'
              : dragBox.isCtrl
              ? 'border-rose-500 bg-rose-500/20'
              : 'border-orange-500 bg-orange-500/20'
          }`}
          style={{
            left: Math.min(dragBox.startX, dragBox.currentX),
            top: Math.min(dragBox.startY, dragBox.currentY),
            width: Math.abs(dragBox.currentX - dragBox.startX),
            height: Math.abs(dragBox.currentY - dragBox.startY),
          }}
        >
          <div className="absolute top-1 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-black/80 text-white shadow">
            {dragBox.isCtrl && dragBox.isShift
              ? 'Invert (Ctrl+Shift)'
              : dragBox.isCtrl
              ? 'Deselect (Ctrl)'
              : 'Select'}
          </div>
        </div>
      )}

      {/* 4. CONFIRMATION MODAL FOR SELECTION ACTIONS */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl ${
                  confirmModal.type === 'clear'
                    ? 'bg-rose-500/10 text-rose-500'
                    : 'bg-orange-500/10 text-orange-500'
                }`}
              >
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {confirmModal.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-md ${
                  confirmModal.type === 'clear'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                    : isOrange
                    ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                }`}
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
