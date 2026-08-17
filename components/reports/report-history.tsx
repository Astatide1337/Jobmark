/**
 * Report History & Management
 *
 * Why: Provides a repository of past performance reviews and summaries.
 * Users can revisit, edit, or re-export historical data at any time.
 *
 * Key Pattern: Uses a collapsible list to keep the interface clean while
 * allowing deep-dives into specific report contents via the saved-draft
 * editor.
 */
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { format } from 'date-fns';
import {
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  File,
  Pencil,
  X,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToPdf, exportToWord } from '@/lib/report-export';
import { deleteReport, updateReport } from '@/app/actions/reports';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { LiveEditor } from './live-editor';
import { copyTextToClipboard } from '@/lib/clipboard';
import {
  McpProviderMenu,
  getMcpProviderLaunchUrl,
  providerSupportsPromptUrl,
  type ConnectedMcpProvider,
} from './mcp-draft-actions';
import { buildSavedDraftAssistantInstructions } from '@/lib/assistant-instructions';

interface Report {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
}

interface ReportHistoryProps {
  initialReports: Report[];
  onUpdate?: (id: string, content: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  connectedMcpProviders?: ConnectedMcpProvider[];
  displayTimeZone?: string;
}

export function ReportHistory({
  initialReports,
  onUpdate,
  onDelete,
  connectedMcpProviders = [],
  displayTimeZone,
}: ReportHistoryProps) {
  const [reports, setReports] = useState(initialReports);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Edit mode state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent expand toggle
    if (!confirm('Delete this review draft?')) return;

    setIsDeleting(id);
    try {
      if (onDelete) {
        await onDelete(id);
      } else {
        await deleteReport(id);
      }
      setReports(reports.filter(r => r.id !== id));
    } catch (error) {
      console.error('Failed to delete draft:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Edit mode handlers
  const startEdit = (report: Report) => {
    setEditingId(report.id);
    setEditContent(report.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const saveEdit = async (reportId: string) => {
    setIsSaving(true);
    try {
      if (onUpdate) {
        await onUpdate(reportId, editContent);
      } else {
        await updateReport(reportId, editContent);
      }

      // Update local state
      setReports(reports.map(r => (r.id === reportId ? { ...r, content: editContent } : r)));
      toast.success('Draft saved.');
      setEditingId(null);
      setEditContent('');
    } catch (error) {
      console.error('Failed to save draft:', error);
      toast.error('Could not save the draft.');
    } finally {
      setIsSaving(false);
    }
  };

  const openDraftWithProvider = async (provider: ConnectedMcpProvider, content: string) => {
    const prompt = buildSavedDraftAssistantInstructions('review', content);
    const launchPrompt = prompt.length <= 2_000 ? prompt : undefined;
    const providerUrl = getMcpProviderLaunchUrl(provider.key, launchPrompt);
    const copyPromise = copyTextToClipboard(prompt);
    if (providerUrl) window.open(providerUrl, '_blank', 'noopener,noreferrer');

    try {
      const copied = await copyPromise;
      if (!copied) throw new Error('clipboard_unavailable');
      toast.success(`${provider.name} instructions copied.`, {
        description:
          launchPrompt && providerSupportsPromptUrl(provider.key)
            ? `Open ${provider.name} to continue your review.`
            : `Open ${provider.name} and paste the instructions to continue.`,
      });
    } catch {
      toast.error('Could not copy the instructions.');
    }
  };

  if (reports.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        <FileText className="mx-auto mb-4 h-12 w-12 opacity-20" />
        <p className="text-foreground text-sm font-medium">No review drafts yet.</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Make a review draft when you need to explain your work.
        </p>
        <Button variant="link" size="sm" asChild className="mt-3">
          <Link href="/reports?tab=new">Make your first review draft</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 py-8">
      {reports.map(report => (
        <div
          key={report.id}
          className="bg-card hover:border-primary/50 overflow-hidden rounded-xl border transition-[border-color]"
        >
          {/* Header / Summary */}
          <div className="flex items-center justify-between gap-3 p-4">
            <button
              type="button"
              onClick={() => toggleExpand(report.id)}
              aria-expanded={expandedId === report.id}
              aria-controls={`report-${report.id}-content`}
              className="hover:bg-muted/30 flex min-w-0 flex-1 items-center gap-4 rounded-lg text-left"
            >
              <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold">{report.title}</h3>
                <p className="text-muted-foreground text-xs" suppressHydrationWarning>
                  {formatReportDate(report.createdAt, displayTimeZone)}
                </p>
                <p className="text-muted-foreground/80 mt-1 text-xs">
                  Open it, edit it, export it, or use it for your next review.
                </p>
              </div>
            </button>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive transition-colors"
                aria-label={`Delete ${report.title}`}
                onClick={e => handleDelete(report.id, e)}
                disabled={isDeleting === report.id}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${expandedId === report.id ? 'Collapse' : 'Expand'} ${report.title}`}
                aria-expanded={expandedId === report.id}
                aria-controls={`report-${report.id}-content`}
                onClick={() => toggleExpand(report.id)}
              >
                {expandedId === report.id ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Expanded Content */}
          <AnimatePresence>
            {expandedId === report.id && (
              <motion.div
                id={`report-${report.id}-content`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-muted/20 overflow-hidden border-t"
              >
                {/* Content Area - Either Editor or Static View */}
                {editingId === report.id ? (
                  <div className="p-4">
                    <LiveEditor
                      value={editContent}
                      onChange={setEditContent}
                      isStreaming={false}
                      enableQuickEdit
                      className="min-h-[300px] rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="text-foreground/90 p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                    {report.content}
                  </div>
                )}

                {/* Action Bar */}
                <div className="bg-muted/40 flex flex-col gap-3 border-t p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  {editingId === report.id ? (
                    // Edit Mode Actions
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={cancelEdit} disabled={isSaving}>
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    // View Mode Actions
                    <Button variant="outline" size="sm" onClick={() => startEdit(report)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  )}

                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <McpProviderMenu
                      connectedMcpProviders={connectedMcpProviders}
                      onOpenProvider={provider =>
                        openDraftWithProvider(
                          provider,
                          editingId === report.id ? editContent : report.content
                        )
                      }
                      className="h-9 w-auto shrink-0"
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Download className="mr-2 h-4 w-4" />
                          Export
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={async () => {
                            try {
                              toast.info('Creating the PDF...');
                              const contentToExport =
                                editingId === report.id ? editContent : report.content;
                              await exportToPdf(contentToExport, {
                                filename: `${report.title}.pdf`,
                              });
                              toast.success('PDF downloaded.');
                            } catch (e) {
                              toast.error('Could not create the PDF.');
                            }
                          }}
                          className="cursor-pointer"
                        >
                          <File className="mr-2 h-4 w-4" /> PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            try {
                              toast.info('Creating the Word document...');
                              const contentToExport =
                                editingId === report.id ? editContent : report.content;
                              exportToWord(contentToExport, { filename: `${report.title}.doc` });
                              toast.success('Word document downloaded.');
                            } catch (e) {
                              toast.error('Could not create the Word document.');
                            }
                          }}
                          className="cursor-pointer"
                        >
                          <FileText className="mr-2 h-4 w-4" /> Word document
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const contentToCopy =
                          editingId === report.id ? editContent : report.content;
                        const copied = await copyTextToClipboard(contentToCopy);
                        if (copied) toast.success('Draft copied.');
                        else toast.error('Could not copy the draft.');
                      }}
                    >
                      Copy draft
                    </Button>
                    {editingId === report.id && (
                      <Button
                        size="sm"
                        onClick={() => saveEdit(report.id)}
                        disabled={isSaving}
                        className="bg-primary text-primary-foreground"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {isSaving ? 'Saving...' : 'Save changes'}
                      </Button>
                    )}
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

function formatReportDate(value: Date, timeZone?: string): string {
  if (!timeZone) return format(new Date(value), 'MMM d, yyyy • h:mm a');

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(part => part.type === type)?.value ?? '';

  return `${get('month')} ${get('day')}, ${get('year')} • ${get('hour')}:${get('minute')} ${get('dayPeriod')}`;
}
