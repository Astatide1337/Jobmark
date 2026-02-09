"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  TrendingUp, 
  Share2,
  CheckCircle2,
  Calendar,
  FileText,
  Users,
  Sparkles,
  Clock
} from "lucide-react";

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
  headline: string;
  description: string;
  features: string[];
  visual: React.ReactNode;
}

const tabs: Tab[] = [
  {
    id: "track",
    label: "Track Your Wins",
    icon: <Trophy className="h-4 w-4" />,
    headline: "Capture every accomplishment",
    description: "Log your work in 30 seconds. Build a comprehensive timeline of everything you've achieved, so nothing slips through the cracks.",
    features: [
      "Quick daily logging",
      "Smart categorization",
      "Searchable history",
      "Timeline view",
    ],
    visual: <TrackVisual />,
  },
  {
    id: "prove",
    label: "Prove Your Impact",
    icon: <TrendingUp className="h-4 w-4" />,
    headline: "Turn logs into proof",
    description: "When it's time for performance reviews or promotion discussions, generate compelling reports that showcase your contributions with specific examples.",
    features: [
      "AI-generated summaries",
      "Impact highlights",
      "Metric extraction",
      "Custom report templates",
    ],
    visual: <ProveVisual />,
  },
  {
    id: "share",
    label: "Share Your Progress",
    icon: <Share2 className="h-4 w-4" />,
    headline: "Keep everyone in the loop",
    description: "Create polished updates for standups, team meetings, or stakeholder reports. No more scrambling to remember what you worked on.",
    features: [
      "Weekly summaries",
      "Standup reports",
      "Export to PDF/Markdown",
      "Team-ready formatting",
    ],
    visual: <ShareVisual />,
  },
];

function TrackVisual() {
  return (
    <div className="bg-card/60 rounded-lg border border-border/40 p-6 space-y-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
        <Calendar className="h-4 w-4 text-primary" />
        <span>Today's Entries</span>
      </div>
      
      {[
        { time: "2:34 PM", text: "Fixed critical bug in payment flow", tags: ["bug-fix", "payments"] },
        { time: "11:15 AM", text: "Led sprint planning meeting", tags: ["leadership", "planning"] },
        { time: "9:45 AM", text: "Reviewed 3 PRs from team", tags: ["code-review"] },
      ].map((entry, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/20"
        >
          <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground">{entry.time}</span>
            </div>
            <p className="text-sm text-foreground">{entry.text}</p>
            <div className="flex gap-1.5 mt-2">
              {entry.tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ProveVisual() {
  return (
    <div className="bg-card/60 rounded-lg border border-border/40 p-6 space-y-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
        <Sparkles className="h-4 w-4 text-primary" />
        <span>Generated Report Preview</span>
      </div>
      
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-background/50 border border-border/20">
          <h4 className="font-medium text-sm mb-2">Key Achievements - Q4</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              "Led migration to new payment system, reducing failures by 40%",
              "Mentored 2 junior developers through onboarding",
              "Shipped 12 features ahead of schedule",
            ].map((item, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15 }}
                className="flex items-start gap-2"
              >
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>{item}</span>
              </motion.li>
            ))}
          </ul>
        </div>
        
        <div className="flex gap-2">
          <div className="flex-1 p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
            <div className="text-2xl font-bold text-primary">47</div>
            <div className="text-xs text-muted-foreground">Entries logged</div>
          </div>
          <div className="flex-1 p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
            <div className="text-2xl font-bold text-primary">12</div>
            <div className="text-xs text-muted-foreground">Features shipped</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShareVisual() {
  return (
    <div className="bg-card/60 rounded-lg border border-border/40 p-6 space-y-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
        <FileText className="h-4 w-4 text-primary" />
        <span>Weekly Update</span>
      </div>
      
      <div className="p-4 rounded-lg bg-background/50 border border-border/20 space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>Ready to share with your team</span>
        </div>
        
        <div className="text-sm space-y-2">
          <p className="text-foreground font-medium">This Week's Highlights:</p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground leading-relaxed"
          >
            <p>Completed the checkout redesign ahead of schedule. Collaborated with design on the new dashboard components. Fixed 3 high-priority bugs reported by customers.</p>
          </motion.div>
        </div>
        
        <div className="flex gap-2 pt-2">
          <motion.button
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md"
          >
            Copy to Clipboard
          </motion.button>
          <motion.button
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="px-3 py-1.5 text-xs border border-border/40 rounded-md text-muted-foreground"
          >
            Export PDF
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export function PersonaTabs() {
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const activeTabData = tabs.find((t) => t.id === activeTab)!;

  return (
    <section className="py-24 lg:py-32 relative">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="max-w-2xl mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-6"
          >
            <div className="h-px w-12 bg-primary/50" />
            <span className="text-sm font-mono text-primary tracking-wide uppercase">
              Use Cases
            </span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight mb-6"
          >
            Built for how you{" "}
            <span className="text-primary">actually work</span>
          </motion.h2>
        </div>

        {/* Tab navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-wrap gap-2 mb-12"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-all duration-300
                ${activeTab === tab.id 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-card/60 text-muted-foreground hover:text-foreground hover:bg-card border border-border/40"
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center"
          >
            {/* Left - Text content */}
            <div className="space-y-6">
              <h3 className="text-2xl sm:text-3xl font-serif font-semibold text-foreground">
                {activeTabData.headline}
              </h3>
              
              <p className="text-lg text-muted-foreground leading-relaxed">
                {activeTabData.description}
              </p>
              
              <ul className="space-y-3 pt-2">
                {activeTabData.features.map((feature, i) => (
                  <motion.li
                    key={feature}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 text-muted-foreground"
                  >
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    {feature}
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Right - Visual */}
            <div className="lg:pl-8">
              {activeTabData.visual}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
