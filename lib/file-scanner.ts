import { MediaFileItem, MediaType } from './types';

const IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'bmp',
  'avif',
  'ico',
  'tiff',
  'heic',
]);

const VIDEO_EXTENSIONS = new Set([
  'mp4',
  'webm',
  'ogg',
  'mov',
  'm4v',
  'mkv',
  'avi',
]);

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length <= 1) return '';
  return parts.pop()?.toLowerCase() || '';
}

export function detectMediaType(filename: string, mime: string): MediaType | null {
  const ext = getFileExtension(filename);
  if (IMAGE_EXTENSIONS.has(ext) || mime.startsWith('image/')) {
    return 'image';
  }
  if (VIDEO_EXTENSIONS.has(ext) || mime.startsWith('video/')) {
    return 'video';
  }
  return null;
}

// Natural alphabetical / numerical sort for filenames
export function naturalSortCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

// Extract subfolder from relative path
export function extractSubfolder(relPath: string): string {
  const parts = relPath.split('/');
  if (parts.length <= 2) {
    // Root level file (e.g. "ProjectFolder/image.jpg")
    return '';
  }
  // Subfolder path without root folder and without filename (e.g. "Landscape" or "Reels/Drone")
  return parts.slice(1, -1).join('/');
}

export interface ScanResult {
  projectName: string;
  totalFiles: number;
  totalSizeBytes: number;
  mediaItems: MediaFileItem[];
  photosCount: number;
  videosCount: number;
  nonMediaCount: number;
  subfolders: string[];
  limitReached: boolean;
}

// 1. Process files from <input type="file" webkitdirectory>
export async function processFileList(
  fileList: FileList | File[],
  imageLimitMB: number,
  videoLimitMB: number,
  maxScanFilesLimit: number = 50000,
  includeHiddenFiles: boolean = true
): Promise<ScanResult> {
  const files = Array.from(fileList);
  if (files.length === 0) {
    throw new Error('No files found in folder.');
  }

  let projectName = 'Media Project';
  const firstPath = files[0].webkitRelativePath || files[0].name;
  if (firstPath.includes('/')) {
    projectName = firstPath.split('/')[0] || projectName;
  }

  let nonMediaCount = 0;
  let photosCount = 0;
  let videosCount = 0;
  let totalSizeBytes = 0;
  let limitReached = false;
  const subfoldersSet = new Set<string>();
  const rawItems: { item: MediaFileItem; path: string }[] = [];

  const countToScan = Math.min(files.length, maxScanFilesLimit);
  if (files.length > maxScanFilesLimit) {
    limitReached = true;
  }

  for (let i = 0; i < countToScan; i++) {
    const file = files[i];
    const relPath = file.webkitRelativePath || file.name;

    // Check hidden files
    const fileName = file.name;
    if (!includeHiddenFiles && (fileName.startsWith('.') || relPath.includes('/.'))) {
      continue;
    }

    const mediaType = detectMediaType(fileName, file.type);
    if (!mediaType) {
      nonMediaCount++;
      continue;
    }

    if (mediaType === 'image') photosCount++;
    if (mediaType === 'video') videosCount++;
    totalSizeBytes += file.size;

    const subfolder = extractSubfolder(relPath);
    if (subfolder) {
      subfoldersSet.add(subfolder);
    }

    const sizeMB = file.size / (1024 * 1024);
    const limitMB = mediaType === 'image' ? imageLimitMB : videoLimitMB;
    const isOverLimit = sizeMB > limitMB;

    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      // ignore
    }

    const id = `item_${i}_${encodeURIComponent(relPath)}_${file.size}`;
    const mediaItem: MediaFileItem = {
      id,
      name: file.name,
      relativePath: relPath,
      subfolder,
      size: file.size,
      lastModified: file.lastModified || Date.now(),
      type: mediaType,
      mimeType: file.type || (mediaType === 'image' ? 'image/jpeg' : 'video/mp4'),
      file,
      objectUrl: objectUrl || undefined,
      url: objectUrl || undefined,
      viewed: false,
      selected: false,
      isOverLimit,
      isManuallyRevealed: false,
    };

    rawItems.push({ item: mediaItem, path: relPath });
  }

  // Sort items naturally by relative path
  rawItems.sort((a, b) => naturalSortCompare(a.path, b.path));
  const mediaItems = rawItems.map((r) => r.item);

  return {
    projectName,
    totalFiles: files.length,
    totalSizeBytes,
    mediaItems,
    photosCount,
    videosCount,
    nonMediaCount,
    subfolders: Array.from(subfoldersSet).sort(),
    limitReached,
  };
}

// 2. Process directory from window.showDirectoryPicker() (File System Access API)
export async function scanDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  imageLimitMB: number,
  videoLimitMB: number,
  maxScanFilesLimit: number = 50000,
  includeHiddenFiles: boolean = true
): Promise<ScanResult> {
  const mediaItems: MediaFileItem[] = [];
  let nonMediaCount = 0;
  let photosCount = 0;
  let videosCount = 0;
  let totalFiles = 0;
  let totalSizeBytes = 0;
  let limitReached = false;
  const subfoldersSet = new Set<string>();

  async function traverse(
    handle: FileSystemDirectoryHandle,
    currentPath: string
  ): Promise<void> {
    if (totalFiles >= maxScanFilesLimit) {
      limitReached = true;
      return;
    }

    // @ts-ignore - async iterator for FileSystemDirectoryHandle
    for await (const entry of handle.values()) {
      if (totalFiles >= maxScanFilesLimit) {
        limitReached = true;
        break;
      }

      const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      if (entry.kind === 'directory') {
        if (!includeHiddenFiles && entry.name.startsWith('.')) continue;
        await traverse(entry as FileSystemDirectoryHandle, entryPath);
      } else if (entry.kind === 'file') {
        totalFiles++;
        if (!includeHiddenFiles && entry.name.startsWith('.')) continue;

        const fileHandle = entry as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        const mediaType = detectMediaType(file.name, file.type);

        if (!mediaType) {
          nonMediaCount++;
          continue;
        }

        if (mediaType === 'image') photosCount++;
        if (mediaType === 'video') videosCount++;
        totalSizeBytes += file.size;

        const subfolder = extractSubfolder(entryPath);
        if (subfolder) {
          subfoldersSet.add(subfolder);
        }

        const sizeMB = file.size / (1024 * 1024);
        const limitMB = mediaType === 'image' ? imageLimitMB : videoLimitMB;
        const isOverLimit = sizeMB > limitMB;

        let objectUrl = '';
        try {
          objectUrl = URL.createObjectURL(file);
        } catch {
          // ignore
        }

        const id = `fsh_${entryPath}_${file.size}_${file.lastModified}`;
        mediaItems.push({
          id,
          name: file.name,
          relativePath: entryPath,
          subfolder,
          size: file.size,
          lastModified: file.lastModified || Date.now(),
          type: mediaType,
          mimeType: file.type || (mediaType === 'image' ? 'image/jpeg' : 'video/mp4'),
          file,
          objectUrl: objectUrl || undefined,
          url: objectUrl || undefined,
          viewed: false,
          selected: false,
          isOverLimit,
          isManuallyRevealed: false,
        });
      }
    }
  }

  await traverse(dirHandle, dirHandle.name);

  // Sort media items
  mediaItems.sort((a, b) => naturalSortCompare(a.relativePath, b.relativePath));

  return {
    projectName: dirHandle.name,
    totalFiles,
    totalSizeBytes,
    mediaItems,
    photosCount,
    videosCount,
    nonMediaCount,
    subfolders: Array.from(subfoldersSet).sort(),
    limitReached,
  };
}
