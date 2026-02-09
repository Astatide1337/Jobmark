"use client";

import { motion } from "framer-motion";
import { DashboardFrame } from "./dashboard-frame";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { addDays } from "date-fns";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut" as const
    }
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
    ]
  };

  const recentActivities = [
    { text: "Completed quarterly report presentation", project: "Q4 Planning", time: "2h ago" },
    { text: "Reviewed pull request for auth module", project: "Mobile App", time: "Yesterday" },
    { text: "Fixed critical bug in payment flow", project: "Mobile App", time: "Yesterday" },
  ];

  return (
    <DashboardFrame activePath="/dashboard" compact>
      <motion.div 
        className="max-w-4xl mx-auto space-y-5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Welcome */}
        <motion.div className="mb-2" variants={itemVariants}>
          <h1 className="text-xl font-bold text-foreground mb-0.5">
            Good morning, User.
          </h1>
          <p className="text-sm text-muted-foreground">
            Ready to capture your wins?
          </p>
        </motion.div>

        {/* Quick Capture */}
        <motion.div variants={itemVariants}>
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <div className="text-xs text-muted-foreground mb-2">What did you accomplish?</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 px-3 py-2 rounded-lg bg-background/60 border border-border/30 text-sm text-foreground/70">
                Completed the quarterly report and presented findings...
              </div>
              <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary text-xs">Q4 Planning</span>
              <span className="text-xs text-muted-foreground">Today</span>
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
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <div className="text-xs text-muted-foreground mb-3 uppercase tracking-wider font-medium">Recent Wins</div>
            <div className="space-y-3">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground/90 leading-snug">{activity.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px]">{activity.project}</span>
                      <span className="text-[10px] text-muted-foreground">{activity.time}</span>
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
