import { cn } from "@/lib/utils";

const fills = {
  blue: "bg-brand-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
  green: "bg-emerald-500",
};

const tracks = {
  blue: "bg-brand-100",
  amber: "bg-amber-100",
  red: "bg-rose-100",
  green: "bg-emerald-100",
};

interface MeterProps {
  value: number;
  max: number;
  tone?: keyof typeof fills;
  label: string;
  className?: string;
}

/** Thin progress bar. The track is a lighter step of the fill's hue. */
export function Meter({ value, max, tone = "blue", label, className }: MeterProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn("h-1.5 w-full overflow-hidden rounded-full", tracks[tone], className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", fills[tone])}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
