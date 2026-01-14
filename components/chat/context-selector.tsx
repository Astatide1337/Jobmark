"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FolderOpen, Target, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContextSelectorProps {
  projects: Array<{ id: string; name: string; color: string }>;
  goals: Array<{ id: string; title: string }>;
  selectedProjectId: string | null;
  selectedGoalId: string | null;
  onProjectSelect: (projectId: string | null) => void;
  onGoalSelect: (goalId: string | null) => void;
}

export function ContextSelector({
  projects,
  goals,
  selectedProjectId,
  selectedGoalId,
  onProjectSelect,
  onGoalSelect,
}: ContextSelectorProps) {
  const [projectOpen, setProjectOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const selectedGoal = goals.find((g) => g.id === selectedGoalId);

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Selected Project Chip */}
      {selectedProject && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border/50 text-sm">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: selectedProject.color }}
          />
          <span className="text-foreground">{selectedProject.name}</span>
          <button
            onClick={() => onProjectSelect(null)}
            className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Selected Goal Chip */}
      {selectedGoal && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border/50 text-sm">
          <Target className="h-3 w-3 text-primary" />
          <span className="text-foreground truncate max-w-[150px]">{selectedGoal.title}</span>
          <button
            onClick={() => onGoalSelect(null)}
            className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Add Context Buttons */}
      <div className="flex gap-1">
        {/* Project Selector */}
        {!selectedProject && projects.length > 0 && (
          <Popover open={projectOpen} onOpenChange={setProjectOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-3 w-3 mr-1" />
                <FolderOpen className="h-3 w-3 mr-1" />
                <span className="text-xs">Project</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-2">
              <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                Reference a project
              </div>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      onProjectSelect(project.id);
                      setProjectOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors text-left"
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="truncate">{project.name}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Goal Selector */}
        {!selectedGoal && goals.length > 0 && (
          <Popover open={goalOpen} onOpenChange={setGoalOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-3 w-3 mr-1" />
                <Target className="h-3 w-3 mr-1" />
                <span className="text-xs">Goal</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-2">
              <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                Reference a goal
              </div>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {goals.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => {
                      onGoalSelect(goal.id);
                      setGoalOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors text-left"
                  >
                    <Target className="h-3 w-3 text-primary shrink-0" />
                    <span className="truncate">{goal.title}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
