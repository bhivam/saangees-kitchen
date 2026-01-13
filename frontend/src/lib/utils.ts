import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCents(value: number) {
  return `$${((value ?? 0) / 100).toFixed(2)}`;
}

/**
 * Convert a Date to YYYY-MM-DD string using LOCAL timezone (not UTC).
 * This prevents off-by-one day errors when in EST/other timezones.
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

