'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { FolderProject, MediaFileItem, AppSettings } from '@/lib/types';
import { formatClipboardPaths } from '@/lib/zip-exporter';
import { getMediaSourceUrl, isTauri } from '@/lib/tauri-bridge';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  X,
  CheckCircle2,
  Copy,
  Info,
  Sparkles,
  Undo2,
  LayoutGrid,
  RotateCcw,
  Home,
  CheckCheck,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface SlideshowViewProps {
  project: FolderProject;
  startIndex?: number;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onUpdateProject: (updatedProject: FolderProject) => void;
  onClose: () => void;
  onOpenGallery: () => void;
  onShowToast: (message: string) => void;
}

export function SlideshowView({
  project,
  startIndex = 0,
  settings,
  onUpdateSettings,
  onUpdateProject,
  onClose,
  onOpenGallery,
  onShowToast,
}: SlideshowViewProps) {
  // Filter items by active subfolders
  const activeItems = useMemo(() => {
    return project.items.filter((item) => {
      if (!item.subfolder) {
        return project.includeRootFiles !== false;
      }
      return project.enabledSubfolders?.includes(item.subfolder) ?? true;
    });
  }, [project.items, project.enabledSubfolders, project.includeRootFiles]);

  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    return Math.min(Math.max(0, startIndex), Math.max(0, activeItems.length - 1));
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(() => {
    return project.slideshowPaused !== undefined ? !project.slideshowPaused : true;
  });
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [isOSFullscreen, setIsOSFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [undoStack, setUndoStack] = useState<{ index: number; prevSelected: boolean }[]>([]);

  // Center Splash Icon State
  const [splashIcon, setSplashIcon] = useState<{
    type: 'play' | 'pause' | 'volume-on' | 'volume-off';
    id: number;
  } | null>(null);

  const splashTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger quick center splash
  const triggerSplash = useCallback((type: 'play' | 'pause' | 'volume-on' | 'volume-off') => {
    setSplashIcon({ type, id: Date.now() });
    if (splashTimerRef.current) clearTimeout(splashTimerRef.current);
    splashTimerRef.current = setTimeout(() => {
      setSplashIcon(null);
    }, 600);
  }, []);

  // Toggle and persist play/pause state
  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      triggerSplash(next ? 'play' : 'pause');
      onUpdateProject({
        ...project,
        slideshowPaused: !next,
      });
      return next;
    });
  }, [project, onUpdateProject, triggerSplash]);

  // Zoom & Pan state for current media (centered on mouse or Cmd+/-)
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [zoomOffset, setZoomOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingZoom, setIsDraggingZoom] = useState<boolean>(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const mediaContainerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const slideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentItem = activeItems[currentIndex] as MediaFileItem | undefined;

  // Generate or get objectUrl for current item
  const getMediaUrl = useCallback((item?: MediaFileItem): string => {
    if (!item) return '';
    return getMediaSourceUrl(item);
  }, []);

  // Mark item as viewed in project state
  const markAsViewed = useCallback(
    (itemToMark?: MediaFileItem) => {
      if (!itemToMark) return;
      if (!itemToMark.viewed) {
        const newItems = project.items.map((i) =>
          i.id === itemToMark.id ? { ...i, viewed: true } : i
        );
        const viewedCount = newItems.filter((i) => i.viewed).length;
        onUpdateProject({
          ...project,
          items: newItems,
          viewedCount,
          lastViewedIndex: currentIndex,
          lastAccessedAt: Date.now(),
        });
      } else {
        if (project.lastViewedIndex !== currentIndex) {
          onUpdateProject({
            ...project,
            lastViewedIndex: currentIndex,
            lastAccessedAt: Date.now(),
          });
        }
      }
    },
    [project, currentIndex, onUpdateProject]
  );

  // Navigation handlers
  const goToNext = useCallback(() => {
    if (activeItems.length === 0) return;
    if (isFinished) {
      // If already on finished screen and user presses next, navigate to gallery!
      onOpenGallery();
      return;
    }

    if (currentIndex >= activeItems.length - 1) {
      // Reached the end: show Finished Screen!
      setIsFinished(true);
      setIsPlaying(false);
      setZoomScale(1);
      setZoomOffset({ x: 0, y: 0 });
      return;
    }

    setZoomScale(1);
    setZoomOffset({ x: 0, y: 0 });
    setCurrentIndex((prev) => prev + 1);
  }, [activeItems.length, currentIndex, isFinished, onOpenGallery]);

  const goToPrev = useCallback(() => {
    if (activeItems.length === 0) return;
    setZoomScale(1);
    setZoomOffset({ x: 0, y: 0 });
    if (isFinished) {
      // Return back to last slide
      setIsFinished(false);
      setCurrentIndex(activeItems.length - 1);
      return;
    }

    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [activeItems.length, currentIndex, isFinished]);

  // Toggle selection for current item
  const toggleSelectCurrent = useCallback(() => {
    if (isFinished || !currentItem) return;
    const prevSelected = currentItem.selected;
    const newSelected = !prevSelected;

    // Push to undo stack
    setUndoStack((prev) => [...prev, { index: currentIndex, prevSelected }]);

    const newItems = project.items.map((i) =>
      i.id === currentItem.id ? { ...i, selected: newSelected } : i
    );
    const selectedCount = newItems.filter((i) => i.selected).length;

    onUpdateProject({
      ...project,
      items: newItems,
      selectedCount,
    });

    onShowToast(
      newSelected
        ? `Added to selection (${currentItem.name})`
        : `Removed from selection`
    );
  }, [isFinished, currentItem, currentIndex, project, onUpdateProject, onShowToast]);

  // Undo last selection
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) {
      onShowToast('Nothing to undo');
      return;
    }
    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));

    const targetItem = activeItems[lastAction.index];
    if (targetItem) {
      const newItems = project.items.map((i) =>
        i.id === targetItem.id ? { ...i, selected: lastAction.prevSelected } : i
      );
      const selectedCount = newItems.filter((i) => i.selected).length;
      onUpdateProject({
        ...project,
        items: newItems,
        selectedCount,
      });
      setCurrentIndex(lastAction.index);
      setIsFinished(false);
      onShowToast(`Selection undone (Cmd+Z)`);
    }
  }, [undoStack, activeItems, project, onUpdateProject, onShowToast]);

  // Copy selected paths up to now to clipboard
  const handleCopyClipboard = useCallback(async () => {
    const selectedItems = project.items.filter((i) => i.selected);
    if (selectedItems.length === 0) {
      onShowToast('No media selected yet. Press Spacebar to select current slide.');
      return;
    }
    const text = formatClipboardPaths(selectedItems, settings.clipboardFormat);
    try {
      await navigator.clipboard.writeText(text);
      onShowToast(`Copied ${selectedItems.length} selected path(s) to clipboard.`);
    } catch {
      onShowToast('Clipboard access was denied by browser.');
    }
  }, [project.items, settings.clipboardFormat, onShowToast]);

  // Mark current index viewed whenever it changes
  useEffect(() => {
    if (!isFinished && currentItem) {
      markAsViewed(currentItem);
    }
  }, [currentIndex, isFinished, currentItem, markAsViewed]);

  // Auto-hide controls timer on mouse inactivity
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, settings.controlsAutoHideMs);
  }, [settings.controlsAutoHideMs]);

  // Zoom helpers
  const resetZoom = useCallback(() => {
    setZoomScale(1);
    setZoomOffset({ x: 0, y: 0 });
    setIsDraggingZoom(false);
  }, []);

  const adjustZoom = useCallback(
    (delta: number, clientX?: number, clientY?: number) => {
      setZoomScale((prevScale) => {
        const newScale = Math.min(10, Math.max(1, +(prevScale + delta).toFixed(2)));

        // If zooming in for the first time, pause slideshow
        if (prevScale === 1 && newScale > 1) {
          setIsPlaying(false);
          onUpdateProject({
            ...project,
            slideshowPaused: true,
          });
          triggerSplash('pause');
        }

        if (newScale === 1) {
          setZoomOffset({ x: 0, y: 0 });
          return 1;
        }

        // Center on cursor if coords provided
        if (clientX !== undefined && clientY !== undefined && mediaContainerRef.current) {
          const rect = mediaContainerRef.current.getBoundingClientRect();
          const mouseXRel = clientX - (rect.left + rect.width / 2);
          const mouseYRel = clientY - (rect.top + rect.height / 2);

          const scaleRatio = newScale / prevScale;
          setZoomOffset((prevOffset) => ({
            x: (prevOffset.x - mouseXRel) * scaleRatio + mouseXRel,
            y: (prevOffset.y - mouseYRel) * scaleRatio + mouseYRel,
          }));
        }

        return newScale;
      });
    },
    [onUpdateProject, project, triggerSplash]
  );

  // Wheel zoom handler directly on window or container
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (settings.wheelZoomEnabled === false || isFinished) return;
      // Prevent page/window scrolling while zooming media
      e.preventDefault();
      const zoomDelta = e.deltaY < 0 ? 0.35 : -0.35;
      adjustZoom(zoomDelta, e.clientX, e.clientY);
    };

    const node = containerRef.current;
    if (node) {
      node.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (node) node.removeEventListener('wheel', handleWheel);
    };
  }, [settings.wheelZoomEnabled, isFinished, adjustZoom]);

  // Mouse drag panning when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomScale > 1) {
      setIsDraggingZoom(true);
      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        startX: zoomOffset.x,
        startY: zoomOffset.y,
      };
    }
  };

  const handleGlobalMouseMove = (e: React.MouseEvent) => {
    if (isDraggingZoom && zoomScale > 1) {
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      setZoomOffset({
        x: dragStartRef.current.startX + dx,
        y: dragStartRef.current.startY + dy,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDraggingZoom(false);
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [handleMouseMove]);

  // Slideshow timer logic
  useEffect(() => {
    if (!isPlaying || isFinished || !currentItem) {
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
      if (videoTimerRef.current) clearTimeout(videoTimerRef.current);
      return;
    }

    if (currentItem.type === 'image') {
      const duration = (settings.slideDurationSec || 3) * 1000;
      slideTimerRef.current = setTimeout(() => {
        goToNext();
      }, duration);
      return () => {
        if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
      };
    } else if (currentItem.type === 'video') {
      const maxDuration = (settings.videoMaxDurationSec || 30) * 1000;
      videoTimerRef.current = setTimeout(() => {
        goToNext();
      }, maxDuration);

      return () => {
        if (videoTimerRef.current) clearTimeout(videoTimerRef.current);
      };
    }
  }, [currentIndex, isPlaying, isFinished, currentItem, settings.slideDurationSec, settings.videoMaxDurationSec, goToNext]);

  // Video playback management on index change
  useEffect(() => {
    if (!isFinished && currentItem?.type === 'video' && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = settings.globalMuted;
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [currentIndex, isFinished, currentItem, isPlaying, settings.globalMuted]);

  // Fullscreen toggle
  const toggleOSFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => setIsOSFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsOSFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsOSFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+C / Ctrl+C
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopyClipboard();
        return;
      }
      // Cmd+Z / Ctrl+Z
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Cmd/Ctrl + Plus / Equal / Minus / Zero (Zoom shortcuts)
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+' || e.key === 'Add')) {
        e.preventDefault();
        adjustZoom(0.35);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === '-' || e.key === '_' || e.key === 'Subtract')) {
        e.preventDefault();
        adjustZoom(-0.35);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === '0' || e.key === 'Digit0')) {
        e.preventDefault();
        resetZoom();
        return;
      }

      switch (e.key) {
        // ONLY Left and Right arrows navigate slides (ArrowUp/ArrowDown removed as requested)
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goToPrev();
          break;
        case 'Enter':
          e.preventDefault();
          togglePlayPause();
          break;
        case ' ':
          e.preventDefault();
          toggleSelectCurrent();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          onUpdateSettings({ globalMuted: !settings.globalMuted });
          triggerSplash(settings.globalMuted ? 'volume-on' : 'volume-off');
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleOSFullscreen();
          break;
        case 'Backspace':
          e.preventDefault();
          onOpenGallery();
          break;
        case 'Escape':
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          } else {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    goToNext,
    goToPrev,
    toggleSelectCurrent,
    handleCopyClipboard,
    handleUndo,
    onClose,
    onOpenGallery,
    settings.globalMuted,
    onUpdateSettings,
    adjustZoom,
    resetZoom,
    togglePlayPause,
    triggerSplash,
  ]);

  if (activeItems.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-white space-y-4">
        <p>No playable media found in this project&apos;s active subfolders.</p>
        <button onClick={onClose} className="px-4 py-2 bg-slate-800 rounded-lg text-sm">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const mediaUrl = currentItem ? getMediaUrl(currentItem) : '';
  const total = activeItems.length;
  const percentViewed = Math.round(((currentIndex + 1) / total) * 100);
  const selectedCount = project.items.filter((i) => i.selected).length;

  const isSelected = currentItem?.selected || false;
  const isOrangeAccent = settings.neonAccent === 'orange';

  const neonOutlineClass = isSelected
    ? isOrangeAccent
      ? 'border-2 border-orange-500 shadow-[0_0_35px_rgba(249,115,22,0.7)] ring-2 ring-orange-400/80'
      : 'border-2 border-emerald-500 shadow-[0_0_35px_rgba(16,185,129,0.7)] ring-2 ring-emerald-400/80'
    : 'border border-transparent';

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none cursor-default font-sans"
      onMouseMove={handleMouseMove}
      onClick={(e) => {
        if (isFinished) return;
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('a') || target.closest('input')) {
          return;
        }
        toggleSelectCurrent();
      }}
    >
      {/* Center Animated Splash Icon (Play / Pause / Mute / Unmute) */}
      {splashIcon && (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center animate-in zoom-in-50 fade-in duration-150">
          <div className="p-6 rounded-3xl bg-black/80 backdrop-blur-xl border border-white/20 shadow-2xl text-white flex items-center justify-center">
            {splashIcon.type === 'play' && <Play className="w-14 h-14 text-emerald-400 fill-emerald-400" />}
            {splashIcon.type === 'pause' && <Pause className="w-14 h-14 text-amber-400 fill-amber-400" />}
            {splashIcon.type === 'volume-on' && <Volume2 className="w-14 h-14 text-emerald-400" />}
            {splashIcon.type === 'volume-off' && <VolumeX className="w-14 h-14 text-slate-400" />}
          </div>
        </div>
      )}

      {/* 1. TOPMOST PROGRESS BAR (Always visible in top layer) */}
      <div className="absolute top-0 left-0 right-0 z-40 pointer-events-none">
        {/* Progress Fill Line */}
        <div className="w-full h-1.5 bg-slate-900/60 backdrop-blur-sm">
          <div
            className={`h-full transition-all duration-300 ease-out ${
              isOrangeAccent
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]'
                : 'bg-gradient-to-r from-teal-500 to-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]'
            }`}
            style={{ width: isFinished ? '100%' : `${percentViewed}%` }}
          />
        </div>

        {/* Top HUD Metrics Bar (fades with controls) */}
        <div
          className={`flex items-center justify-between px-6 py-2.5 text-xs transition-opacity duration-300 pointer-events-auto ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Left: Project title & Progress */}
          <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-slate-200">
            <span className="font-semibold text-white truncate max-w-[200px]">{project.name}</span>
            <span className="text-white/30">|</span>
            <span className="font-mono tabular-nums text-slate-300">
              {isFinished ? total : currentIndex + 1} / {total}
            </span>
            <span className="text-white/30">|</span>
            <span className="font-mono tabular-nums text-slate-300 font-semibold">
              {isFinished ? '100%' : `${percentViewed}%`}
            </span>
          </div>

          {/* Center: Selected Counter Indicator */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border backdrop-blur-md transition-all ${
              selectedCount > 0
                ? isOrangeAccent
                  ? 'border-orange-500/50 bg-orange-950/40 text-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.3)]'
                  : 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'border-white/10 bg-black/60 text-slate-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">
              {selectedCount} Selected
            </span>
          </div>

          {/* Right: Quick Control Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopyClipboard();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/90 text-slate-200 hover:text-white border border-white/10 text-xs backdrop-blur-md transition-colors"
              title="Copy All Selected Paths (Cmd+C)"
            >
              <Copy className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">Copy Paths (Cmd+C)</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUndo();
              }}
              className="p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-slate-300 hover:text-white border border-white/10 text-xs backdrop-blur-md transition-colors"
              title="Undo Last Action (Cmd+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenGallery();
              }}
              className="p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-slate-300 hover:text-white border border-white/10 text-xs backdrop-blur-md transition-colors"
              title="Switch to Gallery Grid View (Backspace)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 rounded-full bg-black/60 hover:bg-rose-900/60 text-slate-300 hover:text-white border border-white/10 hover:border-rose-500/50 text-xs backdrop-blur-md transition-colors"
              title="Exit Slideshow (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN MEDIA STAGE OR END SCREEN */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        {/* Navigation Arrow Left (Previous) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToPrev();
          }}
          className={`absolute left-4 z-30 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 backdrop-blur-md transition-all duration-200 hover:scale-110 ${
            showControls ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'
          }`}
          title="Previous Slide (Left Arrow)"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {isFinished ? (
          /* Slideshow Finished Screen */
          <div className="z-20 max-w-lg w-full p-8 rounded-3xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-2xl shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCheck className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Slideshow Completed!</h2>
              <p className="text-sm text-slate-400">
                You have reviewed all {total} media items in this session.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex justify-around text-xs">
              <div>
                <span className="block text-slate-500">Reviewed</span>
                <span className="font-mono text-lg font-bold text-white">{total}</span>
              </div>
              <div className="w-px bg-slate-800" />
              <div>
                <span className="block text-slate-500">Selected</span>
                <span className="font-mono text-lg font-bold text-emerald-400">{selectedCount}</span>
              </div>
            </div>

            {/* Mouse Clickable Choice Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setIsFinished(false);
                  setIsPlaying(true);
                }}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-white transition-all shadow-md ${
                  isOrangeAccent
                    ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restart</span>
              </button>

              <button
                onClick={onOpenGallery}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                title="Switch to Gallery (Right Arrow)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Gallery</span>
              </button>

              <button
                onClick={onClose}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Menu</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono">Right Arrow</kbd> to jump to gallery, or <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono">Left Arrow</kbd> to review previous slide.
            </p>
          </div>
        ) : (
          /* Active Media Frame with Native 100% Scale, Smooth Zoom, Pan & Magic Glow */
          <div
            ref={mediaContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleGlobalMouseMove}
            onMouseUp={handleMouseUp}
            className={`relative max-w-full max-h-full rounded-xl transition-all duration-300 flex items-center justify-center overflow-hidden ${
              zoomScale > 1 ? 'cursor-grab active:cursor-grabbing' : ''
            } ${neonOutlineClass}`}
          >
            <div
              style={{
                transform: `translate3d(${zoomOffset.x}px, ${zoomOffset.y}px, 0px) scale(${zoomScale})`,
                transformOrigin: 'center center',
                transition: isDraggingZoom ? 'none' : 'transform 120ms ease-out',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {currentItem?.type === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={currentItem.id}
                  src={mediaUrl}
                  alt={currentItem.name}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (isTauri() && currentItem.absolutePath && !target.dataset.triedFallback) {
                      target.dataset.triedFallback = 'true';
                      const clean = currentItem.absolutePath.replace(/^[/\\]+/, '');
                      target.src = `mediapicker://localhost/${encodeURIComponent(clean)}`;
                      return;
                    }
                    if (!target.dataset.fallbackSvg && currentItem.demoSvgUrl) {
                      target.dataset.fallbackSvg = 'true';
                      target.src = currentItem.demoSvgUrl;
                    }
                  }}
                  className="max-w-[95vw] max-h-[82vh] object-contain rounded-lg shadow-2xl select-none pointer-events-auto"
                  draggable={false}
                />
              ) : currentItem ? (
                <video
                  key={currentItem.id}
                  ref={videoRef}
                  src={mediaUrl}
                  controls={false}
                  autoPlay={isPlaying}
                  loop
                  muted={settings.globalMuted}
                  className="max-w-[95vw] max-h-[82vh] object-contain rounded-lg shadow-2xl select-none"
                  onEnded={() => {
                    if (isPlaying) goToNext();
                  }}
                />
              ) : null}
            </div>

            {/* Magic Badge on Media when Selected */}
            {isSelected && (
              <div
                className={`absolute top-4 right-4 z-20 px-3 py-1.5 rounded-lg backdrop-blur-md text-xs font-bold text-white flex items-center gap-1.5 shadow-lg animate-in zoom-in-75 duration-200 ${
                  isOrangeAccent
                    ? 'bg-orange-600/90 shadow-orange-600/40 border border-orange-400'
                    : 'bg-emerald-600/90 shadow-emerald-600/40 border border-emerald-400'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Selected</span>
              </div>
            )}
          </div>
        )}

        {/* Navigation Arrow Right (Next) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          className={`absolute right-4 z-30 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 backdrop-blur-md transition-all duration-200 hover:scale-110 ${
            showControls ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'
          }`}
          title={isFinished ? 'Go to Gallery (Right Arrow)' : 'Next Slide (Right Arrow)'}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* 3. BOTTOM CONTROL HUD & FILE INFO */}
      {!isFinished && currentItem && (
        <div
          className={`relative z-30 w-full transition-opacity duration-300 pb-3 pt-2 px-6 flex flex-col items-center gap-2 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Floating Center Controls Deck */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/75 backdrop-blur-xl border border-white/10 shadow-2xl text-white">
            {/* Selection Toggle Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSelectCurrent();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isSelected
                  ? isOrangeAccent
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/50'
                    : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
              title="Toggle Selection (Spacebar or Left-Click)"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSelected ? 'Selected (Space)' : 'Select Slide (Space)'}</span>
            </button>

            <span className="w-px h-5 bg-white/20 mx-1" />

            {/* Play / Pause Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlayPause();
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors"
              title={isPlaying ? 'Pause Slideshow (Enter / P)' : 'Resume Slideshow (Enter / P)'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Sound Mute Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateSettings({ globalMuted: !settings.globalMuted });
                triggerSplash(settings.globalMuted ? 'volume-on' : 'volume-off');
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors"
              title={settings.globalMuted ? 'Muted (M)' : 'Audio Active (M)'}
            >
              {settings.globalMuted ? (
                <VolumeX className="w-4 h-4 text-slate-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              )}
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleOSFullscreen();
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors"
              title="Toggle OS Fullscreen (F)"
            >
              {isOSFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <span className="w-px h-5 bg-white/20 mx-1" />

            {/* Dedicated Zoom Controls (Cmd + / -) */}
            <div className="flex items-center gap-1 bg-white/5 rounded-xl p-0.5 border border-white/10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  adjustZoom(-0.35);
                }}
                disabled={zoomScale <= 1}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/15 disabled:opacity-40 transition-colors"
                title="Zoom Out (Cmd -)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  resetZoom();
                }}
                className={`px-2 py-0.5 rounded-md font-mono text-[11px] tabular-nums font-semibold transition-all ${
                  zoomScale > 1 ? 'text-amber-400 bg-amber-400/10' : 'text-slate-400'
                }`}
                title="Reset Zoom Scale (Cmd 0)"
              >
                {Math.round(zoomScale * 100)}%
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  adjustZoom(0.35);
                }}
                disabled={zoomScale >= 10}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/15 disabled:opacity-40 transition-colors"
                title="Zoom In (Cmd +)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* File Path & Metadata Info Box under image */}
          <div className="bg-black/70 backdrop-blur-md px-4 py-1.5 rounded-xl border border-white/10 flex items-center gap-3 text-xs max-w-4xl text-slate-300">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-semibold text-white truncate max-w-xs">{currentItem.name}</span>
            <span className="text-white/20">|</span>
            <span className="font-mono text-slate-400 truncate max-w-lg" title={currentItem.relativePath}>
              {currentItem.relativePath}
            </span>
            <span className="text-white/20">|</span>
            <span className="font-mono tabular-nums text-slate-400 shrink-0">
              {(currentItem.size / (1024 * 1024)).toFixed(1)} MB
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
