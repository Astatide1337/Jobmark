'use client';

import type { Dispatch, SetStateAction } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Copy,
  Save,
  CheckCircle,
  Mail,
  Send,
  Download,
  FileText,
  File,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LiveEditor } from '@/components/reports/live-editor';
import { McpProviderMenu, type ConnectedMcpProvider } from '@/components/reports/mcp-draft-actions';
import { exportToPdf, exportToWord } from '@/lib/report-export';
import { copyTextToClipboard } from '@/lib/clipboard';
import { toast } from 'sonner';

interface ReportWizardEditorProps {
  reportContent: string;
  setReportContent: Dispatch<SetStateAction<string>>;
  isStreaming: boolean;
  isSaving: boolean;
  saved: boolean;
  onBack: () => void;
  onEmail: () => void;
  onGmail: () => void;
  onSave: () => void;
  connectedMcpProviders: ConnectedMcpProvider[];
  onDraftWithProvider: (provider: ConnectedMcpProvider) => void;
}

export function ReportWizardEditor({
  reportContent,
  setReportContent,
  isStreaming,
  isSaving,
  saved,
  onBack,
  onEmail,
  onGmail,
  onSave,
  connectedMcpProviders,
  onDraftWithProvider,
}: ReportWizardEditorProps) {
  return (
    <motion.div
      key="step4"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="h-full"
    >
      <div className="flex h-full w-full flex-col gap-6">
        <div className="flex shrink-0 items-center gap-2 pl-1">
          <Button variant="ghost" size="icon-sm" onClick={onBack} disabled={isStreaming}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            Review Draft
            {isStreaming && (
              <span className="text-muted-foreground animate-pulse text-xs font-normal">
                (Preparing...)
              </span>
            )}
          </h2>
        </div>

        <div className="border-border/50 bg-card/35 rounded-2xl border p-4">
          <p className="text-foreground text-sm font-medium">Where this is useful</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Use this draft for a weekly update, manager sync, self-review, or the first pass of a
            promotion narrative.
          </p>
        </div>

        <div className="flex min-h-0 flex-1 gap-8">
          <div className="flex h-full min-h-0 flex-1 flex-col">
            <div className="border-border/50 bg-card/30 flex flex-1 flex-col rounded-xl border shadow-xl">
              <LiveEditor
                value={reportContent}
                onChange={setReportContent}
                isStreaming={isStreaming}
                className="h-full flex-1"
              />
            </div>
          </div>

          <div className="flex w-64 shrink-0 flex-col gap-4 pt-4">
            <div className="text-muted-foreground px-1 text-xs font-bold tracking-widest uppercase">
              Actions
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border-muted-foreground/20 hover:border-muted-foreground/50 h-12 w-full justify-start rounded-xl hover:bg-transparent"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send via...
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[var(--radix-dropdown-menu-trigger-width)]"
              >
                <DropdownMenuItem onClick={onEmail} className="group cursor-pointer">
                  <Mail className="text-foreground group-focus:text-accent-foreground mr-2 h-4 w-4" />
                  <span className="group-focus:text-accent-foreground">Default Mail App</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onGmail} className="group cursor-pointer">
                  <span className="text-foreground group-focus:text-accent-foreground mr-2 text-lg font-bold">
                    M
                  </span>
                  <span className="group-focus:text-accent-foreground">Gmail</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border-muted-foreground/20 hover:border-muted-foreground/50 h-12 w-full justify-start rounded-xl hover:bg-transparent"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[var(--radix-dropdown-menu-trigger-width)]"
              >
                <DropdownMenuItem
                  onClick={() => exportToPdf(reportContent)}
                  className="group cursor-pointer"
                >
                  <File className="text-foreground group-focus:text-accent-foreground mr-2 h-4 w-4" />
                  <span className="group-focus:text-accent-foreground">Download as PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportToWord(reportContent)}
                  className="group cursor-pointer"
                >
                  <FileText className="text-foreground group-focus:text-accent-foreground mr-2 h-4 w-4" />
                  <span className="group-focus:text-accent-foreground">Download as Word</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              className="border-muted-foreground/20 hover:border-muted-foreground/50 h-12 w-full justify-start rounded-xl hover:bg-transparent"
              onClick={async () => {
                const copied = await copyTextToClipboard(reportContent);
                if (copied) toast.success('Copied to clipboard');
                else toast.error('Could not copy the draft');
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy draft
            </Button>
            <div className="h-4" />
            <Button
              className="h-12 w-full justify-start rounded-xl bg-[var(--accent-warm)] font-semibold text-black shadow-[var(--accent-warm)]/10 shadow-lg hover:bg-[var(--accent-warm-hover)]"
              onClick={onSave}
              disabled={isStreaming || isSaving || saved}
            >
              {saved ? <CheckCircle className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
              {saved ? 'Saved Draft' : 'Save Draft'}
            </Button>
            <McpProviderMenu
              connectedMcpProviders={connectedMcpProviders}
              onOpenProvider={onDraftWithProvider}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
