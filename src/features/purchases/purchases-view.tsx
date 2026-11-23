"use client";

import { Download, PackageCheck, Plus, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useOpenDialog } from "@/components/layout/dialog-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/field";
import { SearchInput } from "@/components/ui/search-input";
import { Segmented } from "@/components/ui/segmented";
import { Stat } from "@/components/ui/stat";
import { Table, TBody, TD, TH, THead, TR, clickableRow } from "@/components/ui/table";
import { downloadCsv } from "@/lib/csv";
import { formatCompactCurrency, formatCurrency, formatDate, formatShortDate, pluralize } from "@/lib/format";
import {
  byId,
  orderTotal,
  purchaseDisplayStatus,
  purchasesBetween,
  unitCount,
  type PurchaseDisplayStatus,
} from "@/lib/selectors";
import { actions, useInventory } from "@/lib/store";
import type { PurchaseOrder } from "@/lib/types";
import { useQueryState } from "@/lib/use-query-state";
import { addDays, daysBetween, matches, sum } from "@/lib/utils";
import { PurchaseStatusBadge } from "../shared/status";
import { PurchaseOrderSheet } from "./purchase-order-sheet";

const filters = ["all", "ordered", "delayed", "received", "cancelled"] as const;
type Filter = (typeof filters)[number];

const filterLabels: Record<Filter, string> = {
  all: "All",
  ordered: "Pending",
  delayed: "Delayed",
  received: "Received",
  cancelled: "Cancelled",
};

function deliveryNote(order: PurchaseOrder, status: PurchaseDisplayStatus) {
  if (status === "received") return `Received ${formatShortDate(order.receivedAt!)}`;
  if (status === "cancelled") return "—";
  const days = daysBetween(new Date(), order.expectedDate);
  if (status === "delayed") return <span className="font-medium text-rose-600">{Math.abs(days)}d late</span>;
  return days === 0 ? "Arriving today" : `Arriving in ${days}d`;
}

