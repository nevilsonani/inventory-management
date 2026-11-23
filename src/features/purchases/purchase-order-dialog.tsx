"use client";

import { PackageCheck, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, FormError } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { byId } from "@/lib/selectors";
import { actions, useInventory } from "@/lib/store";
import { addDays } from "@/lib/utils";
import {
  draftLine,
  emptyLine,
  LineItemsEditor,
  toLineItems,
  type DraftLine,
} from "../shared/line-items-editor";

export interface PurchasePrefill {
  supplierId?: string;
  godownId?: string;
  lines?: { itemId: string; qty: number }[];
}

/** yyyy-mm-dd in local time, for <input type="date">. */
const toDateInput = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export function PurchaseOrderDialog({ prefill, onClose }: { prefill?: PurchasePrefill; onClose: () => void }) {
  const state = useInventory();
  const router = useRouter();
  const [supplierId, setSupplierId] = useState(prefill?.supplierId ?? "");
  const [godownId, setGodownId] = useState(prefill?.godownId ?? state.godowns[0].id);
  const [lines, setLines] = useState<DraftLine[]>(() =>
    prefill?.lines?.length
      ? prefill.lines.map((l) => draftLine(l.itemId, l.qty, byId(state.items, l.itemId)?.costPrice ?? 0))
      : [emptyLine()],
  );
  // Empty means "use the supplier's lead time".
  const [expected, setExpected] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const supplier = byId(state.suppliers, supplierId);
  const godown = byId(state.godowns, godownId);
  const defaultExpected = toDateInput(addDays(new Date(), supplier?.leadTimeDays ?? 7));

  function submit(receive: boolean) {
    const expectedDate = new Date(`${expected || defaultExpected}T18:00:00`).toISOString();
    const result = actions.createPurchaseOrder({
      supplierId,
      godownId,
      lines: toLineItems(lines),
      expectedDate,
      notes,
      receive,
    });
    if (!result.ok) return setError(result.error);
    const order = byId(result.state.purchaseOrders, result.id)!;
    onClose();
    toast.success(receive ? `${order.number} received` : `${order.number} sent to ${supplier?.name}`, {
      description: receive
        ? `Stock increased at ${godown?.name}.`
        : "Mark it received when the goods arrive to add them to stock.",
      action: { label: "View", onClick: () => router.push(`/purchases?order=${order.id}`) },
    });
  }

  return (
    <Dialog
      title="New purchase order"
      description="Receiving a purchase order adds its quantities to the selected godown."
      size="xl"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={() => submit(true)} title="Goods already arrived">
            <PackageCheck /> Save as received
          </Button>
          <Button variant="primary" onClick={() => submit(false)}>
            <Send /> Place order
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Supplier" hint={supplier ? `${supplier.city} · usual lead time ${supplier.leadTimeDays} days` : undefined}>
            <Select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} data-autofocus>
              <option value="">Select a supplier…</option>
              {state.suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Deliver to">
            <Select value={godownId} onChange={(event) => setGodownId(event.target.value)}>
              {state.godowns.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.code})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Expected delivery">
            <Input type="date" value={expected || defaultExpected} onChange={(event) => setExpected(event.target.value)} />
          </Field>
        </div>

        <LineItemsEditor
          state={state}
          lines={lines}
          onChange={setLines}
          price="costPrice"
          godownId={godownId}
          checkAvailability={false}
        />

        <Field label="Notes (optional)">
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Quotation number, delivery terms…"
            rows={2}
          />
        </Field>

        <FormError message={error} />
      </div>
    </Dialog>
  );
}
