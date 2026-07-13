'use client';

import { FileText, Users, Target, Briefcase } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

type EvidenceProject = { id: string; name: string; color: string };
type EvidenceGoal = { id: string; title: string };
type EvidenceContact = {
  id: string;
  fullName: string;
  relationship: string | null;
  interactionsCount: number;
};
type EvidenceReport = { id: string; title: string; createdAt: Date };

interface ChatContextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: EvidenceProject[];
  goals: EvidenceGoal[];
  contacts: EvidenceContact[];
  reports: EvidenceReport[];
  selectedProjectIds: string[];
  selectedGoalIds: string[];
  selectedContactIds: string[];
  selectedReportIds: string[];
  onProjectChange: (ids: string[]) => void;
  onGoalChange: (ids: string[]) => void;
  onContactChange: (ids: string[]) => void;
  onReportChange: (ids: string[]) => void;
  onContextChange?: (
    projectId?: string | null,
    goalId?: string | null,
    contactId?: string | null,
    reportIds?: string[]
  ) => void;
}

export function ChatContextDialog({
  open,
  onOpenChange,
  projects,
  goals,
  contacts,
  reports,
  selectedProjectIds,
  selectedGoalIds,
  selectedContactIds,
  selectedReportIds,
  onProjectChange,
  onGoalChange,
  onContactChange,
  onReportChange,
  onContextChange,
}: ChatContextDialogProps) {
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add Evidence"
      description="Select the projects, goals, contacts, or summaries you want the coach to use."
      className="lg:left-[calc(50%+8rem)]"
    >
      <CommandInput placeholder="Search evidence..." />
      <CommandList className="scrollbar-none">
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Projects">
          {projects.map(project => (
            <CommandItem
              key={project.id}
              value={`project-${project.id}`}
              onSelect={() => {
                const newIds = selectedProjectIds.includes(project.id)
                  ? selectedProjectIds.filter(id => id !== project.id)
                  : [...selectedProjectIds, project.id];
                onProjectChange(newIds);
                onContextChange?.(
                  newIds[0] || null,
                  selectedGoalIds[0] || null,
                  selectedContactIds[0] || null,
                  selectedReportIds
                );
                onOpenChange(false);
              }}
              className="flex items-center gap-2"
            >
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: project.color }} />
              <Briefcase className="text-muted-foreground h-4 w-4" />
              <span>{project.name}</span>
              {selectedProjectIds.includes(project.id) && (
                <span className="text-primary ml-auto text-xs font-medium">Selected</span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Goals">
          {goals.map(goal => (
            <CommandItem
              key={goal.id}
              value={`goal-${goal.id}`}
              onSelect={() => {
                const newIds = selectedGoalIds.includes(goal.id)
                  ? selectedGoalIds.filter(id => id !== goal.id)
                  : [...selectedGoalIds, goal.id];
                onGoalChange(newIds);
                onContextChange?.(
                  selectedProjectIds[0] || null,
                  newIds[0] || null,
                  selectedContactIds[0] || null,
                  selectedReportIds
                );
                onOpenChange(false);
              }}
              className="flex items-center gap-2"
            >
              <Target className="text-muted-foreground h-4 w-4" />
              <span>{goal.title}</span>
              {selectedGoalIds.includes(goal.id) && (
                <span className="text-primary ml-auto text-xs font-medium">Selected</span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Network & Contacts">
          {contacts.map(contact => (
            <CommandItem
              key={contact.id}
              value={`contact-${contact.id}`}
              onSelect={() => {
                const newIds = selectedContactIds.includes(contact.id)
                  ? selectedContactIds.filter(id => id !== contact.id)
                  : [...selectedContactIds, contact.id];
                onContactChange(newIds);
                onContextChange?.(
                  selectedProjectIds[0] || null,
                  selectedGoalIds[0] || null,
                  newIds[0] || null,
                  selectedReportIds
                );
                onOpenChange(false);
              }}
              className="flex items-center gap-2"
            >
              <Users className="text-muted-foreground h-4 w-4" />
              <div className="flex flex-col">
                <span>{contact.fullName}</span>
                {contact.relationship && (
                  <span className="text-muted-foreground text-[10px]">{contact.relationship}</span>
                )}
              </div>
              {selectedContactIds.includes(contact.id) && (
                <span className="text-primary ml-auto text-xs font-medium">Selected</span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Summaries">
          {reports.map(report => (
            <CommandItem
              key={report.id}
              value={`report-${report.id}`}
              onSelect={() => {
                const newIds = selectedReportIds.includes(report.id)
                  ? selectedReportIds.filter(id => id !== report.id)
                  : [...selectedReportIds, report.id];
                onReportChange(newIds);
                onContextChange?.(
                  selectedProjectIds[0] || null,
                  selectedGoalIds[0] || null,
                  selectedContactIds[0] || null,
                  newIds
                );
                onOpenChange(false);
              }}
              className="flex items-center gap-2"
            >
              <FileText className="text-muted-foreground h-4 w-4" />
              <div className="flex flex-col">
                <span>{report.title}</span>
                <span className="text-muted-foreground text-[10px]">
                  {new Date(report.createdAt).toLocaleDateString()}
                </span>
              </div>
              {selectedReportIds.includes(report.id) && (
                <span className="text-primary ml-auto text-xs font-medium">Selected</span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
