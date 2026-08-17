'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { SettingsSaveBar } from '@/components/settings/settings-save-bar';
import {
  clearAllActivities,
  deleteUserAccount,
  exportUserData,
  type UserSettingsData,
  updateAppearanceSettings,
  updateReportSettings,
} from '@/app/actions/settings';
import { useSettings, applyTheme } from '@/components/providers/settings-provider';
import { themePresets } from '@/lib/themes';
import { cn } from '@/lib/utils';
import { Check, CheckCircle2, Download, Loader2, Palette, Trash2, UserX } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { toast } from 'sonner';

export function ReportsSection({ settings: initialSettings }: { settings: UserSettingsData }) {
  const { settings, refreshSettings } = useSettings();
  const currentSettings = settings || initialSettings;
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [customInstructions, setCustomInstructions] = useState(
    currentSettings.customInstructions || ''
  );

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const hasChanges = useMemo(
    () => customInstructions !== (currentSettings.customInstructions || ''),
    [customInstructions, currentSettings]
  );

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);
    await updateReportSettings({ customInstructions: customInstructions || null });
    await refreshSettings();
    setIsSaving(false);
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <SettingsSaveBar show={hasChanges && !saved} onSave={handleSave} isSaving={isSaving} />
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Review draft notes</CardTitle>
          <CardDescription>Extra notes to use when making review drafts.</CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="review-draft-notes" className="sr-only">
            Extra notes for review drafts
          </Label>
          <Textarea
            id="review-draft-notes"
            placeholder='e.g., "Mention accessibility and ease of use."'
            value={customInstructions}
            onChange={event => {
              setCustomInstructions(event.target.value);
              setSaved(false);
            }}
            rows={3}
          />
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          )}
          {!isSaving && saved && (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Saved
            </>
          )}
          {!isSaving && !saved && 'Save review settings'}
        </Button>
      </div>
    </div>
  );
}

