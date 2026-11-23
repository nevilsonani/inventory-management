"use client";

import { useRef, useState } from "react";
import { formatNumber, formatShortDate } from "@/lib/format";
import { niceTicks } from "./scale";

interface StepChartProps {
  points: { date: Date; qty: number }[];
  /** Horizontal reference line, e.g. the reorder point. */
  threshold?: number;
  thresholdLabel?: string;
  height?: number;
  title: string;
}

const COLOR = "var(--color-series-1)";

/**
 * Stock level over time. Stock changes in jumps, so the line is drawn as
 * steps. SVG stretches to the container; text stays in HTML so it never
 * distorts.
 */
export function StepChart({ points, threshold, thresholdLabel, height = 220, title }: StepChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const plot = useRef<HTMLDivElement>(null);

  const max = Math.max(1, threshold ?? 0, ...points.map((p) => p.qty));
  const ticks = niceTicks(max, 3);
  const top = ticks[ticks.length - 1];
  const width = Math.max(points.length - 1, 1);
  const y = (qty: number) => 100 - (qty / top) * 100;

  let line = `M0,${y(points[0]?.qty ?? 0)}`;
  points.forEach((point, i) => {
    if (i > 0) line += ` H${i} V${y(point.qty)}`;
  });
  const area = `${line} H${width} V100 H0 Z`;

  function onPointerMove(event: React.PointerEvent) {
    const box = plot.current?.getBoundingClientRect();
    if (!box) return;
    const ratio = (event.clientX - box.left) / box.width;
    setHovered(Math.min(points.length - 1, Math.max(0, Math.round(ratio * width))));
  }

  const active = hovered === null ? null : points[hovered];
  const left = (i: number) => `${(i / width) * 100}%`;

  return (
    <div>
      <div className="flex" style={{ height }}>
        <div className="relative w-10 shrink-0" aria-hidden>
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-3 translate-y-1/2 text-[11px] text-zinc-400 tabular-nums"
              style={{ bottom: `${(tick / top) * 100}%` }}
            >
              {formatNumber(tick)}
            </span>
          ))}
        </div>
        <div
          ref={plot}
          className="relative flex-1 touch-none"
          role="img"
          aria-label={title}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHovered(null)}
        >
          {ticks.map((tick) => (
            <div
              key={tick}
              className={tick === 0 ? "absolute inset-x-0 h-px bg-zinc-300" : "absolute inset-x-0 h-px bg-zinc-100"}
              style={{ bottom: `${(tick / top) * 100}%` }}
              aria-hidden
            />
          ))}
          <svg
            viewBox={`0 0 ${width} 100`}
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
            aria-hidden
          >
            <path d={area} fill={COLOR} fillOpacity={0.1} />
            <path
              d={line}
              fill="none"
              stroke={COLOR}
              strokeWidth={2}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {threshold !== undefined && (
              <line
                x1={0}
                x2={width}
                y1={y(threshold)}
                y2={y(threshold)}
                stroke="#d97706"
                strokeWidth={1}
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
          {threshold !== undefined && thresholdLabel && (
            <span
              className="absolute right-0 -translate-y-full pb-0.5 text-[11px] font-medium text-amber-700"
              style={{ top: `${y(threshold)}%` }}
            >
              {thresholdLabel}
            </span>
          )}
          {active && hovered !== null && (
            <>
              <div className="absolute inset-y-0 w-px bg-zinc-400/60" style={{ left: left(hovered) }} aria-hidden />
              <div
                className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
                style={{ left: left(hovered), top: `${y(active.qty)}%`, background: COLOR }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute top-0 z-10 w-max -translate-x-1/2 -translate-y-[calc(100%+6px)] rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
                style={{ left: `clamp(48px, ${left(hovered)}, calc(100% - 48px))` }}
              >
                <span className="text-zinc-300">{formatShortDate(active.date.toISOString())}</span>
                <span className="ml-2 font-medium tabular-nums">{formatNumber(active.qty)} units</span>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="ml-10 flex justify-between pt-2 text-xs text-zinc-500" aria-hidden>
        <span>{points[0] && formatShortDate(points[0].date.toISOString())}</span>
        <span>{points[Math.floor(points.length / 2)] && formatShortDate(points[Math.floor(points.length / 2)].date.toISOString())}</span>
        <span>Today</span>
      </div>
    </div>
  );
}
