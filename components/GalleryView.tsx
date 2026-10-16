'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { FolderProject, MediaFileItem, AppSettings, GallerySortOption } from '@/lib/types';
import { naturalSortCompare } from '@/lib/file-scanner';
import { formatClipboardPaths } from '@/lib/zip-exporter';
import { getMediaSourceUrl, isTauri } from '@/lib/tauri-bridge';
import { getTheme } from '@/lib/themes';
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
  Grid,
  Square,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  BookmarkCheck,
  Keyboard,
  Undo2,
  Redo2,
} from 'lucide-react';

interface GalleryViewProps {
  project: FolderProject;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onUpdateProject: (updatedProject: FolderProject) => void;
  onStartSlideshow: (startIndex: number) => void;
  onClose: () => void;
  onOpenActionModal: () => void;
  onOpenShortcuts?: () => void;
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
  onOpenShortcuts,
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
  const videoHoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [rangeAnchor, setRangeAnchor] = useState<{
    id: string;
    mode: 'select' | 'deselect' | 'invert';
  } | null>(null);
  const lastClickedItemIdRef = useRef<string | null>(null);

  // Undo / Redo history stacks in Gallery
  const [undoStack, setUndoStack] = useState<{ prevItems: MediaFileItem[]; description: string }[]>([]);
  const [redoStack, setRedoStack] = useState<{ prevItems: MediaFileItem[]; description: string }[]>([]);

  // Quick Preview on Alt/Option key + hover
  const [isAltPressed, setIsAltPressed] = useState<boolean>(false);
  const [quickPreviewItem, setQuickPreviewItem] = useState<MediaFileItem | null>(null);
  const [quickPreviewOrigin, setQuickPreviewOrigin] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setIsAltPressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setIsAltPressed(false);
        setQuickPreviewItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

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

  const updateProjectPreferences = useCallback(
    (overrides: Partial<FolderProject>) => {
      onUpdateProject({
        ...project,
        ...overrides,
      });
    },
    [project, onUpdateProject]
  );

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

  const handleSortChange = (newSort: GallerySortOption) => {
    setSortOption(newSort);
    updateProjectPreferences({ gallerySortOption: newSort });
  };

