'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { FocusBlock, FocusBlockType } from '@/lib/focus/types';
import { getDefaultFocusConfig } from '@/lib/focus/defaults';
import type { GoalData } from '@/app/actions/goals';
import { saveFocusConfig, resetFocusConfig } from '@/app/actions/focus-config';
import { nanoid } from 'nanoid';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { AnimatePresence } from 'framer-motion';
import { SettingsSaveBar } from './settings-save-bar';
import { AddBlockSelector, SortableBlockCard } from './focus-block-editors';

// ---------------------------------------------------------------------------
// FocusSection — Completely Refactored
// ---------------------------------------------------------------------------

export function FocusSection({
  initialBlocks,
  goals,
}: {
  initialBlocks: FocusBlock[];
  goals: GoalData[];
}) {
  const [blocks, setBlocks] = useState<FocusBlock[]>(initialBlocks);
  const [lastSavedBlocks, setLastSavedBlocks] = useState<FocusBlock[]>(initialBlocks);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const hasChanges = JSON.stringify(blocks) !== JSON.stringify(lastSavedBlocks);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks(prev => {
      const oldIndex = prev.findIndex(b => b.id === active.id);
      const newIndex = prev.findIndex(b => b.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function addBlock(type: FocusBlockType) {
    const id = nanoid();
    let newBlock: FocusBlock;

    switch (type) {
      case 'breathing':
        newBlock = { id, type, config: { pattern: '4-7-8', cycles: 3 } };
        break;
      case 'affirmation':
        newBlock = {
          id,
          type,
          config: { texts: ['I am capable of achieving my goals.'], totalDuration: 60 },
        };
        break;
      case 'goal':
        newBlock = { id, type, config: { duration: 15 } };
        break;
    }

    setBlocks(prev => [...prev, newBlock]);
    setExpandedId(id);
  }

  function updateBlock(updated: FocusBlock) {
    setBlocks(prev => prev.map(b => (b.id === updated.id ? updated : b)));
  }

  function deleteBlock(id: string) {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  async function handleSave() {
    setIsSaving(true);
    const result = await saveFocusConfig(blocks);
    if (result.success) {
      setLastSavedBlocks(blocks);
      toast.success('Focus session saved');
    } else {
      toast.error(result.error ?? 'Failed to save');
    }
    setIsSaving(false);
  }

  async function handleReset() {
    setIsResetting(true);
    await resetFocusConfig();
    const defaults = getDefaultFocusConfig();
    setBlocks(defaults);
    setLastSavedBlocks(defaults);
    setExpandedId(null);
    toast.success('Reset to defaults');
    setIsResetting(false);
  }

  return (
    <div className="space-y-6">
      <SettingsSaveBar show={hasChanges} onSave={handleSave} isSaving={isSaving} />

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">Focus Sequence</h3>
          <p className="text-muted-foreground text-sm">
            End your day with intention. Drag to reorder your session blocks.
          </p>
        </div>
        <AddBlockSelector onSelect={addBlock} />
      </div>

      <div className="space-y-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        >
          <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
            <AnimatePresence mode="popLayout">
              {blocks.map(block => (
                <SortableBlockCard
                  key={block.id}
                  block={block}
                  goals={goals}
                  isExpanded={expandedId === block.id}
                  onToggleExpand={() =>
                    setExpandedId(prev => (prev === block.id ? null : block.id))
                  }
                  onDelete={() => deleteBlock(block.id)}
                  onUpdate={updateBlock}
                />
              ))}
            </AnimatePresence>
          </SortableContext>
        </DndContext>

        {blocks.length === 0 && (
          <div className="text-muted-foreground rounded-2xl border border-dashed py-12 text-center text-sm">
            No blocks in your sequence. Add one to get started.
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <p className="text-muted-foreground text-xs italic">
          Tip: Design a sequence that helps you transition from work to a state of calm focus.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="mr-2 h-3.5 w-3.5" />
              Reset Defaults
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset focus sequence?</AlertDialogTitle>
              <AlertDialogDescription>
                This will restore the original sequence. Your current customizations will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
