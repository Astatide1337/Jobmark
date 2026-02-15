
"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { improveText } from "@/app/actions/reports";
import { Loader2, Sparkles, X, Check, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUI } from "@/components/providers/ui-provider";

interface LiveEditorProps {
  value: string;
  onChange: (val: string) => void;
  isStreaming: boolean;
  className?: string; // Allow external styling
}

export function LiveEditor({ value, onChange, isStreaming, className }: LiveEditorProps) {
  const { uiV2 } = useUI();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightSpanRef = useRef<HTMLSpanElement>(null);

  const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(null);
  const [instruction, setInstruction] = useState("");
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
      const left = spanRect.left - containerRect.left + (spanRect.width / 2);

      setMenuPosition({ top, left });
    }
  };

  // Re-calculate position on resize or scroll
  useEffect(() => {
     const handleScroll = () => updateMenuPos();
     window.addEventListener("resize", updateMenuPos);
     scrollContainerRef.current?.addEventListener("scroll", handleScroll);
     
     return () => {
        window.removeEventListener("resize", updateMenuPos);
        scrollContainerRef.current?.removeEventListener("scroll", handleScroll);
     };
  }, [selection]);


  const handleImprove = async () => {
    if (!selection || !instruction) return;
    setIsImproving(true);

    try {
      const improved = await improveText(selection.text, instruction);
      if (improved) {
        const before = value.substring(0, selection.start);
        const after = value.substring(selection.end);
        
        const newValue = before + improved + after;
        onChange(newValue);
        
        setSelection(null);
        setInstruction("");
        setMenuPosition(null);
      }
    } catch (error) {
      console.error("Improvement failed", error);
    } finally {
      setIsImproving(false);
    }
  };

  // Construct the mirrored content
  const { before, selected, after } = useMemo(() => {
    if (!selection) return { before: value, selected: "", after: "" };
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
          "relative w-full h-[500px] bg-card/50 border border-border/50 rounded-lg font-sans text-base leading-relaxed group shadow-sm flex flex-col",
          uiV2 && "h-auto min-h-[400px]",
          className
        )}
    >    
        <div ref={scrollContainerRef} className={cn(
          "relative flex-1 w-full h-full overflow-y-auto overflow-x-hidden",
          uiV2 && "overflow-visible"
        )}>
             {/* Wrapper to ensure height matches content */}
             <div className="relative min-h-full">
                {/* 1. Backdrop Highlight Layer (Mirrors Textarea) - DRIVES HEIGHT */}
                <div 
                    aria-hidden="true"
                    className="relative p-6 pointer-events-none whitespace-pre-wrap break-words text-transparent"
                >
                {selection ? (
                    <>
                    {before}
                    <span 
                        ref={highlightSpanRef} 
                        className="bg-primary/20 text-transparent rounded-[2px] box-decoration-clone"
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
                onChange={(e) => onChange(e.target.value)}
                onSelect={handleSelect}
                className="absolute inset-0 w-full h-full p-6 bg-transparent resize-none focus:outline-none break-words text-foreground z-10 font-sans text-base leading-relaxed overflow-hidden"
                placeholder="Report will stream here..."
                spellCheck="false"
                />
            </div>
        </div>
        
        {isStreaming && (
            <div className="absolute bottom-4 right-4 z-20 pointer-events-none">
                <span className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
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
                transform: "translateX(-50%)" 
            }}
            className="absolute z-50 flex flex-col items-center origin-top"
        >
            {/* Arrow pointer */}
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-popover absolute -top-[6px] left-1/2 -translate-x-1/2 drop-shadow-sm" />

            <div className="bg-popover border border-border shadow-xl rounded-xl p-2 flex items-center gap-3 w-[380px] backdrop-blur-md">
                <div className="h-8 w-8 flex items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                    <Sparkles className="h-4 w-4" />
                </div>
                
                <Input
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Ask AI to edit this... (e.g. 'Shorten it')"
                className="h-9 border-none bg-transparent focus-visible:ring-0 px-2 text-sm shadow-none"
                onKeyDown={(e) => {
                    if (e.key === "Enter") handleImprove();
                }}
                autoFocus 
                />
                
                <div className="flex items-center gap-1 border-l border-border/50 pl-1 pr-1">
                    <Button 
                    size="icon" 
                    variant="ghost" 
                    className={cn("h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-lg transition-all active:scale-90", instruction && "text-primary")}
                    onClick={handleImprove}
                    disabled={!instruction || isImproving}
                    aria-label="Submit AI improvement"
                    >
                    {isImproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                    </Button>
                    <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition-all active:scale-90"
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
