import { formatMonth, formatShortDate } from "@/lib/format";
import { addDays, daysBetween } from "@/lib/utils";

export interface Bucket {
  from: Date;
  to: Date;
  label: string;
}

/** Weekly buckets for ranges up to ~3 months, monthly beyond that. */
export function timeBuckets(from: Date, to: Date): Bucket[] {
  const buckets: Bucket[] = [];
  if (daysBetween(from, to) <= 92) {
    for (let start = from; start < to; start = addDays(start, 7)) {
      const end = addDays(start, 7) < to ? addDays(start, 7) : to;
      buckets.push({ from: start, to: end, label: formatShortDate(start.toISOString()) });
    }
    return buckets;
  }
  for (let start = new Date(from.getFullYear(), from.getMonth(), 1); start < to; ) {
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    buckets.push({ from: start < from ? from : start, to: end < to ? end : to, label: formatMonth(start) });
    start = end;
  }
  return buckets;
}
