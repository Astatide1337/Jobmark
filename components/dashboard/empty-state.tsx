"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pen, Sparkles } from "lucide-react";

/**
 * Psychologically Optimized Empty State
 * 
 * Principles Applied:
 * 1. Endowed Progress: Acknowledge they've already started
 * 2. Zeigarnik Effect: Create open loops to complete
 * 3. Social Proof: "Most users log 5+ activities in week 1"
 * 4. Foot-in-the-Door: Small first ask leads to bigger engagement
 */

interface EmptyStateProps {
  onFocusCapture?: () => void;
}

export function EmptyState({ onFocusCapture }: EmptyStateProps) {
  // Tips rotate for variable engagement
  const tips = [
    "Most successful users log their first win within 30 seconds",
    "Even small wins count - every entry builds your story",
    "Quick tip: Use Cmd+Enter to save instantly",
    "Your future self will thank you for logging today",
  ];
  
  // Random tip for variable reward
  const randomTip = tips[Math.floor(Math.random() * tips.length)];

  return (
    <Card className="bg-card/50 border-border/50 border-dashed">
      <CardContent className="py-16 text-center">
        {/* Visual anchor */}
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Pen className="h-8 w-8 text-primary" />
        </div>
        
        {/* Encouraging headline - Endowed Progress */}
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Ready to capture your first win
        </h3>
        
        {/* Social proof + Foot-in-the-door */}
        <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
          {randomTip}
        </p>

        {/* Clear call to action */}
        <Button onClick={onFocusCapture} className="mb-4">
          <Sparkles className="h-4 w-4 mr-2" />
          Log Your First Activity
        </Button>

        {/* Micro-commitment */}
        <p className="text-xs text-muted-foreground">
          Takes less than 30 seconds
        </p>
      </CardContent>
    </Card>
  );
}
