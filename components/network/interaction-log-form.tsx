"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import {
  Loader2,
  ChevronDown,
  Calendar as CalendarIcon,
  Mic,
  Square,
} from "lucide-react";
import { createInteraction } from "@/app/actions/network";
import { CHANNEL_OPTIONS } from "@/lib/network";
import { toast } from "sonner";
import { polishDictation } from "@/app/actions/dictation";
import { cn } from "@/lib/utils";

interface InteractionLogFormProps {
  contactId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function InteractionLogForm({
  contactId,
  onSuccess,
  onCancel,
}: InteractionLogFormProps) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showRawNotes, setShowRawNotes] = useState(false);

  // Dictation
  const [isListening, setIsListening] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [activeField, setActiveField] = useState<"summary" | "nextStep" | null>(
    null
  );
  type SpeechRecognitionResultLike = {
    transcript: string;
  };

  type SpeechRecognitionEventLike = {
    resultIndex: number;
    results: ArrayLike<ArrayLike<SpeechRecognitionResultLike> & { isFinal: boolean }>;
  };

  type SpeechRecognitionErrorEventLike = {
    error: string;
  };

  type SpeechRecognitionLike = {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
    onend: (() => void) | null;
  };

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // Form fields
  const [channel, setChannel] = useState("other");
  const [summary, setSummary] = useState("");
  const [occurredAt, setOccurredAt] = useState(today);
  const [nextStep, setNextStep] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [rawNotes, setRawNotes] = useState("");

  const [occurredPickerOpen, setOccurredPickerOpen] = useState(false);
  const [followUpPickerOpen, setFollowUpPickerOpen] = useState(false);

  const ymdToLocalDate = (ymd: string) => {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const todayLocalMidnight = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const getFieldValue = (field: "summary" | "nextStep") => {
    return field === "summary" ? summary : nextStep;
  };

  const setFieldValue = (field: "summary" | "nextStep", value: string) => {
    if (field === "summary") setSummary(value);
    else setNextStep(value);
  };

  const appendFinalTranscript = (
    field: "summary" | "nextStep",
    finalTranscript: string
  ) => {
    const chunk = finalTranscript.trim();
    if (!chunk) return;

    const apply = (prev: string) => {
      const needsSpace = prev.length > 0 && !prev.endsWith(" ");
      return prev + (needsSpace ? " " : "") + chunk;
    };

    if (field === "summary") setSummary(apply);
    else setNextStep(apply);
  };

  const startListening = (field: "summary" | "nextStep") => {
    const SpeechRecognition = (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error(
        "Voice dictation isn't supported in this browser (try Chrome/Edge)."
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        }
      }

      if (!finalTranscript) return;

      appendFinalTranscript(field, finalTranscript);
    };

    recognition.onerror = (event) => {
      if (event.error !== "no-speech") {
        console.error("Dictation error:", event.error);
        toast.error("Dictation error. Please try again.");
      }
      setIsListening(false);
      setActiveField(null);
    };

    recognition.onend = () => {
      setIsListening(false);
      setActiveField(null);
    };

    recognitionRef.current = recognition;
    setActiveField(field);
    setIsListening(true);
    recognition.start();
  };

  const stopListening = async (field: "summary" | "nextStep") => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // ignore
    }

    const current = getFieldValue(field);
    if (!current.trim()) return;

    setIsPolishing(true);
    try {
      const polished = await polishDictation(current);
      if (polished && polished.trim().length > 0) {
        setFieldValue(field, polished);
      }
    } catch (error) {
      console.error("Dictation polish error:", error);
    } finally {
      setIsPolishing(false);
    }
  };

  const toggleListening = async (field: "summary" | "nextStep") => {
    if (isLoading || isPolishing) return;

    if (isListening && activeField === field) {
      await stopListening(field);
      return;
    }

    if (isListening && activeField && activeField !== field) {
      await stopListening(activeField);
    }

    startListening(field);
  };

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop?.();
      } catch {
        // ignore
      }
    };
  }, []);

  const resetForm = () => {
    setChannel("other");
    setSummary("");
    setOccurredAt(today);
    setNextStep("");
    setFollowUpDate("");
    setRawNotes("");
    setErrors({});
    setShowRawNotes(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      const formData = new FormData();
      formData.append("contactId", contactId);
      formData.append("channel", channel);
      formData.append("summary", summary);
      formData.append("occurredAt", occurredAt);
      formData.append("nextStep", nextStep);
      formData.append("followUpDate", followUpDate);
      formData.append("rawNotes", rawNotes);

      const result = await createInteraction(
        { success: false, message: "" },
        formData
      );

      if (result.success) {
        toast.success("Interaction logged");
        resetForm();
        onSuccess?.();
      } else if (result.errors) {
        const mapped: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(result.errors)) {
          if (msgs && msgs.length > 0) {
            mapped[key] = msgs[0];
          }
        }
        setErrors(mapped);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Interaction log error:", error);
      toast.error("Failed to log interaction");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card/50 p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Channel */}
          <div className="space-y-2">
            <Label htmlFor="interaction-channel">Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger id="interaction-channel">
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                {CHANNEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.channel && (
              <p className="text-xs text-destructive">{errors.channel}</p>
            )}
          </div>

          {/* Occurred Date */}
          <div className="space-y-2">
            <Label htmlFor="interaction-occurredAt">Date</Label>
            <Popover open={occurredPickerOpen} onOpenChange={setOccurredPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {occurredAt
                    ? format(ymdToLocalDate(occurredAt), "LLL dd, yyyy")
                    : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={occurredAt ? ymdToLocalDate(occurredAt) : undefined}
                  onSelect={(date) => {
                    if (!date) return;
                    setOccurredAt(format(date, "yyyy-MM-dd"));
                    setOccurredPickerOpen(false);
                  }}
                  disabled={(date) => {
                    const d = new Date(date);
                    d.setHours(0, 0, 0, 0);
                    return d > todayLocalMidnight;
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.occurredAt && (
              <p className="text-xs text-destructive">{errors.occurredAt}</p>
            )}
          </div>
        </div>

        {/* Summary (required) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="interaction-summary">
              Summary <span className="text-destructive">*</span>
            </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "rounded-xl transition-all",
                  isListening && activeField === "summary"
                    ? "border-destructive text-destructive bg-destructive/5"
                    : ""
                )}
                onClick={() => toggleListening("summary")}
                disabled={isLoading || isPolishing}
              >
              {isListening && activeField === "summary" ? (
                <>
                  <Square className="h-4 w-4 mr-1" /> Stop
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-1" /> Dictate
                </>
              )}
            </Button>
          </div>
          <Textarea
            id="interaction-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="What did you discuss? Key takeaways..."
            className="resize-none h-20"
          />
          {errors.summary && (
            <p className="text-xs text-destructive">{errors.summary}</p>
          )}
        </div>

        {/* Next Step */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="interaction-nextStep">Next Step</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "rounded-xl transition-all",
                  isListening && activeField === "nextStep"
                    ? "border-destructive text-destructive bg-destructive/5"
                    : ""
                )}
                onClick={() => toggleListening("nextStep")}
                disabled={isLoading || isPolishing}
              >
              {isListening && activeField === "nextStep" ? (
                <>
                  <Square className="h-4 w-4 mr-1" /> Stop
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-1" /> Dictate
                </>
              )}
            </Button>
          </div>
          <Textarea
            id="interaction-nextStep"
            value={nextStep}
            onChange={(e) => setNextStep(e.target.value)}
            placeholder="Any follow-up actions..."
            className="resize-none h-16"
          />
          {errors.nextStep && (
            <p className="text-xs text-destructive">{errors.nextStep}</p>
          )}
        </div>

        {/* Follow-up Date */}
        <div className="space-y-2">
          <Label htmlFor="interaction-followUpDate">Follow-up Date</Label>
          <div className="flex items-center gap-2">
            <Popover open={followUpPickerOpen} onOpenChange={setFollowUpPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {followUpDate
                    ? format(ymdToLocalDate(followUpDate), "LLL dd, yyyy")
                    : "Pick a follow-up date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={followUpDate ? ymdToLocalDate(followUpDate) : undefined}
                  onSelect={(date) => {
                    if (!date) return;
                    setFollowUpDate(format(date, "yyyy-MM-dd"));
                    setFollowUpPickerOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {followUpDate && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => setFollowUpDate("")}
                disabled={isLoading || isPolishing}
              >
                Clear
              </Button>
            )}
          </div>
          {errors.followUpDate && (
            <p className="text-xs text-destructive">{errors.followUpDate}</p>
          )}
        </div>

        {/* Raw Notes (collapsible) */}
        <div>
          <button
            type="button"
            onClick={() => setShowRawNotes(!showRawNotes)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                showRawNotes ? "rotate-180" : ""
              }`}
            />
            Raw Notes
          </button>
          {showRawNotes && (
            <div className="mt-2 space-y-2">
              <Textarea
                id="interaction-rawNotes"
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
                placeholder="Paste meeting notes, email threads, etc."
                className="resize-none h-24"
              />
              {errors.rawNotes && (
                <p className="text-xs text-destructive">{errors.rawNotes}</p>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="rounded-xl">
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" disabled={isLoading} className="rounded-xl px-6">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Log Interaction
          </Button>
        </div>
      </form>
    </div>
  );
}
