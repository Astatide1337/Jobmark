"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, FolderOpen, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Project Chip Selector
 * 
 * UI/UX Principles Applied:
 * 1. Fitts's Law: Large touch targets for easy selection
 * 2. Recognition over Recall: Visual color chips, not text-only
 * 3. Progressive Disclosure: Shows colors inline, details on expand
 * 4. Microinteractions: Smooth expand/collapse animation
 */

interface Project {
  id: string;
  name: string;
  color: string;
}

interface ProjectChipSelectorProps {
  projects: Project[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ProjectChipSelector({ 
  projects, 
  selectedId, 
  onSelect 
}: ProjectChipSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const selectedProject = projects.find(p => p.id === selectedId);

  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
          "bg-background/50 hover:bg-background/80",
          isExpanded 
            ? "border-primary/50 ring-2 ring-primary/20" 
            : "border-border/50 hover:border-border"
        )}
      >
        {selectedProject ? (
          <>
            <div 
              className="h-3 w-3 rounded-full" 
              style={{ backgroundColor: selectedProject.color }}
            />
            <span className="text-sm text-foreground">{selectedProject.name}</span>
          </>
        ) : (
          <>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">No project</span>
          </>
        )}
        <ChevronDown 
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isExpanded && "rotate-180"
          )} 
        />
      </button>

      {/* Expanded chip list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-0 mt-2 z-50 w-full min-w-[200px] p-2 rounded-lg border border-border/50 bg-card shadow-lg"
          >
            {/* No project option */}
            <ProjectChip
              name="No project"
              color=""
              isSelected={!selectedId}
              onClick={() => {
                onSelect("");
                setIsExpanded(false);
              }}
            />
            
            {/* Project options */}
            {projects.map((project) => (
              <ProjectChip
                key={project.id}
                name={project.name}
                color={project.color}
                isSelected={selectedId === project.id}
                onClick={() => {
                  onSelect(project.id);
                  setIsExpanded(false);
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop to close */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsExpanded(false)} 
        />
      )}
    </div>
  );
}

interface ProjectChipProps {
  name: string;
  color: string;
  isSelected: boolean;
  onClick: () => void;
}

function ProjectChip({ name, color, isSelected, onClick }: ProjectChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-all",
        isSelected 
          ? "bg-primary/10 text-foreground" 
          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
      )}
    >
      {color ? (
        <div 
          className="h-3 w-3 rounded-full shrink-0" 
          style={{ backgroundColor: color }}
        />
      ) : (
        <FolderOpen className="h-3 w-3 text-muted-foreground shrink-0" />
      )}
      <span className="text-sm flex-1 truncate">{name}</span>
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
        >
          <Check className="h-4 w-4 text-primary" />
        </motion.div>
      )}
    </button>
  );
}
