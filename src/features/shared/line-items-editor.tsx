"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { GST_RATE } from "@/lib/domain";
import { formatCurrency } from "@/lib/format";
import { byId, onHand, orderTotals, qtyAt } from "@/lib/selectors";
import type { InventoryState, LineItem } from "@/lib/types";
import { cn, uid } from "@/lib/utils";

/** Form-state version of a line: inputs hold strings until submit. */
export interface DraftLine {
  key: string;
  itemId: string;
  qty: string;
  rate: string;
}

export const emptyLine = (): DraftLine => ({ key: uid("line"), itemId: "", qty: "1", rate: "" });

export function draftLine(itemId: string, qty: number, rate: number): DraftLine {
  return { key: uid("line"), itemId, qty: String(qty), rate: String(rate) };
}

/** Lines with an item chosen, parsed to numbers for the domain layer. */
export function toLineItems(lines: DraftLine[]): LineItem[] {
  return lines
    .filter((line) => line.itemId)
    .map((line) => ({ itemId: line.itemId, qty: Number(line.qty), rate: Number(line.rate) }));
}

interface LineItemsEditorProps {
  state: InventoryState;
  lines: DraftLine[];
  onChange: (lines: DraftLine[]) => void;
  /** Which price to fill in when an item is picked. */
  price: "sellPrice" | "costPrice";
  /** Godown whose stock is shown under each line. */
  godownId: string;
  /** Sales check stock is sufficient; purchases just show levels. */
  checkAvailability: boolean;
}

export function LineItemsEditor({
  state,
  lines,
  onChange,
  price,
  godownId,
  checkAvailability,
}: LineItemsEditorProps) {
  const godown = byId(state.godowns, godownId);
  const totals = orderTotals({ lines: toLineItems(lines), taxRate: GST_RATE });

  const update = (key: string, patch: Partial<DraftLine>) =>
    onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  return (
    <div>
      <div className="hidden grid-cols-[minmax(0,1fr)_76px_104px_104px_32px] gap-2 px-0.5 pb-1.5 text-xs font-medium text-zinc-500 sm:grid">
        <span>Item</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Rate (₹)</span>
        <span className="text-right">Amount</span>
        <span />
      </div>

      <ul className="space-y-3 sm:space-y-2">
        {lines.map((line, index) => {
          const item = byId(state.items, line.itemId);
          const qty = Number(line.qty) || 0;
          const available = item ? qtyAt(item, godownId) : 0;
          // Combine repeated lines of the same item for the stock check.
          const requested = lines
            .filter((other) => other.itemId === line.itemId)
            .reduce((total, other) => total + (Number(other.qty) || 0), 0);
          const short = checkAvailability && item && requested > available;

          return (
            <li
              key={line.key}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_36px] gap-2 sm:grid-cols-[minmax(0,1fr)_76px_104px_104px_32px]"
            >
              <div className="col-span-3 sm:col-span-1">
                <Select
                  value={line.itemId}
                  aria-label={`Item for line ${index + 1}`}
                  onChange={(event) => {
                    const picked = byId(state.items, event.target.value);
                    update(line.key, { itemId: event.target.value, rate: picked ? String(picked[price]) : "" });
                  }}
                >
                  <option value="">Select an item…</option>
                  {state.items.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name} · {option.sku}
                    </option>
                  ))}
                </Select>
                {item && (
                  <p className={cn("mt-1 pl-0.5 text-xs", short ? "font-medium text-rose-600" : "text-zinc-500")}>
                    {checkAvailability
                      ? short
                        ? `Only ${available} available at ${godown?.name}`
                        : `${available} available at ${godown?.name}`
                      : `${qtyAt(item, godownId)} at ${godown?.name} · ${onHand(item)} total · min ${item.minStock}`}
                  </p>
                )}
              </div>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={line.qty}
                onChange={(event) => update(line.key, { qty: event.target.value })}
                aria-label={`Quantity for line ${index + 1}`}
                aria-invalid={short || undefined}
                className="text-right tabular-nums"
              />
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                value={line.rate}
                onChange={(event) => update(line.key, { rate: event.target.value })}
                aria-label={`Rate for line ${index + 1}`}
                className="text-right tabular-nums"
              />
              <p className="hidden h-9 items-center justify-end text-sm font-medium text-zinc-900 tabular-nums sm:flex">
                {formatCurrency(qty * (Number(line.rate) || 0))}
              </p>
              <button
                type="button"
                onClick={() => onChange(lines.length > 1 ? lines.filter((l) => l.key !== line.key) : [emptyLine()])}
                className="grid size-9 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                aria-label={`Remove line ${index + 1}`}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Button size="sm" variant="ghost" onClick={() => onChange([...lines, emptyLine()])} className="-ml-2 self-start">
          <Plus /> Add line
        </Button>
        <dl className="w-full space-y-1.5 rounded-xl bg-zinc-50 p-3.5 text-sm ring-1 ring-zinc-950/[0.05] sm:w-64">
          <div className="flex justify-between text-zinc-600">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{formatCurrency(totals.subtotal)}</dd>
          </div>
          <div className="flex justify-between text-zinc-600">
            <dt>GST ({GST_RATE * 100}%)</dt>
            <dd className="tabular-nums">{formatCurrency(totals.tax)}</dd>
          </div>
          <div className="flex justify-between border-t border-zinc-950/[0.08] pt-1.5 font-semibold text-zinc-900">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatCurrency(totals.total)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
