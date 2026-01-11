"use client";

import { useEffect, useState, useTransition } from "react";
import { getActivities } from "@/app/actions/activities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { FileText, Loader2, ChevronDown } from "lucide-react";
import { DeleteActivityButton } from "./delete-activity-button";
import { cn } from "@/lib/utils";

type Activity = Awaited<ReturnType<typeof getActivities>>[number];

interface ActivityTimelineProps {
  activities: Activity[];
  totalCount?: number;
}

const PAGE_SIZE = 20;

export function ActivityTimeline({ activities: initialActivities, totalCount }: ActivityTimelineProps) {
  const [mounted, setMounted] = useState(false);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [isLoadingMore, startLoadingMore] = useTransition();
  const [hasMore, setHasMore] = useState(
    totalCount ? initialActivities.length < totalCount : initialActivities.length === PAGE_SIZE
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync with server-side activities when they change
  useEffect(() => {
    setActivities(initialActivities);
    setDeletedIds(new Set());
    // Recalculate hasMore based on new data
    setHasMore(totalCount ? initialActivities.length < totalCount : initialActivities.length === PAGE_SIZE);
  }, [initialActivities, totalCount]);

  // Filter out optimistically deleted activities
  const visibleActivities = activities.filter(a => !deletedIds.has(a.id));

  const handleOptimisticDelete = (id: string) => {
    setDeletedIds(prev => new Set(prev).add(id));
  };

  const handleUndoDelete = (id: string) => {
    setDeletedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleLoadMore = () => {
    startLoadingMore(async () => {
      const moreActivities = await getActivities(PAGE_SIZE, activities.length);
      if (moreActivities.length < PAGE_SIZE) {
        setHasMore(false);
      }
      setActivities(prev => [...prev, ...moreActivities]);
    });
  };

  if (visibleActivities.length === 0 && !isLoadingMore) {
    return <EmptyState />;
  }

  // Prevent hydration mismatch by not rendering dates until mounted
  if (!mounted) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-card/50 border-border/50 opacity-50 animate-pulse">
            <CardContent className="p-4 h-24" />
          </Card>
        ))}
      </div>
    );
  }

  // Group activities by date and sort by date descending (newest first)
  const groupedActivities = groupByDate(visibleActivities);

  return (
    <div className="space-y-8">
      {/* Activities grouped by date */}
      <div className="space-y-8 animate-in fade-in duration-500">
        {groupedActivities.map(({ dateKey, activities: dateActivities }) => (
          <div key={dateKey}>
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                {formatDateHeader(dateKey)}
              </h3>
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-xs text-muted-foreground">
                {dateActivities.length} {dateActivities.length === 1 ? "entry" : "entries"}
              </span>
            </div>
            
            <div className="space-y-3">
              {dateActivities.map((activity) => (
                <ActivityCard 
                  key={activity.id} 
                  activity={activity}
                  onOptimisticDelete={() => handleOptimisticDelete(activity.id)}
                  onUndoDelete={() => handleUndoDelete(activity.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
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
                <span className="text-xs font-medium uppercase tracking-wider">Load More</span>
                <div className="h-px w-12 bg-border/50 group-hover:bg-border transition-colors" />
              </div>
              <ChevronDown className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity animate-bounce" />
            </>
          )}
        </button>
      )}

      {/* Count indicator */}
      {visibleActivities.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Showing {visibleActivities.length} {visibleActivities.length === 1 ? "activity" : "activities"}
          {totalCount && totalCount > visibleActivities.length && ` of ${totalCount}`}
        </p>
      )}
    </div>
  );
}

interface ActivityCardProps {
  activity: Activity;
  onOptimisticDelete: () => void;
  onUndoDelete: () => void;
}

function ActivityCard({ activity, onOptimisticDelete, onUndoDelete }: ActivityCardProps) {
  return (
    <Card className="bg-card/50 border-border/50 group hover:bg-card/70 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-foreground leading-relaxed whitespace-pre-wrap break-all">
              {activity.content}
            </p>
            
            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
              {getLogDateYMD(activity.logDate) !== getCreatedAtLocalYMD(activity.createdAt) && (
                <span className="text-amber-500 font-medium">
                  For {format(parseLocalYMD(getLogDateYMD(activity.logDate)), "MMM d")}
                </span>
              )}
              
              <span>
                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </span>
              
              {activity.project && (
                <>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-1.5">
                    <span 
                      className="h-2 w-2 rounded-full" 
                      style={{ backgroundColor: activity.project.color }}
                    />
                    {activity.project.name}
                  </span>
                </>
              )}
            </div>
          </div>
          
          <DeleteActivityButton 
            activityId={activity.id}
            onOptimisticDelete={onOptimisticDelete}
            onUndoDelete={onUndoDelete}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="bg-card/50 border-border/50 border-dashed">
      <CardContent className="py-12 text-center">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground mb-2">No activities yet</h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Start logging your daily accomplishments using the Quick Capture above.
        </p>
      </CardContent>
    </Card>
  );
}

function groupByDate(activities: Activity[]): { dateKey: string; activities: Activity[] }[] {
  const groups: Record<string, Activity[]> = {};
  
  activities.forEach((activity) => {
    // Use createdAt converted to local date for grouping (matches "Today"/"Yesterday" headers)
    const dateKey = getCreatedAtLocalYMD(activity.createdAt);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(activity);
  });
  
  // Convert to array, sort date groups (newest first), and sort activities within each group (newest first)
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, groupActivities]) => ({
      dateKey,
      activities: groupActivities.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    }));
}

/**
 * Extract YYYY-MM-DD from a date-only field (like logDate).
 * These are stored as midnight UTC, so we extract the date part directly.
 * Example: "2026-01-08T00:00:00.000Z" → "2026-01-08"
 */
function getLogDateYMD(date: string | Date): string {
  if (typeof date === 'string') {
    return date.substring(0, 10);
  }
  // Fallback for Date objects - extract UTC date parts
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Convert a full timestamp (like createdAt) to local YYYY-MM-DD.
 * Since the user sees "Today"/"Yesterday" based on their local time,
 * we need to convert the timestamp to their timezone.
 * Example: "2026-01-11T03:00:00.000Z" in EST → "2026-01-10"
 */
function getCreatedAtLocalYMD(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-CA"); // Returns YYYY-MM-DD in local time
}

/**
 * Parse a YYYY-MM-DD string as local midnight.
 * Used for formatting headers like "Friday, January 9"
 */
function parseLocalYMD(ymd: string): Date {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateHeader(dateKey: string): string {
  const date = parseLocalYMD(dateKey);
  
  if (isToday(date)) {
    return "Today";
  }
  if (isYesterday(date)) {
    return "Yesterday";
  }
  
  return format(date, "EEEE, MMMM d");
}
