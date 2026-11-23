import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone = "zinc" | "green" | "amber" | "red" | "blue" | "violet";

const tones: Record<Tone, { badge: string; dot: string }> = {
  zinc: { badge: "bg-zinc-100 text-zinc-700 ring-zinc-500/15", dot: "bg-zinc-400" },
  green: { badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/15", dot: "bg-emerald-500" },
  amber: { badge: "bg-amber-50 text-amber-800 ring-amber-600/20", dot: "bg-amber-500" },
  red: { badge: "bg-rose-50 text-rose-700 ring-rose-600/15", dot: "bg-rose-500" },
  blue: { badge: "bg-brand-50 text-brand-700 ring-brand-600/15", dot: "bg-brand-500" },
  violet: { badge: "bg-violet-50 text-violet-700 ring-violet-600/15", dot: "bg-violet-500" },
};

interface BadgeProps {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

/** Status pill. Always carries a text label, so state is never colour-only. */
export function Badge({ tone = "zinc", dot = true, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        tones[tone].badge,
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", tones[tone].dot)} aria-hidden />}
      {children}
    </span>
  );
}

/** Small neutral counter used in nav items and tabs. */
export function Count({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-zinc-950/5 px-1.5 text-[11px] font-medium text-zinc-600 tabular-nums",
        className,
      )}
    >
      {children}
    </span>
  );
}