  const handleColumnsChange = (newCols: number) => {
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

  useEffect(() => {
    if (!anchorItemIdRef.current) return;
    const targetId = anchorItemIdRef.current;
    const raf = requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-gallery-item-id="${targetId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'auto', block: 'nearest' });
      }
      anchorItemIdRef.current = null;
    });
    return () => cancelAnimationFrame(raf);
  }, [columns, containerWidthPercent, layoutMode]);

  const baseItems = useMemo(() => {
    return project.items.filter((item) => {
      if (!item.subfolder) {
        return project.includeRootFiles !== false;
      }
      return project.enabledSubfolders?.includes(item.subfolder) ?? true;
    });
  }, [project.items, project.enabledSubfolders, project.includeRootFiles]);

  const getMediaUrl = useCallback((item: MediaFileItem): string => {
    return getMediaSourceUrl(item);
  }, []);

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

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedItems.slice(start, start + itemsPerPage);
  }, [processedItems, currentPage, itemsPerPage]);

  const pushUndoState = useCallback(
    (description: string) => {
      setUndoStack((prev) => [
        ...prev,
        { prevItems: project.items.map((i) => ({ ...i })), description },
      ]);
      setRedoStack([]);
    },
    [project.items]
  );

  const toggleSelect = useCallback(
    (id: string) => {
      pushUndoState('Toggle item selection');
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
    [project, onUpdateProject, pushUndoState]
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) {
      onShowToast('Nothing to undo');
      return;
    }
    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [
      ...prev,
      { prevItems: project.items.map((i) => ({ ...i })), description: lastAction.description },
    ]);
    const selectedCount = lastAction.prevItems.filter((i) => i.selected).length;
    onUpdateProject({
      ...project,
      items: lastAction.prevItems.map((i) => ({ ...i })),
      selectedCount,
    });
    onShowToast(`Undone: ${lastAction.description}`);
  }, [undoStack, project, onUpdateProject, onShowToast]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) {
      onShowToast('Nothing to redo');
      return;
    }
    const lastRedo = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [
      ...prev,
      { prevItems: project.items.map((i) => ({ ...i })), description: lastRedo.description },
    ]);
    const selectedCount = lastRedo.prevItems.filter((i) => i.selected).length;
    onUpdateProject({
      ...project,
      items: lastRedo.prevItems.map((i) => ({ ...i })),
      selectedCount,
    });
    onShowToast(`Redone: ${lastRedo.description}`);
  }, [redoStack, project, onUpdateProject, onShowToast]);

  const hasAutoScrolledOnMountRef = useRef<boolean>(false);

  const handleJumpToLastReviewed = useCallback(() => {
    const lastIdx = project.lastViewedIndex || 0;
    const targetItem = baseItems[lastIdx];
    if (!targetItem) {
      onShowToast('No reviewed items found yet.');
      return;
    }

    const foundProcessedIdx = processedItems.findIndex((i) => i.id === targetItem.id);
    if (foundProcessedIdx === -1) {
      onShowToast(`Item "${targetItem.name}" is filtered out in current filter.`);
      return;
    }

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

  const handleItemClick = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (isDraggingRef.current) return;

      const isCmd = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;

      const anchorId = anchorItemIdRef.current || lastClickedItemIdRef.current;
      const isRangeAction = anchorId && anchorId !== id && (isShift || isCmd);

      if (isRangeAction) {
        const idxA = processedItems.findIndex((i) => i.id === anchorId);
        const idxB = processedItems.findIndex((i) => i.id === id);

        if (idxA !== -1 && idxB !== -1) {
          const minIdx = Math.min(idxA, idxB);
          const maxIdx = Math.max(idxA, idxB);
          const rangeSlice = processedItems.slice(minIdx, maxIdx + 1);
          const rangeIds = new Set(rangeSlice.map((i) => i.id));

          let updated = [...project.items];
          let desc = '';

          if ((isCmd && !isShift) || (isAlt && isShift)) {
            desc = `Deselect range (${rangeIds.size} files)`;
            updated = updated.map((i) => (rangeIds.has(i.id) ? { ...i, selected: false } : i));
          } else if (isCmd && isShift) {
            desc = `Invert range (${rangeIds.size} files)`;
            updated = updated.map((i) => (rangeIds.has(i.id) ? { ...i, selected: !i.selected } : i));
          } else {
            desc = `Select range (${rangeIds.size} files)`;
            updated = updated.map((i) => (rangeIds.has(i.id) ? { ...i, selected: true } : i));
          }

          pushUndoState(desc);
          const newCount = updated.filter((i) => i.selected).length;
          onUpdateProject({ ...project, items: updated, selectedCount: newCount });
          onShowToast(`${desc}.`);
          setRangeAnchor(null);
          anchorItemIdRef.current = id;
          lastClickedItemIdRef.current = id;
          return;
        }
      }

      anchorItemIdRef.current = id;
      lastClickedItemIdRef.current = id;
      setRangeAnchor({ id, mode: isAlt ? 'deselect' : isCmd ? 'invert' : 'select' });
      toggleSelect(id);
    },
    [processedItems, project, onUpdateProject, onShowToast, toggleSelect, pushUndoState]
  );

  const selectedCount = project.items.filter((i) => i.selected).length;

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
      pushUndoState('Select all files');
      const targetIds = new Set(processedItems.map((i) => i.id));
      const updated = project.items.map((i) => (targetIds.has(i.id) ? { ...i, selected: true } : i));
      const newCount = updated.filter((i) => i.selected).length;
      onUpdateProject({ ...project, items: updated, selectedCount: newCount });
      onShowToast(`Selected all ${targetIds.size} files.`);
    } else if (confirmModal.type === 'clear') {
      pushUndoState('Clear all selections');
      const updated = project.items.map((i) => ({ ...i, selected: false }));
      onUpdateProject({ ...project, items: updated, selectedCount: 0 });
      onShowToast('Cleared all selections.');
    } else if (confirmModal.type === 'invert') {
      pushUndoState('Invert selections');
      const targetIds = new Set(processedItems.map((i) => i.id));
      const updated = project.items.map((i) => (targetIds.has(i.id) ? { ...i, selected: !i.selected } : i));
      const newCount = updated.filter((i) => i.selected).length;
      onUpdateProject({ ...project, items: updated, selectedCount: newCount });
      onShowToast(`Inverted selections: ${newCount} files are now selected.`);
    }
    setConfirmModal(null);
  };

  const handleGridMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.closest('[data-gallery-item-id]') ||
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

    const updateModifiers = (e: MouseEvent | KeyboardEvent) => {
      setDragBox((prev) =>
        prev
          ? {
              ...prev,
              isCtrl: e.ctrlKey || e.metaKey,
              isShift: e.shiftKey,
            }
          : null
      );
    };

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

    const handleKeyDown = (e: KeyboardEvent) => {
      updateModifiers(e);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      updateModifiers(e);
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

          pushUndoState('Box selection');
          let updated = [...project.items];
          let actionLabel = '';

          if (isCtrl && isShift) {
            updated = updated.map((i) =>
              targetIds.has(i.id) ? { ...i, selected: !i.selected } : i
            );
            actionLabel = `Inverted ${targetIds.size} files in selection box`;
          } else if (isCtrl) {
            updated = updated.map((i) =>
              targetIds.has(i.id) ? { ...i, selected: false } : i
            );
            actionLabel = `Deselected ${targetIds.size} files in selection box`;
          } else {
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
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [dragBox, project, onUpdateProject, onShowToast, pushUndoState]);

  const revealMedia = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElem = document.activeElement;
      const isInput = activeElem?.tagName === 'INPUT' || activeElem?.tagName === 'TEXTAREA';

      const isKeyZ =
        e.key.toLowerCase() === 'z' ||
        e.code === 'KeyZ' ||
        e.keyCode === 90 ||
        (e as any).which === 90 ||
        e.key === 'ظ' ||
        e.key === 'ئ';

      const isKeyY =
        e.key.toLowerCase() === 'y' ||
        e.code === 'KeyY' ||
        e.keyCode === 89 ||
        (e as any).which === 89 ||
        e.key === 'غ' ||
        e.key === '؛';

      const isKeyC =
        e.key.toLowerCase() === 'c' ||
        e.code === 'KeyC' ||
        e.keyCode === 67 ||
        (e as any).which === 67;

      const isKeyA =
        e.key.toLowerCase() === 'a' ||
        e.code === 'KeyA' ||
        e.keyCode === 65 ||
        (e as any).which === 65 ||
        e.key === 'ش';

      if ((e.metaKey || e.ctrlKey) && isKeyC) {
        e.preventDefault();
        handleCopyClipboard();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && isKeyZ) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && isKeyY) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.key === 'Backspace' && !isInput) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Escape') {
        if (rangeAnchor) {
          e.preventDefault();
          setRangeAnchor(null);
          onShowToast('Range selection cancelled.');
          return;
        }
        e.preventDefault();
        onClose();
        return;
      }

      if (isKeyA && !isInput && !(e.metaKey || e.ctrlKey || e.altKey || e.shiftKey)) {
        e.preventDefault();
        if (totalPages > 1 && currentPage > 1) {
          setCurrentPage((p) => Math.max(1, p - 1));
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          window.scrollBy({ top: -window.innerHeight * 0.8, behavior: 'smooth' });
        }
        return;
      }

      if (isKeyZ && !isInput && !(e.metaKey || e.ctrlKey || e.altKey || e.shiftKey)) {
        e.preventDefault();
        if (totalPages > 1 && currentPage < totalPages) {
          setCurrentPage((p) => Math.min(totalPages, p + 1));
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopyClipboard, onClose, currentPage, totalPages, handleUndo, handleRedo, rangeAnchor, onShowToast]);

  const isDarkMode =
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : settings.themeMode === 'dark' || settings.themeMode === 'system';

  const currentTheme = getTheme(settings.activeThemeId, isDarkMode);
  const isLiquidGlass = currentTheme.id === 'theme-3-liquid-glass';
  const isCupertino = currentTheme.id === 'theme-2-cupertino-frosted-pro';

  const renderCard = (item: MediaFileItem, isNaturalAspect: boolean) => {
    const isSelected = item.selected;
    const isHighlighted = highlightedItemId === item.id;
    const isLastViewed = baseItems[project.lastViewedIndex || 0]?.id === item.id;
    const isRangeAnchor = rangeAnchor?.id === item.id;
    const rangeMode = rangeAnchor?.mode || 'select';
    const sizeMB = item.size / (1024 * 1024);
    const limitMB =
      item.type === 'image' ? settings.imageSizeLimitMB || 5 : settings.videoSizeLimitMB || 100;
    const isHeavy = sizeMB > limitMB;
    const isRevealed = isTauri() || revealedIds.has(item.id) || !isHeavy;

    let cardStateClass = '';
    let cardOutlineStyle: React.CSSProperties = {};

    if (isRangeAnchor) {
      if (rangeMode === 'deselect') {
        cardStateClass =
          'border-2 border-dashed !border-rose-500 ring-4 ring-rose-500/50 shadow-[0_0_25px_rgba(244,63,94,0.7)] animate-pulse';
      } else if (rangeMode === 'invert') {
        cardStateClass =
          'border-2 border-dashed !border-purple-500 ring-4 ring-purple-500/50 shadow-[0_0_25px_rgba(168,85,247,0.7)] animate-pulse';
      } else {
        cardStateClass =
          'border-2 border-dashed !border-sky-400 ring-4 ring-sky-400/50 shadow-[0_0_25px_rgba(56,189,248,0.7)] animate-pulse';
      }
    } else if (isHighlighted) {
      cardStateClass = 'scale-[1.02] !border-amber-300';
      cardOutlineStyle = {
        outline: '3px solid #fbbf24',
        outlineOffset: '-2px',
        boxShadow: '0 0 35px rgba(251, 191, 36, 0.85)',
      };
    } else if (isLastViewed) {
      cardStateClass = 'scale-[1.01]';
      cardOutlineStyle = {
        outline: isSelected
          ? `2.5px solid rgb(${currentTheme.palette.accentRgb})`
          : '2px solid rgba(251, 191, 36, 0.9)',
        outlineOffset: '-2px',
        boxShadow: isSelected
          ? `var(--theme-glow), var(--theme-card-shadow)`
          : '0 0 18px rgba(251, 191, 36, 0.45), var(--theme-card-shadow)',
      };
    } else if (isSelected) {
      cardOutlineStyle = {
        outline:
          currentTheme.id === 'theme-2-cupertino-frosted-pro' ||
          currentTheme.id === 'theme-4-paper-atelier'
            ? `2.5px solid rgb(${currentTheme.palette.accentRgb})`
            : `2px solid rgb(${currentTheme.palette.accentRgb})`,
        outlineOffset: '-2px',
        boxShadow: `var(--theme-glow), var(--theme-card-shadow)`,
      };
    }

    return (
      <div
        key={item.id}
        data-gallery-item-id={item.id}
        onClick={(e) => handleItemClick(item.id, e)}
        style={cardOutlineStyle}
        onMouseEnter={(e) => {
          if (isAltPressed) {
            const rect = e.currentTarget.getBoundingClientRect();
            setQuickPreviewOrigin({
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              width: rect.width,
              height: rect.height,
            });
            setQuickPreviewItem(item);
            return;
          }
          if (item.type === 'video') {
            if (videoHoverTimerRef.current) clearTimeout(videoHoverTimerRef.current);
            videoHoverTimerRef.current = setTimeout(() => {
              setHoveredVideoId(item.id);
            }, 400);
          }
        }}
        onMouseLeave={() => {
          if (quickPreviewItem?.id === item.id) {
            setQuickPreviewItem(null);
          }
          if (item.type === 'video') {
            if (videoHoverTimerRef.current) clearTimeout(videoHoverTimerRef.current);
            setHoveredVideoId((prev) => (prev === item.id ? null : prev));
          }
        }}
        className={`group relative overflow-hidden theme-card border cursor-pointer flex flex-col justify-between ${
          isNaturalAspect ? 'masonry-card mb-3' : 'aspect-square'
        } ${isLiquidGlass ? 'liquid-specular-rim' : isCupertino ? 'cupertino-vibrancy-rim' : ''} ${cardStateClass}`}
      >
        {}
        {!isRevealed ? (
          <div className="w-full h-full min-h-[160px] flex flex-col items-center justify-center p-3 text-center theme-surface-subtle space-y-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-500">
              {item.type === 'video' ? (
                <Film className="w-4 h-4" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
            </div>
            <span className="text-[11px] font-semibold text-amber-500">
              Size: {sizeMB.toFixed(1)} MB
            </span>
            <p className="text-[10px] theme-text-secondary">
              {item.type === 'image'
                ? `Over ${settings.imageSizeLimitMB} MB limit`
                : `Over ${settings.videoSizeLimitMB} MB limit`}
            </p>
            <button
              onClick={(e) => revealMedia(item.id, e)}
              className="px-2.5 py-1 theme-btn theme-surface border theme-border text-[11px] theme-text flex items-center gap-1"
              title="Load and reveal media"
            >
              <Eye className="w-3 h-3 theme-accent" />
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
              !isNaturalAspect ? 'h-full object-cover' : 'h-auto block object-cover'
            } transition-transform duration-300 group-hover:scale-105`}
          />
        ) : (
          <video
            key={item.id}
            src={getMediaUrl(item)}
            muted={true}
            loop
            playsInline
            ref={(el) => {
              if (el) {
                if (hoveredVideoId === item.id) {
                  el.play().catch(() => {});
                } else {
                  el.pause();
                  el.currentTime = 0;
                }
              }
            }}
            className={`w-full ${
              !isNaturalAspect ? 'h-full object-cover' : 'h-auto block object-cover'
            }`}
          />
        )}

        {}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10 gap-1">
          <div className="flex items-center gap-1">
            <div className="p-1 rounded-md bg-black/55 backdrop-blur-md border border-white/15 text-white shadow-sm">
              {item.type === 'video' ? (
                <Film className="w-3 h-3" />
              ) : (
                <ImageIcon className="w-3 h-3" />
              )}
            </div>
            {isRangeAnchor && (
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-md animate-pulse ${
                  rangeMode === 'deselect'
                    ? 'bg-rose-600'
                    : rangeMode === 'invert'
                    ? 'bg-purple-600'
                    : 'bg-sky-500'
                }`}
              >
                {rangeMode === 'deselect'
                  ? 'Deselect Range Start (Cmd)'
                  : rangeMode === 'invert'
                  ? 'Invert Range Start (Cmd+Shift)'
                  : 'Select Range Start (Shift)'}
              </span>
            )}
            {isLastViewed && !isRangeAnchor && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-400 text-slate-950 shadow-md flex items-center gap-0.5">
                <BookmarkCheck className="w-2.5 h-2.5 text-slate-950" />
                Last Slide
              </span>
            )}
          </div>
          {isSelected && (
            <div
              className="animate-in zoom-in-75 flex items-center justify-center font-bold theme-glow-accent"
              style={{
                backgroundColor: `rgb(${currentTheme.palette.accentRgb})`,
                color: currentTheme.palette.accentContrast,
                borderRadius:
                  currentTheme.id === 'theme-1-obsidian-culler'
                    ? '2px'
                    : currentTheme.id === 'theme-4-paper-atelier'
                    ? '3px'
                    : '9999px',
                padding: currentTheme.id === 'theme-1-obsidian-culler' ? '2px 5px' : '3px',
                fontFamily:
                  currentTheme.id === 'theme-1-obsidian-culler' ? 'monospace' : 'inherit',
                fontSize: '10px',
              }}
            >
              {currentTheme.id === 'theme-1-obsidian-culler' ? (
                <span>CULLED</span>
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
            </div>
          )}
        </div>

        {}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
          <button
            onClick={(e) => {
              e.stopPropagation();
              const originalIndex = baseItems.findIndex((i) => i.id === item.id);
              onStartSlideshow(originalIndex >= 0 ? originalIndex : 0);
            }}
            className="p-2.5 rounded-full theme-surface-elevated border theme-border theme-text shadow-xl transition-transform hover:scale-110 pointer-events-auto"
            title="Play slideshow starting from this slide"
          >
            <Play className="w-4 h-4 fill-current" />
          </button>
        </div>

        {/* Bottom Filename Overlay */}
        <div
          className={`absolute bottom-0 inset-x-0 p-2 text-left pointer-events-none z-10 ${
            isLiquidGlass || isCupertino
              ? 'bg-gradient-to-t from-black/85 via-black/55 to-transparent backdrop-blur-[6px]'
              : 'bg-gradient-to-t from-black/90 via-black/50 to-transparent'
          }`}
        >
          <p className="text-[11px] font-medium text-white truncate drop-shadow-sm">{item.name}</p>
          <div className="flex justify-between items-center text-[10px] text-slate-300 font-mono tabular-nums">
            <span>{(item.size / (1024 * 1024)).toFixed(1)} MB</span>
            {item.subfolder && (
              <span className="opacity-80 truncate max-w-[80px]">{item.subfolder}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      onMouseDown={handleGridMouseDown}
      className={`relative min-h-screen flex flex-col font-sans transition-colors duration-200 select-none theme-bg ${
        isLiquidGlass
          ? 'liquid-glass-backdrop'
          : isCupertino
          ? 'cupertino-frosted-backdrop'
          : ''
      }`}
    >
      {/* Ambient Optical Light Mesh & Prismatic Ice Refraction Layer */}
      {(isLiquidGlass || isCupertino) && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {isLiquidGlass ? (
            <>
              <div
                className="absolute -top-36 left-1/4 w-[650px] h-[380px] rounded-full blur-[110px] opacity-35"
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

      {}
      <div
        className={`sticky top-0 z-30 px-4 sm:px-6 py-2.5 transition-all border-b theme-border theme-header ${
          isLiquidGlass ? 'liquid-specular-rim' : isCupertino ? 'cupertino-vibrancy-rim' : ''
        }`}
      >
        <div className="max-w-[1920px] mx-auto flex flex-col gap-2">
          {/* Main Action Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Left: Project title & Back button */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
              <button
                onClick={onClose}
                className="p-1.5 border theme-border theme-surface theme-btn theme-text"
                title="Return to Dashboard (Backspace / Esc)"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="text-left">
                <h1 className="text-sm font-bold theme-heading theme-text truncate max-w-xs">
                  {project.name}
                </h1>
                <p className="text-[11px] theme-text-secondary">
                  {processedItems.length} media • {columns} cols • {containerWidthPercent}% width
                </p>
              </div>
            </div>

            {}
            <div className="flex items-center gap-2 w-full md:w-auto justify-center flex-wrap">
              {/* Search Input */}
              <div className="relative min-w-[130px] sm:w-44">
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 theme-input text-xs placeholder: opacity-75"
                />
                <Search className="w-3.5 h-3.5 theme-text-muted absolute left-2.5 top-2" />
              </div>

              {/* Filter Tabs */}
              <div
                style={{ borderRadius: 'var(--theme-radius-btn, 4px)' }}
                className="flex items-center gap-1 p-1 theme-surface-subtle border theme-border text-xs"
              >
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
                    className={`px-2.5 py-1 text-[11px] font-medium transition-all ${
                      filterType === tab.id
                        ? 'theme-btn-accent font-bold'
                        : 'theme-btn theme-text-secondary hover:theme-text'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Batch Selection Helpers with Confirmation */}
              <div
                style={{ borderRadius: 'var(--theme-radius-btn, 4px)' }}
                className="flex items-center gap-1 p-0.5 theme-surface-subtle border theme-border text-xs"
              >
                <button
                  type="button"
                  onClick={promptSelectAll}
                  className="px-2.5 py-1 text-[11px] font-medium theme-btn theme-text"
                  title="Select All files in current view (confirmation prompt)"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={promptClearSelection}
                  className="px-2.5 py-1 text-[11px] font-medium theme-btn theme-text"
                  title="Deselect all files in project (confirmation prompt)"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={promptInvertSelection}
                  className="px-2.5 py-1 text-[11px] font-medium theme-btn theme-text"
                  title="Invert current file selections (confirmation prompt)"
                >
                  Invert
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5 theme-input px-2.5 py-1 text-xs">
                <ArrowUpDown className="w-3 h-3 theme-text-muted shrink-0" />
                <select
                  value={sortOption}
                  onChange={(e) => handleSortChange(e.target.value as GallerySortOption)}
                  className="bg-transparent border-none text-xs theme-text focus:outline-none cursor-pointer pr-1"
                >
                  <option value="folder_name" className="bg-slate-900 text-white">
                    Folder & Name
                  </option>
                  <option value="name_asc" className="bg-slate-900 text-white">
                    Name (A-Z)
                  </option>
                  <option value="name_desc" className="bg-slate-900 text-white">
                    Name (Z-A)
                  </option>
                  <option value="date_newest" className="bg-slate-900 text-white">
                    Date Modified (Newest)
                  </option>
                  <option value="date_oldest" className="bg-slate-900 text-white">
                    Date Modified (Oldest)
                  </option>
                  <option value="size_desc" className="bg-slate-900 text-white">
                    Size (Largest)
                  </option>
                  <option value="size_asc" className="bg-slate-900 text-white">
                    Size (Smallest)
                  </option>
                  <option value="type" className="bg-slate-900 text-white">
                    Media Type
                  </option>
                </select>
              </div>
            </div>

            {}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Visual Undo & Redo buttons */}
              <div
                style={{ borderRadius: 'var(--theme-radius-btn, 4px)' }}
                className="flex items-center gap-1 p-0.5 theme-surface-subtle border theme-border text-xs"
              >
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  className="flex items-center gap-1.5 px-2.5 py-1 theme-btn theme-text disabled:opacity-35 disabled:pointer-events-none"
                  title="Undo last selection change (Cmd+Z / Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[11px] font-semibold">Undo</span>
                  {undoStack.length > 0 && (
                    <span className="text-[10px] text-amber-500 font-mono font-bold bg-amber-500/20 px-1 rounded">
                      {undoStack.length}
                    </span>
                  )}
                </button>
                <div className="w-px h-4 theme-border bg-current opacity-20" />
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="flex items-center gap-1.5 px-2.5 py-1 theme-btn theme-text disabled:opacity-35 disabled:pointer-events-none"
                  title="Redo last undone change (Cmd+Shift+Z / Ctrl+Shift+Z / Cmd+Y)"
                >
                  <Redo2 className="w-3.5 h-3.5 theme-accent" />
                  <span className="text-[11px] font-semibold">Redo</span>
                  {redoStack.length > 0 && (
                    <span className="text-[10px] theme-accent font-mono font-bold bg-cyan-500/20 px-1 rounded">
                      {redoStack.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Jump to Last Reviewed */}
              <button
                onClick={handleJumpToLastReviewed}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border theme-border theme-surface theme-btn theme-text"
                title="Scroll to last reviewed media slide"
              >
                <BookmarkCheck className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Last Reviewed</span>
              </button>

              {/* Sound toggle */}
              <button
                onClick={() => onUpdateSettings({ globalMuted: !settings.globalMuted })}
                className="p-1.5 border theme-border theme-surface theme-btn theme-text"
                title={settings.globalMuted ? 'Audio Muted (M)' : 'Audio Active (M)'}
              >
                {settings.globalMuted ? (
                  <VolumeX className="w-4 h-4 theme-text-muted" />
                ) : (
                  <Volume2 className="w-4 h-4 text-emerald-500" />
                )}
              </button>

              {/* Keyboard Shortcuts Guide Cheatsheet */}
              {onOpenShortcuts && (
                <button
                  onClick={onOpenShortcuts}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border theme-border theme-surface theme-btn theme-text"
                  title="Keyboard Shortcuts Cheatsheet (?)"
                >
                  <Keyboard className="w-3.5 h-3.5 theme-text-muted" />
                  <span className="hidden md:inline">Shortcuts</span>
                </button>
              )}

              {/* Quick Actions modal */}
              <button
                onClick={onOpenActionModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border theme-border theme-surface theme-btn theme-text"
                title="Export ZIP and Batch Actions"
              >
                <Archive className="w-3.5 h-3.5 theme-accent" />
                <span>Actions & Export</span>
              </button>

              {/* Start Slideshow from beginning */}
              <button
                onClick={() => onStartSlideshow(0)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold theme-btn-accent active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play Slideshow</span>
              </button>
            </div>
          </div>
        </div>

        {}
        {totalPages > 1 && (
          <div className="mt-2.5 pt-2 border-t theme-border flex items-center justify-between text-xs theme-text-secondary max-w-[1920px] mx-auto">
            <span>
              Showing items {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, processedItems.length)} of{' '}
              {processedItems.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="p-1 theme-btn theme-surface border theme-border disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono tabular-nums theme-text">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="p-1 theme-btn theme-surface border theme-border disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {}
      <div
        ref={gridContainerRef}
        onMouseDown={handleGridMouseDown}
        className="relative z-10 flex-1 mx-auto w-full p-4 sm:p-6 transition-all duration-150 ease-out select-none"
        style={{ width: `${containerWidthPercent}%`, maxWidth: `${containerWidthPercent}%` }}
      >
        {pageItems.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <AlertCircle className="w-12 h-12 theme-text-muted mx-auto" />
            <p className="text-sm theme-text-secondary">
              No media found matching current filter.
            </p>
          </div>
        ) : layoutMode === 'aspect' ? (
          <div
            className="masonry-columns transition-all duration-150 pb-24"
            style={{
              columnCount: columns,
              columnGap: '0.75rem',
            }}
          >
            {pageItems.map((item) => renderCard(item, true))}
          </div>
        ) : (
          <div
            className="grid gap-3 transition-all duration-150 pb-24"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {pageItems.map((item) => renderCard(item, false))}
          </div>
        )}
      </div>

      {}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-3.5 py-2 flex items-center gap-2.5 sm:gap-3.5 transition-all duration-200 select-none theme-hud-dock ${
          isLiquidGlass ? 'liquid-specular-rim' : isCupertino ? 'cupertino-vibrancy-rim' : ''
        }`}
      >
        {/* Layout Toggle */}
        <div
          style={{ borderRadius: 'var(--theme-radius-btn, 9999px)' }}
          className="flex items-center gap-1 p-0.5 border theme-border theme-surface-subtle"
        >
          <button
            type="button"
            onClick={() => handleLayoutModeChange('aspect')}
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium transition-all ${
              layoutMode === 'aspect'
                ? 'theme-btn-accent font-semibold'
                : 'theme-btn theme-text-secondary hover:theme-text'
            }`}
            title="Natural Aspect Ratio (Masonry layout: cards wrap snugly to photo dimensions)"
          >
            <Grid className="w-3 h-3" />
            <span className="hidden sm:inline">Natural</span>
          </button>
          <button
            type="button"
            onClick={() => handleLayoutModeChange('square')}
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium transition-all ${
              layoutMode === 'square'
                ? 'theme-btn-accent font-semibold'
                : 'theme-btn theme-text-secondary hover:theme-text'
            }`}
            title="Square Grid (Uniform 1:1 square thumbnails)"
          >
            <Square className="w-3 h-3" />
            <span className="hidden sm:inline">Square</span>
          </button>
        </div>

        <div className="w-px h-4 theme-border bg-current opacity-20" />

        {/* Columns / Thumbnails per row */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleColumnsChange(Math.max(1, columns - 1))}
            disabled={columns <= 1}
            className="p-1 theme-btn theme-text disabled:opacity-30"
            title="Decrease columns (Larger thumbnails)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5 px-1">
            <span className="text-[10px] uppercase font-bold theme-text-secondary hidden md:inline">
              Cols:
            </span>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={columns}
              onChange={(e) => handleColumnsChange(parseInt(e.target.value) || 6)}
              className="w-16 sm:w-24 h-1.5 bg-black/15 dark:bg-white/15 rounded-lg appearance-none cursor-pointer"
            />
            <span className="font-mono text-xs font-bold tabular-nums min-w-[16px] text-center theme-text">
              {columns}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleColumnsChange(Math.min(10, columns + 1))}
            disabled={columns >= 10}
            className="p-1 theme-btn theme-text disabled:opacity-30"
            title="Increase columns (Smaller thumbnails)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="w-px h-4 theme-border bg-current opacity-20 hidden sm:block" />

        {/* Container Width Slider */}
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold theme-text-secondary hidden lg:inline">
            Width:
          </span>
          <input
            type="range"
            min="20"
            max="100"
            step="5"
            value={containerWidthPercent}
            onChange={(e) => handleWidthChange(parseInt(e.target.value) || 100)}
            className="w-16 sm:w-20 h-1.5 bg-black/15 dark:bg-white/15 rounded-lg appearance-none cursor-pointer"
          />
          <span className="font-mono text-xs font-bold tabular-nums min-w-[34px] text-center theme-text">
            {containerWidthPercent}%
          </span>
        </div>

        {/* Reset Viewport */}
        <button
          type="button"
          onClick={() => {
            handleColumnsChange(6);
            handleWidthChange(100);
          }}
          className="p-1 theme-btn theme-text-secondary hover:theme-text"
          title="Reset to 6 columns & 100% width"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {}
      {dragBox && isDragging && (
        <div
          className={`fixed pointer-events-none z-50 border-2 ${
            dragBox.isCtrl && dragBox.isShift
              ? 'border-purple-500 bg-purple-500/20 backdrop-blur-[4px]'
              : dragBox.isCtrl
              ? 'border-rose-500 bg-rose-500/20 backdrop-blur-[4px]'
              : isLiquidGlass
              ? 'border-[#00d2ff] bg-[#00d2ff]/18 backdrop-blur-md shadow-[0_0_28px_rgba(0,210,255,0.5),inset_0_1px_1px_rgba(255,255,255,0.6)]'
              : isCupertino
              ? 'border-[#0a84ff] bg-[#0a84ff]/20 backdrop-blur-sm shadow-[0_0_18px_rgba(10,132,255,0.35)]'
              : currentTheme.id === 'theme-4-paper-atelier'
              ? 'border-[#6c968b] bg-[#6c968b]/20 border-dashed'
              : 'border-[#00e5ff] bg-[#00e5ff]/20'
          }`}
          style={{
            left: Math.min(dragBox.startX, dragBox.currentX),
            top: Math.min(dragBox.startY, dragBox.currentY),
            width: Math.abs(dragBox.currentX - dragBox.startX),
            height: Math.abs(dragBox.currentY - dragBox.startY),
            borderRadius: 'var(--theme-radius-card, 4px)',
          }}
        >
          <div
            style={{ borderRadius: 'var(--theme-radius-btn, 4px)' }}
            className="absolute top-1.5 left-1.5 px-2.5 py-0.5 text-[10px] font-mono font-bold theme-surface-elevated border theme-border theme-text shadow-md flex items-center gap-1.5"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                dragBox.isCtrl && dragBox.isShift
                  ? 'bg-purple-400'
                  : dragBox.isCtrl
                  ? 'bg-rose-400'
                  : 'theme-accent-bg'
              }`}
            />
            <span>
              {dragBox.isCtrl && dragBox.isShift
                ? 'Invert (Cmd/Ctrl + Shift)'
                : dragBox.isCtrl
                ? 'Deselect (Cmd/Ctrl)'
                : 'Select (Drag)'}
            </span>
          </div>
        </div>
      )}

      {}
      {confirmModal && confirmModal.isOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmModal(null);
          }}
          className="fixed inset-0 z-50 theme-modal-backdrop flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="theme-modal-window max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl border ${
                  confirmModal.type === 'clear'
                    ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                    : 'theme-surface-subtle theme-accent theme-border'
                }`}
              >
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold theme-heading theme-text">
                  {confirmModal.title}
                </h3>
                <p className="text-xs theme-text-secondary mt-1">{confirmModal.description}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t theme-border">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-xs font-medium border theme-border theme-surface theme-btn theme-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`px-4 py-2 text-xs font-semibold transition-all ${
                  confirmModal.type === 'clear'
                    ? 'theme-btn bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30'
                    : 'theme-btn-accent'
                }`}
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALT/OPTION QUICK PREVIEW MODAL */}
      {isAltPressed && quickPreviewItem && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center theme-modal-backdrop animate-in fade-in zoom-in-95 duration-150">
          <div className="relative max-w-[92vw] max-h-[88vh] theme-modal-window overflow-hidden flex flex-col items-center justify-center p-2">
            {quickPreviewItem.type === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getMediaUrl(quickPreviewItem)}
                alt={quickPreviewItem.name}
                referrerPolicy="no-referrer"
                className="max-w-[90vw] max-h-[84vh] object-contain rounded-lg select-none"
              />
            ) : (
              <video
                src={getMediaUrl(quickPreviewItem)}
                autoPlay
                loop
                playsInline
                muted={false}
                className="max-w-[90vw] max-h-[84vh] object-contain rounded-lg select-none"
              />
            )}

            {/* Quick Preview Info Badge */}
            <div className="absolute bottom-4 px-4 py-1.5 theme-hud-dock text-xs font-medium flex items-center gap-2">
              <span className="font-semibold theme-accent">Quick Preview (Alt)</span>
              <span className="opacity-30">|</span>
              <span className="truncate max-w-sm theme-text">{quickPreviewItem.name}</span>
              <span className="opacity-30">|</span>
              <span className="font-mono theme-text-secondary">
                {(quickPreviewItem.size / (1024 * 1024)).toFixed(1)} MB
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}