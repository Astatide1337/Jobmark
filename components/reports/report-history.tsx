"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Trash2, ChevronDown, ChevronUp, FileText, Download, File, Pencil, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToPdf, exportToWord } from "@/lib/report-export";
import { deleteReport, updateReport } from "@/app/actions/reports";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { LiveEditor } from "./live-editor";

interface Report {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  metadata?: any;
}

interface ReportHistoryProps {
  initialReports: Report[];
  onUpdate?: (id: string, content: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function ReportHistory({ initialReports, onUpdate, onDelete }: ReportHistoryProps) {
  const [reports, setReports] = useState(initialReports);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  // Edit mode state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Sync internal state if initialReports changes (e.g. from parent demo)
  useEffect(() => {
     setReports(initialReports);
  }, [initialReports]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent expand toggle
    if (!confirm("Are you sure you want to delete this report?")) return;

    setIsDeleting(id);
    try {
      if (onDelete) {
          await onDelete(id);
      } else {
          await deleteReport(id);
      }
      setReports(reports.filter(r => r.id !== id));
    } catch (error) {
      console.error("Failed to delete report:", error);
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
    setEditContent("");
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
      setReports(reports.map(r => 
        r.id === reportId ? { ...r, content: editContent } : r
      ));
      toast.success("Report saved!");
      setEditingId(null);
      setEditContent("");
    } catch (error) {
      console.error("Failed to save report:", error);
      toast.error("Failed to save report");
    } finally {
      setIsSaving(false);
    }
  };

  if (reports.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p>No saved reports yet.</p>
        <p className="text-sm">Generate one to see it here!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto py-8">
      {reports.map((report) => (
        <div 
          key={report.id} 
          className="border rounded-xl bg-card overflow-hidden transition-all hover:border-primary/50"
        >
          {/* Header / Summary */}
          <div 
            onClick={() => toggleExpand(report.id)}
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base">{report.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(report.createdAt), "MMM d, yyyy • h:mm a")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-destructive transition-colors"
                onClick={(e) => handleDelete(report.id, e)}
                disabled={isDeleting === report.id}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                {expandedId === report.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Expanded Content */}
          <AnimatePresence>
            {expandedId === report.id && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-muted/20 border-t"
              >
                {/* Content Area - Either Editor or Static View */}
                {editingId === report.id ? (
                  <div className="p-4">
                    <LiveEditor 
                      value={editContent}
                      onChange={setEditContent}
                      isStreaming={false}
                      className="min-h-[300px] rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="p-6 whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground/90">
                    {report.content}
                  </div>
                )}

                {/* Action Bar */}
                <div className="p-3 flex justify-between items-center bg-muted/40 border-t">
                   {editingId === report.id ? (
                     // Edit Mode Actions
                     <div className="flex gap-2">
                       <Button 
                         variant="outline" 
                         size="sm" 
                         onClick={cancelEdit}
                         disabled={isSaving}
                       >
                         <X className="mr-2 h-4 w-4" />
                         Cancel
                       </Button>
                        <Button 
                          size="sm" 
                          onClick={() => saveEdit(report.id)}
                          disabled={isSaving}
                          className="bg-primary text-primary-foreground"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                     </div>
                   ) : (
                     // View Mode Actions
                     <Button 
                       variant="outline" 
                       size="sm" 
                       onClick={() => startEdit(report)}
                     >
                       <Pencil className="mr-2 h-4 w-4" />
                       Edit
                     </Button>
                   )}

                   <div className="flex gap-2">
                     <DropdownMenu>
                       <DropdownMenuTrigger asChild>
                         <Button variant="outline" size="sm">
                           <Download className="mr-2 h-4 w-4" />
                           Export
                         </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent align="end">
                         <DropdownMenuItem onClick={async () => {
                            try {
                                toast.info("Generating PDF...");
                                const contentToExport = editingId === report.id ? editContent : report.content;
                                await exportToPdf(contentToExport, { filename: `${report.title}.pdf` });
                                toast.success("PDF Downloaded");
                            } catch (e) {
                                toast.error("Failed to generate PDF");
                            }
                         }} className="cursor-pointer">
                           <File className="mr-2 h-4 w-4" /> PDF
                         </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => {
                            try {
                                toast.info("Generating Word Doc...");
                                const contentToExport = editingId === report.id ? editContent : report.content;
                                exportToWord(contentToExport, { filename: `${report.title}.doc` });
                                toast.success("Word Doc Downloaded");
                            } catch (e) {
                                toast.error("Failed to generate Word Doc");
                            }
                         }} className="cursor-pointer">
                           <FileText className="mr-2 h-4 w-4" /> Word
                         </DropdownMenuItem>
                       </DropdownMenuContent>
                     </DropdownMenu>

                     <Button 
                       variant="outline" 
                       size="sm" 
                       onClick={() => {
                         const contentToCopy = editingId === report.id ? editContent : report.content;
                         navigator.clipboard.writeText(contentToCopy);
                         toast.success("Copied to clipboard!");
                       }}
                     >
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
