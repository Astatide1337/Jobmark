export type GreetingPeriod = "morning" | "afternoon" | "evening";

function toGreetingPeriod(hour: number): GreetingPeriod {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function getHourInTimeZone(date: Date, timeZone?: string): number {
  if (!timeZone) {
    return date.getHours();
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone,
  });

  const parts = formatter.formatToParts(date);
  const hourPart = parts.find((part) => part.type === "hour")?.value;
  const parsed = hourPart ? Number.parseInt(hourPart, 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : date.getHours();
}

export function getFirstName(name?: string | null): string {
  if (!name) return "";
  return name.trim().split(/\s+/)[0] ?? "";
}

export function getGreetingLabel(period: GreetingPeriod): string {
  switch (period) {
    case "morning":
      return "Good Morning";
    case "afternoon":
      return "Good Afternoon";
    default:
      return "Good Evening";
  }
}

export function getPersonalizedGreeting(options?: {
  name?: string | null;
  date?: Date;
  timeZone?: string;
}): string {
  const date = options?.date ?? new Date();
  const hour = getHourInTimeZone(date, options?.timeZone);
  const period = toGreetingPeriod(hour);
  const firstName = getFirstName(options?.name);
  const base = getGreetingLabel(period);

  if (!firstName) {
    return `${base}.`;
  }

  return `${base}, ${firstName}.`;
}