export function PurchasesView() {
  const state = useInventory();
  const openDialog = useOpenDialog();
  const [filter, setFilter] = useQueryState<Filter>("status", "all", filters);
  const [supplierId, setSupplierId] = useQueryState("supplier", "");
  const [godownId, setGodownId] = useQueryState("godown", "");
  const [openOrderId, setOpenOrderId] = useQueryState("order", "");
  const [query, setQuery] = useState("");

  const rows = useMemo(
    () =>
      state.purchaseOrders
        .map((order) => ({
          order,
          status: purchaseDisplayStatus(order),
          supplier: byId(state.suppliers, order.supplierId)!,
          godown: byId(state.godowns, order.godownId)!,
        }))
        .sort((a, b) => b.order.date.localeCompare(a.order.date)),
    [state],
  );

  const scoped = rows.filter(
    (row) =>
      (!supplierId || row.order.supplierId === supplierId) &&
      (!godownId || row.order.godownId === godownId) &&
      matches(query, row.order.number, row.supplier.name),
  );
  const counts = Object.fromEntries(
    filters.map((f) => [f, f === "all" ? scoped.length : scoped.filter((row) => row.status === f).length]),
  ) as Record<Filter, number>;
  const visible = scoped.filter((row) => filter === "all" || row.status === filter);

  const now = new Date();
  const open = state.purchaseOrders.filter((po) => po.status === "ordered");
  const delayed = open.filter((po) => purchaseDisplayStatus(po) === "delayed");
  const arrivingSoon = open.filter((po) => new Date(po.expectedDate) <= addDays(now, 7) && !delayed.includes(po));

  function receive(order: PurchaseOrder) {
    const result = actions.receivePurchaseOrder(order.id);
    if (!result.ok) toast.error(result.error);
    else
      toast.success(`${order.number} received`, {
        description: `${pluralize(unitCount(order.lines), "unit")} added to ${byId(state.godowns, order.godownId)?.name}.`,
      });
  }

  function exportCsv() {
    downloadCsv(
      "purchase-orders.csv",
      ["PO", "Date", "Supplier", "Deliver to", "Units", "Amount (INR)", "Status", "Expected", "Received on"],
      visible.map(({ order, status, supplier, godown }) => [
        order.number,
        formatDate(order.date),
        supplier.name,
        godown.name,
        unitCount(order.lines),
        orderTotal(order),
        filterLabels[status],
        formatDate(order.expectedDate),
        order.receivedAt ? formatDate(order.receivedAt) : "",
      ]),
    );
  }

  return (
    <>
      <PageHeader
        title="Purchases"
        description="Purchase orders to suppliers. Receiving an order adds its stock to the godown."
        actions={
          <>
            <Button onClick={exportCsv}>
              <Download /> Export
            </Button>
            <Button variant="primary" onClick={() => openDialog({ type: "purchase" })}>
              <Plus /> New purchase order
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat
          label="Open orders"
          value={formatCompactCurrency(sum(open, orderTotal))}
          footer={pluralize(open.length, "order") + " in transit"}
        />
        <Stat
          label="Arriving this week"
          value={arrivingSoon.length}
          footer={`${pluralize(sum(arrivingSoon, (po) => unitCount(po.lines)), "unit")} expected`}
        />
        <Stat
          label="Delayed"
          value={delayed.length}
          footer={
            delayed.length ? (
              <button type="button" onClick={() => setFilter("delayed")} className="font-medium text-rose-600 hover:underline">
                Follow up with suppliers →
              </button>
            ) : (
              "Everything on schedule"
            )
          }
        />
        <Stat
          label="Received · last 30 days"
          value={formatCompactCurrency(purchasesBetween(state, addDays(now, -30), now))}
          footer="Value of goods received"
        />
      </div>

      <Card>
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <Segmented
            label="Filter by status"
            value={filter}
            onChange={setFilter}
            options={filters.map((f) => ({ value: f, label: filterLabels[f], count: counts[f] }))}
          />
          <div className="flex flex-col gap-2 sm:flex-row lg:ml-auto">
            <SearchInput value={query} onChange={setQuery} placeholder="Search PO or supplier" className="sm:w-60" />
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value || null)} aria-label="Supplier" className="sm:w-48">
              <option value="">All suppliers</option>
              {state.suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
            <Select value={godownId} onChange={(e) => setGodownId(e.target.value || null)} aria-label="Godown" className="sm:w-44">
              <option value="">All godowns</option>
              {state.godowns.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </Select>
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No purchase orders match"
            description="Try a different status, supplier or search term."
            action={
              <Button
                size="sm"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                  setSupplierId(null);
                  setGodownId(null);
                }}
              >
                Clear filters
              </Button>
            }
            className="border-t border-zinc-950/[0.06]"
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Purchase order</TH>
                <TH>Supplier</TH>
                <TH className="hidden md:table-cell">Deliver to</TH>
                <TH className="text-right">Units</TH>
                <TH className="text-right">Amount</TH>
                <TH>Status</TH>
                <TH className="hidden lg:table-cell">Delivery</TH>
                <TH className="w-px"><span className="sr-only">Actions</span></TH>
              </tr>
            </THead>
            <TBody>
              {visible.map(({ order, status, supplier, godown }) => (
                <TR key={order.id} className={clickableRow} onClick={() => setOpenOrderId(order.id)}>
                  <TD>
                    <button type="button" className="font-medium text-zinc-900 outline-none hover:underline focus-visible:underline">
                      {order.number}
                    </button>
                    <p className="text-xs text-zinc-500">{formatDate(order.date)}</p>
                  </TD>
                  <TD>
                    <p className="max-w-56 truncate text-zinc-900">{supplier.name}</p>
                    <p className="text-xs text-zinc-500">{supplier.city}</p>
                  </TD>
                  <TD className="hidden text-zinc-600 md:table-cell">{godown.name}</TD>
                  <TD className="text-right text-zinc-600 tabular-nums">{unitCount(order.lines)}</TD>
                  <TD className="text-right font-medium tabular-nums">{formatCurrency(orderTotal(order))}</TD>
                  <TD><PurchaseStatusBadge status={status} /></TD>
                  <TD className="hidden text-[13px] text-zinc-500 lg:table-cell">{deliveryNote(order, status)}</TD>
                  <TD onClick={(event) => event.stopPropagation()}>
                    {order.status === "ordered" && (
                      <Button size="sm" onClick={() => receive(order)}>
                        <PackageCheck /> Receive
                      </Button>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {openOrderId && <PurchaseOrderSheet orderId={openOrderId} onClose={() => setOpenOrderId(null)} />}
    </>
  );
}
