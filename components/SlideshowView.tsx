'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { FolderProject, MediaFileItem, AppSettings } from '@/lib/types';
import { formatClipboardPaths } from '@/lib/zip-exporter';
import { getMediaSourceUrl, isTauri } from '@/lib/tauri-bridge';
import { getTheme } from '@/lib/themes';
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
  Redo2,
  LayoutGrid,
  RotateCcw,
  Home,
  CheckCheck,
  ZoomIn,
  ZoomOut,
  Pin,
  PinOff,
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
  const [redoStack, setRedoStack] = useState<{ index: number; prevSelected: boolean }[]>([]);

  const [splashIcon, setSplashIcon] = useState<{
    type: 'play' | 'pause' | 'volume-on' | 'volume-off';
    id: number;
  } | null>(null);
  const splashTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSplash = useCallback((type: 'play' | 'pause' | 'volume-on' | 'volume-off') => {
    setSplashIcon({ type, id: Date.now() });
    if (splashTimerRef.current) clearTimeout(splashTimerRef.current);
    splashTimerRef.current = setTimeout(() => {
      setSplashIcon(null);
    }, 600);
  }, []);

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      triggerSplash(next ? 'play' : 'pause');
      return next;
    });
    onUpdateProject({
      ...project,
      slideshowPaused: isPlaying,
    });
  }, [project, isPlaying, onUpdateProject, triggerSplash]);

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

  const getMediaUrl = useCallback((item?: MediaFileItem): string => {
    if (!item) return '';
    return getMediaSourceUrl(item);
  }, []);

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

  const goToNext = useCallback(() => {
    if (activeItems.length === 0) return;
    if (isFinished) {
      onOpenGallery();
      return;
    }
    if (currentIndex >= activeItems.length - 1) {
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
      setIsFinished(false);
      setCurrentIndex(activeItems.length - 1);
      return;
    }
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [activeItems.length, currentIndex, isFinished]);

  const toggleSelectCurrent = useCallback(() => {
    if (isFinished || !currentItem) return;
    const prevSelected = currentItem.selected;
    const newSelected = !prevSelected;

    setUndoStack((prev) => [...prev, { index: currentIndex, prevSelected }]);
    setRedoStack([]);

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
      newSelected ? `Added to selection (${currentItem.name})` : `Removed from selection`
    );
  }, [isFinished, currentItem, currentIndex, project, onUpdateProject, onShowToast]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) {
      onShowToast('Nothing to undo');
      return;
    }
    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    const targetItem = activeItems[lastAction.index];
    if (targetItem) {
      setRedoStack((prev) => [
        ...prev,
        { index: lastAction.index, prevSelected: targetItem.selected },
      ]);
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

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) {
      onShowToast('Nothing to redo');
      return;
    }
    const lastRedo = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    const targetItem = activeItems[lastRedo.index];
    if (targetItem) {
      setUndoStack((prev) => [
        ...prev,
        { index: lastRedo.index, prevSelected: targetItem.selected },
      ]);
      const newItems = project.items.map((i) =>
        i.id === targetItem.id ? { ...i, selected: lastRedo.prevSelected } : i
      );
      const selectedCount = newItems.filter((i) => i.selected).length;
      onUpdateProject({
        ...project,
        items: newItems,
        selectedCount,
      });
      setCurrentIndex(lastRedo.index);
      setIsFinished(false);
      onShowToast(`Selection redone (Cmd+Shift+Z)`);
    }
  }, [redoStack, activeItems, project, onUpdateProject, onShowToast]);

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

  useEffect(() => {
    if (!isFinished && currentItem) {
      markAsViewed(currentItem);
    }
  }, [currentIndex, isFinished, currentItem, markAsViewed]);

  const isControlsPinned = project.slideshowControlsMode
    ? project.slideshowControlsMode === 'pinned'
    : settings.slideshowControlsMode !== 'autohide';

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (isControlsPinned) return;
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, settings.controlsAutoHideMs || 2500);
  }, [isControlsPinned, settings.controlsAutoHideMs]);

  const resetZoom = useCallback(() => {
    setZoomScale(1);
    setZoomOffset({ x: 0, y: 0 });
    setIsDraggingZoom(false);
  }, []);

  const adjustZoom = useCallback(
    (delta: number, clientX?: number, clientY?: number) => {
      setZoomScale((prevScale) => {
        const newScale = Math.min(10, Math.max(1, +(prevScale + delta).toFixed(2)));
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
        if (clientX !== undefined && clientY !== undefined && mediaContainerRef.current) {
          const rect = mediaContainerRef.current.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;

          const cursorRelX = clientX - centerX;
          const cursorRelY = clientY - centerY;
          const ratio = newScale / prevScale;

          setZoomOffset((prevOffset) => ({
            x: cursorRelX - (cursorRelX - prevOffset.x) * ratio,
            y: cursorRelY - (cursorRelY - prevOffset.y) * ratio,
          }));
        }
        return newScale;
      });
    },
    [onUpdateProject, project, triggerSplash]
  );

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (settings.wheelZoomEnabled === false || isFinished) return;
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
  }, [
    currentIndex,
    isPlaying,
    isFinished,
    currentItem,
    settings.slideDurationSec,
    settings.videoMaxDurationSec,
    goToNext,
  ]);

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

  const toggleOSFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current
        ?.requestFullscreen()
        .then(() => setIsOSFullscreen(true))
        .catch(() => {});
    } else {
      document
        .exitFullscreen()
        .then(() => setIsOSFullscreen(false))
        .catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsOSFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
        case 'k':
        case 'K':
          if (currentItem?.type === 'video' && videoRef.current) {
            e.preventDefault();
            if (videoRef.current.paused) {
              videoRef.current.play().catch(() => {});
            } else {
              videoRef.current.pause();
            }
          }
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
    handleRedo,
    currentItem,
    onClose,
    onOpenGallery,
    settings.globalMuted,
    onUpdateSettings,
    adjustZoom,
    resetZoom,
    togglePlayPause,
    triggerSplash,
  ]);

  const isDarkMode =
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : settings.themeMode === 'dark' || settings.themeMode === 'system';

  const currentTheme = getTheme(settings.activeThemeId, isDarkMode);
  const isLiquidGlass = currentTheme.id === 'theme-3-liquid-glass';
  const isCupertino = currentTheme.id === 'theme-2-cupertino-frosted-pro';
  const isPaperAtelier = currentTheme.id === 'theme-4-paper-atelier';
  const isObsidian = currentTheme.id === 'theme-1-obsidian-culler';
  const rimClass = isLiquidGlass
    ? 'liquid-specular-rim'
    : isCupertino
    ? 'cupertino-vibrancy-rim'
    : isPaperAtelier
    ? 'paper-editorial-rim'
    : 'obsidian-console-rim';

  if (activeItems.length === 0) {
    return (
      <div className="fixed inset-0 z-50 theme-slideshow-canvas flex flex-col items-center justify-center space-y-4 p-6">
        <div className={`theme-modal-window p-8 text-center space-y-4 max-w-md ${rimClass}`}>
          <p className="text-sm theme-text">
            No playable media found in this project&apos;s active subfolders.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 theme-btn theme-surface border theme-border text-xs font-semibold theme-text"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const mediaUrl = currentItem ? getMediaUrl(currentItem) : '';
  const total = activeItems.length;
  const percentViewed = Math.round(((currentIndex + 1) / total) * 100);
  const selectedCount = project.items.filter((i) => i.selected).length;
  const isSelected = currentItem?.selected || false;

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 theme-slideshow-canvas flex flex-col justify-between overflow-hidden select-none cursor-default font-sans transition-colors duration-300 ${
        isLiquidGlass
          ? 'liquid-glass-backdrop'
          : isCupertino
          ? 'cupertino-frosted-backdrop'
          : isPaperAtelier
          ? 'paper-atelier-backdrop'
          : 'obsidian-culler-backdrop'
      }`}
      onMouseMove={handleMouseMove}
      onClick={(e) => {
        if (isFinished) return;
        if (zoomScale > 1) return;
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('a') || target.closest('input')) {
          return;
        }
        const clientY = e.clientY;
        const clientX = e.clientX;
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;
        if (
          clientY < 80 ||
          clientY > windowHeight - 90 ||
          clientX < 90 ||
          clientX > windowWidth - 90
        ) {
          return;
        }
        toggleSelectCurrent();
      }}
    >
      {/* Dynamic Optical Refraction & Media Ambient Bleed Layer */}
      {(isLiquidGlass || isCupertino) && (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          {/* Active Slide Color Bleed into the Frosted Glass / Glacier Ice */}
          {!isFinished && currentItem?.type === 'image' && mediaUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl}
              alt=""
              aria-hidden="true"
              className={`w-full h-full object-cover scale-125 transition-all duration-700 ${
                isLiquidGlass
                  ? 'blur-[95px] saturate-[220%] opacity-30 dark:opacity-35'
                  : 'blur-[110px] saturate-[190%] opacity-25 dark:opacity-30'
              }`}
            />
          )}

          {/* Theme-Specific Optical Caustics & Specular Ice Sheen */}
          {isLiquidGlass ? (
            <>
              <div
                className="absolute -top-32 left-1/4 w-[700px] h-[380px] rounded-full blur-[120px] opacity-35"
                style={{
                  background:
                    'radial-gradient(circle, rgba(0, 210, 255, 0.55) 0%, rgba(56, 189, 248, 0.18) 60%, transparent 100%)',
                }}
              />
              <div
                className="absolute -bottom-32 right-1/4 w-[650px] h-[420px] rounded-full blur-[130px] opacity-30"
                style={{
                  background:
                    'radial-gradient(circle, rgba(125, 235, 255, 0.45) 0%, rgba(99, 102, 241, 0.2) 65%, transparent 100%)',
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(0, 210, 255, 0.03) 45%, transparent 60%, rgba(125, 235, 255, 0.06) 100%)',
                }}
              />
            </>
          ) : (
            <>
              <div
                className="absolute -top-40 left-1/3 w-[720px] h-[380px] rounded-full blur-[130px] opacity-25"
                style={{
                  background:
                    'radial-gradient(circle, rgba(10, 132, 255, 0.45) 0%, transparent 75%)',
                }}
              />
              <div
                className="absolute -bottom-36 right-1/4 w-[620px] h-[380px] rounded-full blur-[130px] opacity-20"
                style={{
                  background:
                    'radial-gradient(circle, rgba(94, 92, 230, 0.38) 0%, transparent 75%)',
                }}
              />
            </>
          )}
        </div>
      )}

      {/* Center Animated Splash Icon (Play / Pause / Mute / Unmute) */}
      {splashIcon && (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center animate-in zoom-in-50 fade-in duration-150">
          <div className={`p-6 theme-modal-window flex items-center justify-center ${rimClass}`}>
            {splashIcon.type === 'play' && (
              <Play className="w-14 h-14 text-emerald-400 fill-emerald-400" />
            )}
            {splashIcon.type === 'pause' && (
              <Pause className="w-14 h-14 text-amber-400 fill-amber-400" />
            )}
            {splashIcon.type === 'volume-on' && <Volume2 className="w-14 h-14 text-emerald-400" />}
            {splashIcon.type === 'volume-off' && (
              <VolumeX className="w-14 h-14 theme-text-secondary" />
            )}
          </div>
        </div>
      )}

      {/* 1. TOPMOST PROGRESS BAR & HUD METRICS */}
      <div className="relative z-40 pointer-events-none">
        {/* Progress Fill Line */}
        <div className="w-full h-1.5 theme-surface-subtle overflow-hidden">
          <div
            className="h-full transition-all duration-300 ease-out"
            style={{
              width: isFinished ? '100%' : `${percentViewed}%`,
              backgroundColor: `rgb(${currentTheme.palette.accentRgb})`,
              boxShadow: 'var(--theme-glow)',
            }}
          />
        </div>

        {/* Top HUD Metrics Bar */}
        <div
          className={`flex items-center justify-between px-4 sm:px-6 py-2.5 text-xs transition-opacity duration-300 pointer-events-auto gap-2 flex-wrap ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Left: Project title & Progress */}
          <div
            className={`flex items-center gap-2.5 px-3.5 py-1.5 theme-hud-dock ${rimClass}`}
          >
            <span className="font-bold theme-heading theme-text truncate max-w-[180px] sm:max-w-[240px]">
              {project.name}
            </span>
            <span className="opacity-30">|</span>
            <span className="font-mono tabular-nums theme-text-secondary">
              {isFinished ? total : currentIndex + 1} / {total}
            </span>
            <span className="opacity-30">|</span>
            <span className="font-mono tabular-nums font-bold theme-accent">
              {isFinished ? '100%' : `${percentViewed}%`}
            </span>
          </div>

          {/* Center: Selected Counter Indicator */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 transition-all ${
              selectedCount > 0
                ? 'theme-btn-accent font-bold'
                : `theme-hud-dock theme-text-secondary ${rimClass}`
            }`}
            style={{ borderRadius: 'var(--theme-radius-hud, 9999px)' }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-xs">{selectedCount} Selected</span>
          </div>

          {/* Right: Quick Control Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopyClipboard();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium theme-hud-dock theme-btn ${rimClass}`}
              title="Copy All Selected Paths (Cmd+C)"
            >
              <Copy className="w-3.5 h-3.5 theme-accent" />
              <span className="hidden sm:inline">Copy Paths (Cmd+C)</span>
            </button>

            {/* Visual Undo & Redo Capsule */}
            <div className={`flex items-center gap-1 p-0.5 theme-hud-dock text-xs ${rimClass}`}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUndo();
                }}
                disabled={undoStack.length === 0}
                className="flex items-center gap-1 px-2.5 py-1 theme-btn theme-text disabled:opacity-35 disabled:pointer-events-none"
                title="Undo last selection change (Cmd+Z / Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[11px] font-semibold hidden md:inline">Undo</span>
                {undoStack.length > 0 && (
                  <span className="text-[10px] text-amber-500 font-mono font-bold bg-amber-500/20 px-1 rounded">
                    {undoStack.length}
                  </span>
                )}
              </button>
              <div className="w-px h-3.5 theme-border bg-current opacity-20" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRedo();
                }}
                disabled={redoStack.length === 0}
                className="flex items-center gap-1 px-2.5 py-1 theme-btn theme-text disabled:opacity-35 disabled:pointer-events-none"
                title="Redo last undone change (Cmd+Shift+Z / Ctrl+Shift+Z / Cmd+Y)"
              >
                <Redo2 className="w-3.5 h-3.5 theme-accent" />
                <span className="text-[11px] font-semibold hidden md:inline">Redo</span>
                {redoStack.length > 0 && (
                  <span className="text-[10px] theme-accent font-mono font-bold bg-cyan-500/20 px-1 rounded">
                    {redoStack.length}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenGallery();
              }}
              className={`p-1.5 theme-hud-dock theme-btn ${rimClass}`}
              title="Switch to Gallery Grid View (Backspace)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>

            {/* Pinned vs Auto-Hide Controls Toggle Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newMode = isControlsPinned ? 'autohide' : 'pinned';
                onUpdateProject({
                  ...project,
                  slideshowControlsMode: newMode,
                });
                onUpdateSettings({
                  slideshowControlsMode: newMode,
                });
                onShowToast(
                  newMode === 'pinned'
                    ? 'Controls Pinned: Always Visible'
                    : 'Controls Auto-Hide: Fades out on mouse rest'
                );
              }}
              className={`p-1.5 text-xs transition-all ${
                isControlsPinned
                  ? 'theme-btn-accent'
                  : `theme-hud-dock theme-btn theme-text-secondary ${rimClass}`
              }`}
              style={{ borderRadius: 'var(--theme-radius-hud, 9999px)' }}
              title={
                isControlsPinned
                  ? 'Controls Mode: Always Visible (Pinned). Click to switch to Auto-Hide.'
                  : 'Controls Mode: Auto-Hide. Click to switch to Always Visible (Pinned).'
              }
            >
              {isControlsPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className={`p-1.5 theme-hud-dock theme-btn hover:!border-rose-500/60 hover:!text-rose-500 ${rimClass}`}
              title="Exit Slideshow (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN MEDIA STAGE OR END SCREEN */}
      <div className="relative z-20 flex-1 w-full h-full flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        {/* Navigation Arrow Left (Previous) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToPrev();
          }}
          className={`absolute left-4 z-30 p-3 theme-hud-dock theme-btn transition-all duration-200 hover:scale-110 ${rimClass} ${
            showControls ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'
          }`}
          title="Previous Slide (Left Arrow)"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {isFinished ? (
          /* Slideshow Finished Screen */
          <div
            className={`z-20 max-w-lg w-full p-8 theme-modal-window text-center space-y-6 animate-in zoom-in-95 duration-200 ${rimClass}`}
          >
            <div className="w-16 h-16 rounded-2xl theme-surface-subtle border theme-border flex items-center justify-center theme-accent mx-auto shadow-inner">
              <CheckCheck className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold theme-heading theme-text">Slideshow Completed!</h2>
              <p className="text-sm theme-text-secondary">
                You have reviewed all {total} media items in this session.
              </p>
            </div>

            <div className="p-4 rounded-xl theme-surface-subtle border theme-border flex justify-around text-xs">
              <div>
                <span className="block theme-text-muted">Reviewed</span>
                <span className="font-mono text-lg font-bold theme-text">{total}</span>
              </div>
              <div className="w-px theme-border bg-current opacity-20" />
              <div>
                <span className="block theme-text-muted">Selected</span>
                <span className="font-mono text-lg font-bold theme-accent">{selectedCount}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setIsFinished(false);
                  setIsPlaying(true);
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold theme-btn-accent"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restart</span>
              </button>
              <button
                onClick={onOpenGallery}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold theme-surface border theme-border theme-btn theme-text"
                title="Switch to Gallery (Right Arrow)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Gallery</span>
              </button>
              <button
                onClick={onClose}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold theme-surface border theme-border theme-btn theme-text"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Menu</span>
              </button>
            </div>

            <p className="text-[11px] theme-text-muted">
              Press{' '}
              <kbd className="px-1.5 py-0.5 rounded theme-surface border theme-border font-mono theme-text">
                Right Arrow
              </kbd>{' '}
              to jump to gallery, or{' '}
              <kbd className="px-1.5 py-0.5 rounded theme-surface border theme-border font-mono theme-text">
                Left Arrow
              </kbd>{' '}
              to review previous slide.
            </p>
          </div>
        ) : (
          /* Active Media Frame with Native 100% Scale, Smooth Zoom, Pan & Theme Glow */
          <div
            ref={mediaContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleGlobalMouseMove}
            onMouseUp={handleMouseUp}
            style={{
              borderRadius: 'var(--theme-radius-card, 8px)',
              outline: isSelected
                ? `3px solid rgb(${currentTheme.palette.accentRgb})`
                : isLiquidGlass
                ? '1px solid rgba(125, 235, 255, 0.38)'
                : isCupertino
                ? '1px solid rgba(255, 255, 255, 0.16)'
                : isPaperAtelier
                ? '1px solid var(--theme-border)'
                : '1px solid rgba(255, 255, 255, 0.08)',
              outlineOffset: isObsidian && isSelected ? '-3px' : '0px',
              boxShadow: isSelected
                ? isObsidian
                  ? 'inset 0 0 0 2px #050608, var(--theme-glow), var(--theme-elevated-shadow)'
                  : 'var(--theme-glow), var(--theme-elevated-shadow)'
                : 'var(--theme-elevated-shadow)',
            }}
            className={`relative max-w-full max-h-full transition-all duration-300 flex items-center justify-center overflow-hidden ${
              zoomScale > 1 ? 'cursor-grab active:cursor-grabbing' : ''
            } ${isPaperAtelier && zoomScale === 1 ? 'p-2 sm:p-3 bg-[#fffdf9] dark:bg-[#23201c]' : ''}`}
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
                  className={`${
                    zoomScale > 1 ? 'max-w-none max-h-none' : 'max-w-[95vw] max-h-[80vh]'
                  } object-contain select-none pointer-events-auto`}
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
                  className={`${
                    zoomScale > 1 ? 'max-w-none max-h-none' : 'max-w-[95vw] max-h-[80vh]'
                  } object-contain select-none`}
                  onEnded={() => {
                    if (isPlaying) goToNext();
                  }}
                />
              ) : null}
            </div>

            {/* Selected Badge on Media */}
            {isSelected && (
              <div
                className={`absolute top-4 right-4 z-20 px-3 py-1.5 theme-btn-accent text-xs font-bold flex items-center gap-1.5 animate-in zoom-in-75 duration-200 ${
                  isObsidian ? 'font-mono tracking-wider' : isPaperAtelier ? 'theme-heading tracking-wide' : ''
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isObsidian ? 'CULLED' : isPaperAtelier ? 'SELECTED FOLIO' : 'Selected'}
                </span>
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
          className={`absolute right-4 z-30 p-3 theme-hud-dock theme-btn transition-all duration-200 hover:scale-110 ${rimClass} ${
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
          className={`relative z-30 w-full transition-opacity duration-300 pb-3 pt-1 px-4 sm:px-6 flex flex-col items-center gap-2 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Floating Center Controls Deck */}
          <div className={`flex items-center gap-2 px-4 py-2 theme-hud-dock ${rimClass}`}>
            {/* Selection Toggle Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSelectCurrent();
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold transition-all ${
                isSelected
                  ? 'theme-btn-accent font-bold'
                  : 'theme-btn theme-surface-subtle border theme-border theme-text'
              }`}
              title="Toggle Selection (Spacebar or Left-Click)"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSelected ? 'Selected (Space)' : 'Select Slide (Space)'}</span>
            </button>

            <span className="w-px h-5 theme-border bg-current opacity-20 mx-0.5" />

            {/* Play / Pause Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlayPause();
              }}
              className="p-2 theme-btn theme-surface-subtle border theme-border theme-text"
              title={isPlaying ? 'Pause Slideshow (Enter / P)' : 'Resume Slideshow (Enter / P)'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 text-emerald-500 fill-emerald-500" />
              )}
            </button>

            {/* Sound Mute Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateSettings({ globalMuted: !settings.globalMuted });
                triggerSplash(settings.globalMuted ? 'volume-on' : 'volume-off');
              }}
              className="p-2 theme-btn theme-surface-subtle border theme-border theme-text"
              title={settings.globalMuted ? 'Muted (M)' : 'Audio Active (M)'}
            >
              {settings.globalMuted ? (
                <VolumeX className="w-4 h-4 theme-text-muted" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-500" />
              )}
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleOSFullscreen();
              }}
              className="p-2 theme-btn theme-surface-subtle border theme-border theme-text"
              title="Toggle OS Fullscreen (F)"
            >
              {isOSFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            <span className="w-px h-5 theme-border bg-current opacity-20 mx-0.5" />

            {/* Dedicated Zoom Controls (Cmd + / -) */}
            <div
              style={{ borderRadius: 'var(--theme-radius-btn, 8px)' }}
              className="flex items-center gap-1 theme-surface-subtle p-0.5 border theme-border"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  adjustZoom(-0.35);
                }}
                disabled={zoomScale <= 1}
                className="p-1.5 theme-btn theme-text disabled:opacity-35"
                title="Zoom Out (Cmd -)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  resetZoom();
                }}
                className={`px-2 py-0.5 rounded font-mono text-[11px] tabular-nums font-bold transition-all ${
                  zoomScale > 1 ? 'theme-accent bg-cyan-500/15' : 'theme-text-secondary'
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
                className="p-1.5 theme-btn theme-text disabled:opacity-35"
                title="Zoom In (Cmd +)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* File Path & Metadata Info Box under image */}
          <div
            className={`px-4 py-1.5 theme-hud-dock flex items-center gap-2.5 text-xs max-w-4xl ${rimClass}`}
          >
            <Info className="w-3.5 h-3.5 theme-accent shrink-0" />
            <span className="font-semibold theme-text truncate max-w-xs">{currentItem.name}</span>
            <span className="opacity-25">|</span>
            <span
              className="font-mono theme-text-secondary truncate max-w-lg hidden sm:inline"
              title={currentItem.relativePath}
            >
              {currentItem.relativePath}
            </span>
            <span className="opacity-25 hidden sm:inline">|</span>
            <span className="font-mono tabular-nums theme-text-muted shrink-0">
              {(currentItem.size / (1024 * 1024)).toFixed(1)} MB
            </span>
          </div>
        </div>
      )}
    </div>
  );
}