"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, FormError } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import type { ItemInput } from "@/lib/domain";
import { byId } from "@/lib/selectors";
import { actions, useInventory } from "@/lib/store";

/** Create a new item (with opening stock) or edit an existing one. */
export function ItemDialog({ itemId, onClose }: { itemId?: string; onClose: () => void }) {
  const state = useInventory();
  const router = useRouter();
  const existing = byId(state.items, itemId);

  const [form, setForm] = useState({
    name: existing?.name ?? "",
    sku: existing?.sku ?? "",
    category: existing?.category ?? "",
    unit: existing?.unit ?? "pcs",
    costPrice: existing ? String(existing.costPrice) : "",
    sellPrice: existing ? String(existing.sellPrice) : "",
    minStock: existing ? String(existing.minStock) : "10",
    preferredSupplierId: existing?.preferredSupplierId ?? state.suppliers[0]?.id ?? "",
  });
  const [opening, setOpening] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [key]: event.target.value });

  const categories = [...new Set(state.items.map((item) => item.category))].sort();
  const cost = Number(form.costPrice);
  const sell = Number(form.sellPrice);
  const margin = sell > 0 && cost >= 0 ? Math.round(((sell - cost) / sell) * 100) : null;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const input: ItemInput = {
      name: form.name,
      sku: form.sku,
      category: form.category.trim() || "Uncategorised",
      unit: form.unit.trim() || "pcs",
      costPrice: Number(form.costPrice),
      sellPrice: Number(form.sellPrice),
      minStock: Number(form.minStock),
      preferredSupplierId: form.preferredSupplierId,
    };
    const result = existing
      ? actions.updateItem(existing.id, input)
      : actions.createItem(
          input,
          Object.fromEntries(Object.entries(opening).map(([godown, qty]) => [godown, Math.max(0, Math.floor(Number(qty) || 0))])),
        );
    if (!result.ok) return setError(result.error);
    onClose();
    toast.success(existing ? "Item updated" : `${input.name.trim()} added`, {
      action: existing ? undefined : { label: "View", onClick: () => router.push(`/stock/${result.id}`) },
    });
  }

  return (
    <Dialog
      title={existing ? `Edit ${existing.name}` : "Add item"}
      description={existing ? "Changes apply to future orders. Past orders keep their prices." : "Add a product and, optionally, the stock you already hold."}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="item-form">
            {existing ? "Save changes" : "Add item"}
          </Button>
        </>
      }
    >
      <form id="item-form" onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Item name" className="sm:col-span-2">
            <Input value={form.name} onChange={set("name")} placeholder="e.g. Wireless Keyboard K380" required autoFocus />
          </Field>
          <Field label="SKU" hint="Unique code printed on labels.">
            <Input value={form.sku} onChange={set("sku")} placeholder="PER-KBD-380" className="font-mono uppercase" required />
          </Field>
          <Field label="Category">
            <Input value={form.category} onChange={set("category")} list="item-categories" placeholder="Peripherals" />
            <datalist id="item-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Cost price (₹)">
            <Input type="number" min={0} inputMode="decimal" value={form.costPrice} onChange={set("costPrice")} required />
          </Field>
          <Field label="Selling price (₹)" hint={margin !== null ? `Gross margin ${margin}%` : undefined}>
            <Input type="number" min={0} inputMode="decimal" value={form.sellPrice} onChange={set("sellPrice")} required />
          </Field>
          <Field label="Minimum stock level" hint="At or below this, the item shows as low stock.">
            <Input type="number" min={0} step={1} inputMode="numeric" value={form.minStock} onChange={set("minStock")} required />
          </Field>
          <Field label="Unit">
            <Input value={form.unit} onChange={set("unit")} placeholder="pcs" />
          </Field>
          <Field label="Preferred supplier" className="sm:col-span-2" hint="Used when you reorder from a low stock alert.">
            <Select value={form.preferredSupplierId} onChange={set("preferredSupplierId")}>
              {state.suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </Field>
        </div>

        {!existing && (
          <fieldset>
            <legend className="text-[13px] font-medium text-zinc-700">Opening stock</legend>
            <p className="mb-2 text-xs text-zinc-500">Quantity already on hand in each godown. Leave blank for none.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {state.godowns.map((g) => (
                <Field key={g.id} label={g.name}>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    placeholder="0"
                    value={opening[g.id] ?? ""}
                    onChange={(event) => setOpening({ ...opening, [g.id]: event.target.value })}
                  />
                </Field>
              ))}
            </div>
          </fieldset>
        )}

        <FormError message={error} />
      </form>
    </Dialog>
  );
}