export function AppearanceSection({ settings }: { settings: UserSettingsData }) {
  const { settings: savedSettings, refreshSettings } = useSettings();
  const persistedSettings = savedSettings ?? settings;
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [themePreset, setThemePreset] = useState(settings.themePreset);
  const [themeMode] = useState(settings.themeMode);
  const [hideArchived, setHideArchived] = useState(settings.hideArchived);
  const [showConfetti, setShowConfetti] = useState(settings.showConfetti);
  const [timeZone, setTimeZone] = useState(settings.timeZone);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasChanges = useMemo(
    () =>
      themePreset !== persistedSettings.themePreset ||
      hideArchived !== persistedSettings.hideArchived ||
      showConfetti !== persistedSettings.showConfetti ||
      timeZone !== persistedSettings.timeZone,
    [themePreset, hideArchived, showConfetti, timeZone, persistedSettings]
  );

  const committedThemeRef = useRef({
    themePreset: persistedSettings.themePreset,
    themeMode: persistedSettings.themeMode,
  });

  // Preview changes without restoring the old theme between state updates.
  useEffect(() => {
    applyTheme(themePreset, themeMode);
  }, [themeMode, themePreset]);

  // Keep the unmount restore target current without putting a restore/apply pair
  // between every preview change or settings refresh.
  useEffect(() => {
    committedThemeRef.current = {
      themePreset: persistedSettings.themePreset,
      themeMode: persistedSettings.themeMode,
    };
  }, [persistedSettings.themePreset, persistedSettings.themeMode]);

  useEffect(() => {
    return () => {
      applyTheme(committedThemeRef.current.themePreset, committedThemeRef.current.themeMode);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);
    await updateAppearanceSettings({
      themePreset,
      themeMode,
      hideArchived,
      showConfetti,
      timeZone,
    });
    committedThemeRef.current = { themePreset, themeMode };
    await refreshSettings();
    setIsSaving(false);
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <SettingsSaveBar show={hasChanges && !saved} onSave={handleSave} isSaving={isSaving} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="text-primary h-5 w-5" />
            Colors
          </CardTitle>
          <CardDescription>Choose a color scheme.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {themePresets.map(preset => {
              const isSelected = themePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setThemePreset(preset.id);
                    setSaved(false);
                  }}
                  className={cn(
                    'relative rounded-xl border-2 p-4 text-left transition-[border-color,background-color,box-shadow]',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  {isSelected && (
                    <span className="absolute top-2 right-2">
                      <Check className="text-primary h-4 w-4" />
                    </span>
                  )}
                  <span className="mb-3 flex gap-1" aria-hidden="true">
                    <span
                      className="h-8 w-8 rounded-full"
                      style={{ backgroundColor: preset.colors.primary }}
                    />
                    <span
                      className="h-8 w-8 rounded-full"
                      style={{ backgroundColor: preset.colors.accent }}
                    />
                  </span>
                  <span className="text-sm font-medium">{preset.name}</span>
                  <span className="text-muted-foreground block text-xs">{preset.description}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="hideArchived">Hide notes from archived projects</Label>
              <p className="text-muted-foreground text-xs">
                Don&apos;t show notes from archived projects in Recent notes
              </p>
            </div>
            <Switch
              id="hideArchived"
              checked={hideArchived}
              onCheckedChange={value => {
                setHideArchived(value);
                setSaved(false);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeZone">Calendar time zone</Label>
            <select
              id="timeZone"
              value={timeZone}
              onChange={event => {
                setTimeZone(event.target.value);
                setSaved(false);
              }}
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="showConfetti">Show confetti</Label>
              <p className="text-muted-foreground text-xs">
                Show a celebration when you save a note
              </p>
            </div>
            <Switch
              id="showConfetti"
              checked={showConfetti}
              onCheckedChange={value => {
                setShowConfetti(value);
                setSaved(false);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          )}
          {!isSaving && saved && (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Saved
            </>
          )}
          {!isSaving && !saved && 'Save appearance'}
        </Button>
      </div>
    </div>
  );
}

export function DataSection() {
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [clearConfirmation, setClearConfirmation] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportUserData();
      if (!data) return;
      if ('error' in data) {
        toast.error(data.error);
        return;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `jobmark-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Could not export your data.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearActivities = async () => {
    if (clearConfirmation !== 'CLEAR ALL NOTES') return;
    setIsClearing(true);
    await clearAllActivities('CLEAR ALL NOTES');
    setIsClearing(false);
    setClearConfirmation('');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') return;
    setIsDeleting(true);
    const result = await deleteUserAccount();
    if (result.success) await signOut({ callbackUrl: '/' });
    setIsDeleting(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Download className="text-primary h-5 w-5" />
            Export data
          </CardTitle>
          <CardDescription>Download all your data in JSON format.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={isExporting} variant="outline">
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export your data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive text-lg">Delete data</CardTitle>
          <CardDescription>These actions cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-destructive/20 flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <p className="font-medium">Clear all notes</p>
              <p className="text-muted-foreground text-sm">Delete all your notes.</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all notes?</AlertDialogTitle>
                  <AlertDialogDescription>
                    <p>
                      This will permanently delete all your notes. Your projects and drafts will
                      remain. This action cannot be undone.
                    </p>
                    <p className="mt-3 font-medium">Type CLEAR ALL NOTES to confirm:</p>
                    <Input
                      aria-label="Confirmation for clearing all notes"
                      placeholder="CLEAR ALL NOTES"
                      value={clearConfirmation}
                      onChange={event => setClearConfirmation(event.target.value)}
                    />
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearActivities}
                    disabled={isClearing || clearConfirmation !== 'CLEAR ALL NOTES'}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isClearing ? 'Clearing...' : 'Clear all'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="border-destructive/20 flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <p className="font-medium">Delete account</p>
              <p className="text-muted-foreground text-sm">
                Permanently delete your account and all data.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <UserX className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete account?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-4">
                    <p>
                      This will permanently delete your account and all associated data, including
                      projects, notes, drafts, and settings.
                    </p>
                    <p className="font-medium">
                      Type <span className="text-destructive">DELETE</span> to confirm:
                    </p>
                    <Input
                      aria-label="Confirmation for deleting your account"
                      placeholder="DELETE"
                      value={deleteConfirmation}
                      onChange={event => setDeleteConfirmation(event.target.value)}
                    />
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmation !== 'DELETE' || isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete account'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
