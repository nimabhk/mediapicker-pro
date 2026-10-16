export interface ThemeColorPalette {
  bgBase: string; // root page background
  surface: string; // cards, panels
  surfaceElevated: string; // modals, floating bars
  surfaceHover: string;
  border: string; // card & section borders
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string; // primary highlight hex/class
  accentBg: string; // accent background hex/class
  accentRgb: string; // rgb triplet: "0, 229, 255"
  accentContrast: string; // high-contrast text color on accent backgrounds
  dangerAccent: string; // semantic rejection/trash highlight
  badgeBg: string;
  badgeText: string;
  glowShadow: string;
  glassEffect: string; // glassmorphism backdrop-blur & border class
}

export interface AppTheme {
  id: string;
  name: string;
  nameFa: string;
  tagline: string;
  description: string;
  preferredMode: 'dark' | 'light';
  darkPalette: ThemeColorPalette;
  lightPalette: ThemeColorPalette;
  palette: ThemeColorPalette; // active palette according to mode
  cardRadius: string;
  btnRadius: string;
  panelRadius: string;
  hudRadius: string;
  fontHeading?: string;
}

export const REGISTERED_THEMES: Record<string, AppTheme> = {
  // 1. Theme 1: Obsidian Culler (Digital Grading Darkroom)
  'theme-1-obsidian-culler': {
    id: 'theme-1-obsidian-culler',
    name: 'Obsidian Culler',
    nameFa: 'ابسیدین (تاریک‌خانه دیجیتال)',
    tagline: 'Pure OLED Pitch-Black & Precision Electric Cyan',
    description:
      'Engineered for pitch-dark professional grading suites and OLED screens. 4px razor borders, high-volt electric cyan selection, and zero-distraction darkroom canvas.',
    preferredMode: 'dark',
    cardRadius: 'rounded-[4px]',
    btnRadius: 'rounded-[4px]',
    panelRadius: 'rounded-[6px]',
    hudRadius: 'rounded-[6px]',
    darkPalette: {
      bgBase: 'bg-[#0d0e11]',
      surface: 'bg-[#15171c]',
      surfaceElevated: 'bg-[#1e2128]',
      surfaceHover: 'hover:bg-[#282c35]',
      border: 'border-white/10',
      borderSubtle: 'border-white/5',
      textPrimary: 'text-[#f3f4f6]',
      textSecondary: 'text-[#9ca3af]',
      textMuted: 'text-[#646d7a]',
      accent: 'text-[#00e5ff]',
      accentBg: 'bg-[#00e5ff]',
      accentRgb: '0, 229, 255',
      accentContrast: '#041014',
      dangerAccent: '#ff3b30',
      badgeBg: 'bg-[#00e5ff]/15',
      badgeText: 'text-[#00e5ff]',
      glowShadow: 'shadow-[0_0_20px_rgba(0,229,255,0.55)]',
      glassEffect: 'theme-surface',
    },
    lightPalette: {
      bgBase: 'bg-[#f1f3f7]',
      surface: 'bg-[#ffffff]',
      surfaceElevated: 'bg-[#ffffff]',
      surfaceHover: 'hover:bg-[#eaeef5]',
      border: 'border-[#d5d9e2]',
      borderSubtle: 'border-[#e5e8f0]',
      textPrimary: 'text-[#111418]',
      textSecondary: 'text-[#4b5260]',
      textMuted: 'text-[#767f8f]',
      accent: 'text-[#0099b8]',
      accentBg: 'bg-[#0099b8]',
      accentRgb: '0, 153, 184',
      accentContrast: '#ffffff',
      dangerAccent: '#dc2626',
      badgeBg: 'bg-[#0099b8]/15',
      badgeText: 'text-[#0099b8]',
      glowShadow: 'shadow-[0_0_16px_rgba(0,153,184,0.35)]',
      glassEffect: 'theme-surface',
    },
    palette: {
      bgBase: 'bg-[#0d0e11]',
      surface: 'bg-[#15171c]',
      surfaceElevated: 'bg-[#1e2128]',
      surfaceHover: 'hover:bg-[#282c35]',
      border: 'border-white/10',
      borderSubtle: 'border-white/5',
      textPrimary: 'text-[#f3f4f6]',
      textSecondary: 'text-[#9ca3af]',
      textMuted: 'text-[#646d7a]',
      accent: 'text-[#00e5ff]',
      accentBg: 'bg-[#00e5ff]',
      accentRgb: '0, 229, 255',
      accentContrast: '#041014',
      dangerAccent: '#ff3b30',
      badgeBg: 'bg-[#00e5ff]/15',
      badgeText: 'text-[#00e5ff]',
      glowShadow: 'shadow-[0_0_20px_rgba(0,229,255,0.55)]',
      glassEffect: 'theme-surface',
    },
  },

  // 2. Theme 2: Cupertino Frosted Pro (Native macOS Sonoma / Tahoe HIG Vibrancy)
  'theme-2-cupertino-frosted-pro': {
    id: 'theme-2-cupertino-frosted-pro',
    name: 'Cupertino Frosted Pro',
    nameFa: 'کوپرتینو (شیشه مات macOS)',
    tagline: 'macOS Tahoe Vibrancy & Frosted Acrylic Glassmorphism',
    description:
      'Authentic macOS Sonoma/Tahoe system vibrancy. High-saturation frosted acrylic blur, dual-rim window specularity, anodized micro-grain, and Apple System Blue accents.',
    preferredMode: 'dark',
    cardRadius: 'rounded-[10px]',
    btnRadius: 'rounded-[7px]',
    panelRadius: 'rounded-[14px]',
    hudRadius: 'rounded-[22px]',
    darkPalette: {
      bgBase: 'bg-[#0f1015]',
      surface: 'bg-[#22232b]/56',
      surfaceElevated: 'bg-[#2c2e38]/66',
      surfaceHover: 'hover:bg-[#3e414e]/68',
      border: 'border-white/14',
      borderSubtle: 'border-white/7',
      textPrimary: 'text-white',
      textSecondary: 'text-white/72',
      textMuted: 'text-white/48',
      accent: 'text-[#0a84ff]',
      accentBg: 'bg-[#0a84ff]',
      accentRgb: '10, 132, 255',
      accentContrast: '#ffffff',
      dangerAccent: '#ff453a',
      badgeBg: 'bg-[#0a84ff]/22',
      badgeText: 'text-[#64d2ff]',
      glowShadow: 'shadow-[0_0_22px_rgba(10,132,255,0.55)]',
      glassEffect: 'cupertino-vibrancy-rim',
    },
    lightPalette: {
      bgBase: 'bg-[#e8edf5]',
      surface: 'bg-white/62',
      surfaceElevated: 'bg-white/74',
      surfaceHover: 'hover:bg-white/85',
      border: 'border-black/9',
      borderSubtle: 'border-black/5',
      textPrimary: 'text-[#1d1d1f]',
      textSecondary: 'text-[#1d1d1f]/72',
      textMuted: 'text-[#1d1d1f]/48',
      accent: 'text-[#0071e3]',
      accentBg: 'bg-[#0071e3]',
      accentRgb: '0, 113, 227',
      accentContrast: '#ffffff',
      dangerAccent: '#ff3b30',
      badgeBg: 'bg-[#0071e3]/15',
      badgeText: 'text-[#0071e3]',
      glowShadow: 'shadow-[0_0_18px_rgba(0,113,227,0.35)]',
      glassEffect: 'cupertino-vibrancy-rim',
    },
    palette: {
      bgBase: 'bg-[#0f1015]',
      surface: 'bg-[#22232b]/56',
      surfaceElevated: 'bg-[#2c2e38]/66',
      surfaceHover: 'hover:bg-[#3e414e]/68',
      border: 'border-white/14',
      borderSubtle: 'border-white/7',
      textPrimary: 'text-white',
      textSecondary: 'text-white/72',
      textMuted: 'text-white/48',
      accent: 'text-[#0a84ff]',
      accentBg: 'bg-[#0a84ff]',
      accentRgb: '10, 132, 255',
      accentContrast: '#ffffff',
      dangerAccent: '#ff453a',
      badgeBg: 'bg-[#0a84ff]/22',
      badgeText: 'text-[#64d2ff]',
      glowShadow: 'shadow-[0_0_22px_rgba(10,132,255,0.55)]',
      glassEffect: 'cupertino-vibrancy-rim',
    },
  },

  // 3. Theme 3: Liquid Glass (Refractive Glacier Ice & Prismatic Liquid Glass)
  'theme-3-liquid-glass': {
    id: 'theme-3-liquid-glass',
    name: 'Liquid Glass',
    nameFa: 'لیکوید گلس (یخ شفاف و منشوری)',
    tagline: 'Crystalline Glacier Ice & Prismatic Specular Refraction',
    description:
      'Sculpted from translucent glacier ice. Features 4-vector specular bevels, diagonal crystal sheen, caustic light meshes, capsule liquid pills, and high-refraction cyan glow.',
    preferredMode: 'dark',
    cardRadius: 'rounded-[12px]',
    btnRadius: 'rounded-full',
    panelRadius: 'rounded-[18px]',
    hudRadius: 'rounded-full',
    darkPalette: {
      bgBase: 'bg-[#050a14]',
      surface: 'bg-[#0e1c34]/28',
      surfaceElevated: 'bg-[#0a182e]/44',
      surfaceHover: 'hover:bg-[#00d2ff]/16',
      border: 'border-[#7debff]/36',
      borderSubtle: 'border-[#00d2ff]/18',
      textPrimary: 'text-[#f0fdff]',
      textSecondary: 'text-[#a5f0ff]',
      textMuted: 'text-[#5cc4e0]',
      accent: 'text-[#00d2ff]',
      accentBg: 'bg-[#00d2ff]',
      accentRgb: '0, 210, 255',
      accentContrast: '#03131a',
      dangerAccent: '#ff2a55',
      badgeBg: 'bg-[#00d2ff]/20',
      badgeText: 'text-[#00d2ff]',
      glowShadow: 'shadow-[0_0_28px_rgba(0,210,255,0.65)]',
      glassEffect: 'liquid-specular-rim',
    },
    lightPalette: {
      bgBase: 'bg-[#e2f6fc]',
      surface: 'bg-white/42',
      surfaceElevated: 'bg-white/58',
      surfaceHover: 'hover:bg-white/76',
      border: 'border-[#00a8d6]/42',
      borderSubtle: 'border-[#00a8d6]/22',
      textPrimary: 'text-[#042834]',
      textSecondary: 'text-[#0b586e]',
      textMuted: 'text-[#21839c]',
      accent: 'text-[#0096c7]',
      accentBg: 'bg-[#0096c7]',
      accentRgb: '0, 150, 199',
      accentContrast: '#ffffff',
      dangerAccent: '#e11d48',
      badgeBg: 'bg-[#0096c7]/15',
      badgeText: 'text-[#0096c7]',
      glowShadow: 'shadow-[0_0_24px_rgba(0,150,199,0.45)]',
      glassEffect: 'liquid-specular-rim',
    },
    palette: {
      bgBase: 'bg-[#050a14]',
      surface: 'bg-[#0e1c34]/28',
      surfaceElevated: 'bg-[#0a182e]/44',
      surfaceHover: 'hover:bg-[#00d2ff]/16',
      border: 'border-[#7debff]/36',
      borderSubtle: 'border-[#00d2ff]/18',
      textPrimary: 'text-[#f0fdff]',
      textSecondary: 'text-[#a5f0ff]',
      textMuted: 'text-[#5cc4e0]',
      accent: 'text-[#00d2ff]',
      accentBg: 'bg-[#00d2ff]',
      accentRgb: '0, 210, 255',
      accentContrast: '#03131a',
      dangerAccent: '#ff2a55',
      badgeBg: 'bg-[#00d2ff]/20',
      badgeText: 'text-[#00d2ff]',
      glowShadow: 'shadow-[0_0_28px_rgba(0,210,255,0.65)]',
      glassEffect: 'liquid-specular-rim',
    },
  },

  // 4. Theme 4: Paper Atelier (Tactile Editorial Drafting Canvas)
  'theme-4-paper-atelier': {
    id: 'theme-4-paper-atelier',
    name: 'Paper Atelier',
    nameFa: 'آتلیه کاغذی (طراحی سرمقاله‌ای)',
    tagline: 'Warm Tactile Washi Paper & Editorial Serif Drafting Lines',
    description:
      'A warm, tactile printmaker aesthetic with micro-grain washi paper, 3px crisp cut edges, editorial serif typography, pastel sage selection, and terracotta bookmarks.',
    preferredMode: 'light',
    cardRadius: 'rounded-[3px]',
    btnRadius: 'rounded-[4px]',
    panelRadius: 'rounded-[6px]',
    hudRadius: 'rounded-full',
    fontHeading: '"Newsreader", Georgia, Cambria, "Times New Roman", serif',
    lightPalette: {
      bgBase: 'bg-[#f7f5f0]',
      surface: 'bg-[#ffffff]',
      surfaceElevated: 'bg-[#efece4]',
      surfaceHover: 'hover:bg-[#f1ede3]',
      border: 'border-[#ded7c8]',
      borderSubtle: 'border-[#eae4d8]',
      textPrimary: 'text-[#252422]',
      textSecondary: 'text-[#6b6862]',
      textMuted: 'text-[#9c978e]',
      accent: 'text-[#6c968b]',
      accentBg: 'bg-[#6c968b]',
      accentRgb: '108, 150, 139',
      accentContrast: '#ffffff',
      dangerAccent: '#e07a5f',
      badgeBg: 'bg-[#6c968b]/20',
      badgeText: 'text-[#5a8076]',
      glowShadow: 'shadow-[0_0_16px_rgba(108,150,139,0.42)]',
      glassEffect: 'theme-surface',
    },
    darkPalette: {
      bgBase: 'bg-[#1c1a17]',
      surface: 'bg-[#272420]',
      surfaceElevated: 'bg-[#312d28]',
      surfaceHover: 'hover:bg-[#3d3832]',
      border: 'border-[#463f38]',
      borderSubtle: 'border-[#332d27]',
      textPrimary: 'text-[#f6f3eb]',
      textSecondary: 'text-[#cac3b5]',
      textMuted: 'text-[#948c7e]',
      accent: 'text-[#7ea69b]',
      accentBg: 'bg-[#7ea69b]',
      accentRgb: '126, 166, 155',
      accentContrast: '#141c1a',
      dangerAccent: '#e07a5f',
      badgeBg: 'bg-[#7ea69b]/20',
      badgeText: 'text-[#a2c5bc]',
      glowShadow: 'shadow-[0_0_20px_rgba(126,166,155,0.5)]',
      glassEffect: 'theme-surface',
    },
    palette: {
      bgBase: 'bg-[#f7f5f0]',
      surface: 'bg-[#ffffff]',
      surfaceElevated: 'bg-[#efece4]',
      surfaceHover: 'hover:bg-[#f1ede3]',
      border: 'border-[#ded7c8]',
      borderSubtle: 'border-[#eae4d8]',
      textPrimary: 'text-[#252422]',
      textSecondary: 'text-[#6b6862]',
      textMuted: 'text-[#9c978e]',
      accent: 'text-[#6c968b]',
      accentBg: 'bg-[#6c968b]',
      accentRgb: '108, 150, 139',
      accentContrast: '#ffffff',
      dangerAccent: '#e07a5f',
      badgeBg: 'bg-[#6c968b]/20',
      badgeText: 'text-[#5a8076]',
      glowShadow: 'shadow-[0_0_16px_rgba(108,150,139,0.42)]',
      glassEffect: 'theme-surface',
    },
  },
};

export const THEME_LIST: AppTheme[] = Object.values(REGISTERED_THEMES);

export function getTheme(themeId?: string, isDark: boolean = true): AppTheme {
  const base =
    themeId && REGISTERED_THEMES[themeId]
      ? REGISTERED_THEMES[themeId]
      : REGISTERED_THEMES['theme-1-obsidian-culler'];
  return {
    ...base,
    palette: isDark ? base.darkPalette : base.lightPalette,
  };
}

export function getThemePalette(themeId?: string, isDark: boolean = true): ThemeColorPalette {
  const theme = getTheme(themeId, isDark);
  return theme.palette;
}