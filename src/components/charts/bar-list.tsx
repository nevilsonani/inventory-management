import Link from "next/link";
import type { ReactNode } from "react";

export interface BarListItem {
  key: string;
  label: ReactNode;
  value: number;
  /** Secondary text after the value, e.g. a unit count. */
  meta?: ReactNode;
  href?: string;
}

interface BarListProps {
  items: BarListItem[];
  formatValue: (value: number) => string;
  /** Visually hidden description of what is ranked. */
  title: string;
  /** Series colour. Purchases use series 2 everywhere, sales series 1. */
  color?: string;
}

/** Ranked horizontal bars. One series, so one colour and no legend. */
export function BarList({ items, formatValue, title, color = "var(--color-series-1)" }: BarListProps) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <ul className="space-y-3.5" aria-label={title}>
      {items.map((item) => {
        const label = item.href ? (
          <Link href={item.href} className="truncate hover:text-brand-700 hover:underline">
            {item.label}
          </Link>
        ) : (
          <span className="truncate">{item.label}</span>
        );
        return (
          <li key={item.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex min-w-0 text-zinc-700">{label}</span>
              <span className="shrink-0 font-medium text-zinc-900 tabular-nums">
                {formatValue(item.value)}
                {item.meta && <span className="ml-1.5 font-normal text-zinc-500">{item.meta}</span>}
              </span>
            </div>
            <div className="mt-1.5 h-2 rounded-r-[4px]" aria-hidden>
              <div
                className="h-full rounded-r-[4px] transition-[width] duration-500"
                style={{ width: `${Math.max(1, (item.value / max) * 100)}%`, background: color }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
