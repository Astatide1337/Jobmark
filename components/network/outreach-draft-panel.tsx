"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { readStreamableValue } from "@ai-sdk/rsc";
import { toast } from "sonner";
import {
  Sparkles,
  Copy,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  OUTREACH_OBJECTIVES,
  OUTREACH_TONES,
  OUTREACH_CHANNELS,
} from "@/lib/network";
import {
  generateOutreachDraft,
  improveOutreachDraft,
} from "@/app/actions/network-ai";

interface Interaction {
  channel: string;
  summary: string;
  occurredAt: string | Date;
}

interface Contact {
  id: string;
  fullName: string;
  email?: string | null;
  relationship?: string | null;
  personalityTraits?: string | null;
  notes?: string | null;
}

interface OutreachDraftPanelProps {
  contact: Contact;
  interactions: Interaction[];
}

export function OutreachDraftPanel({
  ...props
}: OutreachDraftPanelProps) {
  const { contact } = props;
  const [objective, setObjective] = useState<string>(OUTREACH_OBJECTIVES[0].value);
  const [tone, setTone] = useState<string>(OUTREACH_TONES[0].value);
  const [channel, setChannel] = useState<string>(OUTREACH_CHANNELS[0].value);
  const [extraContext, setExtraContext] = useState("");
  const [draft, setDraft] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectionRect, setSelectionRect] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Track text selection inside the draft output
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !outputRef.current) {
      setSelectedText("");
      setSelectionRect(null);
      return;
    }

    const text = selection.toString().trim();
    if (!text) {
      setSelectedText("");
      setSelectionRect(null);
      return;
    }

    // Make sure the selection is inside the output area
    if (!outputRef.current.contains(selection.anchorNode)) {
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = outputRef.current.getBoundingClientRect();

    setSelectedText(text);
    setSelectionRect({
      top: rect.top - containerRect.top - 36,
      left: rect.left - containerRect.left + rect.width / 2,
    });
  }, []);

  // Clear selection rect when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        outputRef.current &&
        !outputRef.current.contains(e.target as Node)
      ) {
        setSelectedText("");
        setSelectionRect(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setDraft("");
    try {
      const { output } = await generateOutreachDraft({
        contactId: contact.id,
        objective,
        tone,
        channel,
        extraContext: extraContext.trim() || undefined,
      });

      for await (const chunk of readStreamableValue(output)) {
        if (chunk) {
          setDraft((prev) => prev + chunk);
        }
      }
    } catch (err) {
      console.error("Failed to generate draft:", err);
      toast.error("Failed to generate draft. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      toast.success("Draft copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleOpenInEmail = () => {
    // Extract subject from draft if present (first line starting with "Subject:")
    let subject = `Reaching out to ${contact.fullName}`;
    let body = draft;

    const subjectMatch = draft.match(/^Subject:\s*(.+)$/m);
    if (subjectMatch) {
      subject = subjectMatch[1].trim();
      body = draft.replace(/^Subject:\s*.+\n?/m, "").trim();
    }

    if (channel === "email") {
      const mailto = `mailto:${contact.email ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailto, "_blank");
    } else {
      // Gmail compose fallback
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contact.email ?? "")}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(gmailUrl, "_blank");
    }
  };

  const handleImproveSelection = async () => {
    if (!selectedText) return;
    setIsImproving(true);
    try {
      const improved = await improveOutreachDraft(
        selectedText,
        "Improve this text to be more effective and natural-sounding"
      );
      setDraft((prev) => prev.replace(selectedText, improved));
      setSelectedText("");
      setSelectionRect(null);
      toast.success("Selection improved");
    } catch {
      toast.error("Failed to improve selection");
    } finally {
      setIsImproving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" />
          Generate Outreach Draft
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Objective</Label>
            <Select value={objective} onValueChange={setObjective}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTREACH_OBJECTIVES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTREACH_TONES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTREACH_CHANNELS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Additional Context (optional)</Label>
          <Textarea
            value={extraContext}
            onChange={(e) => setExtraContext(e.target.value)}
            placeholder="e.g. I recently saw they got promoted, mention the conference we both attended..."
            rows={2}
          />
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Draft
            </>
          )}
        </Button>

        {/* Draft output */}
        {draft && (
          <div className="space-y-3">
            <Card className="relative bg-muted/50">
              <CardContent className="p-4">
                <div
                  ref={outputRef}
                  className="relative whitespace-pre-wrap text-sm leading-relaxed"
                  onMouseUp={handleMouseUp}
                >
                  {draft}

                  {/* Floating improve button on selection */}
                  {selectionRect && selectedText && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute z-10 shadow-md text-xs"
                      style={{
                        top: `${selectionRect.top}px`,
                        left: `${selectionRect.left}px`,
                        transform: "translateX(-50%)",
                      }}
                      onClick={handleImproveSelection}
                      disabled={isImproving}
                    >
                      {isImproving ? (
                        <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="mr-1 h-3 w-3" />
                      )}
                      Improve
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyToClipboard}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy to Clipboard
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInEmail}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {channel === "email" ? "Open in Email" : "Open in Gmail"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
