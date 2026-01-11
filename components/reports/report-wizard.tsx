"use client";

import { useState, useEffect } from "react";
import { ReportConfig, streamReport, saveReportToHistory, checkActivityCount } from "@/app/actions/reports";
import { readStreamableValue } from "ai/rsc";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LiveEditor } from "./live-editor";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronLeft, Sparkles, Save, CheckCircle, AlertCircle, Mail, Send } from "lucide-react";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
}

interface ReportWizardProps {
  projects: Project[];
}

export function ReportWizard({ projects }: ReportWizardProps) {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<ReportConfig>({
    dateRange: "7d",
    projectId: undefined, // All projects
    tone: "professional",
  });
  
  // Custom date selection state
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [validationError, setValidationError] = useState<string | null>(null);

  const [reportContent, setReportContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  // New Validation Logic
  // When dateRange or config changes, we validate the count to ensure "Next" is only enabled when valid.
  const [hasValidActivities, setHasValidActivities] = useState(true); // default true to avoid flicker on load
  const [isValidating, setIsValidating] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  // Re-validate when dateRange or presets change
  useEffect(() => {
    // Only validate if we are in Step 1
    if (step !== 1) return;

    const validate = async () => {
        setIsValidating(true);
        setValidationMessage(null);
        
        try {
             // Prepare temp config for check
            const tempConfig = { ...config };
            if (config.dateRange === "custom") {
                // Wait until both dates are set
                if (!dateRange?.from || !dateRange?.to) {
                     setIsValidating(false);
                     setHasValidActivities(false);
                     return;
                }
                
                tempConfig.customStartDate = dateRange.from;
                tempConfig.customEndDate = dateRange.to || dateRange.from;
            }

            const result = await checkActivityCount(tempConfig);
            const isValid = result.count > 0;
            setHasValidActivities(isValid);
            if (!isValid) setValidationMessage("No activities found in this range.");
        } catch (e) {
            console.error(e);
        } finally {
            setIsValidating(false);
        }
    };
    
    // Debounce slightly to avoid rapid checks
    const timer = setTimeout(validate, 300);
    return () => clearTimeout(timer);
  }, [config.dateRange, dateRange, step, config.projectId]);

  const handleNextStep = () => {
    if (hasValidActivities && !isValidating) {
        nextStep();
    }
  };

  const startGeneration = async () => {
    nextStep(); // Go to step 4
    setIsStreaming(true);
    setReportContent("");

    try {
      // Finalize config with custom dates if selected
      const finalConfig = { ...config };
      if (config.dateRange === "custom" && dateRange?.from) {
        finalConfig.customStartDate = dateRange.from;
        finalConfig.customEndDate = dateRange.to || dateRange.from;
      }

      const { output } = await streamReport(finalConfig);
      
      for await (const delta of readStreamableValue(output)) {
        setReportContent((current) => current + delta);
      }
    } catch (error) {
      console.error("Streaming error", error);
      setReportContent("Error generating report. Please try again.");
    } finally {
      setIsStreaming(false);
    }
  };

  // Helper to convert markdown to nice plain text for email
  const getCleanEmailBody = () => {
     let text = reportContent;
     // Remove bold/italic markers
     text = text.replace(/\*\*(.*?)\*\*/g, "$1");
     text = text.replace(/\*(.*?)\*/g, "$1");
     text = text.replace(/__(.*?)__/g, "$1");
     text = text.replace(/_(.*?)_/g, "$1");
     // Remove header hashes but maybe keep newline spacing
     text = text.replace(/^#+\s+(.*)$/gm, "$1");
     // Remove link formatting [text](url) -> text (url)
     text = text.replace(/\[(.*?)\]\((.*?)\)/g, "$1 ($2)");
     return text;
  };

  const handleEmail = () => {
    const subject = `Work Report - ${format(new Date(), "MMM dd, yyyy")}`;
    const body = getCleanEmailBody();
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  const handleGmail = () => {
    const subject = `Work Report - ${format(new Date(), "MMM dd, yyyy")}`;
    const body = getCleanEmailBody();
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
  };

  const handleSave = async () => {
    setIsSaving(true);
    await saveReportToHistory(reportContent, config);
    setIsSaving(false);
    setSaved(true);
    // Maybe redirect or show success
    setTimeout(() => setSaved(false), 3000);
  };

  // Animation variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 50 : -50,
      opacity: 0,
    }),
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Progress Indicator */}
      {step < 4 && (
        <div className="flex justify-between items-center mb-12 px-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div 
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                  step >= i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                {i}
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {i === 1 ? "Time" : i === 2 ? "Focus" : "Style"}
              </span>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        
        {/* STEP 1: TIME */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">When?</h2>
              <p className="text-muted-foreground">Select the time period for this report.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <OptionCard 
                selected={config.dateRange === "7d"} 
                onClick={() => setConfig({...config, dateRange: "7d"})}
                label="Last 7 Days"
              />
              <OptionCard 
                selected={config.dateRange === "30d"} 
                onClick={() => setConfig({...config, dateRange: "30d"})}
                label="Last 30 Days"
              />
              <OptionCard 
                selected={config.dateRange === "month"} 
                onClick={() => setConfig({...config, dateRange: "month"})}
                label="This Month"
              />
            </div>
            
            {/* Custom Calendar Option */}
            <div className="flex flex-col items-center mt-6">
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant={config.dateRange === "custom" ? "default" : "outline"}
                    className={cn(
                      "w-full md:w-auto h-12 px-6", 
                      config.dateRange === "custom" ? "" : "border-dashed"
                    )}
                    onClick={() => {
                        // Switch to custom mode
                        if (config.dateRange !== "custom") {
                             setConfig({...config, dateRange: "custom"});
                             // Explicitly clear any stale date range to force new selection
                             setDateRange(undefined);
                             setHasValidActivities(false); // Assume false until picked
                        }
                    }}
                  >
                     {config.dateRange === "custom" && dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd")
                      )
                    ) : (
                      <span>Custom Range from Calendar</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="range"
                    // Important: undefined defaultMonth prevents auto-focus on today if not desired,
                    // but usually helpful. We ensure 'selected' is strictly controlled.
                    defaultMonth={dateRange?.from || new Date()} 
                    selected={dateRange}
                    // @ts-ignore
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              
              {/* Validation Warning */}
              <div className="h-6 mt-2 text-center text-sm">
                  {config.dateRange === "custom" && (!dateRange?.from || !dateRange?.to) ? (
                     <p className="text-muted-foreground text-xs">Please select start & end date.</p>
                  ) : isValidating ? (
                      <p className="text-muted-foreground animate-pulse text-xs">Checking activities...</p>
                  ) : !hasValidActivities ? (
                      <p className="text-destructive flex items-center justify-center gap-1 text-xs font-medium">
                          <AlertCircle className="h-3 w-3" /> No activities found in this range.
                      </p>
                  ) : (
                      <p className="text-green-600 flex items-center justify-center gap-1 text-xs opacity-0 animate-in fade-in slide-in-from-bottom-1">
                          <CheckCircle className="h-3 w-3" /> Ready
                      </p>
                  )}
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <Button 
                onClick={handleNextStep} 
                size="lg" 
                className={cn(
                    "rounded-full px-8 transition-all duration-200",
                    !hasValidActivities || isValidating
                        ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground hover:bg-muted"
                        : ""
                )}
                disabled={!hasValidActivities || isValidating}
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: FOCUS */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Focus?</h2>
              <p className="text-muted-foreground">Filter by project and add context.</p>
            </div>

            <div className="space-y-4">
               <Label>Project Filter</Label>
               <Select 
                  value={config.projectId === null ? "unassigned" : config.projectId || "all"} 
                  onValueChange={(v) => {
                    // Logic: 'all' -> undefined, 'unassigned' -> null, else -> string
                    const pid = v === "all" ? undefined : v === "unassigned" ? null : v;
                    setConfig({...config, projectId: pid});
                  }}
                >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everything (All Projects)</SelectItem>
                  <SelectItem value="unassigned">Unassigned Only (No Project)</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label>Extra Instructions (Optional)</Label>
              <Input 
                placeholder="E.g. Focus on the API refactor, or mention the outage on Tuesday..."
                value={config.notes || ""}
                onChange={(e: any) => setConfig({...config, notes: e.target.value})}
                className="h-12 bg-muted/30"
              />
            </div>

            <div className="flex justify-between mt-8">
              <Button variant="ghost" onClick={prevStep}>Back</Button>
              <Button onClick={nextStep} size="lg" className="rounded-full px-8">
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: STYLE */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Style?</h2>
              <p className="text-muted-foreground">How should it sound?</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <OptionCard 
                selected={config.tone === "professional"} 
                onClick={() => setConfig({...config, tone: "professional"})}
                label="Professional"
                description="Formal, structured, executive summary."
              />
              <OptionCard 
                selected={config.tone === "casual"} 
                onClick={() => setConfig({...config, tone: "casual"})}
                label="Casual Update"
                description="Friendly, team-focused, quick read."
              />
              <OptionCard 
                selected={config.tone === "bullet-points"} 
                onClick={() => setConfig({...config, tone: "bullet-points"})}
                label="Bullet Points"
                description="Just the facts. Short and punchy."
              />
            </div>

            <div className="flex justify-between mt-8">
              <Button variant="ghost" onClick={prevStep}>Back</Button>
              <Button onClick={startGeneration} size="lg" className="rounded-full px-8 bg-primary hover:bg-primary/90">
                <Sparkles className="mr-2 h-4 w-4" />
                Generate
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 4: EDITOR */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full"
          >
             <div className="flex justify-between items-center mb-6">
               <div className="flex items-center gap-2">
                 <Button variant="ghost" size="icon-sm" onClick={() => setStep(1)} disabled={isStreaming}>
                   <ChevronLeft className="h-4 w-4" />
                 </Button>
                 <h2 className="text-xl font-bold flex items-center gap-2">
                   Your Report
                   {isStreaming && <span className="text-xs font-normal text-muted-foreground animate-pulse">(Generating...)</span>}
                 </h2>
               </div>
               
               <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <Send className="mr-2 h-4 w-4" />
                        Send via...
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleEmail} className="group cursor-pointer">
                         <Mail className="mr-2 h-4 w-4 text-foreground group-focus:text-accent-foreground" /> 
                         <span className="group-focus:text-accent-foreground">Default Mail App</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleGmail} className="group cursor-pointer">
                         <span className="mr-2 text-lg font-bold text-foreground group-focus:text-accent-foreground">M</span> 
                         <span className="group-focus:text-accent-foreground">Gmail</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button variant="outline" onClick={() => navigator.clipboard.writeText(reportContent)}>
                     Copy
                  </Button>
                  <Button onClick={handleSave} disabled={isStreaming || isSaving || saved}>
                     {saved ? <CheckCircle className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                     {saved ? "Saved" : "Save to History"}
                  </Button>
                </div>
             </div>

             <LiveEditor 
                value={reportContent} 
                onChange={setReportContent}
                isStreaming={isStreaming}
             />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

function OptionCard({ selected, onClick, label, description }: { selected: boolean; onClick: () => void; label: string; description?: string }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-xl border-2 p-6 transition-all duration-200 hover:scale-[1.02]",
        selected 
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" 
          : "border-border/50 bg-card hover:border-primary/50"
      )}
    >
      <div className="font-semibold text-lg mb-1">{label}</div>
      {description && <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>}
    </div>
  )
}
