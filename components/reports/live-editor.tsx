'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { improveText } from '@/app/actions/reports';
import { Loader2, Sparkles, X, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useUI } from '@/components/providers/ui-provider';

interface LiveEditorProps {
  value: string;
  onChange: (val: string) => void;
  isStreaming: boolean;
  className?: string;
  onImprove?: (selection: string, instruction: string) => Promise<string>;
  placeholder?: string;
}

export function LiveEditor({
  value,
  onChange,
  isStreaming,
  className,
  onImprove,
  placeholder,
}: LiveEditorProps) {
  const { uiV2 } = useUI();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightSpanRef = useRef<HTMLSpanElement>(null);

  const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(
    null
  );
  const [instruction, setInstruction] = useState('');
  const [isImproving, setIsImproving] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  // Handle Selection
  const handleSelect = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (textarea.selectionStart !== textarea.selectionEnd) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = value.substring(start, end);

      setSelection({ start, end, text });
      requestAnimationFrame(updateMenuPos);
    } else {
      setSelection(null);
      setMenuPosition(null);
    }
  };

  const updateMenuPos = () => {
    if (highlightSpanRef.current && containerRef.current) {
      const spanRect = highlightSpanRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      // Calculate top relative to the viewport first, then adjust for container
      // However, since menu is inside AnimatePresence -> likely fixed or absolute relative to container
      // If we use fixed positioning for the menu (Portal), we use spanRect directly.
      // If we use absolute positioning inside the container, we need relative coords.

      const top = spanRect.bottom - containerRect.top;
      const left = spanRect.left - containerRect.left + spanRect.width / 2;

      setMenuPosition({ top, left });
    }
  };

  // Re-calculate position on resize or scroll
  useEffect(() => {
    const handleScroll = () => updateMenuPos();
    window.addEventListener('resize', updateMenuPos);
    scrollContainerRef.current?.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('resize', updateMenuPos);
      scrollContainerRef.current?.removeEventListener('scroll', handleScroll);
    };
  }, [selection]);

  const handleImprove = async () => {
    if (!selection || !instruction) return;
    setIsImproving(true);

    try {
      const improveFunc = onImprove ?? improveText;
      const improved = await improveFunc(selection.text, instruction);
      if (improved) {
        const before = value.substring(0, selection.start);
        const after = value.substring(selection.end);

        const newValue = before + improved + after;
        onChange(newValue);

        setSelection(null);
        setInstruction('');
        setMenuPosition(null);
      }
    } catch (error) {
      console.error('Improvement failed', error);
    } finally {
      setIsImproving(false);
    }
  };

  // Construct the mirrored content
  const { before, selected, after } = useMemo(() => {
    if (!selection) return { before: value, selected: '', after: '' };
    return {
      before: value.substring(0, selection.start),
      selected: value.substring(selection.start, selection.end),
      after: value.substring(selection.end),
    };
  }, [value, selection]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'bg-card/50 border-border/50 group relative flex h-[500px] w-full flex-col rounded-lg border font-sans text-base leading-relaxed shadow-sm',
        uiV2 && 'h-auto min-h-[400px]',
        className
      )}
    >
      <div
        ref={scrollContainerRef}
        className={cn(
          'relative h-full w-full flex-1 overflow-x-hidden overflow-y-auto',
          uiV2 && 'overflow-visible'
        )}
      >
        {/* Wrapper to ensure height matches content */}
        <div className="relative min-h-full">
          {/* 1. Backdrop Highlight Layer (Mirrors Textarea) - DRIVES HEIGHT */}
          <div
            aria-hidden="true"
            className="pointer-events-none relative p-6 break-words whitespace-pre-wrap text-transparent"
          >
            {selection ? (
              <>
                {before}
                <span
                  ref={highlightSpanRef}
                  className="bg-primary/20 rounded-[2px] box-decoration-clone text-transparent"
                >
                  {selected}
                </span>
                {after}
              </>
            ) : (
              value
            )}
            {/* Ensure last line break renders height */}
            <br />
          </div>

          {/* 2. Actual Textarea - ABSOLUTE OVERLAY MATCHING PARENT */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => onChange(e.target.value)}
            onSelect={handleSelect}
            className="text-foreground absolute inset-0 z-10 h-full w-full resize-none overflow-hidden bg-transparent p-6 font-sans text-base leading-relaxed break-words focus:outline-none"
            placeholder={placeholder ?? 'Content will stream here...'}
            spellCheck="false"
          />
        </div>
      </div>

      {isStreaming && (
        <div className="pointer-events-none absolute right-4 bottom-4 z-20">
          <span className="text-muted-foreground flex animate-pulse items-center gap-2 text-xs">
            <Loader2 className="h-3 w-3 animate-spin" /> Generating...
          </span>
        </div>
      )}

      {/* Floating Copilot Toolbar */}
      <AnimatePresence>
        {selection && menuPosition && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 16, scale: 1 }} // 16px below the selection
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              transform: 'translateX(-50%)',
            }}
            className="absolute z-50 flex origin-top flex-col items-center"
          >
            {/* Arrow pointer */}
            <div className="border-b-popover absolute -top-[6px] left-1/2 h-0 w-0 -translate-x-1/2 border-r-[6px] border-b-[6px] border-l-[6px] border-r-transparent border-l-transparent drop-shadow-sm" />

            <div className="bg-popover border-border flex w-[380px] items-center gap-3 rounded-xl border p-2 shadow-xl backdrop-blur-md">
              <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
                <Sparkles className="h-4 w-4" />
              </div>

              <Input
                value={instruction}
                onChange={e => setInstruction(e.target.value)}
                placeholder="Ask AI to edit this... (e.g. 'Shorten it')"
                className="h-9 border-none bg-transparent px-2 text-sm shadow-none focus-visible:ring-0"
                onKeyDown={e => {
                  if (e.key === 'Enter') handleImprove();
                }}
                autoFocus
              />

              <div className="border-border/50 flex items-center gap-1 border-l pr-1 pl-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn(
                    'hover:bg-primary/10 hover:text-primary h-8 w-8 rounded-lg transition-all active:scale-90',
                    instruction && 'text-primary'
                  )}
                  onClick={handleImprove}
                  disabled={!instruction || isImproving}
                  aria-label="Submit AI improvement"
                >
                  {isImproving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/40 h-8 w-8 rounded-lg transition-all active:scale-90"
                  onClick={() => {
                    setSelection(null);
                    setMenuPosition(null);
                  }}
                  aria-label="Cancel selection"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
