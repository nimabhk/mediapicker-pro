import { AppSettings, FolderProject, TrashRecord } from './types';

const SETTINGS_KEY = 'mediapicker_settings';
const PROJECTS_KEY = 'mediapicker_projects_meta';
const TRASH_KEY = 'mediapicker_trash_records';
const DB_NAME = 'MediaPickerProDB';
const DB_VERSION = 1;
const STORE_NAME = 'project_files_store';

export const DEFAULT_SETTINGS: AppSettings = {
  slideDurationSec: 3,
  videoMaxDurationSec: 30,
  imageSizeLimitMB: 5,
  videoSizeLimitMB: 100,
  itemsPerPage: 1000,
  controlsAutoHideMs: 2500,
  neonAccent: 'orange',
  themeMode: 'dark',
  clipboardFormat: 'newline',
  globalMuted: true,
  maxScanFilesLimit: 50000,
  includeHiddenFiles: true,
  exportSuffix: '_selected',
  wheelZoomEnabled: true,
};

// Safe localStorage access
export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Failed to load settings:', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

// 30 Days in milliseconds: 30 * 24 * 60 * 60 * 1000 = 2,592,000,000 ms
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function loadTrashRecords(): TrashRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TRASH_KEY);
    if (!raw) return [];
    const list: TrashRecord[] = JSON.parse(raw);
    const now = Date.now();
    // Filter out items older than 30 days (purged on day 31)
    const valid = list.filter((item) => now <= item.expiresAt);
    if (valid.length !== list.length) {
      localStorage.setItem(TRASH_KEY, JSON.stringify(valid));
    }
    return valid;
  } catch (err) {
    console.error('Failed to load trash records:', err);
    return [];
  }
}

export function saveTrashRecord(project: FolderProject): void {
  if (typeof window === 'undefined') return;
  try {
    const trashList = loadTrashRecords();
    const now = Date.now();
    const newRecord: TrashRecord = {
      id: 'trash_' + project.id + '_' + now,
      projectId: project.id,
      projectName: project.name,
      deletedAt: now,
      expiresAt: now + THIRTY_DAYS_MS,
      itemCount: project.mediaCount,
      projectData: {
        ...project,
        deletedAt: now,
        // Do not store live File objects in localStorage to avoid serialization error
        items: project.items.map((it) => ({
          ...it,
          file: undefined,
          objectUrl: undefined,
        })),
      },
    };
    trashList.unshift(newRecord);
    localStorage.setItem(TRASH_KEY, JSON.stringify(trashList));
  } catch (err) {
    console.error('Failed to save trash record:', err);
  }
}

export function removeTrashRecord(trashId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const trashList = loadTrashRecords().filter((t) => t.id !== trashId);
    localStorage.setItem(TRASH_KEY, JSON.stringify(trashList));
  } catch (err) {
    console.error('Failed to remove trash record:', err);
  }
}

// IndexedDB Helper for deep storage if needed
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject('No window');
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function persistProjectToIDB(project: FolderProject): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    // Strip in-memory objectUrl before storing
    const serializableProject = {
      ...project,
      items: project.items.map((i) => ({
        id: i.id,
        name: i.name,
        relativePath: i.relativePath,
        size: i.size,
        type: i.type,
        mimeType: i.mimeType,
        viewed: i.viewed,
        selected: i.selected,
      })),
    };
    store.put(serializableProject);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB persistence notice:', err);
  }
}

export async function getProjectFromIDB(id: string): Promise<FolderProject | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function deleteProjectFromIDB(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
  } catch (err) {
    console.warn('IDB delete error:', err);
  }
}

// Check if duplicate project exists by name and count signature
export function findMatchingProject(
  projects: FolderProject[],
  name: string,
  mediaCount: number
): FolderProject | undefined {
  return projects.find(
    (p) => p.name.toLowerCase() === name.toLowerCase() && Math.abs(p.mediaCount - mediaCount) <= 2
  );
}
