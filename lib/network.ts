/**
 * Network feature utilities
 */

/**
 * Derive age from a birthday date.
 * Returns undefined if birthday is not provided.
 * Handles month/day boundaries correctly.
 */
export function getAgeFromBirthday(birthday: Date | null | undefined): number | undefined {
  if (!birthday) return undefined

  const today = new Date()
  const birth = new Date(birthday)

  // Use UTC methods for both to avoid local timezone interference
  let age = today.getUTCFullYear() - birth.getUTCFullYear()
  const monthDiff = today.getUTCMonth() - birth.getUTCMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < birth.getUTCDate())) {
    age--
  }

  return age >= 0 ? age : undefined
}

/**
 * Safely parse a date string or Date object as a UTC Date object at midnight.
 * This avoids timezone-related off-by-one errors.
 */
export function parseUTCDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null
  
  if (date instanceof Date) {
    // If it's already a Date, normalize it to a UTC "date-only" value.
    // Many date-only fields come back as midnight UTC; using UTC getters prevents
    // timezone-based off-by-one display issues.
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  }

  // Ensure we interpret YYYY-MM-DD as UTC midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Date(`${date}T00:00:00Z`)
  }
  
  const d = new Date(date)
  if (isNaN(d.getTime())) return null
  
  // Force to UTC midnight for any other string format
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

/**
 * Format a date for display (e.g., "Jan 15, 2024")
 * Always uses UTC to avoid off-by-one errors for date-only values.
 */
export function formatDate(date: Date | string | null | undefined): string {
  const d = parseUTCDate(date)
  if (!d) return ""
  
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[d.getUTCMonth()];
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  return `${month} ${day}, ${year}`;
}

function getUTCYMD(date: Date | string): string {
  if (typeof date === "string") {
    // Common case: ISO string - keep date-only portion
    if (date.length >= 10) return date.substring(0, 10)
    const parsed = new Date(date)
    if (!isNaN(parsed.getTime())) {
      return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}-${String(parsed.getUTCDate()).padStart(2, "0")}`
    }
    return ""
  }
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`
}

function parseLocalYMD(ymd: string): Date {
  const [year, month, day] = ymd.split("-").map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Get a relative time string (e.g., "2 days ago", "in 3 days")
 */
export function getRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return ""
  const now = new Date()
  const d = new Date(date)
  const diffMs = d.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "today"
  if (diffDays === 1) return "tomorrow"
  if (diffDays === -1) return "yesterday"
  if (diffDays > 0) return `in ${diffDays} days`
  return `${Math.abs(diffDays)} days ago`
}

/**
 * Get a relative day label for date-only fields (e.g., follow-up dates).
 * Uses UTC date parts for the stored value (to preserve intended calendar day)
 * and compares against the user's local "today".
 */
export function getRelativeDay(date: Date | string | null | undefined): string {
  const d = parseUTCDate(date)
  if (!d) return ""

  const targetYMD = getUTCYMD(d)
  if (!targetYMD) return ""

  const todayYMD = new Date().toLocaleDateString("en-CA")
  const diffDays = Math.round(
    (parseLocalYMD(targetYMD).getTime() - parseLocalYMD(todayYMD).getTime()) /
      (1000 * 60 * 60 * 24)
  )

  if (diffDays === 0) return "today"
  if (diffDays === 1) return "tomorrow"
  if (diffDays === -1) return "yesterday"
  if (diffDays > 0) return `in ${diffDays} days`
  return `${Math.abs(diffDays)} days ago`
}

/**
 * Date-only overdue check for follow-up dates.
 * Overdue means the follow-up calendar day is before the user's local today.
 */
export function isDateOnlyOverdue(date: Date | string | null | undefined): boolean {
  const d = parseUTCDate(date)
  if (!d) return false
  const targetYMD = getUTCYMD(d)
  if (!targetYMD) return false
  const todayYMD = new Date().toLocaleDateString("en-CA")
  return targetYMD < todayYMD
}

/**
 * Channel display labels
 */
export const CHANNEL_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "call", label: "Phone Call" },
  { value: "text", label: "Text Message" },
  { value: "in-person", label: "In Person" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "video", label: "Video Call" },
  { value: "other", label: "Other" },
] as const

export type Channel = (typeof CHANNEL_OPTIONS)[number]["value"]

export function getChannelLabel(channel: string): string {
  const found = CHANNEL_OPTIONS.find((c) => c.value === channel)
  return found?.label ?? channel
}

/**
 * Outreach objective options
 */
export const OUTREACH_OBJECTIVES = [
  { value: "referral", label: "Ask for Referral" },
  { value: "catch-up", label: "Catch Up" },
  { value: "thank-you", label: "Say Thank You" },
  { value: "reconnect", label: "Reconnect" },
  { value: "introduction", label: "Request Introduction" },
  { value: "congratulate", label: "Congratulate" },
] as const

export const OUTREACH_TONES = [
  { value: "warm", label: "Warm & Friendly" },
  { value: "professional", label: "Professional" },
  { value: "concise", label: "Short & Concise" },
] as const

export const OUTREACH_CHANNELS = [
  { value: "email", label: "Email" },
  { value: "linkedin", label: "LinkedIn Message" },
  { value: "text", label: "Text Message" },
] as const
