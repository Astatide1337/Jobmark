"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getUserSettings, type UserSettingsData } from "@/app/actions/settings";
import { getThemePreset } from "@/lib/themes";

interface SettingsContextType {
  settings: UserSettingsData | null;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: null,
  isLoading: true,
  refreshSettings: async () => {},
});

export function useSettings() {
  return useContext(SettingsContext);
}

interface SettingsProviderProps {
  children: React.ReactNode;
  initialSettings?: UserSettingsData | null;
}

export function SettingsProvider({ children, initialSettings }: SettingsProviderProps) {
  const [settings, setSettings] = useState<UserSettingsData | null>(initialSettings || null);
  const [isLoading, setIsLoading] = useState(!initialSettings);

  const refreshSettings = async () => {
    setIsLoading(true);
    const newSettings = await getUserSettings();
    setSettings(newSettings);
    setIsLoading(false);
    
    // Apply theme when settings refresh
    if (newSettings) {
      applyTheme(newSettings.themePreset, newSettings.themeMode);
    }
  };

  // Apply theme on initial load and when settings change
  useEffect(() => {
    if (settings) {
      applyTheme(settings.themePreset, settings.themeMode);
    }
  }, [settings]);

  // Fetch settings on mount if not provided
  useEffect(() => {
    if (!initialSettings) {
      refreshSettings();
    }
  }, [initialSettings]);

  return (
    <SettingsContext.Provider value={{ settings, isLoading, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

function applyTheme(presetId: string, mode: string) {
  const preset = getThemePreset(presetId);
  if (!preset) return;

  const root = document.documentElement;

  // Apply color variables using hex values
  root.style.setProperty("--primary", preset.colors.primary);
  root.style.setProperty("--primary-foreground", preset.colors.primaryForeground);
  root.style.setProperty("--accent", preset.colors.accent);
  root.style.setProperty("--accent-warm", preset.colors.accentWarm);
  root.style.setProperty("--accent-warm-hover", preset.colors.accentWarmHover);
  root.style.setProperty("--ring", preset.colors.ring);
  root.style.setProperty("--sidebar-primary", preset.colors.sidebarPrimary);
  root.style.setProperty("--sidebar-ring", preset.colors.sidebarRing);
  root.style.setProperty("--chart-1", preset.colors.chart1);

  // Apply theme mode (light/dark)
  if (mode === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
    root.classList.toggle("light", !prefersDark);
  } else {
    root.classList.toggle("dark", mode === "dark");
    root.classList.toggle("light", mode === "light");
  }
}

// Export for use in appearance section
export { applyTheme };
