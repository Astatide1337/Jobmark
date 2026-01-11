"use client";

import { deleteActivity } from "@/app/actions/activities";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useTransition, useRef } from "react";
import { toast } from "sonner";

interface DeleteActivityButtonProps {
  activityId: string;
  onOptimisticDelete?: () => void;
  onUndoDelete?: () => void;
}

export function DeleteActivityButton({ 
  activityId, 
  onOptimisticDelete,
  onUndoDelete,
}: DeleteActivityButtonProps) {
  const [isPending, startTransition] = useTransition();
  const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  const handleDelete = () => {
    // Optimistically hide the card
    onOptimisticDelete?.();

    // Show undo toast with 5-second countdown
    toastIdRef.current = toast("Activity deleted", {
      description: "This action will be permanent in 5 seconds",
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          // Cancel the pending deletion
          if (deleteTimeoutRef.current) {
            clearTimeout(deleteTimeoutRef.current);
            deleteTimeoutRef.current = null;
          }
          // Restore the card
          onUndoDelete?.();
          toast.success("Activity restored");
        },
      },
      onDismiss: () => {
        // Toast dismissed without undo - deletion already scheduled
      },
    });

    // Schedule actual deletion after 5 seconds
    deleteTimeoutRef.current = setTimeout(() => {
      startTransition(async () => {
        await deleteActivity(activityId);
      });
    }, 5000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={isPending}
      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
