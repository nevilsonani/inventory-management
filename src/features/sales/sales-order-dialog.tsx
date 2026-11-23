"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, FormError } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/field";
import { findShortages } from "@/lib/domain";
import { byId } from "@/lib/selectors";
import { actions, useInventory } from "@/lib/store";
import {
  draftLine,
  emptyLine,
  LineItemsEditor,
  toLineItems,
  type DraftLine,
} from "../shared/line-items-editor";

export interface SalePrefill {
  customerId?: string;
  godownId?: string;
  lines?: { itemId: string; qty: number }[];
}

export function SalesOrderDialog({ prefill, onClose }: { prefill?: SalePrefill; onClose: () => void }) {
  const state = useInventory();
  const router = useRouter();
  const [customerId, setCustomerId] = useState(prefill?.customerId ?? "");
  const [godownId, setGodownId] = useState(prefill?.godownId ?? state.godowns[0].id);
  const [lines, setLines] = useState<DraftLine[]>(() =>
    prefill?.lines?.length
      ? prefill.lines.map((l) => draftLine(l.itemId, l.qty, byId(state.items, l.itemId)?.sellPrice ?? 0))
      : [emptyLine()],
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const customer = byId(state.customers, customerId);
  const godown = byId(state.godowns, godownId);
  const items = toLineItems(lines);
  const shortages = findShortages(state, godownId, items);

  function submit(dispatch: boolean) {
    const result = actions.createSalesOrder({ customerId, godownId, lines: items, notes, dispatch });
    if (!result.ok) return setError(result.error);
    const order = byId(result.state.salesOrders, result.id)!;
    onClose();
    toast.success(dispatch ? `${order.number} dispatched` : `${order.number} saved as pending`, {
      description: dispatch
        ? `Stock reduced at ${godown?.name}. Invoice due in ${customer?.paymentTermsDays} days.`
        : "Stock will be reduced when you dispatch it.",
      action: { label: "View", onClick: () => router.push(`/sales?order=${order.id}`) },
    });
  }

  return (
    <Dialog
      title="New sales order"
      description="Dispatching reduces stock at the selected godown and raises the invoice."
      size="xl"
      onClose={onClose}
      footer={
        <>
          {shortages.length > 0 && (
            <p className="mr-auto text-[13px] text-rose-600">
              Not enough stock to dispatch. Save as pending until stock arrives.
            </p>
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={() => submit(false)}>Save as pending</Button>
          <Button variant="primary" onClick={() => submit(true)} disabled={shortages.length > 0}>
            <Send /> Create &amp; dispatch
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Customer"
            hint={
              customer
                ? `${customer.city} · GSTIN ${customer.gstin} · Net ${customer.paymentTermsDays} days`
                : undefined
            }
          >
            <Select value={customerId} onChange={(event) => setCustomerId(event.target.value)} autoFocus>
              <option value="">Select a customer…</option>
              {state.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.city}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Dispatch from">
            <Select value={godownId} onChange={(event) => setGodownId(event.target.value)}>
              {state.godowns.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.code})
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <LineItemsEditor
          state={state}
          lines={lines}
          onChange={setLines}
          price="sellPrice"
          godownId={godownId}
          checkAvailability
        />

        <Field label="Notes (optional)">
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Delivery instructions, PO reference…"
            rows={2}
          />
        </Field>

        <FormError message={error} />
      </div>
    </Dialog>
  );
}
