/**
 * Jobmark Unified Theme & Constants
 * Single source of truth for visual tokens and configuration
 */

export const THEME = {
  // Visual Presets from themes.ts
  presets: {
    cafe: {
      name: "Late Night Café",
      description: "Warm amber and deep browns",
      background: "#1a1412",
      primary: "#d4a574",
    },
    ocean: {
      name: "Deep Ocean",
      description: "Cool blues and teals",
      background: "#0a192f",
      primary: "#64ffda",
    },
    forest: {
      name: "Evergreen",
      description: "Deep greens and earthy tones",
      background: "#0d1a12",
      primary: "#7fb069",
    },
    sunset: {
      name: "Desert Sunset",
      description: "Warm oranges and purples",
      background: "#1a1216",
      primary: "#e0a458",
    },
    midnight: {
      name: "True Midnight",
      description: "Pure blacks and stark whites",
      background: "#000000",
      primary: "#ffffff",
    },
    rose: {
      name: "Velvet Rose",
      description: "Deep reds and soft pinks",
      background: "#1a0f11",
      primary: "#d66b6b",
    },
    slate: {
      name: "Industrial Slate",
      description: "Cold greys and blues",
      background: "#0f172a",
      primary: "#38bdf8",
    },
  },

  // Project Colors from constants.ts
  projectColors: [
    { name: "Amber", value: "#d4a574" },
    { name: "Emerald", value: "#10b981" },
    { name: "Blue", value: "#3b82f6" },
    { name: "Rose", value: "#f43f5e" },
    { name: "Purple", value: "#8b5cf6" },
    { name: "Slate", value: "#64748b" },
    { name: "Orange", value: "#f97316" },
  ],

  // Layout Constants
  layout: {
    sidebarWidth: "280px",
    sidebarCollapsedWidth: "80px",
    headerHeight: "64px",
    maxWidth: "1200px",
  },

  // Animation Tokens (Framer Motion)
  animations: {
    transitions: {
      spring: { type: "spring", stiffness: 300, damping: 30 },
      smooth: { type: "tween", ease: "easeInOut", duration: 0.3 },
    },
    variants: {
      fadeIn: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      },
      slideUp: {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 20 },
      },
    },
  },

  // Formatting Config
  formats: {
    date: "MMM d, yyyy",
    time: "h:mm a",
    dateTime: "MMM d, yyyy h:mm a",
  },
} as const;

// Domain Constants
export const CHANNELS = [
  { label: "Email", value: "email" },
  { label: "LinkedIn", value: "linkedin" },
  { label: "Twitter", value: "twitter" },
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Phone", value: "phone" },
  { label: "In Person", value: "in-person" },
] as const;

export const OUTREACH_OBJECTIVES = [
  { label: "Catch up", value: "catch-up" },
  { label: "Referral request", value: "referral" },
  { label: "Feedback request", value: "feedback" },
  { label: "Meeting request", value: "meeting" },
  { label: "Thank you", value: "thank-you" },
  { label: "Follow up", value: "follow-up" },
] as const;

export const REPORT_TONES = [
  { id: "professional", label: "Professional", description: "Executive summary style" },
  { id: "casual", label: "Casual", description: "Friendly update style" },
  { id: "bullet-points", label: "Brevity", description: "Just the facts, concisely" },
] as const;
