"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Target, Loader2, CheckCircle2, AlertCircle, Plus, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { updateGoalSettings, type UserSettingsData } from "@/app/actions/settings";
import { createGoal, deleteGoal, type GoalData } from "@/app/actions/goals";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SettingsSaveBar } from "./settings-save-bar";

interface GoalsSectionProps {
  settings: UserSettingsData;
  goals: GoalData[];
}

export function GoalsSection({ settings, goals: initialGoals }: GoalsSectionProps) {
  const [goals, setGoals] = useState<GoalData[]>(initialGoals);
  
  // Activity Targets State
  const [isSavingTargets, setIsSavingTargets] = useState(false);
  const [targetsSaved, setTargetsSaved] = useState(false);
  const [dailyTarget, setDailyTarget] = useState(settings.dailyTarget);
  const [weeklyTarget, setWeeklyTarget] = useState(settings.weeklyTarget);
  const [monthlyTarget, setMonthlyTarget] = useState(settings.monthlyTarget);

  // New Goal State
  const [isCreating, setIsCreating] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalDeadline, setNewGoalDeadline] = useState("");
  const [newGoalWhy, setNewGoalWhy] = useState("");

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
      setNewGoalTitle("");
      setNewGoalDeadline("");
      setNewGoalWhy("");
      toast.success("Goal created successfully");
    } else {
      toast.error("Failed to create goal");
    }
    setIsCreating(false);
  };

  const handleDeleteGoal = async (id: string) => {
    const result = await deleteGoal(id);
    if (result.success) {
      setGoals(goals.filter(g => g.id !== id));
      toast.success("Goal deleted");
    } else {
      toast.error("Failed to delete goal");
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
      {/* Unsaved changes indicator */}
      <SettingsSaveBar 
        show={hasTargetChanges && !targetsSaved} 
        onSave={handleSaveTargets} 
        isSaving={isSavingTargets} 
      />

      {/* Activity Targets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity Targets</CardTitle>
          <CardDescription>Set your activity volume goals.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Daily Target</Label>
              <Input 
                type="number" 
                value={dailyTarget} 
                onChange={(e) => setDailyTarget(parseInt(e.target.value) || 0)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Weekly Target</Label>
              <Input 
                type="number" 
                value={weeklyTarget} 
                onChange={(e) => setWeeklyTarget(parseInt(e.target.value) || 0)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Monthly Target</Label>
              <Input 
                type="number" 
                value={monthlyTarget} 
                onChange={(e) => setMonthlyTarget(parseInt(e.target.value) || 0)} 
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
                  "Update Targets"
                )}
             </Button>
          </div>
        </CardContent>
      </Card>

      {/* Goals Management */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Your Goals</h3>
            <span className="text-sm text-muted-foreground">{goals.length} goals set</span>
        </div>

        {/* Add Goal Form */}
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
                        onChange={(e) => setNewGoalTitle(e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                        <Label>Set a deadline</Label>
                        <Input 
                            type="date" 
                            value={newGoalDeadline}
                            onChange={(e) => setNewGoalDeadline(e.target.value)}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Why is it important?</Label>
                    <Textarea 
                        placeholder="Write your 'Why'..." 
                        className="resize-none"
                        value={newGoalWhy}
                        onChange={(e) => setNewGoalWhy(e.target.value)}
                    />
                </div>
                <Button onClick={handleCreateGoal} disabled={isCreating || !newGoalTitle}>
                    {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Add Goal
                </Button>
            </CardContent>
        </Card>

        {/* Existing Goals List */}
        <div className="grid gap-4">
            {goals.map((goal) => (
                <Card key={goal.id}>
                    <CardContent className="p-4 flex items-start justify-between">
                        <div className="space-y-1">
                            <h4 className="font-semibold">{goal.title}</h4>
                            {goal.deadline && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <CalendarIcon className="h-3 w-3" />
                                    <span>Due {format(new Date(goal.deadline), "PPP")}</span>
                                </div>
                            )}
                            {goal.why && (
                                <p className="text-sm text-muted-foreground italic mt-2">
                                    "{goal.why}"
                                </p>
                            )}
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all active:scale-95" 
                            onClick={() => handleDeleteGoal(goal.id)}
                        >

                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>
            ))}
            {goals.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                    No goals set yet. Add one above!
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
