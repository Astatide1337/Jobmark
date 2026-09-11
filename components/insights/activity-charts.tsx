/**
 * Productivity Visualization Charts
 *
 * Why: Users need to see high-level trends that individual logs don't reveal.
 * This module transforms raw server-side counts into meaningful visual
 * patterns using Recharts.
 *
 * Design Details:
 * - Weekly Trend: Uses a customized `AreaChart` with a custom SVG gradient
 *   to align with the "Café" aesthetic.
 * - Project Distribution: A Donut chart with a "Total" center-label to
 *   show exactly where a user is spending their time.
 * - Custom Tooltips: Overrides standard Recharts tooltips with premium
 *   glassmorphism styling for consistency.
 */
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts';
import type { ProjectDistribution } from '@/app/actions/insights';

interface ActivityChartsProps {
  weeklyTrend: number[];
  projectDistribution: ProjectDistribution[];
  compact?: boolean;
}

// Consistent card styling
const CARD_STYLES = 'rounded-2xl border border-border/40 bg-card/60 shadow-sm';

export function ActivityCharts({
  weeklyTrend,
  projectDistribution,
  compact = false,
}: ActivityChartsProps) {
  return (
    <div className={compact ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 gap-4 lg:grid-cols-2'}>
      <WeeklyTrendChart data={weeklyTrend} />
      <ProjectDistributionChart data={projectDistribution} />
    </div>
  );
}

// Custom tooltip - consistent styling
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    payload: Record<string, unknown>;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border-border rounded-xl border px-3 py-2 shadow-xl backdrop-blur-md">
        <p className="text-muted-foreground mb-1 text-xs font-medium">{label}</p>
        <p className="text-foreground text-sm font-bold">
          {payload[0].value} {payload[0].value === 1 ? 'note' : 'notes'}
        </p>
      </div>
    );
  }
  return null;
}

function WeeklyTrendChart({ data }: { data: number[] }) {
  const chartData = data.map((value, index) => ({
    week: `W${index + 1}`,
    activities: value,
  }));

  const hasData = data.some(v => v > 0);

  return (
    <Card className={CARD_STYLES}>
      <CardHeader className="px-6 pt-6 pb-2">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
          Weekly notes
        </CardTitle>
        <p className="text-muted-foreground text-sm">How often you add notes</p>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="h-52">
          {!hasData && (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              Add a few notes to see your weekly pattern.
            </div>
          )}
          {hasData && (
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={0}
              initialDimension={{ width: 320, height: 208 }}
            >
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                {/* X Axis - HIGH CONTRAST */}
                <XAxis
                  dataKey="week"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 500 }}
                  dy={8}
                />
                {/* Y Axis - HIGH CONTRAST */}
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 500 }}
                  width={32}
                  allowDecimals={false}
                />
                <RechartsTooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area
                  type="monotone"
                  dataKey="activities"
                  isAnimationActive={false}
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#activityGradient)"
                  dot={{ fill: 'var(--primary)', strokeWidth: 0, r: 4 }}
                  activeDot={{
                    fill: 'var(--primary)',
                    strokeWidth: 3,
                    stroke: 'var(--background)',
                    r: 6,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Pie tooltip
interface PieTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: {
      percentage: string;
    };
  }>;
}

function PieTooltip({ active, payload }: PieTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-popover border-border rounded-xl border px-3 py-2 shadow-xl backdrop-blur-md">
        <p className="text-foreground text-sm font-bold">{data.name}</p>
        <p className="text-muted-foreground text-xs">
          {data.value} {data.value === 1 ? 'note' : 'notes'} ({data.payload.percentage}%)
        </p>
      </div>
    );
  }
  return null;
}

function ProjectDistributionChart({ data }: { data: ProjectDistribution[] }) {
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  const total = sortedData.reduce((sum, item) => sum + item.count, 0);

  const chartData = sortedData.map(item => ({
    ...item,
    percentage: total > 0 ? ((item.count / total) * 100).toFixed(0) : 0,
  }));

  if (chartData.length === 0) {
    return (
      <Card className={CARD_STYLES}>
        <CardHeader className="px-6 pt-6 pb-2">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            Notes in each project
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-52 items-center justify-center px-6 pb-6">
          <p className="text-muted-foreground text-sm">
            No project notes yet. Create a project or add a note to one.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={CARD_STYLES}>
      <CardHeader className="px-6 pt-6 pb-2">
        <CardTitle className="text-base font-semibold">Notes in each project</CardTitle>
        <p className="text-muted-foreground text-sm">See where your notes are grouped</p>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="flex items-center gap-8">
          {/* Legend - LEFT SIDE */}
          <div className="min-w-0 flex-1 space-y-3">
            {chartData.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-foreground flex-1 truncate text-sm">{item.name}</span>
                <span className="text-foreground text-sm font-semibold tabular-nums">
                  {item.count}
                </span>
              </div>
            ))}
            {chartData.length > 5 && (
              <p className="text-muted-foreground pl-6 text-xs">+{chartData.length - 5} more</p>
            )}
          </div>

          {/* Donut Chart - RIGHT SIDE */}
          <div className="relative z-0 shrink-0">
            <div className="relative h-40 w-40">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={0}
                initialDimension={{ width: 160, height: 160 }}
              >
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="name"
                    strokeWidth={0}
                    isAnimationActive={false}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        className="cursor-pointer transition-opacity hover:opacity-80"
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    content={<PieTooltip />}
                    isAnimationActive={false}
                    wrapperStyle={{ zIndex: 50 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-foreground text-2xl font-bold">{total}</p>
                  <p className="text-muted-foreground text-xs font-medium">Total</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
