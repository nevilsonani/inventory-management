"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, FormError } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { formatSigned } from "@/lib/format";
import { byId, qtyAt } from "@/lib/selectors";
import { actions, useInventory } from "@/lib/store";
import { cn } from "@/lib/utils";

const reasons = [
  "Physical count correction",
  "Damaged / defective",
  "Lost or missing",
  "Customer return",
  "Found during audit",
];

interface AdjustStockDialogProps {
  itemId?: string;
  godownId?: string;
  onClose: () => void;
}

/** Record a physical count. The difference is booked as an adjustment. */
export function AdjustStockDialog({ itemId: initialItem, godownId: initialGodown, onClose }: AdjustStockDialogProps) {
  const state = useInventory();
  const [itemId, setItemId] = useState(initialItem ?? "");
  const [godownId, setGodownId] = useState(initialGodown ?? state.godowns[0].id);
  const [counted, setCounted] = useState("");
  const [reason, setReason] = useState(reasons[0]);
  const [error, setError] = useState<string | null>(null);

  const item = byId(state.items, itemId);
  const current = item ? qtyAt(item, godownId) : 0;
  const diff = counted === "" ? 0 : Number(counted) - current;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = actions.adjustStock({ itemId, godownId, countedQty: Number(counted), reason });
    if (!result.ok) return setError(result.error);
    onClose();
    toast.success(`Stock adjusted ${formatSigned(diff)}`, {
      description: `${item?.name} at ${byId(state.godowns, godownId)?.name} is now ${counted}.`,
    });
  }

  return (
    <Dialog
      title="Adjust stock"
      description="Enter what you physically counted. We'll book the difference."
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="adjust-form" disabled={!item || counted === ""}>
            Save adjustment
          </Button>
        </>
      }
    >
      <form id="adjust-form" onSubmit={submit} className="space-y-4">
        <Field label="Item">
          <Select value={itemId} onChange={(e) => setItemId(e.target.value)} autoFocus={!initialItem}>
            <option value="">Select an item…</option>
            {state.items.map((i) => (
              <option key={i.id} value={i.id}>{i.name} · {i.sku}</option>
            ))}
          </Select>
        </Field>
        <Field label="Godown">
          <Select value={godownId} onChange={(e) => setGodownId(e.target.value)}>
            {state.godowns.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-3 items-end gap-3">
          <div className="rounded-lg bg-zinc-50 px-3 py-2 ring-1 ring-zinc-950/[0.06]">
            <p className="text-xs text-zinc-500">In system</p>
            <p className="text-lg font-semibold tabular-nums">{item ? current : "—"}</p>
          </div>
          <Field label="Counted">
            <Input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={counted}
              onChange={(e) => setCounted(e.target.value)}
              className="h-[46px] text-lg font-semibold tabular-nums"
              autoFocus={!!initialItem}
              required
            />
          </Field>
          <div className="rounded-lg bg-zinc-50 px-3 py-2 ring-1 ring-zinc-950/[0.06]">
            <p className="text-xs text-zinc-500">Difference</p>
            <p
              className={cn(
                "text-lg font-semibold tabular-nums",
                diff > 0 && "text-emerald-600",
                diff < 0 && "text-rose-600",
              )}
            >
              {diff === 0 ? "0" : formatSigned(diff)}
            </p>
          </div>
        </div>

        <Field label="Reason">
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            {reasons.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </Field>

        <FormError message={error} />
      </form>
    </Dialog>
  );
}
