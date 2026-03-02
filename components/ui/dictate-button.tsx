/**
 * Dictation Status & Trigger Button
 *
 * Why: A specialized button that communicates the state of the
 * Web Speech API (Idle, Listening, or Polishing via AI).
 *
 * States:
 * - Idle: Ghostly Mic icon.
 * - Listening: Destructive Red with an active "Ping" animation.
 * - Polishing: Loading spinner representing the AI cleanup phase.
 */
'use client';

import React from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
      variant={isListening ? 'destructive' : 'ghost'}
      size="sm"
      className={cn(
        'h-9 rounded-xl px-3 transition-all duration-300',
        isListening
          ? 'animate-pulse border border-red-500/20 bg-red-500/10 text-red-500 shadow-lg shadow-red-500/5 hover:bg-red-500/20 hover:text-red-600'
          : 'text-muted-foreground hover:bg-muted/40 hover:text-primary active:scale-95',
        className
      )}
      onClick={onClick}
      disabled={disabled || isPolishing}
    >
      {isListening ? (
        <>
          <span className="relative mr-2 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
          </span>
          {showLabel && 'Stop'}
        </>
      ) : isPolishing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {showLabel && 'Polishing...'}
        </>
      ) : (
        <>
          <Mic className="mr-2 h-4 w-4" />
          {showLabel && 'Dictate'}
        </>
      )}
    </Button>
  );
}
