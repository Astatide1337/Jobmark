"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { logDecompressionSession } from "@/app/actions/decompress";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useUI } from "@/components/providers/ui-provider";

interface DecompressionWizardProps {
  dailyCount: number;
  lastProjectName: string | null;
  userGoal: string;
}

type Phase = "ACKNOWLEDGMENT" | "RELEASE" | "BREATH" | "PRE_MANIFEST" | "MANIFEST" | "COMPLETION";

export function DecompressionWizard({
  dailyCount,
  lastProjectName,
  userGoal,
}: DecompressionWizardProps) {
  const [phase, setPhase] = useState<Phase>("ACKNOWLEDGMENT");
  const [textIndex, setTextIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio Lifecycle
  useEffect(() => {
    const audio = new Audio("/audio/weightless.mp3");
    audio.loop = true;
    audio.volume = 0; // Start silent
    audioRef.current = audio;

    return () => {
      // Cleanup: stop and remove
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  // Audio Fade In/Out Logic
  useEffect(() => {
    if (!audioRef.current) return;

    if (phase === "RELEASE" || phase === "BREATH" || phase === "MANIFEST") {
        // Fade in
        audioRef.current.play().catch(e => console.log("Audio play failed:", e));
        const fadeInterval = setInterval(() => {
            if (audioRef.current && audioRef.current.volume < 0.2) {
                audioRef.current.volume = Math.min(0.2, audioRef.current.volume + 0.01);
            } else {
                clearInterval(fadeInterval);
            }
        }, 200);
    } else if (phase === "COMPLETION") {
         // Fade out
         const fadeInterval = setInterval(() => {
            if (audioRef.current && audioRef.current.volume > 0) {
                audioRef.current.volume = Math.max(0, audioRef.current.volume - 0.01);
            } else {
                if (audioRef.current) audioRef.current.pause();
                clearInterval(fadeInterval);
            }
        }, 200);
    }
  }, [phase]);

  // Phase Automation
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const advance = (nextPhase: Phase, delay: number) => {
      timer = setTimeout(() => {
        setPhase(nextPhase);
        setTextIndex(0); // Reset for next phase
      }, delay);
    };

    switch (phase) {
      case "ACKNOWLEDGMENT":
        // 12 seconds to read acknowledgment
        advance("RELEASE", 12000);
        break;

      case "RELEASE":
        // 4 steps of mental release, 8s each = 32s total
        if (textIndex < 3) {
           timer = setTimeout(() => setTextIndex(prev => prev + 1), 8000);
        } else {
           advance("BREATH", 8000);
        }
        break;

      case "BREATH":
         // 3 cycles of 4-7-8 (19s) = 57s total
         advance("PRE_MANIFEST", 57000);
         break;

      case "PRE_MANIFEST":
         // One liner about manifestation
         advance("MANIFEST", 8000);
         break;

      case "MANIFEST":
        // 7 quotes. Increased duration for slower reading.
        const timings = [8000, 9000, 9000, 10000, 8000, 8000, 8000];
        if (textIndex < timings.length - 1) {
             timer = setTimeout(() => setTextIndex(prev => prev + 1), timings[textIndex]);
        } else {
             advance("COMPLETION", timings[textIndex]);
        }
        break;
      
      case "COMPLETION":
         // Log session
         logDecompressionSession();
         break;
    }

    return () => clearTimeout(timer);
  }, [phase, textIndex]);

  // Content Generators
  const getAcknowledgmentText = () => {
    if (dailyCount > 0) {
      return (
        <>
          You logged <span className="text-[#d4a574] font-semibold text-5xl mx-2">{dailyCount}</span> {dailyCount === 1 ? "entry" : "entries"} today, 
          {lastProjectName && <> focusing on <span className="text-[#d4a574] italic">{lastProjectName}</span></>}.
          <br /><span className="text-sm mt-8 block opacity-70 tracking-wide uppercase">Great progress. Now, let&apos;s transition to rest.</span>
        </>
      );
    }
    return (
      <>
        You haven&apos;t logged any entries today. <br />
        <span className="text-[#d4a574] italic text-3xl mt-4 block">That is perfectly okay.</span>
        <br /><span className="text-sm mt-8 block opacity-70 tracking-wide uppercase">Every day holds its own story. Let&apos;s transition to rest.</span>
      </>
    );
  };

  const getReleaseText = () => {
    const steps = [
      "Bring to mind any tension from the day.",
      "Acknowledge it.",
      "Now, let it drop from your shoulders.",
      "Leave the work here."
    ];
    return steps[textIndex];
  };

  const getManifestText = () => {
     const quotes = [
        "We become what we think about.",
        "Whatever the mind can conceive and believe, it can achieve.",
        "Success is the progressive realization of a worthy ideal.",
        <>Picture yourself having already achieved:<br/><span className="text-[#d4a574] text-3xl mt-2 block">{userGoal}</span></>,
        "See yourself living that reality now.",
        "Your world is a living expression of your mind.",
        "Act as though it were impossible to fail."
     ];
     return quotes[textIndex];
  };

  const { uiV2 } = useUI();

  return (
    <div className={cn(
      "relative w-full min-h-[60vh] flex flex-col items-center justify-center text-center px-6",
      uiV2 ? "overflow-visible" : "h-screen overflow-hidden"
    )}>
      <Link href="/dashboard" className="fixed top-8 left-8 text-muted-foreground hover:text-primary transition-all flex items-center gap-2 text-sm z-50 focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg px-2 py-1">
        <ArrowLeft className="w-4 h-4" /> Exit
      </Link>

      <AnimatePresence mode="wait">
        
        {phase === "ACKNOWLEDGMENT" && (
          <motion.div
            key="ack"
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(10px)" }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="text-2xl md:text-3xl leading-relaxed font-serif text-[#f5f0e8]"
          >
            {getAcknowledgmentText()}
          </motion.div>
        )}

        {phase === "RELEASE" && (
          <motion.div
            key={`release-${textIndex}`}
            initial={{ opacity: 0, filter: "blur(12px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(12px)" }}
            transition={{ duration: 3, ease: "easeInOut" }} // Slower, smoother
            className="text-2xl md:text-4xl font-serif text-[#f5f0e8]/90 max-w-2xl leading-relaxed"
          >
            {getReleaseText()}
          </motion.div>
        )}

        {phase === "BREATH" && (
           <motion.div
             key="breath"
             initial={{ opacity: 0, filter: "blur(12px)" }}
             animate={{ opacity: 1, filter: "blur(0px)" }}
             exit={{ opacity: 0, filter: "blur(12px)" }}
             transition={{ duration: 3, ease: "easeInOut" }}
             className="flex flex-col items-center justify-center w-full h-full" // Ensure full centering
           >
              <BreathingCycle />
           </motion.div>
        )}

        {phase === "PRE_MANIFEST" && (
          <motion.div
            key="pre-manifest"
            initial={{ opacity: 0, filter: "blur(12px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(12px)" }}
            transition={{ duration: 3, ease: "easeInOut" }}
            className="text-2xl md:text-4xl font-serif text-[#f5f0e8]/90 max-w-2xl leading-relaxed"
          >
            The mind is a garden. What you plant, grows.
          </motion.div>
        )}

        {phase === "MANIFEST" && (
          <motion.div
            key={`manifest-${textIndex}`}
            initial={{ opacity: 0, filter: "blur(12px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(12px)" }}
            transition={{ duration: 3, ease: "easeInOut" }}
            className="text-2xl md:text-4xl font-serif leading-relaxed max-w-3xl"
          >
            {getManifestText()}
          </motion.div>
        )}

        {phase === "COMPLETION" && (
          <motion.div
            key="completion"
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            className="flex flex-col items-center gap-12"
          >
            <div className="text-center">
                <h2 className="text-3xl font-serif text-[#d4a574]">You&apos;ve cultivated peace today.</h2>
                <p className="text-[#a89888] text-xl mt-4 font-serif italic">Well done.</p>
            </div>
            <Link 
              href="/dashboard" 
              className="text-muted-foreground hover:text-primary transition-all text-sm tracking-[0.2em] uppercase font-medium focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg px-3 py-2"
            >
              Return to Dashboard
            </Link>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

// Sub-component for Breathing Animation
function BreathingCycle() {
  const [step, setStep] = useState<"INHALE" | "HOLD" | "EXHALE">("INHALE");

  useEffect(() => {
    // 4-7-8 Rhythm
    // Total 19s
    let active = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const runCycle = () => {
      if (!active) return;
      
      // Start Inhale (0s)
      setStep("INHALE");

      // Start Hold (4s)
      timeoutId = setTimeout(() => {
        if (!active) return;
        setStep("HOLD");

        // Start Exhale (11s)
        timeoutId = setTimeout(() => {
          if (!active) return;
          setStep("EXHALE");
        }, 7000); // Hold for 7s

      }, 4000); // Inhale for 4s
    };

    // Run immediately
    runCycle();
    const interval = setInterval(runCycle, 19000);

    return () => {
      active = false;
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="relative flex items-center justify-center h-64 w-64">
       <AnimatePresence>
          {step === "INHALE" && (
            <motion.div
                key="inhale"
                initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1.5, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1.5, filter: "blur(10px)" }}
                transition={{ duration: 4, ease: "easeOut" }}
                className="absolute text-5xl md:text-7xl font-serif text-[#d4a574] tracking-widest"
            >
                INHALE
            </motion.div>
          )}

          {step === "HOLD" && (
            <motion.div
                key="hold"
                initial={{ opacity: 0, scale: 1.5, filter: "blur(10px)" }} // Start big
                animate={{ opacity: 1, scale: 1.5, filter: "blur(0px)" }}   // Stay big
                exit={{ opacity: 0, scale: 1.5, filter: "blur(10px)" }}    // Exit big
                transition={{ duration: 2, ease: "easeInOut" }} // Quicker fade in
                className="absolute text-5xl md:text-7xl font-serif text-[#d4a574] tracking-widest"
            >
                HOLD
            </motion.div>
          )}

          {step === "EXHALE" && (
            <motion.div
                key="exhale"
                initial={{ opacity: 0, scale: 1.5, filter: "blur(10px)" }} // Start big
                animate={{ opacity: 1, scale: 0.8, filter: "blur(0px)" }}   // Shrink
                exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}    // Exit small
                transition={{ duration: 8, ease: "easeInOut" }}
                className="absolute text-5xl md:text-7xl font-serif text-[#d4a574] tracking-widest"
            >
                EXHALE
            </motion.div>
          )}
       </AnimatePresence>
    </div>
  );
}
