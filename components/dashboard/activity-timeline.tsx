'use client';

import { deleteActivity, getActivities } from '@/app/actions/activities';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSettings } from '@/components/providers/settings-provider';
import {
  DEFAULT_TIME_ZONE,
  getCalendarDate,
  isValidTimeZone,
  shiftCalendarDate,
} from '@/lib/date-semantics';
import { format, formatDistance } from 'date-fns';
import { ChevronDown, FileText, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

type Activity = Awaited<ReturnType<typeof getActivities>>[number];

interface ActivityTimelineProps {
  activities: Activity[];
  totalCount?: number;
  initialTimeZone?: string;
  initialToday?: string;
  initialNow?: string;
}

const PAGE_SIZE = 20;

export function ActivityTimeline({
  activities: initialActivities,
  totalCount,
  initialTimeZone,
  initialToday,
  initialNow,
}: ActivityTimelineProps) {
  const { settings } = useSettings();
  let timeZone = DEFAULT_TIME_ZONE;
  if (settings?.timeZone && isValidTimeZone(settings.timeZone)) {
    timeZone = settings.timeZone;
  } else if (initialTimeZone && isValidTimeZone(initialTimeZone)) {
    timeZone = initialTimeZone;
  }
  const [additionalActivities, setAdditionalActivities] = useState<Activity[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [isLoadingMore, startLoadingMore] = useTransition();
  const [hasMore, setHasMore] = useState(
    totalCount ? initialActivities.length < totalCount : initialActivities.length === PAGE_SIZE
  );

  const activities = useMemo(
    () => [...initialActivities, ...additionalActivities],
    [initialActivities, additionalActivities]
  );
  const visibleActivities = activities.filter(activity => !deletedIds.has(activity.id));

  const handleOptimisticDelete = (id: string) => {
    setDeletedIds(previous => new Set(previous).add(id));
  };

  const handleUndoDelete = (id: string) => {
    setDeletedIds(previous => {
      const next = new Set(previous);
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
      setAdditionalActivities(previous => [...previous, ...moreActivities]);
    });
  };

  if (visibleActivities.length === 0 && !isLoadingMore) {
    return <TimelineEmptyState />;
  }

  const groupedActivities = groupByDate(visibleActivities, timeZone);

  return (
    <div className="space-y-8">
      <div className="space-y-8">
        {groupedActivities.map(({ dateKey, activities: dateActivities }) => (
          <div key={dateKey}>
            <div className="mb-4 flex items-center gap-3">
              <h3 className="text-muted-foreground text-sm font-medium">
                {formatDateHeader(dateKey, timeZone, initialToday)}
              </h3>
              <div className="bg-border/50 h-px flex-1" />
              <span className="text-muted-foreground text-xs">
                {dateActivities.length} {dateActivities.length === 1 ? 'note' : 'notes'}
              </span>
            </div>

            <div className="space-y-3">
              {dateActivities.map(activity => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  timeZone={timeZone}
                  initialNow={initialNow}
                  onOptimisticDelete={() => handleOptimisticDelete(activity.id)}
                  onUndoDelete={() => handleUndoDelete(activity.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={isLoadingMore}
          className="text-muted-foreground hover:text-primary group flex w-full flex-col items-center gap-2 py-6 transition-colors"
        >
          {isLoadingMore ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Loading...</span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="bg-border/50 group-hover:bg-primary/30 h-px w-12 transition-colors" />
                <span className="text-xs font-medium tracking-wider uppercase">Load more</span>
                <div className="bg-border/50 group-hover:bg-primary/30 h-px w-12 transition-colors" />
              </div>

              <ChevronDown className="h-4 w-4 opacity-50 transition-opacity group-hover:opacity-100" />
            </>
          )}
        </button>
      )}

      {visibleActivities.length > 0 && (
        <p className="text-muted-foreground text-center text-xs">
          Showing {visibleActivities.length} {visibleActivities.length === 1 ? 'note' : 'notes'}
          {totalCount && totalCount > visibleActivities.length && ` of ${totalCount}`}
        </p>
      )}
    </div>
  );
}

interface ActivityCardProps {
  activity: Activity;
  timeZone: string;
  initialNow?: string;
  onOptimisticDelete: () => void;
  onUndoDelete: () => void;
}

function ActivityCard({
  activity,
  timeZone,
  initialNow,
  onOptimisticDelete,
  onUndoDelete,
}: ActivityCardProps) {
  const logDateYMD = getLogDateYMD(activity.logDate);
  const createdAtYMD = getCreatedAtLocalYMD(activity.createdAt, timeZone);

  return (
    <Card className="bg-card/40 border-border/40 group hover:bg-card/60 hover:shadow-primary/5 rounded-xl transition-[background-color,box-shadow] duration-300 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-foreground leading-relaxed break-words whitespace-pre-wrap">
              {activity.content}
            </p>

            <div className="text-muted-foreground mt-3 flex items-center gap-3 text-xs">
              {logDateYMD !== createdAtYMD && (
                <span className="text-warning font-medium">
                  For {format(parseLocalYMD(logDateYMD), 'MMM d')}
                </span>
              )}

              <span>
                {formatDistance(
                  new Date(activity.createdAt),
                  initialNow ? new Date(initialNow) : new Date(),
                  { addSuffix: true }
                )}
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

interface DeleteActivityButtonProps {
  activityId: string;
  onOptimisticDelete?: () => void;
  onUndoDelete?: () => void;
}

function DeleteActivityButton({
  activityId,
  onOptimisticDelete,
  onUndoDelete,
}: DeleteActivityButtonProps) {
  const [isPending, startTransition] = useTransition();
  const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
    };
  }, []);

  const handleDelete = () => {
    onOptimisticDelete?.();

    toast('Note deleted', {
      description: 'This note will be deleted in 5 seconds.',
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          if (deleteTimeoutRef.current) {
            clearTimeout(deleteTimeoutRef.current);
            deleteTimeoutRef.current = null;
          }
          onUndoDelete?.();
          toast.success('Note restored');
        },
      },
    });

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
      aria-label="Delete note"
      className="text-muted-foreground hover:text-destructive h-8 w-8 p-0 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

function TimelineEmptyState() {
  return (
    <Card className="bg-card/40 border-border/40 rounded-2xl border-dashed">
      <CardContent className="py-12 text-center">
        <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
          <FileText className="text-primary h-6 w-6" />
        </div>
        <h3 className="text-foreground mb-2 font-semibold">No notes yet</h3>
        <p className="text-muted-foreground mx-auto max-w-sm text-sm">
          Write one clear note about something you did.
        </p>
      </CardContent>
    </Card>
  );
}

function groupByDate(
  activities: Activity[],
  timeZone: string
): { dateKey: string; activities: Activity[] }[] {
  const groups: Record<string, Activity[]> = {};

  activities.forEach(activity => {
    const dateKey = getCreatedAtLocalYMD(activity.createdAt, timeZone);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(activity);
  });

  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, groupActivities]) => ({
      dateKey,
      activities: groupActivities.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    }));
}

function getLogDateYMD(date: string | Date): string {
  if (typeof date === 'string') {
    return date.substring(0, 10);
  }
  const value = new Date(date);
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(
    value.getUTCDate()
  ).padStart(2, '0')}`;
}

function getCreatedAtLocalYMD(date: string | Date, timeZone: string): string {
  return getCalendarDate(new Date(date), timeZone);
}

function parseLocalYMD(ymd: string): Date {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateHeader(dateKey: string, timeZone: string, initialToday?: string): string {
  const date = parseLocalYMD(dateKey);
  const today = initialToday ?? getCalendarDate(new Date(), timeZone);

  if (dateKey === today) return 'Today';
  if (dateKey === shiftCalendarDate(today, -1)) return 'Yesterday';

  return format(date, 'EEEE, MMMM d');
}
