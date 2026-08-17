/**
 * Dictation Status & Trigger Button
 *
 * Why: A specialized button that communicates the state of the
 * Web Speech API (Idle, Listening, or predictable text cleanup).
 *
 * States:
 * - Idle: Ghostly Mic icon.
 * - Listening: Destructive Red with an active "Ping" animation.
 * - Polishing: Loading spinner representing the cleanup phase.
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
        'h-9 rounded-xl px-3 transition-[color,background-color,border-color,box-shadow,opacity] duration-300',
        isListening
          ? 'border-destructive/20 bg-destructive/10 text-destructive-text shadow-destructive/5 hover:bg-destructive/20 hover:text-destructive-text animate-pulse border shadow-lg'
          : 'text-muted-foreground hover:bg-muted/40 hover:text-primary',
        className
      )}
      onClick={onClick}
      disabled={disabled || isPolishing}
    >
      {isListening && (
        <>
          <span className="relative mr-2 flex h-2 w-2">
            <span className="bg-destructive absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
            <span className="bg-destructive relative inline-flex h-2 w-2 rounded-full"></span>
          </span>
          {showLabel && 'Stop'}
        </>
      )}
      {!isListening && isPolishing && (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {showLabel && 'Cleaning up...'}
        </>
      )}
      {!isListening && !isPolishing && (
        <>
          <Mic className="mr-2 h-4 w-4" />
          {showLabel && 'Dictate'}
        </>
      )}
    </Button>
  );
}
