import { FolderProject, MediaFileItem } from './types';

function createDemoImageSvg(title: string, color: string, w: number, h: number, details: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
        <stop offset="100%" style="stop-color:#090d16;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#grad)" />
    <circle cx="${w / 2}" cy="${h / 2 - 40}" r="140" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="4" stroke-dasharray="8 8" />
    <circle cx="${w / 2}" cy="${h / 2 - 40}" r="80" fill="rgba(255,255,255,0.1)" />
    <text x="${w / 2}" y="${h / 2 - 30}" font-family="system-ui, sans-serif" font-size="32" font-weight="bold" fill="#ffffff" text-anchor="middle">${title}</text>
    <text x="${w / 2}" y="${h / 2 + 30}" font-family="system-ui, sans-serif" font-size="18" fill="rgba(255,255,255,0.8)" text-anchor="middle">${details}</text>
    <rect x="${w / 2 - 160}" y="${h / 2 + 80}" width="320" height="40" rx="8" fill="rgba(0,0,0,0.4)" />
    <text x="${w / 2}" y="${h / 2 + 105}" font-family="monospace" font-size="14" fill="#38bdf8" text-anchor="middle">100% Native Scale · ${w}x${h}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function generateDemoProject(): FolderProject {
  const demoItems: MediaFileItem[] = [
    {
      id: 'demo_1',
      name: 'DSC_0042_Alpine_Sunset.jpg',
      relativePath: 'DemoStudio/Landscape/DSC_0042_Alpine_Sunset.jpg',
      subfolder: 'Landscape',
      size: 3.4 * 1024 * 1024,
      lastModified: Date.now() - 86400000 * 5,
      type: 'image',
      mimeType: 'image/jpeg',
      objectUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1920&auto=format&fit=crop&q=85',
      url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1920&auto=format&fit=crop&q=85',
      demoSvgUrl: createDemoImageSvg('Alpine Sunset Peak', '#0284c7', 1920, 1080, 'ISO 100 · f/8 · 1/250s · 35mm Prime'),
      viewed: true,
      selected: true,
      isOverLimit: false,
    },
    {
      id: 'demo_2',
      name: 'Studio_Editorial_8K.png',
      relativePath: 'DemoStudio/Fashion/Studio_Editorial_8K.png',
      subfolder: 'Fashion',
      size: 7.8 * 1024 * 1024,
      lastModified: Date.now() - 86400000 * 4,
      type: 'image',
      mimeType: 'image/png',
      objectUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1920&auto=format&fit=crop&q=85',
      url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1920&auto=format&fit=crop&q=85',
      demoSvgUrl: createDemoImageSvg('High-Res Studio Editorial', '#7c3aed', 2560, 1440, 'Large File (> 5MB) for Threshold Testing · 7.8 MB'),
      viewed: true,
      selected: false,
      isOverLimit: true,
      isManuallyRevealed: false,
    },
    {
      id: 'demo_3',
      name: 'Architecture_Minimalist_Lines.webp',
      relativePath: 'DemoStudio/Architecture/Architecture_Minimalist_Lines.webp',
      subfolder: 'Architecture',
      size: 2.1 * 1024 * 1024,
      lastModified: Date.now() - 86400000 * 3,
      type: 'image',
      mimeType: 'image/webp',
      objectUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1920&auto=format&fit=crop&q=85',
      url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1920&auto=format&fit=crop&q=85',
      demoSvgUrl: createDemoImageSvg('Brutalist Facade Shadows', '#059669', 1920, 1280, 'ISO 200 · f/5.6 · 1/500s · Monolithic Concrete'),
      viewed: true,
      selected: true,
      isOverLimit: false,
    },
    {
      id: 'demo_4',
      name: 'Wildlife_Kestrel_Hunting.jpg',
      relativePath: 'DemoStudio/Wildlife/Wildlife_Kestrel_Hunting.jpg',
      subfolder: 'Wildlife',
      size: 4.8 * 1024 * 1024,
      lastModified: Date.now() - 86400000 * 2,
      type: 'image',
      mimeType: 'image/jpeg',
      objectUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&auto=format&fit=crop&q=85',
      url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&auto=format&fit=crop&q=85',
      demoSvgUrl: createDemoImageSvg('Kestrel in Mid-Flight', '#d97706', 2048, 1365, 'Shutter 1/2000s · Continuous AF · 400mm Telephoto'),
      viewed: false,
      selected: false,
      isOverLimit: false,
    },
    {
      id: 'demo_5',
      name: 'Cinematic_Motion_Reel.mp4',
      relativePath: 'DemoStudio/MotionReels/Cinematic_Motion_Reel.mp4',
      subfolder: 'MotionReels',
      size: 45 * 1024 * 1024,
      lastModified: Date.now() - 86400000 * 1,
      type: 'video',
      mimeType: 'video/mp4',
      objectUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      demoSvgUrl: createDemoImageSvg('Cinematic Motion Reel', '#2563eb', 1920, 1080, '4K 60fps ProRes Video Stream'),
      viewed: false,
      selected: false,
      isOverLimit: false,
    },
    {
      id: 'demo_6',
      name: 'Drone_Coastal_Survey_4K.mp4',
      relativePath: 'DemoStudio/MotionReels/Drone_Coastal_Survey_4K.mp4',
      subfolder: 'MotionReels',
      size: 125 * 1024 * 1024,
      lastModified: Date.now() - 43200000,
      type: 'video',
      mimeType: 'video/mp4',
      objectUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      demoSvgUrl: createDemoImageSvg('Drone Coastal Survey', '#0891b2', 1920, 1080, '125MB Large File Stream'),
      viewed: false,
      selected: false,
      isOverLimit: true,
      isManuallyRevealed: false,
    },
    {
      id: 'demo_7',
      name: 'Night_Rain_Cyber_Neon.jpg',
      relativePath: 'DemoStudio/Street/Night_Rain_Cyber_Neon.jpg',
      subfolder: 'Street',
      size: 3.9 * 1024 * 1024,
      lastModified: Date.now() - 21600000,
      type: 'image',
      mimeType: 'image/jpeg',
      objectUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&auto=format&fit=crop&q=85',
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&auto=format&fit=crop&q=85',
      demoSvgUrl: createDemoImageSvg('Night Rain Asphalt Reflection', '#dc2626', 1920, 1080, 'Neon Reflections · ISO 800 · f/1.8 · 50mm'),
      viewed: false,
      selected: false,
      isOverLimit: false,
    },
    {
      id: 'demo_8',
      name: 'Macro_Flora_Droplet.png',
      relativePath: 'DemoStudio/Macro/Macro_Flora_Droplet.png',
      subfolder: 'Macro',
      size: 4.2 * 1024 * 1024,
      lastModified: Date.now() - 3600000,
      type: 'image',
      mimeType: 'image/png',
      objectUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&auto=format&fit=crop&q=85',
      url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&auto=format&fit=crop&q=85',
      demoSvgUrl: createDemoImageSvg('Flora Water Droplet Macro', '#16a34a', 2400, 1600, '100mm Macro · Ring Diffuser · 1:1 Magnification'),
      viewed: false,
      selected: false,
      isOverLimit: false,
    },
  ];

  const subfolders = ['Landscape', 'Fashion', 'Architecture', 'Wildlife', 'MotionReels', 'Street', 'Macro'];
  const totalSizeBytes = demoItems.reduce((acc, it) => acc + it.size, 0);

  return {
    id: 'demo_project_sample',
    name: 'Sample Project (Demo Studio)',
    rootPathName: 'DemoStudio',
    createdAt: Date.now() - 3600000,
    lastAccessedAt: Date.now(),
    totalFilesCount: 11, // 8 media + 3 non-media files
    totalSizeBytes,
    mediaCount: 8,
    photosCount: 6,
    videosCount: 2,
    nonMediaCount: 3,
    viewedCount: 3,
    selectedCount: 2,
    lastViewedIndex: 2,
    subfolders,
    enabledSubfolders: subfolders,
    includeRootFiles: true,
    items: demoItems,
  };
}
