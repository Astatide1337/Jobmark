import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isAfter, parseISO } from "date-fns";

/**
 * UI Utilities
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Date & Time Utilities
 */
export const dateUtils = {
  format: (date: Date | string | number, formatStr: string = "MMM d, yyyy") => {
    return format(new Date(date), formatStr);
  },

  relative: (date: Date | string | number) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  },

  isOverdue: (date: Date | string | number) => {
    return isAfter(new Date(), new Date(date));
  },

  getAge: (birthday: string | Date) => {
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  },
};

/**
 * Text & String Utilities
 */
export const textUtils = {
  truncate: (str: string, length: number) => {
    if (str.length <= length) return str;
    return str.slice(0, length) + "...";
  },

  capitalize: (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  slugify: (str: string) => {
    return str
      .toLowerCase()
      .replace(/[^\w ]+/g, "")
      .replace(/ +/g, "-");
  },
};

/**
 * Number & Currency Utilities
 */
export const numUtils = {
  formatCurrency: (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  },

  formatPercent: (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "percent",
      minimumFractionDigits: 1,
    }).format(value);
  },
};

/**
 * Misc Utilities
 */
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function generateId(length: number = 8) {
  return Math.random().toString(36).substring(2, 2 + length);
}
