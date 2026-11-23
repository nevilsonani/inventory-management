import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  /** Small line under the value: a delta, a hint, a breakdown. */
  footer?: ReactNode;
  href?: string;
  className?: string;
}

/** KPI tile: label, one big number, an optional context line. */
export function Stat({ label, value, icon: Icon, footer, href, className }: StatProps) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-zinc-500">{label}</p>
        {Icon && <Icon className="size-4 text-zinc-400" aria-hidden />}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">{value}</p>
      {footer && <div className="mt-1.5 text-[13px] text-zinc-500">{footer}</div>}
    </>
  );
  const classes = cn(
    "block rounded-xl bg-white p-4 shadow-card ring-1 ring-zinc-950/[0.07] sm:p-5",
    href && "transition-shadow hover:ring-zinc-950/15",
    className,
  );
  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}

interface DeltaProps {
  current: number;
  previous: number;
  /** Whether a rise is good news (revenue) or bad news (overdue). */
  upIsGood?: boolean;
  suffix?: string;
}

export function Delta({ current, previous, upIsGood = true, suffix = "vs previous 30 days" }: DeltaProps) {
  if (previous === 0) return <span>{suffix.replace(/^vs/, "No data for")}</span>;
  const change = ((current - previous) / previous) * 100;
  const up = change >= 0;
  const good = up === upIsGood;
  return (
    <span>
      <span className={cn("font-medium", good ? "text-emerald-600" : "text-rose-600")}>
        {up ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
      </span>{" "}
      {suffix}
    </span>
  );
}
