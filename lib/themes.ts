/**
 * Theme and Layout Configuration
 *
 * Why: jobmark prioritizes a "premium feel" through high-quality UI customization.
 * This module defines the color presets and layout options that drive the
 * dynamic theme engine.
 *
 * Key Integration: These hex values are injected into CSS variables by
 * `SettingsProvider.tsx`, allowing the entire Tailwind-based UI to
 * transform instantly without page reloads.
 */
// Theme preset definitions for the application
// Each theme defines hex color values to match globals.css

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    primaryForeground: string;
    accent: string;
    accentWarm: string;
    accentWarmHover: string;
    ring: string;
    sidebarPrimary: string;
    sidebarRing: string;
    chart1: string;
    chart2: string;
    chart3: string;
    chart4: string;
    chart5: string;
    success: string;
    warning: string;
    info: string;
  };
}

export interface ThemeSurfaceColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  destructiveText: string;
  border: string;
  input: string;
  sidebar: string;
  sidebarForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
}

export interface ThemeSurfacePalette {
  dark: ThemeSurfaceColors;
  light: ThemeSurfaceColors;
}

const defaultDarkSurface: ThemeSurfaceColors = {
  background: '#1a1412',
  foreground: '#f5f0e8',
  card: '#241e1a',
  cardForeground: '#f5f0e8',
  popover: '#2a2320',
  popoverForeground: '#f5f0e8',
  secondary: '#2a2320',
  secondaryForeground: '#e8dfd4',
  muted: '#2a2320',
  mutedForeground: '#a89888',
  accentForeground: '#1a1412',
  destructive: '#d66b6b',
  destructiveForeground: '#1a1412',
  destructiveText: '#ff8a8a',
  border: '#3d332c',
  input: '#3d332c',
  sidebar: '#1e1814',
  sidebarForeground: '#f5f0e8',
  sidebarAccent: '#2a2320',
  sidebarAccentForeground: '#e8dfd4',
  sidebarBorder: '#3d332c',
};

const defaultLightSurface: ThemeSurfaceColors = {
  background: '#f7f3ee',
  foreground: '#2b241f',
  card: '#fffaf5',
  cardForeground: '#2b241f',
  popover: '#fffaf5',
  popoverForeground: '#2b241f',
  secondary: '#eee7df',
  secondaryForeground: '#3f352d',
  muted: '#eee7df',
  mutedForeground: '#76685d',
  accentForeground: '#2b241f',
  destructive: '#c24c4c',
  destructiveForeground: '#fffaf5',
  destructiveText: '#b64242',
  border: '#d8cec3',
  input: '#d8cec3',
  sidebar: '#f0e9e1',
  sidebarForeground: '#3f352d',
  sidebarAccent: '#e5dbd1',
  sidebarAccentForeground: '#2b241f',
  sidebarBorder: '#d8cec3',
};

function darkSurface(overrides: Partial<ThemeSurfaceColors>): ThemeSurfaceColors {
  return { ...defaultDarkSurface, ...overrides };
}

function lightSurface(overrides: Partial<ThemeSurfaceColors>): ThemeSurfaceColors {
  return { ...defaultLightSurface, ...overrides };
}

