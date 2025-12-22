import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCents(value: number) {
  return `$${((value ?? 0) / 100).toFixed(2)}`;
}

