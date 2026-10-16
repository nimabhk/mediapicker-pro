export type MediaType = 'image' | 'video';

export type GallerySortOption =
  | 'name_asc'
  | 'name_desc'
  | 'folder_name'
  | 'date_newest'
  | 'date_oldest'
  | 'size_desc'
  | 'size_asc'
  | 'type';

export interface MediaFileItem {
  id: string;
  name: string;
  relativePath: string;
  absolutePath?: string;
  subfolder: string; // e.g. 'Photos/Landscape' or '' for root
  size: number; // in bytes
  lastModified: number; // timestamp
  type: MediaType;
  mimeType: string;
  file?: File; // in-memory or session File object
  objectUrl?: string; // cached blob URL
  url?: string;
  demoSvgUrl?: string;
  viewed: boolean;
  selected: boolean;
  isOverLimit?: boolean;
  isManuallyRevealed?: boolean;
}

export interface FolderProject {
  id: string;
  name: string;
  rootPathName: string;
  createdAt: number;
  lastAccessedAt: number;
  totalFilesCount: number;
  totalSizeBytes: number; // total size of all media in bytes
  mediaCount: number;
  photosCount: number;
  videosCount: number;
  nonMediaCount: number;
  viewedCount: number;
  selectedCount: number;
  lastViewedIndex: number;
  subfolders: string[]; // list of detected subfolders
  enabledSubfolders: string[]; // subfolders active in review
  includeRootFiles: boolean; // whether root-level files are active
  items: MediaFileItem[];
  deletedAt?: number; // for 30-day trash archive
  // Per-folder gallery customized preferences (persisted across sessions)
  galleryColumns?: number; // 1 to 10 (default: 6)
  galleryContainerWidthPercent?: number; // 20 to 100 (default: 100)
  galleryLayoutMode?: 'aspect' | 'square'; // default: 'aspect' (natural aspect ratio)
  gallerySortOption?: GallerySortOption;
  slideshowPaused?: boolean; // persist paused state across windows and views
}

export interface AppSettings {
  slideDurationSec: number; // default: 3
  videoMaxDurationSec: number; // default: 30
  imageSizeLimitMB: number; // default: 5
  videoSizeLimitMB: number; // default: 100
  itemsPerPage: number; // default: 1000
  controlsAutoHideMs: number; // default: 2500
  neonAccent: 'orange' | 'green'; // default: 'orange'
  themeMode: 'dark' | 'light' | 'system';
  clipboardFormat: 'newline' | 'comma' | 'filenames_only' | 'json';
  globalMuted: boolean;
  maxScanFilesLimit: number; // default: 50000
  includeHiddenFiles: boolean; // default: true
  exportSuffix: string; // default: '_selected'
  wheelZoomEnabled: boolean; // default: true (mouse wheel zoom in slideshow)
}

export interface TrashRecord {
  id: string;
  projectId: string;
  projectName: string;
  deletedAt: number;
  expiresAt: number; // deletedAt + 30 days
  itemCount: number;
  projectData: FolderProject;
}

export type ViewMode = 'dashboard' | 'slideshow' | 'gallery';

