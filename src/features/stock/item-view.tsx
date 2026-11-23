"use client";

import { ArrowLeft, ArrowLeftRight, PackageX, Pencil, SlidersHorizontal, Truck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { StepChart } from "@/components/charts/step-chart";
import { useOpenDialog } from "@/components/layout/dialog-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Meter } from "@/components/ui/meter";
import { Stat } from "@/components/ui/stat";
import { formatCompactCurrency, formatCurrency, formatNumber, formatShortDate } from "@/lib/format";
import {
  byId,
  committedQty,
  emptiestGodownId,
  incomingQty,
  onHand,
  purchaseDisplayStatus,
  qtyAt,
  salesDisplayStatus,
  stockStatus,
  stockTimeline,
  suggestedReorderQty,
} from "@/lib/selectors";
import { useInventory } from "@/lib/store";
import { PurchaseStatusBadge, SalesStatusBadge, StockStatusBadge } from "../shared/status";
import { MovementsTable } from "./movements-table";

export function ItemView() {
  const { id } = useParams<{ id: string }>();
  const state = useInventory();
  const openDialog = useOpenDialog();
  const item = byId(state.items, id);

  const history = useMemo(() => {
    if (!item) return { movements: [], balances: new Map<string, number>() };
    const movements = state.movements
      .filter((m) => m.itemId === item.id)
      .sort((a, b) => b.date.localeCompare(a.date));
    // Walk back from today's quantity to get the balance after each movement.
    const balances = new Map<string, number>();
    let running = onHand(item);
    for (const move of movements) {
      balances.set(move.id, running);
      running -= move.qty;
    }
    return { movements, balances };
  }, [item, state.movements]);

  const timeline = useMemo(() => (item ? stockTimeline(state, item, 90) : []), [item, state]);

  if (!item) {
    return (
      <EmptyState
        icon={PackageX}
        title="Item not found"
        description="It may have been removed when the demo data was reset."
        action={<ButtonLink href="/stock">Back to stock</ButtonLink>}
      />
    );
  }

  const total = onHand(item);
  const status = stockStatus(item);
  const committed = committedQty(state, item.id);
  const incoming = incomingQty(state, item.id);
  const supplier = byId(state.suppliers, item.preferredSupplierId);
  const margin = item.sellPrice > 0 ? Math.round(((item.sellPrice - item.costPrice) / item.sellPrice) * 100) : 0;

  const openSales = state.salesOrders.filter((so) => so.status === "pending" && so.lines.some((l) => l.itemId === item.id));
  const openPurchases = state.purchaseOrders.filter((po) => po.status === "ordered" && po.lines.some((l) => l.itemId === item.id));

  function reorder() {
    openDialog({
      type: "purchase",
      prefill: {
        supplierId: item!.preferredSupplierId,
        godownId: emptiestGodownId(state, item!),
        lines: [{ itemId: item!.id, qty: suggestedReorderQty(item!, incoming) }],
      },
    });
  }

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/stock" className="inline-flex items-center gap-1 text-[13px] font-medium text-zinc-500 hover:text-zinc-800">
            <ArrowLeft className="size-3.5" /> Stock
          </Link>
        }
        title={
          <span className="flex flex-wrap items-center gap-3">
            {item.name}
            <StockStatusBadge status={status} />
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[13px]">{item.sku}</span>
            <span aria-hidden>·</span>
            <Badge dot={false}>{item.category}</Badge>
          </span>
        }
        actions={
          <>
            <Button onClick={() => openDialog({ type: "item", itemId: item.id })}>
              <Pencil /> Edit
            </Button>
            <Button onClick={() => openDialog({ type: "adjust", itemId: item.id })}>
              <SlidersHorizontal /> Adjust
            </Button>
            <Button onClick={() => openDialog({ type: "transfer", itemId: item.id })}>
              <ArrowLeftRight /> Transfer
            </Button>
            <Button variant="primary" onClick={reorder}>
              <Truck /> Reorder
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat label="On hand" value={formatNumber(total)} footer={`Minimum level ${item.minStock}`} />
        <Stat label="Committed" value={formatNumber(committed)} footer="On pending sales orders" />
        <Stat label="Incoming" value={formatNumber(incoming)} footer="On open purchase orders" />
        <Stat
          label="Available to sell"
          value={formatNumber(Math.max(0, total - committed))}
          footer={`Worth ${formatCompactCurrency(total * item.costPrice)} at cost`}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Stock level" description="Total units on hand, last 90 days" />
          <div className="px-5 pt-4 pb-5">
            <StepChart
              points={timeline}
              threshold={item.minStock}
              thresholdLabel={`Min ${item.minStock}`}
              title={`${item.name} stock level over the last 90 days`}
            />
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="By godown" />
            <ul className="space-y-4 px-5 pb-5">
              {state.godowns.map((g) => {
                const qty = qtyAt(item, g.id);
                return (
                  <li key={g.id}>
                    <div className="mb-1.5 flex items-baseline justify-between text-sm">
                      <span className="text-zinc-700">{g.name}</span>
                      <span className="font-semibold tabular-nums">{formatNumber(qty)}</span>
                    </div>
                    <Meter value={qty} max={Math.max(total, 1)} tone={qty === 0 ? "red" : "blue"} label={`${g.name} share`} />
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Pricing" />
            <dl className="grid grid-cols-3 gap-3 px-5 pb-5 text-sm">
              <div>
                <dt className="text-xs text-zinc-500">Cost</dt>
                <dd className="font-medium tabular-nums">{formatCurrency(item.costPrice)}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Selling</dt>
                <dd className="font-medium tabular-nums">{formatCurrency(item.sellPrice)}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Margin</dt>
                <dd className="font-medium tabular-nums">{margin}%</dd>
              </div>
              <div className="col-span-3">
                <dt className="text-xs text-zinc-500">Preferred supplier</dt>
                <dd className="font-medium">
                  {supplier ? (
                    <Link href={`/purchases?supplier=${supplier.id}`} className="hover:text-brand-700 hover:underline">
                      {supplier.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                  {supplier && <span className="font-normal text-zinc-500"> · {supplier.leadTimeDays}-day lead time</span>}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      {(openSales.length > 0 || openPurchases.length > 0) && (
        <Card className="mt-4">
          <CardHeader title="Open orders" description="Orders that will move this item's stock" />
          <ul className="divide-y divide-zinc-950/[0.05] border-t border-zinc-950/[0.06]">
            {openPurchases.map((po) => (
              <li key={po.id}>
                <Link href={`/purchases?order=${po.id}`} className="flex items-center gap-4 px-5 py-3 text-sm hover:bg-zinc-50">
                  <span className="w-20 font-medium">{po.number}</span>
                  <span className="flex-1 truncate text-zinc-600">
                    {byId(state.suppliers, po.supplierId)?.name} → {byId(state.godowns, po.godownId)?.name} · expected{" "}
                    {formatShortDate(po.expectedDate)}
                  </span>
                  <span className="font-medium text-emerald-600 tabular-nums">
                    +{po.lines.find((l) => l.itemId === item.id)?.qty}
                  </span>
                  <PurchaseStatusBadge status={purchaseDisplayStatus(po)} />
                </Link>
              </li>
            ))}
            {openSales.map((so) => (
              <li key={so.id}>
                <Link href={`/sales?order=${so.id}`} className="flex items-center gap-4 px-5 py-3 text-sm hover:bg-zinc-50">
                  <span className="w-20 font-medium">{so.number}</span>
                  <span className="flex-1 truncate text-zinc-600">
                    {byId(state.customers, so.customerId)?.name} · from {byId(state.godowns, so.godownId)?.name}
                  </span>
                  <span className="font-medium text-rose-600 tabular-nums">
                    −{so.lines.find((l) => l.itemId === item.id)?.qty}
                  </span>
                  <SalesStatusBadge status={salesDisplayStatus(so)} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader
          title="Stock history"
          description="Every movement of this item, newest first, with the total balance after each one"
        />
        <MovementsTable state={state} movements={history.movements} showItem={false} balances={history.balances} />
      </Card>
    </>
  );
}
