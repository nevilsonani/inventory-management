"use client";

import { ArrowLeftRight, ArrowRight, MapPin, Warehouse } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useOpenDialog } from "@/components/layout/dialog-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Meter } from "@/components/ui/meter";
import { SearchInput } from "@/components/ui/search-input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatCompactCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { byId, qtyAt } from "@/lib/selectors";
import { useInventory } from "@/lib/store";
import { matches, sum } from "@/lib/utils";

export function GodownsView() {
  const state = useInventory();
  const openDialog = useOpenDialog();
  const [query, setQuery] = useState("");

  const transfers = state.transfers
    .filter((t) => {
      const item = byId(state.items, t.itemId);
      return matches(query, t.number, item?.name, item?.sku, t.note);
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <PageHeader
        title="Godowns"
        description="Stock, value and space at each warehouse. Transfers move stock between them."
        actions={
          <Button variant="primary" onClick={() => openDialog({ type: "transfer" })}>
            <ArrowLeftRight /> Transfer stock
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {state.godowns.map((godown) => {
          const units = sum(state.items, (item) => qtyAt(item, godown.id));
          const value = sum(state.items, (item) => qtyAt(item, godown.id) * item.costPrice);
          const skus = state.items.filter((item) => qtyAt(item, godown.id) > 0).length;
          const empty = state.items.length - skus;
          const used = units / godown.capacity;
          const pending = state.salesOrders.filter((so) => so.status === "pending" && so.godownId === godown.id).length;
          const incoming = state.purchaseOrders.filter((po) => po.status === "ordered" && po.godownId === godown.id).length;
          return (
            <Card key={godown.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-zinc-900">{godown.name}</h2>
                  <p className="mt-0.5 flex items-center gap-1 text-[13px] text-zinc-500">
                    <MapPin className="size-3.5" aria-hidden /> {godown.city}
                  </p>
                </div>
                <span className="rounded-md bg-zinc-100 px-2 py-1 font-mono text-xs font-medium text-zinc-600">
                  {godown.code}
                </span>
              </div>

              <dl className="mt-5 grid grid-cols-3 gap-3">
                <div>
                  <dt className="text-xs text-zinc-500">Units</dt>
                  <dd className="text-lg font-semibold tabular-nums">{formatNumber(units)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Value</dt>
                  <dd className="text-lg font-semibold">{formatCompactCurrency(value)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Items</dt>
                  <dd className="text-lg font-semibold tabular-nums">{skus}</dd>
                </div>
              </dl>

              <div className="mt-5">
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-zinc-500">Space used</span>
                  <span className="font-medium text-zinc-700 tabular-nums">
                    {Math.round(used * 100)}% of {formatNumber(godown.capacity)}
                  </span>
                </div>
                <Meter value={units} max={godown.capacity} tone={used > 0.85 ? "amber" : "blue"} label={`${godown.name} space used`} />
              </div>

              <ul className="mt-5 space-y-1.5 border-t border-zinc-950/[0.06] pt-4 text-[13px] text-zinc-600">
                <li>{pending} sales {pending === 1 ? "order" : "orders"} waiting to dispatch</li>
                <li>{incoming} purchase {incoming === 1 ? "order" : "orders"} on the way</li>
                <li className={empty ? "text-amber-700" : undefined}>
                  {empty ? `${empty} items with no stock here` : "Every item in stock here"}
                </li>
              </ul>

              <div className="mt-auto flex gap-2 pt-5">
                <Link
                  href={`/stock?godown=${godown.id}`}
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:underline"
                >
                  View stock <ArrowRight className="size-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => openDialog({ type: "transfer", fromGodownId: godown.id })}
                  className="ml-auto text-[13px] font-medium text-zinc-600 hover:text-zinc-900 hover:underline"
                >
                  Transfer out
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Transfers"
          description="Stock moved between godowns"
          action={<SearchInput value={query} onChange={setQuery} placeholder="Search transfers" className="sm:w-56" />}
          className="flex-col sm:flex-row"
        />
        {transfers.length === 0 ? (
          <EmptyState
            icon={Warehouse}
            title={query ? "No transfers match" : "No transfers yet"}
            description="Move stock to where it sells. Transfers keep the total the same."
            action={
              <Button size="sm" onClick={() => openDialog({ type: "transfer" })}>
                <ArrowLeftRight /> Transfer stock
              </Button>
            }
            className="border-t border-zinc-950/[0.06]"
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Transfer</TH>
                <TH>Item</TH>
                <TH>Route</TH>
                <TH className="text-right">Qty</TH>
                <TH className="hidden md:table-cell">Note</TH>
              </tr>
            </THead>
            <TBody>
              {transfers.map((t) => {
                const item = byId(state.items, t.itemId);
                return (
                  <TR key={t.id}>
                    <TD>
                      <p className="font-medium">{t.number}</p>
                      <p className="text-xs text-zinc-500">{formatDateTime(t.date)}</p>
                    </TD>
                    <TD>
                      <Link href={`/stock/${t.itemId}`} className="font-medium hover:text-brand-700 hover:underline">
                        {item?.name}
                      </Link>
                      <p className="font-mono text-[11px] text-zinc-500">{item?.sku}</p>
                    </TD>
                    <TD className="text-zinc-600">
                      <span className="inline-flex items-center gap-1.5">
                        {byId(state.godowns, t.fromGodownId)?.code}
                        <ArrowRight className="size-3.5 text-zinc-400" aria-label="to" />
                        {byId(state.godowns, t.toGodownId)?.code}
                      </span>
                    </TD>
                    <TD className="text-right font-medium tabular-nums">{t.qty}</TD>
                    <TD className="hidden text-[13px] text-zinc-500 md:table-cell">{t.note ?? "—"}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
