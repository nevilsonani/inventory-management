"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, FormError } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { byId, qtyAt } from "@/lib/selectors";
import { actions, useInventory } from "@/lib/store";

interface TransferDialogProps {
  itemId?: string;
  fromGodownId?: string;
  onClose: () => void;
}

export function TransferDialog({ itemId: initialItem, fromGodownId, onClose }: TransferDialogProps) {
  const state = useInventory();
  const [itemId, setItemId] = useState(initialItem ?? "");
  const [from, setFrom] = useState(fromGodownId ?? state.godowns[0].id);
  const [to, setTo] = useState(state.godowns.find((g) => g.id !== (fromGodownId ?? state.godowns[0].id))?.id ?? "");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const item = byId(state.items, itemId);
  const available = item ? qtyAt(item, from) : 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = actions.transferStock({ itemId, fromGodownId: from, toGodownId: to, qty: Number(qty), note });
    if (!result.ok) return setError(result.error);
    onClose();
    toast.success(`${result.id}: ${qty} × ${item?.name} moved`, {
      description: `${byId(state.godowns, from)?.name} → ${byId(state.godowns, to)?.name}`,
    });
  }

  return (
    <Dialog
      title="Transfer stock"
      description="Move units between godowns. Total stock stays the same."
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="transfer-form">
            Transfer
          </Button>
        </>
      }
    >
      <form id="transfer-form" onSubmit={submit} className="space-y-4">
        <Field label="Item">
          <Select value={itemId} onChange={(e) => setItemId(e.target.value)} autoFocus={!initialItem}>
            <option value="">Select an item…</option>
            {state.items.map((i) => (
              <option key={i.id} value={i.id}>{i.name} · {i.sku}</option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <Field label="From" hint={item ? `${available} available` : undefined}>
            <Select
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                if (e.target.value === to) setTo(state.godowns.find((g) => g.id !== e.target.value)?.id ?? "");
              }}
            >
              {state.godowns.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </Select>
          </Field>
          <ArrowRight className={`size-4 text-zinc-400 ${item ? "mb-[30px]" : "mb-2.5"}`} aria-hidden />
          <Field label="To" hint={item && to ? `${qtyAt(item, to)} there now` : undefined}>
            <Select value={to} onChange={(e) => setTo(e.target.value)}>
              {state.godowns.map((g) => (
                <option key={g.id} value={g.id} disabled={g.id === from}>{g.name}</option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Quantity">
          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              max={available || undefined}
              step={1}
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="tabular-nums"
              autoFocus={!!initialItem}
              required
            />
            <Button onClick={() => setQty(String(available))} disabled={!available}>
              Max
            </Button>
          </div>
        </Field>

        <Field label="Note (optional)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Rebalancing for festive season" />
        </Field>

        <FormError message={error} />
      </form>
    </Dialog>
  );
}
