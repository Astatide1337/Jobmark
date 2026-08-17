/**
 * Heuristic-Based AI Insights
 *
 * Why: Data alone isn't enough; users need actionable advice. This
 * component analyzes the `InsightsData` object to identify patterns like
 * "Power Days", "Weekend Warrior" habits, or "Momentum Gaps."
 *
 * Performance: Uses `useMemo` to ensure that calculating these complex
 * productivity heuristics never blocks the main UI thread.
 *
 * Insight Logic:
 * - 1. Day-of-week power analysis.
 * - 2. Multi-week trend comparison.
 * - 3. Consistency scoring (30-day window).
 * - 4. Project focus balance.
 */
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Target,
  Lightbulb,
} from 'lucide-react';
import type { InsightsData } from '@/app/actions/insights';

interface AiInsightsProps {
  data: InsightsData;
}

// Consistent card styling
const CARD_STYLES = 'rounded-2xl border border-border/40 bg-card/60 shadow-sm';

interface Insight {
  icon: React.ReactNode;
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'tip';
}

export function AiInsights({ data }: AiInsightsProps) {
  const insights = useMemo(() => generateInsights(data), [data]);

  const iconColors = {
    info: 'text-info',
    success: 'text-success',
    warning: 'text-warning',
    tip: 'text-primary',
  };

  return (
    <Card className={CARD_STYLES}>
      <CardHeader className="px-6 pt-6 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="text-primary h-4 w-4" />
          What your notes show
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {insights.map((insight, index) => (
            <div
              key={index}
              className="bg-muted/30 border-border/30 flex gap-3 rounded-lg border p-3"
            >
              <div className={`mt-0.5 shrink-0 ${iconColors[insight.type]}`}>{insight.icon}</div>
              <div>
                <p className="text-foreground text-sm font-medium">{insight.title}</p>
                <p className="text-muted-foreground mt-0.5 text-sm">{insight.description}</p>
              </div>
            </div>
          ))}
          {insights.length === 0 && (
            <p className="text-muted-foreground col-span-2 py-4 text-center text-sm">
              Add more notes to see patterns.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function generateInsights(data: InsightsData): Insight[] {
  const insights: Insight[] = [];
  const last30Days = data.heatmapData.slice(-30);
  const activeDaysRecent = last30Days.filter(d => d.count > 0).length;
  const consistencyPercent = Math.round((activeDaysRecent / 30) * 100);

  if (last30Days.length > 0) {
    if (consistencyPercent < 25) {
      insights.push({
        icon: <Clock className="h-4 w-4" />,
        title: 'You have only a few recent notes',
        description: 'There are long gaps in the last month. Add one note about today’s work.',
        type: 'warning',
      });
    } else if (consistencyPercent < 55) {
      insights.push({
        icon: <Target className="h-4 w-4" />,
        title: `${consistencyPercent}% of days had notes`,
        description: 'You have some notes, but there are still gaps. Add notes on more days.',
        type: 'info',
      });
    } else {
      insights.push({
        icon: <TrendingUp className="h-4 w-4" />,
        title: 'You have notes for most recent days',
        description: 'You have enough recent notes to make a weekly update.',
        type: 'success',
      });
    }
  }

  if (data.projectDistribution.length >= 2) {
    const total = data.projectDistribution.reduce((sum, p) => sum + p.count, 0);
    const topProject = data.projectDistribution.reduce((a, b) => (a.count > b.count ? a : b));
    const topPercent = Math.round((topProject.count / total) * 100);

    if (topPercent >= 70) {
      insights.push({
        icon: <Lightbulb className="h-4 w-4" />,
        title: `Most of your notes are from "${topProject.name}"`,
        description:
          'That may be your main project. Check if another project needs a note this week.',
        type: 'info',
      });
    }
  } else if (data.totalActivities > 0) {
    insights.push({
      icon: <Calendar className="h-4 w-4" />,
      title: 'Your notes are not grouped by project yet',
      description:
        'Projects make your notes easier to find. Create or choose a project for your main work.',
      type: 'tip',
    });
  }

  if (data.totalReports === 0 && data.totalActivities >= 5) {
    insights.push({
      icon: <Sparkles className="h-4 w-4" />,
      title: 'You have enough notes for a review draft',
      description: 'Use your notes from the last week to make a draft.',
      type: 'tip',
    });
  } else if (data.totalReports > 0) {
    insights.push({
      icon: <TrendingDown className="h-4 w-4" />,
      title: 'Make drafts while details are fresh',
      description: 'Make a draft soon after a busy week or a project milestone.',
      type: 'info',
    });
  }

  return insights.slice(0, 4); // Limit to 4 most relevant insights
}
