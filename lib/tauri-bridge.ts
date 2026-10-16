import { MediaFileItem, FolderProject } from './types';

// Check if running inside the Tauri native desktop runtime
export function isTauri(): boolean {
  if (typeof window === 'undefined') return false;
  return '__TAURI_INTERNALS__' in window || '__TAURI__' in window;
}

// Native folder picker dialog
export async function pickFolderNative(): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select Folder for Media Culling',
    });
    if (typeof selected === 'string') {
      return selected;
    }
    return null;
  } catch (err) {
    console.warn('Native folder dialog error or not available:', err);
    return null;
  }
}

export interface NativeScanResult {
  rootPath: string;
  folderName: string;
  totalFilesCount: number;
  totalSizeBytes: number;
  mediaCount: number;
  photosCount: number;
  videosCount: number;
  nonMediaCount: number;
  subfolders: string[];
  items: MediaFileItem[];
  limitReached: boolean;
  maxLimit: number;
}

// Native multi-threaded recursive directory scanning
export async function scanDirectoryNative(
  path: string,
  maxFiles = 50000,
  includeHidden = false
): Promise<NativeScanResult | null> {
  if (!isTauri()) return null;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke<NativeScanResult>('scan_directory', {
      path,
      maxFiles,
      includeHidden,
    });
    return result;
  } catch (err) {
    console.error('Error invoking native scan_directory:', err);
    throw err;
  }
}

// Native OS Recycle Bin / Trash move
export async function moveToTrashNative(paths: string[]): Promise<number> {
  if (!isTauri()) return 0;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const count = await invoke<number>('move_to_trash', { paths });
    return count;
  } catch (err) {
    console.error('Error invoking native move_to_trash:', err);
    throw err;
  }
}

export interface NativeExportResult {
  destinationPath: string;
  processedCount: number;
  totalBytes: number;
}

// Native atomic copy/move to suffix folder (e.g. Folder_selected)
export async function batchExportFolderNative(
  sourceRoot: string,
  files: string[],
  suffix = '_selected',
  operation: 'copy' | 'move' = 'copy'
): Promise<NativeExportResult | null> {
  if (!isTauri()) return null;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const res = await invoke<NativeExportResult>('batch_export_folder', {
      sourceRoot,
      files,
      suffix,
      operation,
    });
    return res;
  } catch (err) {
    console.error('Error invoking native batch_export_folder:', err);
    throw err;
  }
}

// Native system clipboard write
export async function copyToClipboardNative(text: string): Promise<boolean> {
  if (isTauri()) {
    try {
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
      await writeText(text);
      return true;
    } catch (e) {
      console.warn('Native clipboard failed, falling back to navigator:', e);
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

// Get high-speed media stream URL
export function getMediaSourceUrl(item: MediaFileItem): string {
  // If running in Tauri, stream directly from OS disk
  if (isTauri() && item.absolutePath) {
    try {
      // 1. Try Tauri v2 convertFileSrc if available on window
      const win = window as any;
      if (win.__TAURI__?.core?.convertFileSrc) {
        return win.__TAURI__.core.convertFileSrc(item.absolutePath);
      }
      if (win.__TAURI_INTERNALS__?.convertFileSrc) {
        return win.__TAURI_INTERNALS__.convertFileSrc(item.absolutePath);
      }
    } catch {
      // fallback to custom protocol below
    }

    // 2. High-speed custom protocol fallback: mediapicker://localhost/<path>
    const clean = item.absolutePath.replace(/^[/\\]+/, '');
    return `mediapicker://localhost/${encodeURIComponent(clean)}`;
  }

  // Browser / Web mode fallback (Blob URL, Demo SVG, or Data URI)
  if (item.objectUrl) return item.objectUrl;
  if (item.url) return item.url;
  if (item.demoSvgUrl) return item.demoSvgUrl;

  if (item.file) {
    try {
      const created = URL.createObjectURL(item.file);
      item.objectUrl = created;
      item.url = created;
      return created;
    } catch {
      // ignore
    }
  }

  return '';
}
