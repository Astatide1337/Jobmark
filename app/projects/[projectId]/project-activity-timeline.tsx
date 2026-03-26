'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { getProjectActivities } from '@/app/actions/projects';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Calendar, Loader2, ChevronDown } from 'lucide-react';

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
      const moreActivities = await getProjectActivities(projectId, PAGE_SIZE, activities.length);
      if (moreActivities.length < PAGE_SIZE) {
        setHasMore(false);
      }
      setActivities(prev => [...prev, ...moreActivities]);
    });
  };

  if (activities.length === 0) {
    return (
      <Card className="bg-muted/30 border-muted-foreground/30 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Activity className="text-muted-foreground/30 mb-3 h-10 w-10" />
          <p className="text-muted-foreground font-medium">No project evidence yet</p>
          <p className="text-muted-foreground/70 mt-1 max-w-xs text-xs">
            Assign work to this project so its record becomes specific enough to summarize later.
          </p>
          <Button variant="link" size="sm" asChild className="mt-3">
            <Link href="/dashboard">Log work from the dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <div className="border-border/50 relative ml-6 space-y-8 border-l pb-4">
        {activities.map(activity => {
          const date = new Date(activity.createdAt);
          const today = new Date();
          const isToday = today.toDateString() === date.toDateString();

          return (
            <div key={activity.id} className="group relative pl-8">
              {/* Dot */}
              <div className="bg-border group-hover:bg-primary ring-background absolute top-1.5 -left-[5px] h-2.5 w-2.5 rounded-full ring-4 transition-colors" />

              <div className="bg-card border-border/50 hover:border-border rounded-lg border p-4 transition-all hover:shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
                    <Calendar className="h-3.5 w-3.5" />
                    {date.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    <span className="text-muted-foreground/50 mx-1">•</span>
                    {date.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                  {isToday && (
                    <span className="bg-primary/10 text-primary rounded-sm px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                      New
                    </span>
                  )}
                </div>
                <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
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
          className="text-muted-foreground hover:text-foreground group flex w-full flex-col items-center gap-2 py-6 transition-colors"
        >
          {isLoadingMore ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Loading...</span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="bg-border/50 group-hover:bg-border h-px w-12 transition-colors" />
                <span className="text-xs font-medium tracking-wider uppercase">Load More</span>
                <div className="bg-border/50 group-hover:bg-border h-px w-12 transition-colors" />
              </div>
              <ChevronDown className="h-4 w-4 animate-bounce opacity-50 transition-opacity group-hover:opacity-100" />
            </>
          )}
        </button>
      )}

      {/* Count indicator */}
      <p className="text-muted-foreground text-center text-xs">
        Showing {activities.length} of {totalCount} {totalCount === 1 ? 'activity' : 'activities'}
      </p>
    </div>
  );
}
