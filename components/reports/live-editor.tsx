/**
 * Saved-draft editor.
 *
 * The editor stays manual by default. Selecting text exposes a few small,
 * predictable formatting actions that run locally; it does not pretend to be
 * an AI editor or send the selected text to a model service. Richer writing
 * help is available through the connected AI-app actions beside the editor.
 */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { List, ListChecks, ListOrdered, Loader2, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useUI } from '@/components/providers/ui-provider';
import { applyQuickEdit, type QuickEditAction } from '@/lib/deterministic-drafts';

interface LiveEditorProps {
  value: string;
  onChange: (val: string) => void;
  isStreaming: boolean;
  className?: string;
  placeholder?: string;
  enableQuickEdit?: boolean;
}

const quickEditActions: Array<{
  action: QuickEditAction;
  label: string;
  icon: typeof List;
}> = [
  { action: 'bullets', label: 'Bullets', icon: List },
  { action: 'numbered', label: 'Numbered list', icon: ListOrdered },
  { action: 'checklist', label: 'Checklist', icon: ListChecks },
];

export function LiveEditor({
  value,
  onChange,
  isStreaming,
  className,
  placeholder,
  enableQuickEdit = false,
}: LiveEditorProps) {
  const { uiV2 } = useUI();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightSpanRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(
    null
  );
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [editHistory, setEditHistory] = useState<string[]>([]);

  const closeQuickEditMenu = (restoreFocus = false, caretPosition?: number) => {
    setSelection(null);
    setMenuPosition(null);
    if (restoreFocus) {
      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.focus();
        if (caretPosition !== undefined) textarea.setSelectionRange(caretPosition, caretPosition);
      });
    }
  };

  const updateMenuPos = () => {
    if (highlightSpanRef.current) {
      const spanRect = highlightSpanRef.current.getBoundingClientRect();
      const menuRect = menuRef.current?.getBoundingClientRect();
      const menuWidth = menuRect?.width ?? 360;
      const menuHeight = menuRect?.height ?? 48;
      const selectionCenter = spanRect.left + spanRect.width / 2;
      const minLeft = menuWidth / 2 + 8;
      const maxLeft = Math.max(minLeft, window.innerWidth - menuWidth / 2 - 8);
      const belowTop = spanRect.bottom + 8;
      const aboveTop = spanRect.top - menuHeight - 8;
      const preferredTop =
        belowTop + menuHeight <= window.innerHeight - 8 || aboveTop < 8 ? belowTop : aboveTop;
      const top = Math.max(8, Math.min(preferredTop, window.innerHeight - menuHeight - 8));
      const nextPosition = {
        top,
        left: Math.max(minLeft, Math.min(maxLeft, selectionCenter)),
      };
      setMenuPosition(previous =>
        previous && previous.top === nextPosition.top && previous.left === nextPosition.left
          ? previous
          : nextPosition
      );
    }
  };

  const handleSelect = () => {
    if (!enableQuickEdit) return;
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (textarea.selectionStart !== textarea.selectionEnd) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      setSelection({ start, end, text: value.substring(start, end) });
      requestAnimationFrame(updateMenuPos);
    } else {
      setSelection(null);
      setMenuPosition(null);
    }
  };

  useEffect(() => {
    const handleScroll = () => updateMenuPos();
    const scrollContainer = scrollContainerRef.current;
    window.addEventListener('resize', updateMenuPos);
    scrollContainer?.addEventListener('scroll', handleScroll);
    if (selection) requestAnimationFrame(updateMenuPos);

    return () => {
      window.removeEventListener('resize', updateMenuPos);
      scrollContainer?.removeEventListener('scroll', handleScroll);
    };
  }, [selection, menuPosition]);

  const handleTextChange = (nextValue: string) => {
    // A manual edit makes an older quick-edit undo unsafe, so only keep an
    // undo point while the user is working from the same editor state.
    setEditHistory([]);
    setSelection(null);
    setMenuPosition(null);
    onChange(nextValue);
  };

  const handleQuickEdit = (action: QuickEditAction) => {
    if (!selection || isStreaming) return;
    if (value.slice(selection.start, selection.end) !== selection.text) {
      closeQuickEditMenu(true);
      return;
    }

    const editedText = applyQuickEdit(selection.text, action);
    if (!editedText || editedText === selection.text) return;

    setEditHistory(history => [...history, value]);
    onChange(value.substring(0, selection.start) + editedText + value.substring(selection.end));
    closeQuickEditMenu(true, selection.start + editedText.length);
  };

  const handleUndo = () => {
    if (editHistory.length === 0) return;
    const previousValue = editHistory[editHistory.length - 1];
    setEditHistory(history => history.slice(0, -1));
    onChange(previousValue);
    closeQuickEditMenu(true);
  };

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
        <div className="relative min-h-full">
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
            <br />
          </div>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => handleTextChange(e.target.value)}
            onSelect={enableQuickEdit ? handleSelect : undefined}
            // Some browsers do not dispatch React's normalized `select` event
            // consistently for a controlled textarea. The end-of-selection
            // events keep the formatting menu reliable for both mouse and
            // keyboard selection without changing the editor's value.
            onMouseUp={enableQuickEdit ? handleSelect : undefined}
            onKeyUp={enableQuickEdit ? handleSelect : undefined}
            onKeyDown={e => {
              if (e.key === 'Escape' && selection) {
                e.preventDefault();
                closeQuickEditMenu();
              }
            }}
            className="text-foreground absolute inset-0 z-10 h-full w-full resize-none overflow-hidden bg-transparent p-6 font-sans text-base leading-relaxed break-words focus:outline-none"
            placeholder={placeholder ?? 'Content will appear here...'}
            spellCheck="false"
          />
        </div>
      </div>

      {isStreaming && (
        <div className="pointer-events-none absolute right-4 bottom-4 z-20">
          <span className="text-muted-foreground flex animate-pulse items-center gap-2 text-xs">
            <Loader2 className="h-3 w-3 animate-spin" /> Preparing…
          </span>
        </div>
      )}

      {editHistory.length > 0 && !isStreaming && (
        <div className="bg-background/90 border-border/50 text-muted-foreground absolute right-4 bottom-4 z-20 flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs shadow-sm backdrop-blur-sm">
          <span>Quick edit applied</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-foreground hover:text-primary h-7 px-2"
            onClick={handleUndo}
          >
            <Undo2 className="mr-1 h-3.5 w-3.5" />
            Undo
          </Button>
        </div>
      )}

      {enableQuickEdit && selection && menuPosition && typeof document !== 'undefined'
        ? createPortal(
            <motion.div
              key="quick-edit-menu"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              style={{
                position: 'fixed',
                top: menuPosition.top,
                left: menuPosition.left,
                translate: '-50% 0',
              }}
              className="fixed z-[100] flex origin-top flex-col items-center"
            >
              <div className="border-b-popover absolute -top-[6px] left-1/2 h-0 w-0 -translate-x-1/2 border-r-[6px] border-b-[6px] border-l-[6px] border-r-transparent border-l-transparent drop-shadow-sm" />
              <div
                ref={menuRef}
                className="bg-popover border-border flex max-w-[calc(100vw-2rem)] items-center gap-1 rounded-xl border p-1.5 shadow-xl backdrop-blur-md"
                role="toolbar"
                aria-label="Quick edits"
              >
                <span className="text-muted-foreground px-2 text-xs font-medium">Format</span>
                {quickEditActions.map(({ action, label, icon: Icon }) => (
                  <Button
                    key={action}
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1.5 rounded-lg px-2 text-xs"
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => handleQuickEdit(action)}
                    disabled={isStreaming}
                    aria-label={`Toggle ${label.toLowerCase()} for selected text`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </Button>
                ))}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground h-8 w-8 rounded-lg"
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => {
                    closeQuickEditMenu(true);
                  }}
                  aria-label="Close quick edit menu"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>,
            document.body
          )
        : null}
    </div>
  );
}
