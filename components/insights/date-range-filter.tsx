"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DateRange = "7d" | "30d" | "90d" | "365d" | "all";

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
}

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "365d", label: "Last year" },
  { value: "all", label: "All time" },
];

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as DateRange)}>
      <SelectTrigger className="w-[140px] h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {DATE_RANGE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function getDateRangeStart(range: DateRange): Date | null {
  if (range === "all") return null;
  
  const now = new Date();
  const daysMap: Record<Exclude<DateRange, "all">, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "365d": 365,
  };
  
  const start = new Date();
  start.setDate(now.getDate() - daysMap[range]);
  start.setHours(0, 0, 0, 0);
  return start;
}
