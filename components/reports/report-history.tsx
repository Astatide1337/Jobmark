"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Trash2, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteReport } from "@/app/actions/reports";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Report {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  metadata?: any;
}

interface ReportHistoryProps {
  initialReports: Report[];
}

export function ReportHistory({ initialReports }: ReportHistoryProps) {
  const [reports, setReports] = useState(initialReports);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent expand toggle
    if (!confirm("Are you sure you want to delete this report?")) return;

    setIsDeleting(id);
    try {
      await deleteReport(id);
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
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
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
                <div className="p-6 whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground/90">
                  {report.content}
                </div>
                <div className="p-2 flex justify-end bg-muted/40 border-t">
                   <Button 
                     variant="outline" 
                     size="sm" 
                     onClick={() => navigator.clipboard.writeText(report.content)}
                   >
                     Copy to Clipboard
                   </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
