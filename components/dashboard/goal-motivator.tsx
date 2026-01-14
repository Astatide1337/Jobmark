"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Quote, ChevronLeft, ChevronRight, Calendar, PlusCircle } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { GoalData } from "@/app/actions/goals";
import type { UserSettingsData } from "@/app/actions/settings";

interface GoalMotivatorProps {
  goals: GoalData[];
  settings?: UserSettingsData | null;
}

export function GoalMotivator({ goals, settings }: GoalMotivatorProps) {
  // Combine new goals with legacy goal if no new goals exist yet
  // This provides a smooth migration
  const hasGoals = goals.length > 0;
  const showLegacy = !hasGoals && settings?.primaryGoal;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  // Auto-rotate if multiple goals
  useEffect(() => {
    if (goals.length <= 1) return;

    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % goals.length);
    }, 10000); // 10 seconds

    return () => clearInterval(timer);
  }, [goals.length]);

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex((prev) => {
      let next = prev + newDirection;
      if (next < 0) next = goals.length - 1;
      if (next >= goals.length) next = 0;
      return next;
    });
  };

  if (!hasGoals && !showLegacy) {
    return (
      <Card className="mb-8 border-dashed shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center space-y-3">
          <div className="bg-primary/10 p-3 rounded-full">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">No goals set yet</h3>
            <p className="text-sm text-muted-foreground">Define what you want to achieve.</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/settings">
              <PlusCircle className="mr-2 h-4 w-4" />
              Set a Goal
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Legacy Fallback
  if (showLegacy && settings?.primaryGoal) {
    const deadline = settings.goalDeadline ? new Date(settings.goalDeadline) : null;
    const daysLeft = deadline ? differenceInDays(deadline, new Date()) : null;
    
    return (
      <Card className="mb-8 bg-gradient-to-br from-card to-primary/5 border-primary/10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-16 -translate-x-8" />
        <CardContent className="p-6 relative">
             <div className="flex flex-col gap-4">
               <div>
                  <div className="flex items-center gap-2 text-primary text-sm font-medium mb-1">
                    <Target className="h-4 w-4" />
                    <span>Primary Goal</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground/90">
                    {settings.primaryGoal}
                  </h3>
               </div>
               {settings.whyStatement && (
                <div className="pt-3 border-t border-primary/10 flex gap-2">
                  <Quote className="h-3 w-3 text-primary/60 shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground/80 italic font-medium leading-relaxed">
                    "{settings.whyStatement}"
                  </p>
                </div>
               )}
                {deadline && daysLeft !== null && (
                  <div className="absolute top-6 right-6 hidden md:block text-right">
                    <div className="text-2xl font-bold text-primary">{daysLeft}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Days Left</div>
                  </div>
                )}
             </div>
        </CardContent>
      </Card>
    );
  }

  const currentGoal = goals[currentIndex];
  const deadline = currentGoal.deadline ? new Date(currentGoal.deadline) : null;
  const daysLeft = deadline ? differenceInDays(deadline, new Date()) : null;

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  return (
    <Card className="mb-8 bg-gradient-to-br from-card to-primary/5 border-primary/10 shadow-sm relative overflow-hidden h-[180px] md:h-[200px]">
       <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-16 -translate-x-8" />
       
       <CardContent className="p-6 h-full relative flex items-center">
         <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
                key={currentIndex}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 }
                }}
                className="w-full flex flex-col md:flex-row gap-6 md:items-center justify-between"
            >
                <div className="space-y-4 flex-1">
                    <div>
                        <div className="flex items-center gap-2 text-primary text-sm font-medium mb-1">
                            <Target className="h-4 w-4" />
                            <span>Current Goal {goals.length > 1 && `(${currentIndex + 1}/${goals.length})`}</span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground/90 line-clamp-2">
                            {currentGoal.title}
                        </h3>
                    </div>
                    {currentGoal.why && (
                        <div className="flex gap-2">
                            <Quote className="h-3 w-3 text-primary/60 shrink-0 mt-0.5" />
                            <p className="text-sm text-foreground/80 italic font-medium leading-relaxed line-clamp-2">
                                "{currentGoal.why}"
                            </p>
                        </div>
                    )}
                </div>

                {/* Deadline (Right side on desktop) */}
                {deadline && daysLeft !== null && (
                    <div className="hidden md:flex flex-col items-end min-w-[100px] border-l border-primary/10 pl-6 py-2">
                        <div className="text-3xl font-bold text-primary">{daysLeft}</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Days Left</div>
                        <div className="text-xs text-muted-foreground mt-1">{format(deadline, "MMM d, yyyy")}</div>
                    </div>
                )}
            </motion.div>
         </AnimatePresence>

         {/* Navigation Controls */}
         {goals.length > 1 && (
            <div className="absolute bottom-[-10px] right-4 flex gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background" onClick={() => paginate(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background" onClick={() => paginate(1)}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
         )}
       </CardContent>
    </Card>
  );
}
