'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { SettingsSaveBar } from '@/components/settings/settings-save-bar';
import { createGoal, deleteGoal, type GoalData } from '@/app/actions/goals';
import { updateGoalSettings, type UserSettingsData } from '@/app/actions/settings';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function calendarDateToLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function GoalsSection({
  settings,
  goals: initialGoals,
}: {
  settings: UserSettingsData;
  goals: GoalData[];
}) {
  const [goals, setGoals] = useState(initialGoals);
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
      deadline: newGoalDeadline ? calendarDateToLocalDate(newGoalDeadline) : null,
      why: newGoalWhy,
    });
    if (result.success && result.goal) {
      setGoals(current => [result.goal!, ...current]);
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
      setGoals(current => current.filter(goal => goal.id !== id));
      toast.success('Goal deleted.');
    } else {
      toast.error('Could not delete the goal. Try again.');
    }
  };

  const handleSaveTargets = async () => {
    setIsSavingTargets(true);
    setTargetsSaved(false);
    await updateGoalSettings({ dailyTarget, weeklyTarget, monthlyTarget });
    setIsSavingTargets(false);
    setTargetsSaved(true);
  };

  const hasTargetChanges =
    dailyTarget !== settings.dailyTarget ||
    weeklyTarget !== settings.weeklyTarget ||
    monthlyTarget !== settings.monthlyTarget;
  let targetButtonLabel = 'Save targets';
  if (isSavingTargets) targetButtonLabel = 'Saving...';
  else if (targetsSaved) targetButtonLabel = 'Saved';

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
            <TargetInput
              id="daily-target"
              label="Daily target"
              value={dailyTarget}
              onChange={value => {
                setDailyTarget(value);
                setTargetsSaved(false);
              }}
            />
            <TargetInput
              id="weekly-target"
              label="Weekly target"
              value={weeklyTarget}
              onChange={value => {
                setWeeklyTarget(value);
                setTargetsSaved(false);
              }}
            />
            <TargetInput
              id="monthly-target"
              label="Monthly target"
              value={monthlyTarget}
              onChange={value => {
                setMonthlyTarget(value);
                setTargetsSaved(false);
              }}
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveTargets} disabled={isSavingTargets || !hasTargetChanges}>
              {isSavingTargets && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!isSavingTargets && targetsSaved && <CheckCircle2 className="mr-2 h-4 w-4" />}
              {targetButtonLabel}
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
                onChange={event => setNewGoalTitle(event.target.value)}
              />
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="new-goal-why">Why is this important?</Label>
              <Textarea
                id="new-goal-why"
                placeholder="Why does this matter?"
                className="resize-none"
                value={newGoalWhy}
                onChange={event => setNewGoalWhy(event.target.value)}
              />
            </div>
            <Button onClick={handleCreateGoal} disabled={isCreating || !newGoalTitle.trim()}>
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
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-[color,background-color]"
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

function TargetInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        value={value}
        onChange={event => onChange(parseInt(event.target.value, 10) || 0)}
      />
    </div>
  );
}
