"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, FolderOpen } from "lucide-react";
import { SearchResult } from "@/app/actions/search";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ActivityDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: SearchResult | null;
}

export function ActivityDetailModal({ open, onOpenChange, activity }: ActivityDetailModalProps) {
  if (!activity) return null;

  // Extract date from subtitle or use createdAt if available
  // The subtitle format is now "Project • Date" or similar
  // We can try to parse createdAt if available for a better date display
  
  let dateDisplay = "Unknown Date";
  if (activity.createdAt) {
    dateDisplay = format(new Date(activity.createdAt), "EEEE, MMMM d, yyyy • h:mm a");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{dateDisplay}</span>
            </div>
            {activity.color && activity.subtitle && (
              <Badge 
                variant="outline" 
                className="gap-2 px-3 py-1 font-normal bg-background/50 backdrop-blur-md"
                style={{ 
                  borderColor: activity.color + "40", // 25% opacity
                  color: activity.color 
                }}
              >
                <span 
                  className="h-2 w-2 rounded-full" 
                  style={{ backgroundColor: activity.color }}
                />
                <span className="max-w-[150px] truncate">
                   {/* Extract project name from subtitle: "Project Name • Jan 10" */}
                   {activity.subtitle.split(" • ")[0] || "No Project"}
                </span>
              </Badge>
            )}
          </div>
          
          {/* We don't really have a title for activity other than content, so we skip DialogTitle or use a generic one */}
          <DialogTitle className="sr-only">Activity Detail</DialogTitle>
        </DialogHeader>

        <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          <div className="prose prose-sm dark:prose-invert max-w-none text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {activity.fullContent || activity.title}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t pt-4">
           {/* Future actions like Edit can go here */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
