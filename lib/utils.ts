/**
 * Core Utilities Module
 *
 * Why: Centralizing common logic for styling, date formatting, and string
 * manipulation reduces code duplication and ensures a consistent developer
 * experience across the project.
 *
 * Highlights:
 * - `cn`: Combines tailwind classes using `clsx` and `twMerge` to handle
 *   conditional styles and class priority correctly.
 * - `dateUtils`: Standardized wrappers around `date-fns` for consistent
 *   date display.
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isAfter, parseISO } from 'date-fns';

/**
 * UI Utilities
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Date & Time Utilities
 */
function toDisplayDate(date: Date | string | number): Date {
  // A YYYY-MM-DD value is a calendar date, not a UTC timestamp. parseISO
  // keeps it at local midnight so article dates and deadlines do not shift to
  // the previous day for users west of UTC.
  return typeof date === 'string' ? parseISO(date) : new Date(date);
}

export const dateUtils = {
  format: (date: Date | string | number, formatStr: string = 'MMM d, yyyy') => {
    return format(toDisplayDate(date), formatStr);
  },

  relative: (date: Date | string | number) => {
    return formatDistanceToNow(toDisplayDate(date), { addSuffix: true });
  },

  isOverdue: (date: Date | string | number) => {
    return isAfter(new Date(), toDisplayDate(date));
  },

  getAge: (birthday: string | Date) => {
    const birthDate = toDisplayDate(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  },
};
