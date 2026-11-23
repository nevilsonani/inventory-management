"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { niceTicks } from "./scale";

export interface Series {
  key: string;
  name: string;
  /** CSS colour, e.g. var(--color-series-1). */
  color: string;
}

interface ColumnChartProps {
  data: { label: string; values: Record<string, number> }[];
  series: Series[];
  formatValue: (value: number) => string;
  formatAxis: (value: number) => string;
  height?: number;
  title: string;
}

export function Legend({ series }: { series: Series[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-zinc-600">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} aria-hidden />
          {s.name}
        </li>
      ))}
    </ul>
  );
}

/** Grouped columns with a hairline grid and a hover tooltip per group. */
export function ColumnChart({ data, series, formatValue, formatAxis, height = 240, title }: ColumnChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(0, ...data.flatMap((d) => series.map((s) => d.values[s.key] ?? 0)));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  // Label at most ~7 periods so axis text never crowds; tooltips name every bar.
  const labelEvery = Math.ceil(data.length / 7);

  return (
    <div className="relative">
      <div className="flex" style={{ height }}>
        {/* Y axis */}
        <div className="relative w-14 shrink-0" aria-hidden>
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-3 translate-y-1/2 text-[11px] text-zinc-400 tabular-nums"
              style={{ bottom: `${(tick / top) * 100}%` }}
            >
              {formatAxis(tick)}
            </span>
          ))}
        </div>

        {/* Plot */}
        <div className="relative flex-1" role="img" aria-label={title}>
          {ticks.map((tick) => (
            <div
              key={tick}
              className={cn("absolute inset-x-0 h-px", tick === 0 ? "bg-zinc-300" : "bg-zinc-100")}
              style={{ bottom: `${(tick / top) * 100}%` }}
              aria-hidden
            />
          ))}
          <div className="absolute inset-0 flex">
            {data.map((group, index) => (
              <div
                key={group.label}
                className="relative flex min-w-0 flex-1 items-end justify-center gap-[2px] px-1.5"
                onPointerEnter={() => setHovered(index)}
                onPointerLeave={() => setHovered(null)}
              >
                <div
                  className={cn(
                    "absolute inset-x-1 inset-y-0 rounded-md transition-colors",
                    hovered === index && "bg-zinc-950/[0.035]",
                  )}
                  aria-hidden
                />
                {series.map((s) => (
                  <div
                    key={s.key}
                    className="relative w-full max-w-6 rounded-t-[4px] transition-[height] duration-500"
                    style={{ height: `${((group.values[s.key] ?? 0) / top) * 100}%`, background: s.color }}
                  />
                ))}
                {hovered === index && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 animate-fade-in rounded-lg bg-zinc-900 px-3 py-2 text-xs text-white shadow-lg">
                    <p className="mb-1 font-medium">{group.label}</p>
                    {series.map((s) => (
                      <p key={s.key} className="flex items-center gap-2 text-zinc-300">
                        <span className="size-2 rounded-[2px]" style={{ background: s.color }} />
                        {s.name}
                        <span className="ml-auto pl-3 font-medium text-white tabular-nums">
                          {formatValue(group.values[s.key] ?? 0)}
                        </span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* X axis */}
      <div className="ml-14 flex pt-2" aria-hidden>
        {data.map((group, index) => (
          <span key={group.label} className="min-w-0 flex-1 text-center text-xs whitespace-nowrap text-zinc-500">
            {index % labelEvery === 0 ? group.label : ""}
          </span>
        ))}
      </div>

      {/* Table view for screen readers */}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>Period</th>
            {series.map((s) => (
              <th key={s.key}>{s.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((group) => (
            <tr key={group.label}>
              <th>{group.label}</th>
              {series.map((s) => (
                <td key={s.key}>{formatValue(group.values[s.key] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
