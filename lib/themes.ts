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
  };
}

export const themePresets: ThemePreset[] = [
  {
    id: "cafe",
    name: "Café Warmth",
    description: "Cozy and focused",
    colors: {
      primary: "#d4a574",
      primaryForeground: "#1a1412",
      accent: "#c49a6c",
      accentWarm: "#E3B283",
      accentWarmHover: "#d9a370",
      ring: "#d4a574",
      sidebarPrimary: "#d4a574",
      sidebarRing: "#d4a574",
      chart1: "#d4a574",
    },
  },
  {
    id: "ocean",
    name: "Ocean Calm",
    description: "Serene and professional",
    colors: {
      primary: "#60a5fa",
      primaryForeground: "#1a1412", 
      accent: "#3b82f6",
      accentWarm: "#60a5fa",
      accentWarmHover: "#3b82f6",
      ring: "#60a5fa",
      sidebarPrimary: "#60a5fa",
      sidebarRing: "#60a5fa",
      chart1: "#60a5fa",
    },
  },
  {
    id: "forest",
    name: "Forest Focus",
    description: "Fresh and growth-oriented",
    colors: {
      primary: "#4ade80",
      primaryForeground: "#1a1412",
      accent: "#22c55e",
      accentWarm: "#4ade80",
      accentWarmHover: "#22c55e",
      ring: "#4ade80",
      sidebarPrimary: "#4ade80",
      sidebarRing: "#4ade80",
      chart1: "#4ade80",
    },
  },
  {
    id: "sunset",
    name: "Sunset Ambition",
    description: "Energetic and bold",
    colors: {
      primary: "#fb923c",
      primaryForeground: "#1a1412",
      accent: "#f97316",
      accentWarm: "#fb923c",
      accentWarmHover: "#f97316",
      ring: "#fb923c",
      sidebarPrimary: "#fb923c",
      sidebarRing: "#fb923c",
      chart1: "#fb923c",
    },
  },
  {
    id: "midnight",
    name: "Midnight Pro",
    description: "Creative and modern",
    colors: {
      primary: "#a78bfa",
      primaryForeground: "#1a1412",
      accent: "#8b5cf6",
      accentWarm: "#a78bfa",
      accentWarmHover: "#8b5cf6",
      ring: "#a78bfa",
      sidebarPrimary: "#a78bfa",
      sidebarRing: "#a78bfa",
      chart1: "#a78bfa",
    },
  },
  {
    id: "rose",
    name: "Rose Clarity",
    description: "Warm and personal",
    colors: {
      primary: "#f472b6",
      primaryForeground: "#1a1412",
      accent: "#ec4899",
      accentWarm: "#f472b6",
      accentWarmHover: "#ec4899",
      ring: "#f472b6",
      sidebarPrimary: "#f472b6",
      sidebarRing: "#f472b6",
      chart1: "#f472b6",
    },
  },
  {
    id: "slate",
    name: "Slate Minimal",
    description: "Clean and neutral",
    colors: {
      primary: "#94a3b8",
      primaryForeground: "#1a1412",
      accent: "#64748b",
      accentWarm: "#94a3b8",
      accentWarmHover: "#64748b",
      ring: "#94a3b8",
      sidebarPrimary: "#94a3b8",
      sidebarRing: "#94a3b8",
      chart1: "#94a3b8",
    },
  },
];

export function getThemePreset(id: string): ThemePreset | undefined {
  return themePresets.find((t) => t.id === id);
}

export const dashboardLayouts = [
  { id: "compact", name: "Compact", description: "Dense information, less whitespace" },
  { id: "standard", name: "Standard", description: "Balanced layout" },
  { id: "focused", name: "Focused", description: "Minimal, only essentials" },
] as const;

export type DashboardLayout = typeof dashboardLayouts[number]["id"];

export const reportTones = [
  { id: "professional", name: "Professional", description: "Formal, structured, executive summary" },
  { id: "casual", name: "Casual Update", description: "Friendly, team-focused, quick read" },
  { id: "bullet-points", name: "Bullet Points", description: "Just the facts. Short and punchy" },
] as const;

export type ReportTone = typeof reportTones[number]["id"];

// Unused exports removed

export const dateFormats = [
  { id: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { id: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { id: "YYYY-MM-DD", label: "YYYY-MM-DD" },
] as const;

export const weekStartOptions = [
  { id: 0, name: "Sunday" },
  { id: 1, name: "Monday" },
] as const;
