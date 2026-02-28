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
import {
  Target,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Palette,
  Check,
  Download,
  UserX,
  AlertCircle,
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

interface SettingsClientProps {
  settings: UserSettingsData;
  goals: GoalData[];
}

export function SettingsClient({ settings, goals }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState('goals');

  return (
    <div className="mx-auto max-w-4xl">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8 grid w-full grid-cols-4">
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="goals">
          <GoalsSection settings={settings} goals={goals} />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsSection settings={settings} />
        </TabsContent>

        <TabsContent value="appearance">
          <AppearanceSection settings={settings} />
        </TabsContent>

        <TabsContent value="data">
          <DataSection />
        </TabsContent>
      </Tabs>
    </div>
  );
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
  const [newGoalWhy, setNewGoalWhy] = useState('');

  const handleCreateGoal = async () => {
    if (!newGoalTitle.trim()) return;

    setIsCreating(true);
    const result = await createGoal({
      title: newGoalTitle,
      deadline: newGoalDeadline ? new Date(newGoalDeadline) : null,
      why: newGoalWhy,
    });

    if (result.success && result.goal) {
      setGoals([result.goal, ...goals]);
      setNewGoalTitle('');
      setNewGoalDeadline('');
      setNewGoalWhy('');
      toast.success('Goal created successfully');
    } else {
      toast.error('Failed to create goal');
    }
    setIsCreating(false);
  };

  const handleDeleteGoal = async (id: string) => {
    const result = await deleteGoal(id);
    if (result.success) {
      setGoals(goals.filter(g => g.id !== id));
      toast.success('Goal deleted');
    } else {
      toast.error('Failed to delete goal');
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
          <CardTitle className="text-lg">Activity Targets</CardTitle>
          <CardDescription>Set your activity volume goals.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Daily Target</Label>
              <Input
                type="number"
                value={dailyTarget}
                onChange={e => setDailyTarget(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Weekly Target</Label>
              <Input
                type="number"
                value={weeklyTarget}
                onChange={e => setWeeklyTarget(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Monthly Target</Label>
              <Input
                type="number"
                value={monthlyTarget}
                onChange={e => setMonthlyTarget(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveTargets} disabled={isSavingTargets || !hasTargetChanges}>
              {isSavingTargets ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : targetsSaved ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Saved
                </>
              ) : (
                'Update Targets'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Your Goals</h3>
          <span className="text-muted-foreground text-sm">{goals.length} goals set</span>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Add New Goal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Decide exactly what you want</Label>
              <Input
                placeholder="e.g. Become a Senior Engineer by Q4"
                value={newGoalTitle}
                onChange={e => setNewGoalTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Set a deadline</Label>
                <Input
                  type="date"
                  value={newGoalDeadline}
                  onChange={e => setNewGoalDeadline(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Why is it important?</Label>
              <Textarea
                placeholder="Write your 'Why'..."
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
              Add Goal
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
                    <p className="text-muted-foreground mt-2 text-sm italic">"{goal.why}"</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all active:scale-95"
                  onClick={() => handleDeleteGoal(goal.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
          {goals.length === 0 && (
            <div className="text-muted-foreground py-8 text-center">
              No goals set yet. Add one above!
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
          <CardTitle className="text-lg">Custom Instructions</CardTitle>
          <CardDescription>
            Additional context for AI to remember when generating reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder='e.g., "Always mention my focus on accessibility and user experience."'
            value={customInstructions}
            onChange={e => setCustomInstructions(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Saved
            </>
          ) : (
            'Save Report Settings'
          )}
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

  const hasChanges = useMemo(() => {
    return (
      themePreset !== settings.themePreset ||
      hideArchived !== settings.hideArchived ||
      showConfetti !== settings.showConfetti
    );
  }, [themePreset, hideArchived, showConfetti, settings]);

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
            Color Theme
          </CardTitle>
          <CardDescription>Choose a color scheme that matches your vibe.</CardDescription>
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
              <Label htmlFor="hideArchived">Hide archived project activities</Label>
              <p className="text-muted-foreground text-xs">
                Don&apos;t show activities from archived projects in Recent Activity
              </p>
            </div>
            <Switch id="hideArchived" checked={hideArchived} onCheckedChange={setHideArchived} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="showConfetti">Show confetti</Label>
              <p className="text-muted-foreground text-xs">Celebrate when logging activities</p>
            </div>
            <Switch id="showConfetti" checked={showConfetti} onCheckedChange={setShowConfetti} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Saved
            </>
          ) : (
            'Save Appearance'
          )}
        </Button>
      </div>
    </div>
  );
}

function DataSection() {
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportUserData();
      if (data) {
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
    setIsClearing(true);
    await clearAllActivities();
    setIsClearing(false);
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
            Export Data
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
                Export All Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive text-lg">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions. Please proceed with caution.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-destructive/20 flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Clear All Activities</p>
              <p className="text-muted-foreground text-sm">
                Permanently delete all your logged activities.
              </p>
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
                  <AlertDialogTitle>Clear All Activities?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your logged activities. Your projects and
                    reports will remain. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearActivities}
                    disabled={isClearing}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isClearing ? 'Clearing...' : 'Yes, Clear All'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="border-destructive/20 flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Delete Account</p>
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
                  <AlertDialogTitle>Delete Account?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-4">
                    <p>
                      This will permanently delete your account and all associated data including
                      projects, activities, reports, and settings.
                    </p>
                    <p className="font-medium">
                      Type <span className="text-destructive">DELETE</span> to confirm:
                    </p>
                    <Input
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
                    {isDeleting ? 'Deleting...' : 'Delete Account'}
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

function SettingsSaveBar({
  show,
  onSave,
  isSaving,
  message = 'You have unsaved changes',
}: {
  show: boolean;
  onSave: () => void;
  isSaving: boolean;
  message?: string;
}) {
  if (!show) return null;

  return (
    <div className="animate-in fade-in slide-in-from-top-2 sticky top-0 z-20 flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 backdrop-blur-md duration-300">
      <div className="flex items-center gap-2 text-amber-500">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-medium">{message}</span>
      </div>
      <Button
        size="sm"
        onClick={onSave}
        disabled={isSaving}
        className="rounded-lg border-0 bg-amber-500 px-4 text-white hover:bg-amber-600"
      >
        {isSaving ? 'Saving...' : 'Save Now'}
      </Button>
    </div>
  );
}
