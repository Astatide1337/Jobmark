/**
 * Interactive Dashboard Demo
 *
 * Why: The "First Impression" of the product. It gives potential
 * users a clear look at the core loop: Capture -> Stat Track -> Progress.
 *
 * Motion: Uses `staggerChildren` animation to make the dashboard
 * feel alive and "populate" as the user scrolls into view.
 */
'use client';

import { motion } from 'framer-motion';
import { DashboardFrame } from './dashboard-frame';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { addDays } from 'date-fns';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  },
};

export function DemoDashboard() {
  const today = new Date();

  const stats = {
    thisMonth: 42,
    projects: 5,
    monthlyGoal: 50,
    dates: [
      today.toISOString(),
      addDays(today, -1).toISOString(),
      addDays(today, -2).toISOString(),
      addDays(today, -5).toISOString(),
    ],
  };

  const recentActivities = [
    { text: 'Completed quarterly report presentation', project: 'Q4 Planning', time: '2h ago' },
    { text: 'Reviewed pull request for auth module', project: 'Mobile App', time: 'Yesterday' },
    { text: 'Fixed critical bug in payment flow', project: 'Mobile App', time: 'Yesterday' },
  ];

  return (
    <DashboardFrame activePath="/dashboard" compact>
      <motion.div
        className="mx-auto max-w-4xl space-y-5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Welcome */}
        <motion.div className="mb-2" variants={itemVariants}>
          <h1 className="text-foreground mb-0.5 text-xl font-bold">Good morning, User.</h1>
          <p className="text-muted-foreground text-sm">Ready to capture your wins?</p>
        </motion.div>

        {/* Quick Capture */}
        <motion.div variants={itemVariants}>
          <div className="border-border/50 bg-card/50 rounded-xl border p-4">
            <div className="text-muted-foreground mb-2 text-xs">What did you accomplish?</div>
            <div className="flex items-center gap-3">
              <div className="bg-background/60 border-border/30 text-foreground/70 flex-1 rounded-lg border px-3 py-2 text-sm">
                Completed the quarterly report and presented findings...
              </div>
              <div className="bg-primary/20 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg">
                <svg
                  className="text-primary h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <span className="bg-primary/20 text-primary rounded-md px-2 py-0.5 text-xs">
                Q4 Planning
              </span>
              <span className="text-muted-foreground text-xs">Today</span>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={itemVariants}>
          <StatsCards
            thisMonth={stats.thisMonth}
            projects={stats.projects}
            monthlyGoal={stats.monthlyGoal}
            dates={stats.dates}
          />
        </motion.div>

        {/* Recent Activity Timeline */}
        <motion.div variants={itemVariants}>
          <div className="border-border/50 bg-card/50 rounded-xl border p-4">
            <div className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
              Recent Wins
            </div>
            <div className="space-y-3">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="bg-primary mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground/90 text-sm leading-snug">{activity.text}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[10px]">
                        {activity.project}
                      </span>
                      <span className="text-muted-foreground text-[10px]">{activity.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </DashboardFrame>
  );
}
