"use client";

import { useState, useTransition } from "react";
import { getProjectActivities } from "@/app/actions/projects";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Calendar, Loader2, ChevronDown } from "lucide-react";

type ActivityItem = {
  id: string;
  content: string;
  createdAt: Date;
  logDate: Date;
};

interface ProjectActivityTimelineProps {
  projectId: string;
  initialActivities: ActivityItem[];
  totalCount: number;
}

const PAGE_SIZE = 20;

export function ProjectActivityTimeline({
  projectId,
  initialActivities,
  totalCount,
}: ProjectActivityTimelineProps) {
  const [activities, setActivities] = useState(initialActivities);
  const [isLoadingMore, startLoadingMore] = useTransition();
  const [hasMore, setHasMore] = useState(initialActivities.length < totalCount);

  const handleLoadMore = () => {
    startLoadingMore(async () => {
      const moreActivities = await getProjectActivities(
        projectId,
        PAGE_SIZE,
        activities.length
      );
      if (moreActivities.length < PAGE_SIZE) {
        setHasMore(false);
      }
      setActivities((prev) => [...prev, ...moreActivities]);
    });
  };

  if (activities.length === 0) {
    return (
      <Card className="bg-muted/30 border-dashed border-muted-foreground/30">
        <CardContent className="py-12 flex flex-col items-center justify-center text-center">
          <Activity className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-medium">No activities yet</p>
          <p className="text-xs text-muted-foreground/70 max-w-xs mt-1">
            Start logging activities or assign logs to this project to see them here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <div className="relative border-l border-border/50 ml-6 space-y-8 pb-4">
        {activities.map((activity) => {
          const date = new Date(activity.createdAt);
          const today = new Date();
          const isToday = today.toDateString() === date.toDateString();

          return (
            <div key={activity.id} className="relative pl-8 group">
              {/* Dot */}
              <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-border group-hover:bg-primary transition-colors ring-4 ring-background" />

              <div className="bg-card border border-border/50 hover:border-border rounded-lg p-4 transition-all hover:shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {date.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    <span className="text-muted-foreground/50 mx-1">•</span>
                    {date.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                  {isToday && (
                    <span className="bg-primary/10 text-primary text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm tracking-wide">
                      New
                    </span>
                  )}
                </div>
                <p className="text-foreground text-sm whitespace-pre-wrap leading-relaxed">
                  {activity.content}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={isLoadingMore}
          className="w-full py-6 flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
        >
          {isLoadingMore ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Loading...</span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="h-px w-12 bg-border/50 group-hover:bg-border transition-colors" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Load More
                </span>
                <div className="h-px w-12 bg-border/50 group-hover:bg-border transition-colors" />
              </div>
              <ChevronDown className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity animate-bounce" />
            </>
          )}
        </button>
      )}

      {/* Count indicator */}
      <p className="text-center text-xs text-muted-foreground">
        Showing {activities.length} of {totalCount}{" "}
        {totalCount === 1 ? "activity" : "activities"}
      </p>
    </div>
  );
}
