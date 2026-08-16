'use client';

import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Palette,
  Check,
  Download,
  UserX,
  Pencil,
  X,
} from 'lucide-react';
import {
  updateGoalSettings,
  updateReportSettings,
  updateAppearanceSettings,
  exportUserData,
  clearAllActivities,
  deleteUserAccount,
  type UserSettingsData,
} from '@/app/actions/settings';
import { createGoal, deleteGoal, type GoalData } from '@/app/actions/goals';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { themePresets } from '@/lib/themes';
import { useSettings, applyTheme } from '@/components/providers/settings-provider';
import { signOut } from 'next-auth/react';
import { Calendar } from '@/components/ui/calendar';
import type { FocusBlock } from '@/lib/focus/types';
import { FocusSection } from '@/components/settings/focus-section';
import { SettingsSaveBar } from '@/components/settings/settings-save-bar';

interface SettingsClientProps {
  settings: UserSettingsData;
  goals: GoalData[];
  focusConfig: FocusBlock[];
}

export function SettingsClient({ settings, goals, focusConfig }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState('goals');

  return (
    <div className="mx-auto max-w-4xl">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8 grid w-full grid-cols-3 sm:grid-cols-5">
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="focus">Focus</TabsTrigger>
          <TabsTrigger value="reports">Reviews</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="goals">
          <SettingsIntro title="Goals" description="Set your note goals." />
          <GoalsSection settings={settings} goals={goals} />
        </TabsContent>

        <TabsContent value="focus">
          <SettingsIntro title="Focus" description="Set up your focus session." />
          <FocusSection initialBlocks={focusConfig} goals={goals} />
        </TabsContent>

        <TabsContent value="reports">
          <SettingsIntro
            title="Review defaults"
            description="Choose what to include in review drafts."
          />
          <ReportsSection settings={settings} />
        </TabsContent>

        <TabsContent value="appearance">
          <SettingsIntro title="Appearance" description="Choose how Jobmark looks." />
          <AppearanceSection settings={settings} />
        </TabsContent>

        <TabsContent value="data">
          <SettingsIntro title="Data" description="Export your data or delete it." />
          <DataSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SettingsIntro({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-border/50 bg-card/45 mb-6">
      <CardContent className="p-5">
        <p className="text-primary text-xs font-semibold tracking-widest uppercase">{title}</p>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

function calendarDateToLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function GoalsSection({
  settings,
  goals: initialGoals,
}: {
  settings: UserSettingsData;
  goals: GoalData[];
}) {
  const [goals, setGoals] = useState<GoalData[]>(initialGoals);

  const [isSavingTargets, setIsSavingTargets] = useState(false);
  const [targetsSaved, setTargetsSaved] = useState(false);
  const [dailyTarget, setDailyTarget] = useState(settings.dailyTarget);
  const [weeklyTarget, setWeeklyTarget] = useState(settings.weeklyTarget);
  const [monthlyTarget, setMonthlyTarget] = useState(settings.monthlyTarget);

  const [isCreating, setIsCreating] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');
  const [deadlinePickerOpen, setDeadlinePickerOpen] = useState(false);
  const [newGoalWhy, setNewGoalWhy] = useState('');

  const handleCreateGoal = async () => {
    if (!newGoalTitle.trim()) return;

    setIsCreating(true);
    const result = await createGoal({
      title: newGoalTitle,
      // Keep the selected calendar day in the user's local timezone instead
      // of letting ISO parsing shift it across midnight.
      deadline: newGoalDeadline ? calendarDateToLocalDate(newGoalDeadline) : null,
      why: newGoalWhy,
    });

    if (result.success && result.goal) {
      setGoals([result.goal, ...goals]);
      setNewGoalTitle('');
      setNewGoalDeadline('');
      setNewGoalWhy('');
      toast.success('Goal created.');
    } else {
      toast.error('Could not create the goal. Try again.');
    }
    setIsCreating(false);
  };

  const handleDeleteGoal = async (id: string) => {
    const result = await deleteGoal(id);
    if (result.success) {
      setGoals(goals.filter(g => g.id !== id));
      toast.success('Goal deleted.');
    } else {
      toast.error('Could not delete the goal. Try again.');
    }
  };

  const handleSaveTargets = async () => {
    setIsSavingTargets(true);
    setTargetsSaved(false);

    await updateGoalSettings({
      dailyTarget,
      weeklyTarget,
      monthlyTarget,
    });

    setIsSavingTargets(false);
    setTargetsSaved(true);
    setTimeout(() => setTargetsSaved(false), 2000);
  };

  const hasTargetChanges =
    dailyTarget !== settings.dailyTarget ||
    weeklyTarget !== settings.weeklyTarget ||
    monthlyTarget !== settings.monthlyTarget;

  return (
    <div className="space-y-8">
      <SettingsSaveBar
        show={hasTargetChanges && !targetsSaved}
        onSave={handleSaveTargets}
        isSaving={isSavingTargets}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Note targets</CardTitle>
          <CardDescription>Set how often you want to add notes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="daily-target">Daily target</Label>
              <Input
                id="daily-target"
                type="number"
                value={dailyTarget}
                onChange={e => setDailyTarget(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly-target">Weekly target</Label>
              <Input
                id="weekly-target"
                type="number"
                value={weeklyTarget}
                onChange={e => setWeeklyTarget(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly-target">Monthly target</Label>
              <Input
                id="monthly-target"
                type="number"
                value={monthlyTarget}
                onChange={e => setMonthlyTarget(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveTargets} disabled={isSavingTargets || !hasTargetChanges}>
              {isSavingTargets && (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              )}
              {!isSavingTargets && targetsSaved && (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Saved
                </>
              )}
              {!isSavingTargets && !targetsSaved && 'Save targets'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Your goals</h2>
          <span className="text-muted-foreground text-sm">
            {goals.length} {goals.length === 1 ? 'goal' : 'goals'}
          </span>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Add a goal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-goal-title">What do you want to do?</Label>
              <Input
                id="new-goal-title"
                placeholder="e.g. Lead a project by October"
                value={newGoalTitle}
                onChange={e => setNewGoalTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-goal-deadline">Set a deadline</Label>
                <div className="flex items-center gap-2">
                  <Popover open={deadlinePickerOpen} onOpenChange={setDeadlinePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="new-goal-deadline"
                        type="button"
                        variant="outline"
                        className={cn(
                          'h-10 w-full justify-start text-left font-normal',
                          !newGoalDeadline && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newGoalDeadline
                          ? format(calendarDateToLocalDate(newGoalDeadline), 'PPP')
                          : 'Choose a deadline'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          newGoalDeadline ? calendarDateToLocalDate(newGoalDeadline) : undefined
                        }
                        onSelect={date => {
                          if (!date) return;
                          setNewGoalDeadline(format(date, 'yyyy-MM-dd'));
                          setDeadlinePickerOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {newGoalDeadline && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() => setNewGoalDeadline('')}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-goal-why">Why is this important?</Label>
              <Textarea
                id="new-goal-why"
                placeholder="Why does this matter?"
                className="resize-none"
                value={newGoalWhy}
                onChange={e => setNewGoalWhy(e.target.value)}
              />
            </div>
            <Button onClick={handleCreateGoal} disabled={isCreating || !newGoalTitle}>
              {isCreating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add goal
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {goals.map(goal => (
            <Card key={goal.id}>
              <CardContent className="flex items-start justify-between p-4">
                <div className="space-y-1">
                  <h4 className="font-semibold">{goal.title}</h4>
                  {goal.deadline && (
                    <div className="text-muted-foreground flex items-center gap-1 text-xs">
                      <CalendarIcon className="h-3 w-3" />
                      <span>Due {format(new Date(goal.deadline), 'PPP')}</span>
                    </div>
                  )}
                  {goal.why && (
                    <p className="text-muted-foreground mt-2 text-sm italic">
                      &quot;{goal.why}&quot;
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all active:scale-95"
                  onClick={() => handleDeleteGoal(goal.id)}
                  aria-label={`Delete goal ${goal.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
          {goals.length === 0 && (
            <div className="text-muted-foreground py-8 text-center">
              No goals yet. Add one above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportsSection({ settings: initialSettings }: { settings: UserSettingsData }) {
  const { settings, refreshSettings } = useSettings();
  const currentSettings = settings || initialSettings;

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [customInstructions, setCustomInstructions] = useState(
    currentSettings.customInstructions || ''
  );

  const hasChanges = useMemo(() => {
    return customInstructions !== (currentSettings.customInstructions || '');
  }, [customInstructions, currentSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);

    await updateReportSettings({
      customInstructions: customInstructions || null,
    });

    await refreshSettings();

    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
            onChange={e => setCustomInstructions(e.target.value)}
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

function AppearanceSection({ settings }: { settings: UserSettingsData }) {
  const { refreshSettings } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [themePreset, setThemePreset] = useState(settings.themePreset);
  const [hideArchived, setHideArchived] = useState(settings.hideArchived);
  const [showConfetti, setShowConfetti] = useState(settings.showConfetti);
  const [timeZone, setTimeZone] = useState(settings.timeZone);

  const hasChanges = useMemo(() => {
    return (
      themePreset !== settings.themePreset ||
      hideArchived !== settings.hideArchived ||
      showConfetti !== settings.showConfetti ||
      timeZone !== settings.timeZone
    );
  }, [themePreset, hideArchived, showConfetti, timeZone, settings]);

  useEffect(() => {
    applyTheme(themePreset, 'dark');
  }, [themePreset]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);

    await updateAppearanceSettings({
      themePreset,
      themeMode: 'dark',
      hideArchived,
      showConfetti,
      timeZone,
    });

    await refreshSettings();

    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
                  onClick={() => setThemePreset(preset.id)}
                  className={cn(
                    'relative rounded-xl border-2 p-4 text-left transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Check className="text-primary h-4 w-4" />
                    </div>
                  )}
                  <div className="mb-3 flex gap-1">
                    <div
                      className="h-8 w-8 rounded-full"
                      style={{ backgroundColor: preset.colors.primary }}
                    />
                    <div
                      className="h-8 w-8 rounded-full"
                      style={{ backgroundColor: preset.colors.accent }}
                    />
                  </div>
                  <p className="text-sm font-medium">{preset.name}</p>
                  <p className="text-muted-foreground text-xs">{preset.description}</p>
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
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="hideArchived">Hide notes from archived projects</Label>
              <p className="text-muted-foreground text-xs">
                Don&apos;t show notes from archived projects in Recent notes
              </p>
            </div>
            <Switch id="hideArchived" checked={hideArchived} onCheckedChange={setHideArchived} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeZone">Calendar time zone</Label>
            <select
              id="timeZone"
              value={timeZone}
              onChange={event => setTimeZone(event.target.value)}
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="showConfetti">Show confetti</Label>
              <p className="text-muted-foreground text-xs">
                Show a celebration when you save a note
              </p>
            </div>
            <Switch id="showConfetti" checked={showConfetti} onCheckedChange={setShowConfetti} />
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

function DataSection() {
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [clearConfirmation, setClearConfirmation] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportUserData();
      if (data) {
        if ('error' in data) {
          toast.error(data.error);
          return;
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jobmark-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
    setIsExporting(false);
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
    if (result.success) {
      await signOut({ callbackUrl: '/' });
    }
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
          <div className="border-destructive/20 flex items-center justify-between rounded-lg border p-4">
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
                    <>
                      <p>
                        This will permanently delete all your notes. Your projects and drafts will
                        remain. This action cannot be undone.
                      </p>
                      <p className="mt-3 font-medium">Type CLEAR ALL NOTES to confirm:</p>
                      <Input
                        aria-label="Confirmation for clearing all notes"
                        placeholder="CLEAR ALL NOTES"
                        value={clearConfirmation}
                        onChange={e => setClearConfirmation(e.target.value)}
                      />
                    </>
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

          <div className="border-destructive/20 flex items-center justify-between rounded-lg border p-4">
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
                      onChange={e => setDeleteConfirmation(e.target.value)}
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
