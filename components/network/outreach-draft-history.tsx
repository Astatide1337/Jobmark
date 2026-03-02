'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, Trash2, ChevronDown, ChevronUp, Download, Copy } from 'lucide-react';
import {
  deleteOutreachDraft,
  updateOutreachDraft,
  improveOutreachDraft,
} from '@/app/actions/network-ai';
import { exportToPdf, exportToWord } from '@/lib/report-export';
import { LiveEditor } from '@/components/reports/live-editor';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface OutreachDraft {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
}

interface OutreachDraftHistoryProps {
  initialDrafts: OutreachDraft[];
}

export function OutreachDraftHistory({ initialDrafts }: OutreachDraftHistoryProps) {
  const [drafts, setDrafts] = useState<OutreachDraft[]>(initialDrafts);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync internal state if initialDrafts changes (during render phase to avoid cascading effects)
  const [prevInitialDrafts, setPrevInitialDrafts] = useState(initialDrafts);
  if (initialDrafts !== prevInitialDrafts) {
    setDrafts(initialDrafts);
    setPrevInitialDrafts(initialDrafts);
  }

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
    if (editingId && editingId !== id) {
      setEditingId(null);
      setEditContent('');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this draft?')) return;
    setIsDeleting(id);
    try {
      await deleteOutreachDraft(id);
      setDrafts(prev => prev.filter(d => d.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch {
      toast.error('Failed to delete draft.');
    } finally {
      setIsDeleting(null);
    }
  };

  const startEdit = (draft: OutreachDraft) => {
    setEditingId(draft.id);
    setEditContent(draft.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const saveEdit = async (draftId: string) => {
    setIsSaving(true);
    try {
      await updateOutreachDraft(draftId, editContent);
      setDrafts(prev => prev.map(d => (d.id === draftId ? { ...d, content: editContent } : d)));
      setEditingId(null);
      setEditContent('');
      toast.success('Draft saved!');
    } catch {
      toast.error('Failed to save draft.');
    } finally {
      setIsSaving(false);
    }
  };

  if (drafts.length === 0) {
    return (
      <div className="py-10 text-center">
        <FileText className="mx-auto mb-4 h-12 w-12 opacity-20" />
        <p className="text-muted-foreground text-sm">No saved drafts yet.</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Generate a draft and hit &ldquo;Save to History&rdquo; to keep it here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {drafts.map(draft => (
        <div
          key={draft.id}
          className="border-border/50 bg-card hover:border-primary/50 overflow-hidden rounded-xl border transition-colors"
        >
          {/* Header */}
          <div
            className="flex cursor-pointer items-center justify-between p-4"
            onClick={() => toggleExpand(draft.id)}
          >
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <FileText className="text-primary h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{draft.title}</h3>
                <p className="text-muted-foreground text-xs">
                  {format(new Date(draft.createdAt), 'MMM d, yyyy · h:mm a')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive h-8 w-8"
                onClick={e => handleDelete(draft.id, e)}
                disabled={isDeleting === draft.id}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={e => {
                  e.stopPropagation();
                  toggleExpand(draft.id);
                }}
              >
                {expandedId === draft.id ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Expanded body */}
          <AnimatePresence>
            {expandedId === draft.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-muted/20 border-t"
              >
                {editingId === draft.id ? (
                  <div className="p-4">
                    <LiveEditor
                      value={editContent}
                      onChange={setEditContent}
                      isStreaming={false}
                      onImprove={improveOutreachDraft}
                      className="min-h-[300px] rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="text-foreground/90 p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                    {draft.content}
                  </div>
                )}

                {/* Action bar */}
                <div className="bg-muted/40 flex items-center justify-between border-t p-3">
                  <div className="flex items-center gap-2">
                    {editingId === draft.id ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={cancelEdit}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveEdit(draft.id)}
                          disabled={isSaving}
                          className="rounded-lg"
                        >
                          Save Changes
                        </Button>
                      </>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => startEdit(draft)}>
                        Edit
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Download className="mr-1 h-4 w-4" />
                          Export
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            exportToPdf(draft.content, { filename: `${draft.title}.pdf` })
                          }
                        >
                          Download as PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            exportToWord(draft.content, { filename: `${draft.title}.doc` })
                          }
                        >
                          Download as Word
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(draft.content);
                        toast.success('Copied to clipboard!');
                      }}
                    >
                      <Copy className="mr-1 h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
