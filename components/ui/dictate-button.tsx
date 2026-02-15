"use client";

import React from "react";
import { Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DictateButtonProps {
  isListening: boolean;
  isPolishing?: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  showLabel?: boolean;
}

export function DictateButton({
  isListening,
  isPolishing,
  onClick,
  disabled,
  className,
  showLabel = true,
}: DictateButtonProps) {
  return (
    <Button
      type="button"
      variant={isListening ? "destructive" : "ghost"}
      size="sm"
      className={cn(
        "h-9 px-3 transition-all duration-300 rounded-xl",
        isListening
          ? "animate-pulse bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-600 border border-red-500/20 shadow-lg shadow-red-500/5"
          : "text-muted-foreground hover:bg-muted/40 hover:text-primary active:scale-95",
        className
      )}
      onClick={onClick}
      disabled={disabled || isPolishing}
    >
      {isListening ? (
        <>
          <span className="relative flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          {showLabel && "Stop"}
        </>
      ) : isPolishing ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {showLabel && "Polishing..."}
        </>
      ) : (
        <>
          <Mic className="h-4 w-4 mr-2" />
          {showLabel && "Dictate"}
        </>
      )}
    </Button>
  );
}
