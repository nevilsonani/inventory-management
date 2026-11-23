import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(date: Date | string, days: number) {
  return new Date(new Date(date).getTime() + days * DAY_MS);
}

export function daysBetween(from: Date | string, to: Date | string) {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / DAY_MS);
}

export function sum<T>(list: T[], pick: (value: T) => number) {
  return list.reduce((total, value) => total + pick(value), 0);
}

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Case-insensitive "does any field contain the query" check for search boxes. */
export function matches(query: string, ...fields: (string | undefined)[]) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((field) => field?.toLowerCase().includes(q));
}
