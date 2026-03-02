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
  AlertCircle,
  GripVertical,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Wind,
  Sparkles,
  Target,
  Brain,
  RotateCcw,
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
import { saveFocusConfig, resetFocusConfig } from '@/app/actions/focus-config';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { themePresets } from '@/lib/themes';
import { useSettings, applyTheme } from '@/components/providers/settings-provider';
import { signOut } from 'next-auth/react';
import type { FocusBlock, BreathingPattern, FocusBlockType } from '@/lib/focus/types';
import { BREATHING_PATTERNS, BLOCK_LABELS, getDefaultFocusConfig } from '@/lib/focus/defaults';
import { nanoid } from 'nanoid';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AnimatePresence, motion } from 'framer-motion';
import { BreathingDisplay } from '@/components/focus/breathing-display';

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
        <TabsList className="mb-8 grid w-full grid-cols-5">
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="focus">Focus</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="goals">
          <GoalsSection settings={settings} goals={goals} />
        </TabsContent>

        <TabsContent value="focus">
          <FocusSection initialBlocks={focusConfig} goals={goals} />
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

// ---------------------------------------------------------------------------
// Block type icons
// ---------------------------------------------------------------------------

const BLOCK_ICONS: Record<string, React.ReactNode> = {
  breathing: <Wind className="h-4 w-4" />,
  affirmation: <Sparkles className="h-4 w-4" />,
  goal: <Target className="h-4 w-4" />,
};

// ---------------------------------------------------------------------------
// FocusSection — Completely Refactored
// ---------------------------------------------------------------------------

