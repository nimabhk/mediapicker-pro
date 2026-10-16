import JSZip from 'jszip';
import { MediaFileItem, AppSettings } from './types';

export async function downloadZip(
  items: MediaFileItem[],
  zipFilename: string,
  onProgress?: (percent: number, currentFileName: string) => void
): Promise<void> {
  const zip = new JSZip();

  let loaded = 0;
  const total = items.length;

  for (const item of items) {
    if (onProgress) {
      onProgress(Math.round((loaded / total) * 100), item.name);
    }

    if (item.file) {
      // Use clean relative path inside zip
      zip.file(item.relativePath, item.file);
    } else if (item.objectUrl) {
      try {
        const response = await fetch(item.objectUrl);
        const blob = await response.blob();
        zip.file(item.relativePath, blob);
      } catch (e) {
        console.warn('Could not fetch item for zip:', item.relativePath, e);
      }
    }
    loaded++;
  }

  if (onProgress) {
    onProgress(100, 'در حال فشرده‌سازی نهایی...');
  }

  const content = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    (metadata) => {
      if (onProgress) {
        onProgress(Math.round(metadata.percent), 'تولید فایل زیپ...');
      }
    }
  );

  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipFilename.endsWith('.zip') ? zipFilename : `${zipFilename}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportTextList(
  items: MediaFileItem[],
  filename: string,
  includeFullPath: boolean = true
): void {
  const lines = items.map((i) => (includeFullPath ? i.relativePath : i.name));
  const text = lines.join('\n');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.txt') ? filename : `${filename}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatClipboardPaths(
  items: MediaFileItem[],
  format: AppSettings['clipboardFormat']
): string {
  if (items.length === 0) return '';
  switch (format) {
    case 'newline':
      return items.map((i) => i.relativePath).join('\n');
    case 'comma':
      return items.map((i) => i.relativePath).join(', ');
    case 'filenames_only':
      return items.map((i) => i.name).join('\n');
    case 'json':
      return JSON.stringify(
        items.map((i) => ({ name: i.name, path: i.relativePath, size: i.size })),
        null,
        2
      );
    default:
      return items.map((i) => i.relativePath).join('\n');
  }
}
