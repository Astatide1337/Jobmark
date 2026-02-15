"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Palette, Loader2, CheckCircle2, Check, AlertCircle } from "lucide-react";
import { updateAppearanceSettings, type UserSettingsData } from "@/app/actions/settings";
import { themePresets } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { useSettings, applyTheme } from "@/components/providers/settings-provider";
import { SettingsSaveBar } from "./settings-save-bar";

interface AppearanceSectionProps {
  settings: UserSettingsData;
}

export function AppearanceSection({ settings }: AppearanceSectionProps) {
  const { refreshSettings } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [themePreset, setThemePreset] = useState(settings.themePreset);
  const [hideArchived, setHideArchived] = useState(settings.hideArchived);
  const [showConfetti, setShowConfetti] = useState(settings.showConfetti);

  // Track if there are unsaved changes
  const hasChanges = useMemo(() => {
    return (
      themePreset !== settings.themePreset ||
      hideArchived !== settings.hideArchived ||
      showConfetti !== settings.showConfetti
    );
  }, [themePreset, hideArchived, showConfetti, settings]);

  // Apply theme immediately when selection changes (live preview)
  useEffect(() => {
    applyTheme(themePreset, "dark");
  }, [themePreset]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);

    await updateAppearanceSettings({
      themePreset,
      themeMode: "dark",
      hideArchived,
      showConfetti,
    });

    // Refresh settings context so other components get updated
    await refreshSettings();

    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Unsaved changes indicator */}
      <SettingsSaveBar 
        show={hasChanges && !saved} 
        onSave={handleSave} 
        isSaving={isSaving} 
      />

      {/* Theme Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Color Theme
          </CardTitle>
          <CardDescription>
            Choose a color scheme that matches your vibe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {themePresets.map((preset) => {
              const isSelected = themePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => setThemePreset(preset.id)}
                  className={cn(
                    "relative p-4 rounded-xl border-2 transition-all text-left",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  {/* Color preview */}
                  <div className="flex gap-1 mb-3">
                    <div
                      className="w-8 h-8 rounded-full"
                      style={{ backgroundColor: preset.colors.primary }}
                    />
                    <div
                      className="w-8 h-8 rounded-full"
                      style={{ backgroundColor: preset.colors.accent }}
                    />
                  </div>
                  <p className="font-medium text-sm">{preset.name}</p>
                  <p className="text-xs text-muted-foreground">{preset.description}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="hideArchived">Hide archived project activities</Label>
              <p className="text-xs text-muted-foreground">Don't show activities from archived projects in Recent Activity</p>
            </div>
            <Switch id="hideArchived" checked={hideArchived} onCheckedChange={setHideArchived} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="showConfetti">Show confetti</Label>
              <p className="text-xs text-muted-foreground">Celebrate when logging activities</p>
            </div>
            <Switch id="showConfetti" checked={showConfetti} onCheckedChange={setShowConfetti} />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Saved
            </>
          ) : (
            "Save Appearance"
          )}
        </Button>
      </div>
    </div>
  );
}
