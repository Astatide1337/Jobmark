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
    info: 'text-blue-400',
    success: 'text-green-400',
    warning: 'text-amber-400',
    tip: 'text-primary',
  };

  return (
    <Card className={CARD_STYLES}>
      <CardHeader className="px-6 pt-6 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="text-primary h-4 w-4" />
          Record Signals
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
              Capture more work to see where your record is strong and where it still needs coverage.
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
        title: 'Your recent record is thin',
        description:
          'There are long gaps in the last month, which makes reviews harder later. Next step: log one concrete piece of work today.',
        type: 'warning',
      });
    } else if (consistencyPercent < 55) {
      insights.push({
        icon: <Target className="h-4 w-4" />,
        title: `${consistencyPercent}% coverage in the last 30 days`,
        description:
          'You have a usable record, but it is still patchy. Next step: capture work on more active days so updates write themselves.',
        type: 'info',
      });
    } else {
      insights.push({
        icon: <TrendingUp className="h-4 w-4" />,
        title: 'Recent coverage is strong',
        description:
          'You are documenting work consistently enough to support a good weekly summary. Next step: build a draft from the last 7 days.',
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
        title: `Most of your record points to "${topProject.name}"`,
        description:
          'That focus may be real, but it can also hide other contributions. Next step: review whether another project needs documentation this week.',
        type: 'info',
      });
    }
  } else if (data.totalActivities > 0) {
    insights.push({
      icon: <Calendar className="h-4 w-4" />,
      title: 'Your work is not yet well organized by project',
      description:
        'A clearer project structure makes summaries more specific. Next step: create or assign a project for the work you capture most often.',
      type: 'tip',
    });
  }

  if (data.totalReports === 0 && data.totalActivities >= 5) {
    insights.push({
      icon: <Sparkles className="h-4 w-4" />,
      title: 'You have enough evidence for a first summary',
      description:
        'The record is already usable. Next step: turn the last week of work into a draft you can refine.',
      type: 'tip',
    });
  } else if (data.totalReports > 0) {
    insights.push({
      icon: <TrendingDown className="h-4 w-4" />,
      title: 'Keep summaries close to the work',
      description:
        'Summaries are most useful when they are built while details are fresh. Next step: create one shortly after a busy week or milestone.',
      type: 'info',
    });
  }

  return insights.slice(0, 4); // Limit to 4 most relevant insights
}