export const themePresets: ThemePreset[] = [
  {
    id: 'cafe',
    name: 'Café Warmth',
    description: 'Cozy and focused',
    colors: {
      primary: '#d4a574',
      primaryForeground: '#1a1412',
      accent: '#c49a6c',
      accentWarm: '#E3B283',
      accentWarmHover: '#d9a370',
      ring: '#d4a574',
      sidebarPrimary: '#d4a574',
      sidebarRing: '#d4a574',
      chart1: '#d4a574',
      chart2: '#7fb069',
      chart3: '#e0a458',
      chart4: '#c49a6c',
      chart5: '#a89888',
      success: '#7fb069',
      warning: '#e0a458',
      info: '#8aa6bf',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean Calm',
    description: 'Calm and clear',
    colors: {
      primary: '#60a5fa',
      primaryForeground: '#1a1412',
      accent: '#3b82f6',
      accentWarm: '#60a5fa',
      accentWarmHover: '#3b82f6',
      ring: '#60a5fa',
      sidebarPrimary: '#60a5fa',
      sidebarRing: '#60a5fa',
      chart1: '#60a5fa',
      chart2: '#34d399',
      chart3: '#fbbf24',
      chart4: '#a78bfa',
      chart5: '#94a3b8',
      success: '#34d399',
      warning: '#fbbf24',
      info: '#60a5fa',
    },
  },
  {
    id: 'forest',
    name: 'Forest Focus',
    description: 'Fresh and focused.',
    colors: {
      primary: '#4ade80',
      primaryForeground: '#1a1412',
      accent: '#22c55e',
      accentWarm: '#4ade80',
      accentWarmHover: '#22c55e',
      ring: '#4ade80',
      sidebarPrimary: '#4ade80',
      sidebarRing: '#4ade80',
      chart1: '#4ade80',
      chart2: '#facc15',
      chart3: '#fb923c',
      chart4: '#2dd4bf',
      chart5: '#a3a3a3',
      success: '#4ade80',
      warning: '#facc15',
      info: '#2dd4bf',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset Ambition',
    description: 'Energetic and bold',
    colors: {
      primary: '#fb923c',
      primaryForeground: '#1a1412',
      accent: '#f97316',
      accentWarm: '#fb923c',
      accentWarmHover: '#f97316',
      ring: '#fb923c',
      sidebarPrimary: '#fb923c',
      sidebarRing: '#fb923c',
      chart1: '#fb923c',
      chart2: '#facc15',
      chart3: '#f87171',
      chart4: '#fb7185',
      chart5: '#a8a29e',
      success: '#86efac',
      warning: '#fbbf24',
      info: '#93c5fd',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight Pro',
    description: 'Creative and modern',
    colors: {
      primary: '#a78bfa',
      primaryForeground: '#1a1412',
      accent: '#8b5cf6',
      accentWarm: '#a78bfa',
      accentWarmHover: '#8b5cf6',
      ring: '#a78bfa',
      sidebarPrimary: '#a78bfa',
      sidebarRing: '#a78bfa',
      chart1: '#a78bfa',
      chart2: '#60a5fa',
      chart3: '#f472b6',
      chart4: '#2dd4bf',
      chart5: '#a1a1aa',
      success: '#4ade80',
      warning: '#fbbf24',
      info: '#60a5fa',
    },
  },
  {
    id: 'rose',
    name: 'Rose Clarity',
    description: 'Warm and personal',
    colors: {
      primary: '#f472b6',
      primaryForeground: '#1a1412',
      accent: '#ec4899',
      accentWarm: '#f472b6',
      accentWarmHover: '#ec4899',
      ring: '#f472b6',
      sidebarPrimary: '#f472b6',
      sidebarRing: '#f472b6',
      chart1: '#f472b6',
      chart2: '#fb7185',
      chart3: '#fbbf24',
      chart4: '#a78bfa',
      chart5: '#a1a1aa',
      success: '#86efac',
      warning: '#fbbf24',
      info: '#93c5fd',
    },
  },
  {
    id: 'slate',
    name: 'Slate Minimal',
    description: 'Clean and neutral',
    colors: {
      primary: '#94a3b8',
      primaryForeground: '#1a1412',
      accent: '#64748b',
      accentWarm: '#94a3b8',
      accentWarmHover: '#64748b',
      ring: '#94a3b8',
      sidebarPrimary: '#94a3b8',
      sidebarRing: '#94a3b8',
      chart1: '#94a3b8',
      chart2: '#60a5fa',
      chart3: '#a78bfa',
      chart4: '#2dd4bf',
      chart5: '#64748b',
      success: '#4ade80',
      warning: '#fbbf24',
      info: '#60a5fa',
    },
  },
];

export const themeSurfacePalettes: Record<string, ThemeSurfacePalette> = {
  cafe: {
    dark: darkSurface({}),
    light: lightSurface({}),
  },
  ocean: {
    dark: darkSurface({
      background: '#0f1720',
      foreground: '#e8f1fa',
      card: '#172331',
      cardForeground: '#e8f1fa',
      popover: '#1d2d3d',
      popoverForeground: '#e8f1fa',
      secondary: '#1d2d3d',
      secondaryForeground: '#d8e8f5',
      muted: '#1d2d3d',
      mutedForeground: '#92a8ba',
      accentForeground: '#eff6ff',
      border: '#2c4255',
      input: '#2c4255',
      sidebar: '#101c27',
      sidebarForeground: '#dbeafe',
      sidebarAccent: '#1d3042',
      sidebarAccentForeground: '#eff6ff',
      sidebarBorder: '#2c4255',
    }),
    light: lightSurface({
      background: '#f4f8fc',
      foreground: '#1c2833',
      card: '#ffffff',
      cardForeground: '#1c2833',
      popover: '#ffffff',
      popoverForeground: '#1c2833',
      secondary: '#e8f1f8',
      secondaryForeground: '#30475a',
      muted: '#e8f1f8',
      mutedForeground: '#5d7285',
      accentForeground: '#1c2833',
      border: '#cbdbe8',
      input: '#cbdbe8',
      sidebar: '#eaf2f9',
      sidebarForeground: '#30475a',
      sidebarAccent: '#dcebf5',
      sidebarAccentForeground: '#1c2833',
      sidebarBorder: '#cbdbe8',
    }),
  },
  forest: {
    dark: darkSurface({
      background: '#101b17',
      foreground: '#e8f4ed',
      card: '#17271f',
      cardForeground: '#e8f4ed',
      popover: '#1e3328',
      popoverForeground: '#e8f4ed',
      secondary: '#1e3328',
      secondaryForeground: '#d7ebdf',
      muted: '#1e3328',
      mutedForeground: '#9db8a6',
      accentForeground: '#102016',
      border: '#2f4a3a',
      input: '#2f4a3a',
      sidebar: '#0e1713',
      sidebarForeground: '#dff3e6',
      sidebarAccent: '#1a3023',
      sidebarAccentForeground: '#e8f4ed',
      sidebarBorder: '#2f4a3a',
    }),
    light: lightSurface({
      background: '#f2f8f4',
      foreground: '#1e2b23',
      card: '#fbfffc',
      cardForeground: '#1e2b23',
      popover: '#fbfffc',
      popoverForeground: '#1e2b23',
      secondary: '#e3f0e7',
      secondaryForeground: '#395344',
      muted: '#e3f0e7',
      mutedForeground: '#577060',
      accentForeground: '#1e2b23',
      border: '#c7dccd',
      input: '#c7dccd',
      sidebar: '#e5f0e8',
      sidebarForeground: '#395344',
      sidebarAccent: '#d8eade',
      sidebarAccentForeground: '#1e2b23',
      sidebarBorder: '#c7dccd',
    }),
  },
  sunset: {
    dark: darkSurface({
      background: '#211512',
      foreground: '#fff0e5',
      card: '#2b1b16',
      cardForeground: '#fff0e5',
      popover: '#36231a',
      popoverForeground: '#fff0e5',
      secondary: '#36231a',
      secondaryForeground: '#f6dfd0',
      muted: '#36231a',
      mutedForeground: '#bda294',
      accentForeground: '#2b170d',
      border: '#56382a',
      input: '#56382a',
      sidebar: '#1c120f',
      sidebarForeground: '#ffe8d8',
      sidebarAccent: '#342019',
      sidebarAccentForeground: '#fff0e5',
      sidebarBorder: '#56382a',
    }),
    light: lightSurface({
      background: '#fff7f2',
      foreground: '#34221b',
      card: '#fffdfb',
      cardForeground: '#34221b',
      popover: '#fffdfb',
      popoverForeground: '#34221b',
      secondary: '#f8e8df',
      secondaryForeground: '#5e4032',
      muted: '#f8e8df',
      mutedForeground: '#876f63',
      accentForeground: '#34221b',
      border: '#ead0c1',
      input: '#ead0c1',
      sidebar: '#f9ece4',
      sidebarForeground: '#5e4032',
      sidebarAccent: '#f1ddd1',
      sidebarAccentForeground: '#34221b',
      sidebarBorder: '#ead0c1',
    }),
  },
  midnight: {
    dark: darkSurface({
      background: '#15131f',
      foreground: '#f1efff',
      card: '#201c30',
      cardForeground: '#f1efff',
      popover: '#292440',
      popoverForeground: '#f1efff',
      secondary: '#292440',
      secondaryForeground: '#e4dfff',
      muted: '#292440',
      mutedForeground: '#a69fc0',
      accentForeground: '#171221',
      border: '#3d3658',
      input: '#3d3658',
      sidebar: '#11101b',
      sidebarForeground: '#e9e5ff',
      sidebarAccent: '#25203a',
      sidebarAccentForeground: '#f1efff',
      sidebarBorder: '#3d3658',
    }),
    light: lightSurface({
      background: '#f7f5ff',
      foreground: '#29243a',
      card: '#ffffff',
      cardForeground: '#29243a',
      popover: '#ffffff',
      popoverForeground: '#29243a',
      secondary: '#eeeafc',
      secondaryForeground: '#514a68',
      muted: '#eeeafc',
      mutedForeground: '#716a87',
      accentForeground: '#29243a',
      border: '#dcd5f0',
      input: '#dcd5f0',
      sidebar: '#eeeafb',
      sidebarForeground: '#514a68',
      sidebarAccent: '#e3ddf7',
      sidebarAccentForeground: '#29243a',
      sidebarBorder: '#dcd5f0',
    }),
  },
  rose: {
    dark: darkSurface({
      background: '#21151d',
      foreground: '#fff0f6',
      card: '#2c1b27',
      cardForeground: '#fff0f6',
      popover: '#382334',
      popoverForeground: '#fff0f6',
      secondary: '#382334',
      secondaryForeground: '#f7deeb',
      muted: '#382334',
      mutedForeground: '#bfa5b4',
      accentForeground: '#25121d',
      border: '#523344',
      input: '#523344',
      sidebar: '#1c1118',
      sidebarForeground: '#fbe5ef',
      sidebarAccent: '#33202d',
      sidebarAccentForeground: '#fff0f6',
      sidebarBorder: '#523344',
    }),
    light: lightSurface({
      background: '#fff5f9',
      foreground: '#33212a',
      card: '#ffffff',
      cardForeground: '#33212a',
      popover: '#ffffff',
      popoverForeground: '#33212a',
      secondary: '#f7e6ef',
      secondaryForeground: '#5e4050',
      muted: '#f7e6ef',
      mutedForeground: '#876c79',
      accentForeground: '#33212a',
      border: '#ead1df',
      input: '#ead1df',
      sidebar: '#faeaf2',
      sidebarForeground: '#5e4050',
      sidebarAccent: '#f3dce8',
      sidebarAccentForeground: '#33212a',
      sidebarBorder: '#ead1df',
    }),
  },
  slate: {
    dark: darkSurface({
      background: '#14181e',
      foreground: '#f0f3f7',
      card: '#1d232b',
      cardForeground: '#f0f3f7',
      popover: '#252d37',
      popoverForeground: '#f0f3f7',
      secondary: '#252d37',
      secondaryForeground: '#dfe5ec',
      muted: '#252d37',
      mutedForeground: '#a2adbb',
      accentForeground: '#171a20',
      border: '#38424f',
      input: '#38424f',
      sidebar: '#11151a',
      sidebarForeground: '#e5ebf2',
      sidebarAccent: '#222b35',
      sidebarAccentForeground: '#f0f3f7',
      sidebarBorder: '#38424f',
    }),
    light: lightSurface({
      background: '#f5f7fa',
      foreground: '#232a33',
      card: '#ffffff',
      cardForeground: '#232a33',
      popover: '#ffffff',
      popoverForeground: '#232a33',
      secondary: '#e9edf2',
      secondaryForeground: '#45515e',
      muted: '#e9edf2',
      mutedForeground: '#65717e',
      accentForeground: '#232a33',
      border: '#d4dbe3',
      input: '#d4dbe3',
      sidebar: '#edf1f5',
      sidebarForeground: '#45515e',
      sidebarAccent: '#e1e7ed',
      sidebarAccentForeground: '#232a33',
      sidebarBorder: '#d4dbe3',
    }),
  },
};

export function getThemeSurfacePalette(id: string): ThemeSurfacePalette {
  return themeSurfacePalettes[id] ?? themeSurfacePalettes.cafe;
}

export function getThemePreset(id: string): ThemePreset | undefined {
  return themePresets.find(t => t.id === id);
}

export const dashboardLayouts = [
  { id: 'compact', name: 'Compact', description: 'Dense information, less whitespace' },
  { id: 'standard', name: 'Standard', description: 'Balanced layout' },
  { id: 'focused', name: 'Focused', description: 'Minimal, only essentials' },
] as const;

export type DashboardLayout = (typeof dashboardLayouts)[number]['id'];

export const reportTones = [
  {
    id: 'professional',
    name: 'Formal',
    description: 'Clear and structured',
  },
  { id: 'casual', name: 'Casual', description: 'Friendly and quick to read' },
  { id: 'bullet-points', name: 'Bullet points', description: 'Just the facts in a short list' },
] as const;

export type ReportTone = (typeof reportTones)[number]['id'];

// Unused exports removed

export const dateFormats = [
  { id: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { id: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { id: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
] as const;

export const weekStartOptions = [
  { id: 0, name: 'Sunday' },
  { id: 1, name: 'Monday' },
] as const;
