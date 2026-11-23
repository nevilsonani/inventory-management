"use client";

import { cn } from "@/lib/utils";

interface Option<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  label: string;
  className?: string;
}

/** Pill-style filter tabs. Works as a radio group for screen readers. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex max-w-full gap-0.5 overflow-x-auto rounded-lg [scrollbar-width:none] bg-zinc-950/[0.04] p-0.5 ring-1 ring-zinc-950/[0.04] ring-inset",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium whitespace-nowrap transition-colors",
              active
                ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-950/[0.08]"
                : "text-zinc-500 hover:text-zinc-800",
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  "text-xs tabular-nums",
                  active ? "text-zinc-500" : "text-zinc-400",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