function FocusSection({
  initialBlocks,
  goals,
}: {
  initialBlocks: FocusBlock[];
  goals: GoalData[];
}) {
  const [blocks, setBlocks] = useState<FocusBlock[]>(initialBlocks);
  const [lastSavedBlocks, setLastSavedBlocks] = useState<FocusBlock[]>(initialBlocks);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Sync with props if they change externally (during render phase to avoid cascading effects)
  const [prevInitialBlocks, setPrevInitialBlocks] = useState(initialBlocks);
  if (initialBlocks !== prevInitialBlocks) {
    setBlocks(initialBlocks);
    setLastSavedBlocks(initialBlocks);
    setPrevInitialBlocks(initialBlocks);
  }

  const hasChanges = JSON.stringify(blocks) !== JSON.stringify(lastSavedBlocks);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks(prev => {
      const oldIndex = prev.findIndex(b => b.id === active.id);
      const newIndex = prev.findIndex(b => b.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function addBlock(type: FocusBlockType) {
    const id = nanoid();
    let newBlock: FocusBlock;

    switch (type) {
      case 'breathing':
        newBlock = { id, type, config: { pattern: '4-7-8', cycles: 3 } };
        break;
      case 'affirmation':
        newBlock = {
          id,
          type,
          config: { texts: ['I am capable of achieving my goals.'], totalDuration: 60 },
        };
        break;
      case 'goal':
        newBlock = { id, type, config: { duration: 15 } };
        break;
    }

    setBlocks(prev => [...prev, newBlock]);
    setExpandedId(id);
  }

  function updateBlock(updated: FocusBlock) {
    setBlocks(prev => prev.map(b => (b.id === updated.id ? updated : b)));
  }

  function deleteBlock(id: string) {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  async function handleSave() {
    setIsSaving(true);
    const result = await saveFocusConfig(blocks);
    if (result.success) {
      setLastSavedBlocks(blocks);
      toast.success('Focus session saved');
    } else {
      toast.error(result.error ?? 'Failed to save');
    }
    setIsSaving(false);
  }

  async function handleReset() {
    setIsResetting(true);
    await resetFocusConfig();
    const defaults = getDefaultFocusConfig();
    setBlocks(defaults);
    setLastSavedBlocks(defaults);
    setExpandedId(null);
    toast.success('Reset to defaults');
    setIsResetting(false);
  }

  return (
    <div className="space-y-6">
      <SettingsSaveBar show={hasChanges} onSave={handleSave} isSaving={isSaving} />

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">Focus Sequence</h3>
          <p className="text-muted-foreground text-sm">
            End your day with intention. Drag to reorder your session blocks.
          </p>
        </div>
        <AddBlockSelector onSelect={addBlock} />
      </div>

      <div className="space-y-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        >
          <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
            <AnimatePresence mode="popLayout">
              {blocks.map(block => (
                <SortableBlockCard
                  key={block.id}
                  block={block}
                  goals={goals}
                  isExpanded={expandedId === block.id}
                  onToggleExpand={() =>
                    setExpandedId(prev => (prev === block.id ? null : block.id))
                  }
                  onDelete={() => deleteBlock(block.id)}
                  onUpdate={updateBlock}
                />
              ))}
            </AnimatePresence>
          </SortableContext>
        </DndContext>

        {blocks.length === 0 && (
          <div className="text-muted-foreground rounded-2xl border border-dashed py-12 text-center text-sm">
            No blocks in your sequence. Add one to get started.
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <p className="text-muted-foreground text-xs italic">
          Tip: Design a sequence that helps you transition from work to a state of calm focus.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="mr-2 h-3.5 w-3.5" />
              Reset Defaults
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset focus sequence?</AlertDialogTitle>
              <AlertDialogDescription>
                This will restore the original sequence. Your current customizations will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AddBlockSelector — Reusing Project Picker UI pattern
// ---------------------------------------------------------------------------

function AddBlockSelector({ onSelect }: { onSelect: (type: FocusBlockType) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  const OPTIONS: { type: FocusBlockType; label: string; icon: React.ReactNode }[] = [
    { type: 'breathing', label: 'Breathing Exercise', icon: <Wind className="h-4 w-4" /> },
    { type: 'affirmation', label: 'Affirmations', icon: <Sparkles className="h-4 w-4" /> },
    { type: 'goal', label: 'Goal Visualization', icon: <Target className="h-4 w-4" /> },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-xl border px-3 py-2 transition-all',
          'bg-background/50 hover:bg-background/80',
          isOpen
            ? 'border-primary/50 ring-primary/20 ring-2'
            : 'border-border/50 hover:border-border'
        )}
      >
        <span className="text-sm font-medium">Add Block</span>
        <ChevronDown
          className={cn(
            'text-muted-foreground h-4 w-4 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-card border-border/50 absolute top-full right-0 z-50 mt-2 min-w-[200px] overflow-hidden rounded-xl border p-2 shadow-xl shadow-black/20"
            >
              {OPTIONS.map(opt => (
                <button
                  key={opt.type}
                  onClick={() => {
                    onSelect(opt.type);
                    setIsOpen(false);
                  }}
                  className="hover:bg-primary/10 hover:text-primary flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors"
                >
                  <div className="text-primary/60">{opt.icon}</div>
                  <span className="font-medium">{opt.label}</span>
                </button>
              ))}
            </motion.div>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SortableBlockCard
// ---------------------------------------------------------------------------

function SortableBlockCard({
  block,
  goals,
  isExpanded,
  onToggleExpand,
  onDelete,
  onUpdate,
}: {
  block: FocusBlock;
  goals: GoalData[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  onUpdate: (updated: FocusBlock) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      className={cn(
        'group relative rounded-2xl border transition-all duration-300',
        isDragging ? 'opacity-50' : 'opacity-100',
        isExpanded
          ? 'border-primary/30 bg-card/80 shadow-lg'
          : 'border-border/40 bg-card hover:border-border'
      )}
    >
      <div className="flex items-center gap-2 p-3">
        <button
          {...attributes}
          {...listeners}
          className="text-muted-foreground/30 hover:text-muted-foreground cursor-grab px-1.5 active:cursor-grabbing"
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <div className="flex flex-1 cursor-pointer items-center gap-3" onClick={onToggleExpand}>
          <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl">
            {BLOCK_ICONS[block.type]}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold">{BLOCK_LABELS[block.type]}</h4>
            {!isExpanded && (
              <p className="text-muted-foreground line-clamp-1 text-xs font-medium">
                {block.type === 'breathing' && BREATHING_PATTERNS[block.config.pattern].label}
                {block.type === 'affirmation' &&
                  `${block.config.texts.length} affirmations · ${block.config.totalDuration}s`}
                {block.type === 'goal' && `${block.config.duration}s visualization`}
              </p>
            )}
          </div>
          <div className="text-muted-foreground/40 group-hover:text-muted-foreground pr-2 transition-colors">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>

        <button
          onClick={onDelete}
          className="text-muted-foreground/40 hover:bg-destructive/10 hover:text-destructive bg-background absolute -top-2 -right-2 rounded-full border p-1.5 opacity-0 shadow-sm transition-all group-hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t px-6 pt-4 pb-6">
              <BlockEditor block={block} goals={goals} onUpdate={onUpdate} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// BlockEditor
// ---------------------------------------------------------------------------

function BlockEditor({
  block,
  goals,
  onUpdate,
}: {
  block: FocusBlock;
  goals: GoalData[];
  onUpdate: (updated: FocusBlock) => void;
}) {
  switch (block.type) {
    case 'breathing':
      return <BreathingCarousel block={block} onUpdate={onUpdate} />;
    case 'affirmation':
      return <AffirmationEditor block={block} onUpdate={onUpdate} />;
    case 'goal':
      return <GoalCarousel block={block} goals={goals} onUpdate={onUpdate} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// BreathingPreview — auto-advancing preview for settings
// ---------------------------------------------------------------------------

function BreathingPreview({ pattern }: { pattern: BreathingPattern }) {
  const patternDef = BREATHING_PATTERNS[pattern];
  const steps = patternDef.steps;
  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const currentStep = steps[stepIndex];

    const fadeOut = setTimeout(() => setVisible(false), (currentStep.duration - 0.8) * 1000);

    const advance = setTimeout(() => {
      setVisible(true);
      setStepIndex(prev => (prev + 1) % steps.length);
    }, currentStep.duration * 1000);

    return () => {
      clearTimeout(fadeOut);
      clearTimeout(advance);
    };
  }, [stepIndex, steps]);

  return (
    <div className="pointer-events-none origin-center scale-[0.4] opacity-80">
      <BreathingDisplay
        pattern={pattern}
        stepIndex={stepIndex}
        cycleIndex={0}
        totalCycles={1}
        visible={visible}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// BreathingCarousel
// ---------------------------------------------------------------------------

function BreathingCarousel({
  block,
  onUpdate,
}: {
  block: Extract<FocusBlock, { type: 'breathing' }>;
  onUpdate: (b: FocusBlock) => void;
}) {
  const patterns = Object.keys(BREATHING_PATTERNS) as BreathingPattern[];
  const currentIndex = patterns.indexOf(block.config.pattern);
  const [direction, setDirection] = useState(0);

  const paginate = (newDirection: number) => {
    const nextIndex = (currentIndex + newDirection + patterns.length) % patterns.length;
    setDirection(newDirection);
    onUpdate({ ...block, config: { ...block.config, pattern: patterns[nextIndex] } });
  };

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      zIndex: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
      zIndex: 0,
    }),
  };

  const def = BREATHING_PATTERNS[block.config.pattern];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
          Select Pattern
        </Label>
        <div className="flex items-center gap-3">
          <Label className="text-xs font-medium">Cycles</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={block.config.cycles}
            onChange={e =>
              onUpdate({
                ...block,
                config: { ...block.config, cycles: parseInt(e.target.value) || 3 },
              })
            }
            className="h-8 w-16 [appearance:textfield] text-center text-xs [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
      </div>

      <div className="bg-muted/20 relative overflow-hidden rounded-3xl border p-2">
        <div className="relative h-[280px] w-full items-center justify-center overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={block.config.pattern}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="flex h-full w-full flex-col items-center justify-center p-8 text-center"
            >
              <div className="mb-4 flex flex-col items-center">
                <span className="text-lg font-bold">{def.label}</span>
                <p className="text-muted-foreground mt-1 max-w-[240px] text-xs leading-relaxed">
                  {def.description}
                </p>
              </div>

              {/* Visual Preview */}
              <div className="relative mt-2 flex h-32 w-full max-w-[200px] items-center justify-center overflow-hidden rounded-2xl bg-black/60 shadow-inner">
                <div className="scale-[0.5]">
                  <BreathingPreview pattern={block.config.pattern} />
                </div>
                <div className="absolute inset-0 z-10" />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Controls */}
        <div className="absolute inset-y-0 left-4 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/50 hover:bg-background h-10 w-10 rounded-full shadow-sm backdrop-blur-sm"
            onClick={() => paginate(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>
        <div className="absolute inset-y-0 right-4 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/50 hover:bg-background h-10 w-10 rounded-full shadow-sm backdrop-blur-sm"
            onClick={() => paginate(1)}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Pagination Dots */}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
          {patterns.map((p, i) => (
            <div
              key={p}
              className={cn(
                'h-1 rounded-full transition-all duration-300',
                i === currentIndex ? 'bg-primary w-4' : 'bg-primary/20 w-1'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GoalCarousel
// ---------------------------------------------------------------------------

function GoalCarousel({
  block,
  goals,
  onUpdate,
}: {
  block: Extract<FocusBlock, { type: 'goal' }>;
  goals: GoalData[];
  onUpdate: (b: FocusBlock) => void;
}) {
  const options = [
    {
      id: undefined,
      title: 'Auto (Primary Goal)',
      why: 'Automatically picks your most important goal.',
    },
    ...goals,
  ];
  const currentIndex = options.findIndex(o => o.id === block.config.goalId);
  const [direction, setDirection] = useState(0);

  const paginate = (newDirection: number) => {
    const nextIndex = (currentIndex + newDirection + options.length) % options.length;
    setDirection(newDirection);
    onUpdate({ ...block, config: { ...block.config, goalId: options[nextIndex].id } });
  };

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      zIndex: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
      zIndex: 0,
    }),
  };

  const currentOption = options[currentIndex] || options[0];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
          Select Visualization Target
        </Label>
        <div className="flex items-center gap-3">
          <Label className="text-xs font-medium">Duration (s)</Label>
          <Input
            type="number"
            min={5}
            max={60}
            value={block.config.duration}
            onChange={e =>
              onUpdate({
                ...block,
                config: { ...block.config, duration: parseInt(e.target.value) || 15 },
              })
            }
            className="h-8 w-16 [appearance:textfield] text-center text-xs [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
      </div>

      <div className="bg-muted/20 relative overflow-hidden rounded-3xl border p-2">
        <div className="relative h-[200px] w-full items-center justify-center overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={currentOption.id ?? 'auto'}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="flex h-full w-full flex-col items-center justify-center p-8 text-center"
            >
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold">{currentOption.title}</span>
                <p className="text-muted-foreground mt-2 max-w-[280px] text-xs leading-relaxed italic">
                  "{currentOption.why || 'Visualize your success.'}"
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Controls */}
        <div className="absolute inset-y-0 left-4 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/50 hover:bg-background h-10 w-10 rounded-full shadow-sm backdrop-blur-sm"
            onClick={() => paginate(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>
        <div className="absolute inset-y-0 right-4 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/50 hover:bg-background h-10 w-10 rounded-full shadow-sm backdrop-blur-sm"
            onClick={() => paginate(1)}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Pagination Dots */}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
          {options.map((o, i) => (
            <div
              key={o.id ?? 'auto'}
              className={cn(
                'h-1 rounded-full transition-all duration-300',
                i === currentIndex ? 'bg-primary w-4' : 'bg-primary/20 w-1'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AffirmationEditor
// ---------------------------------------------------------------------------

function AffirmationEditor({
  block,
  onUpdate,
}: {
  block: Extract<FocusBlock, { type: 'affirmation' }>;
  onUpdate: (b: FocusBlock) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
          Affirmations
        </Label>
        <div className="flex items-center gap-3">
          <Label className="text-xs font-medium">Total Time (s)</Label>
          <Input
            type="number"
            min={10}
            max={300}
            value={block.config.totalDuration}
            onChange={e =>
              onUpdate({
                ...block,
                config: { ...block.config, totalDuration: parseInt(e.target.value) || 60 },
              })
            }
            className="h-8 w-16 [appearance:textfield] text-center text-xs [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
      </div>

      <div className="space-y-3">
        {block.config.texts.map((text, i) => (
          <div key={i} className="group flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold">
              {i + 1}
            </div>
            <Input
              value={text}
              onChange={e => {
                const newTexts = [...block.config.texts];
                newTexts[i] = e.target.value;
                onUpdate({ ...block, config: { ...block.config, texts: newTexts } });
              }}
              placeholder="Type an affirmation..."
              className="border-border/40 bg-muted/20 focus:bg-background h-10"
            />
            <button
              onClick={() => {
                const newTexts = block.config.texts.filter((_, idx) => idx !== i);
                onUpdate({ ...block, config: { ...block.config, texts: newTexts } });
              }}
              className="text-muted-foreground/30 hover:text-destructive opacity-0 transition-all group-hover:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onUpdate({ ...block, config: { ...block.config, texts: [...block.config.texts, ''] } })
          }
          className="text-muted-foreground hover:text-primary w-full rounded-2xl border border-dashed py-6"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Affirmation
        </Button>
      </div>
    </div>
  );
}
