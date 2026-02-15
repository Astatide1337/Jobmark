"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Clock,
  MessageSquare,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { deleteInteraction } from "@/app/actions/network";
import {
  getChannelLabel,
  formatDate,
  getRelativeDay,
  isDateOnlyOverdue,
} from "@/lib/network";
import { toast } from "sonner";
import { InteractionLogForm } from "./interaction-log-form";
import { cn } from "@/lib/utils";

interface Interaction {
  id: string;
  contactId: string;
  occurredAt: Date;
  channel: string;
  summary: string;
  nextStep?: string | null;
  followUpDate?: Date | null;
  rawNotes?: string | null;
  createdAt: Date;
}

interface InteractionTimelineProps {
  interactions: Interaction[];
  contactId: string;
  onInteractionAdded?: () => void;
}

const CHANNEL_COLORS: Record<string, string> = {
  email: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  call: "bg-green-500/15 text-green-700 dark:text-green-400",
  text: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  "in-person": "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  linkedin: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  video: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  other: "bg-gray-500/15 text-gray-700 dark:text-gray-400",
};

export function InteractionTimeline({
  interactions,
  contactId,
  onInteractionAdded,
}: InteractionTimelineProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedRawNotes, setExpandedRawNotes] = useState<Set<string>>(
    () => new Set()
  );

  const handleDelete = async (interactionId: string) => {
    setDeletingId(interactionId);
    try {
      const result = await deleteInteraction(interactionId);
      if (result.success) {
        toast.success("Interaction deleted");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Delete interaction error:", error);
      toast.error("Failed to delete interaction");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    onInteractionAdded?.();
  };

  const isOverdue = (date: Date | string | null | undefined) => {
    return isDateOnlyOverdue(date);
  };

  const toggleRawNotes = (interactionId: string) => {
    setExpandedRawNotes((prev) => {
      const next = new Set(prev);
      if (next.has(interactionId)) next.delete(interactionId);
      else next.add(interactionId);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Interactions</CardTitle>
          <Button
            size="sm"
            onClick={() => setShowForm(!showForm)}
            variant={showForm ? "outline" : "default"}
          >
            <Plus className="h-4 w-4 mr-1" />
            Log Interaction
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Inline Log Form */}
        {showForm && (
          <InteractionLogForm
            contactId={contactId}
            onSuccess={handleFormSuccess}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Timeline */}
        {interactions.length === 0 ? (
          <div className="py-8 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No interactions logged yet.
            </p>
            {!showForm && (
              <Button
                variant="link"
                size="sm"
                className="mt-2"
                onClick={() => setShowForm(true)}
              >
                Log your first interaction
              </Button>
            )}
          </div>
        ) : (
          <div className="relative space-y-0">
            {/* Vertical line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

            {interactions.map((interaction) => (
              <div
                key={interaction.id}
                className="relative pl-10 pb-6 last:pb-0 group"
              >
                {/* Timeline dot */}
                <div className="absolute left-[11px] top-1.5 h-2.5 w-2.5 rounded-xl bg-primary ring-2 ring-background" />

                <div className="space-y-2">
                  {/* Header: channel + date */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "border-0 text-xs",
                        CHANNEL_COLORS[interaction.channel] ??
                          CHANNEL_COLORS.other
                      )}
                    >
                      {getChannelLabel(interaction.channel)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(interaction.occurredAt)}
                    </span>

                    {/* Delete button */}
                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                      {confirmDeleteId === interaction.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => handleDelete(interaction.id)}
                            disabled={deletingId === interaction.id}
                          >
                            {deletingId === interaction.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Delete"
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all active:scale-95"
                          onClick={() => setConfirmDeleteId(interaction.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-sm whitespace-pre-wrap">
                    {interaction.summary}
                  </p>

                  {/* Next Step */}
                  {interaction.nextStep && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Next step:
                      </span>{" "}
                      {interaction.nextStep}
                    </div>
                  )}

                  {/* Raw Notes (collapsed by default) */}
                  {interaction.rawNotes && interaction.rawNotes.trim().length > 0 && (
                    <div className="pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-primary transition-all active:scale-95"
                        onClick={() => toggleRawNotes(interaction.id)}
                      >
                        <ChevronDown
                          className={cn(
                            "mr-1 h-3.5 w-3.5 transition-transform",
                            expandedRawNotes.has(interaction.id) && "rotate-180"
                          )}
                        />
                        {expandedRawNotes.has(interaction.id)
                          ? "Hide raw notes"
                          : "View raw notes"}
                      </Button>

                      {expandedRawNotes.has(interaction.id) && (
                        <div className="mt-2 rounded-xl border bg-muted/30 p-3 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                          <p className="text-sm whitespace-pre-wrap text-foreground/80 leading-relaxed">
                            {interaction.rawNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Follow-up Date */}
                  {interaction.followUpDate && (
                    <div
                      className={cn(
                        "flex items-center gap-1.5 text-xs",
                        isOverdue(interaction.followUpDate)
                          ? "text-destructive font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                         Follow up:{" "}
                         {formatDate(interaction.followUpDate)}{" "}
                         ({getRelativeDay(interaction.followUpDate)})
                       </span>
                      {isOverdue(interaction.followUpDate) && (
                        <Badge
                          variant="destructive"
                          className="text-[10px] px-1.5 py-0"
                        >
                          Overdue
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
