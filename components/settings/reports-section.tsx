"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { updateReportSettings, type UserSettingsData } from "@/app/actions/settings";

import { useSettings } from "@/components/providers/settings-provider";

interface ReportsSectionProps {
  settings: UserSettingsData;
}

export function ReportsSection({ settings: initialSettings }: ReportsSectionProps) {
  const { settings, refreshSettings } = useSettings();
  const currentSettings = settings || initialSettings;
  
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [customInstructions, setCustomInstructions] = useState(currentSettings.customInstructions || "");

  // Track unsaved changes
  const hasChanges = useMemo(() => {
    return (
      customInstructions !== (currentSettings.customInstructions || "")
    );
  }, [customInstructions, currentSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);

    await updateReportSettings({
      customInstructions: customInstructions || null,
    });
    
    // Refresh the global settings context so ReportWizard sees the changes immediately
    await refreshSettings();

    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Unsaved changes indicator */}
      {hasChanges && !saved && (
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-amber-500">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">You have unsaved changes</span>
          </div>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Now"}
          </Button>
        </div>
      )}

      {/* Custom Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Custom Instructions</CardTitle>
          <CardDescription>
            Additional context for AI to remember when generating reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder='e.g., "Always mention my focus on accessibility and user experience."'
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            rows={3}
          />
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
            "Save Report Settings"
          )}
        </Button>
      </div>
    </div>
  );
}
