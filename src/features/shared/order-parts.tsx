import { Check, CircleCheck, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { byId, orderTotals } from "@/lib/selectors";
import type { InventoryState, LineItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface Step {
  label: string;
  date?: string;
  state: "done" | "current" | "upcoming" | "cancelled";
}

/** Horizontal progress through an order's lifecycle. */
export function Steps({ steps }: { steps: Step[] }) {
  return (
    <ol className="flex items-start">
      {steps.map((step, index) => (
        <li key={step.label} className="relative flex flex-1 flex-col items-center text-center">
          {index > 0 && (
            <span
              className={cn(
                "absolute top-3 right-1/2 h-px w-full -translate-y-1/2",
                step.state === "done" ? "bg-brand-500" : "bg-zinc-200",
              )}
              aria-hidden
            />
          )}
          <span
            className={cn(
              "relative grid size-6 place-items-center rounded-full ring-4 ring-white",
              step.state === "done" && "bg-brand-600 text-on-brand",
              step.state === "current" && "bg-white text-brand-600 ring-brand-100 [box-shadow:inset_0_0_0_1.5px_var(--color-brand-500)]",
              step.state === "upcoming" && "bg-zinc-100 text-zinc-400",
              step.state === "cancelled" && "bg-zinc-200 text-zinc-500",
            )}
          >
            {step.state === "done" && <Check className="size-3.5" strokeWidth={3} />}
            {step.state === "current" && <span className="size-2 rounded-full bg-brand-500" />}
            {step.state === "cancelled" && <X className="size-3.5" strokeWidth={3} />}
          </span>
          <span
            className={cn(
              "mt-2 text-[13px] font-medium",
              step.state === "upcoming" ? "text-zinc-400" : "text-zinc-800",
            )}
          >
            {step.label}
          </span>
          <span className="text-xs text-zinc-500">{step.date ? formatDateTime(step.date) : " "}</span>
        </li>
      ))}
    </ol>
  );
}

interface LinesTableProps {
  state: InventoryState;
  lines: LineItem[];
  taxRate: number;
  /** Optional per-line note, e.g. stock availability. */
  renderNote?: (line: LineItem) => ReactNode;
}

export function LinesTable({ state, lines, taxRate, renderNote }: LinesTableProps) {
  const totals = orderTotals({ lines, taxRate });
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-zinc-950/[0.07]">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-xs text-zinc-500">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Item</th>
            <th className="px-3 py-2 text-right font-medium">Qty</th>
            <th className="px-3 py-2 text-right font-medium">Rate</th>
            <th className="px-4 py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-950/[0.05]">
          {lines.map((line) => {
            const item = byId(state.items, line.itemId);
            return (
              <tr key={line.itemId}>
                <td className="px-4 py-2.5">
                  <Link href={`/stock/${line.itemId}`} className="font-medium text-zinc-900 hover:text-brand-700 hover:underline">
                    {item?.name ?? "Deleted item"}
                  </Link>
                  <p className="font-mono text-[11px] text-zinc-500">{item?.sku}</p>
                  {renderNote?.(line)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{line.qty}</td>
                <td className="px-3 py-2.5 text-right text-zinc-600 tabular-nums">{formatCurrency(line.rate)}</td>
                <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                  {formatCurrency(line.qty * line.rate)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-zinc-50/60 text-sm">
          <tr>
            <td colSpan={3} className="px-4 pt-3 pb-1 text-right text-zinc-500">Subtotal</td>
            <td className="px-4 pt-3 pb-1 text-right tabular-nums">{formatCurrency(totals.subtotal)}</td>
          </tr>
          <tr>
            <td colSpan={3} className="px-4 py-1 text-right text-zinc-500">GST ({taxRate * 100}%)</td>
            <td className="px-4 py-1 text-right tabular-nums">{formatCurrency(totals.tax)}</td>
          </tr>
          <tr>
            <td colSpan={3} className="px-4 pt-1 pb-3 text-right font-semibold">Total</td>
            <td className="px-4 pt-1 pb-3 text-right font-semibold tabular-nums">{formatCurrency(totals.total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** Label/value pairs in a two-column grid. */
export function InfoList({ items }: { items: [label: string, value: ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-zinc-500">{label}</dt>
          <dd className="mt-0.5 truncate text-zinc-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Inline confirmation inside a sheet (toasts would sit under the modal). */
export function SuccessNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="status"
      className="flex animate-fade-in items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-800 ring-1 ring-emerald-600/15 ring-inset"
    >
      <CircleCheck className="mt-px size-4 shrink-0 text-emerald-600" aria-hidden />
      {message}
    </p>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-2.5 text-xs font-medium tracking-wide text-zinc-500 uppercase">{children}</h3>;
}
