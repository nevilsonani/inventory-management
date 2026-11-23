"use client";

import { CircleDollarSign, Download, Plus, ReceiptText, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { useOpenDialog } from "@/components/layout/dialog-provider";
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
  isUnpaid,
  orderTotal,
  revenueBetween,
  salesDisplayStatus,
  unitCount,
  type SalesDisplayStatus,
} from "@/lib/selectors";
import { actions, useInventory } from "@/lib/store";
import type { SalesOrder } from "@/lib/types";
import { useQueryState } from "@/lib/use-query-state";
import { daysBetween, matches, sum } from "@/lib/utils";
import { SalesStatusBadge } from "../shared/status";
import { SalesOrderSheet } from "./sales-order-sheet";

const filters = ["all", "pending", "dispatched", "overdue", "paid", "cancelled"] as const;
type Filter = (typeof filters)[number];

const filterLabels: Record<Filter, string> = {
  all: "All",
  pending: "Pending",
  dispatched: "Dispatched",
  overdue: "Overdue",
  paid: "Paid",
  cancelled: "Cancelled",
};

function paymentNote(order: SalesOrder, status: SalesDisplayStatus) {
  const now = new Date();
  if (status === "pending") return "Awaiting dispatch";
  if (status === "cancelled") return "—";
  if (status === "paid") return `Paid ${formatShortDate(order.paidAt!)}`;
  const days = daysBetween(now, order.dueDate!);
  if (status === "overdue") return <span className="font-medium text-rose-600">{Math.abs(days)}d overdue</span>;
  return days === 0 ? "Due today" : `Due in ${days}d`;
}

export function SalesView() {
  const state = useInventory();
  const openDialog = useOpenDialog();
  const [filter, setFilter] = useQueryState<Filter>("status", "all", filters);
  const [customerId, setCustomerId] = useQueryState("customer", "");
  const [godownId, setGodownId] = useQueryState("godown", "");
  const [openOrderId, setOpenOrderId] = useQueryState("order", "");
  const [query, setQuery] = useState("");

  const rows = useMemo(
    () =>
      state.salesOrders
        .map((order) => ({
          order,
          status: salesDisplayStatus(order),
          customer: byId(state.customers, order.customerId)!,
          godown: byId(state.godowns, order.godownId)!,
        }))
        .sort((a, b) => b.order.date.localeCompare(a.order.date)),
    [state],
  );

  const scoped = rows.filter(
    (row) =>
      (!customerId || row.order.customerId === customerId) &&
      (!godownId || row.order.godownId === godownId) &&
      matches(query, row.order.number, row.customer.name, row.customer.city),
  );
  const counts = Object.fromEntries(
    filters.map((f) => [f, f === "all" ? scoped.length : scoped.filter((row) => row.status === f).length]),
  ) as Record<Filter, number>;
  const visible = scoped.filter((row) => filter === "all" || row.status === filter);

  // Summary tiles
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const unpaid = state.salesOrders.filter(isUnpaid);
  const overdue = unpaid.filter((so) => salesDisplayStatus(so) === "overdue");
  const pending = state.salesOrders.filter((so) => so.status === "pending");

  function quickAction(order: SalesOrder) {
    const result =
      order.status === "pending" ? actions.dispatchSalesOrder(order.id) : actions.markSalesOrderPaid(order.id);
    if (!result.ok) {
      toast.error("Couldn't complete that", {
        description: result.error,
        action: { label: "Open order", onClick: () => setOpenOrderId(order.id) },
      });
    } else {
      toast.success(
        order.status === "pending" ? `${order.number} dispatched · stock reduced` : `${order.number} marked as paid`,
      );
    }
  }

  function exportCsv() {
    downloadCsv(
      "sales-orders.csv",
      ["Order", "Date", "Customer", "City", "Godown", "Units", "Amount (INR)", "Status", "Due date", "Paid on"],
      visible.map(({ order, status, customer, godown }) => [
        order.number,
        formatDate(order.date),
        customer.name,
        customer.city,
        godown.name,
        unitCount(order.lines),
        orderTotal(order),
        filterLabels[status],
        order.dueDate ? formatDate(order.dueDate) : "",
        order.paidAt ? formatDate(order.paidAt) : "",
      ]),
    );
  }

  return (
    <>
      <PageHeader
        title="Sales"
        description="Sales orders and invoices. Dispatching an order reduces stock at its godown."
        actions={
          <>
            <Button onClick={exportCsv}>
              <Download /> Export
            </Button>
            <Button variant="primary" onClick={() => openDialog({ type: "sale" })}>
              <Plus /> New sales order
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat
          label="Invoiced this month"
          value={formatCompactCurrency(revenueBetween(state, monthStart, now))}
          footer={`Since ${formatShortDate(monthStart.toISOString())}`}
        />
        <Stat
          label="Outstanding"
          value={formatCompactCurrency(sum(unpaid, orderTotal))}
          footer={pluralize(unpaid.length, "unpaid invoice")}
        />
        <Stat
          label="Overdue"
          value={formatCompactCurrency(sum(overdue, orderTotal))}
          footer={
            overdue.length ? (
              <button type="button" onClick={() => setFilter("overdue")} className="font-medium text-rose-600 hover:underline">
                {pluralize(overdue.length, "invoice")} past due →
              </button>
            ) : (
              "Nothing overdue"
            )
          }
        />
        <Stat
          label="Awaiting dispatch"
          value={pending.length}
          footer={
            pending.length ? (
              <button type="button" onClick={() => setFilter("pending")} className="font-medium text-brand-700 hover:underline">
                Worth {formatCompactCurrency(sum(pending, orderTotal))} →
              </button>
            ) : (
              "All orders dispatched"
            )
          }
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
            <SearchInput value={query} onChange={setQuery} placeholder="Search order or customer" className="sm:w-60" />
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value || null)} aria-label="Customer" className="sm:w-48">
              <option value="">All customers</option>
              {state.customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
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
            icon={ReceiptText}
            title="No sales orders match"
            description="Try a different status, customer or search term."
            action={
              <Button
                size="sm"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                  setCustomerId(null);
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
                <TH>Order</TH>
                <TH>Customer</TH>
                <TH className="hidden md:table-cell">Godown</TH>
                <TH className="text-right">Units</TH>
                <TH className="text-right">Amount</TH>
                <TH>Status</TH>
                <TH className="hidden lg:table-cell">Payment</TH>
                <TH className="w-px"><span className="sr-only">Actions</span></TH>
              </tr>
            </THead>
            <TBody>
              {visible.map(({ order, status, customer, godown }) => (
                <TR key={order.id} className={clickableRow} onClick={() => setOpenOrderId(order.id)}>
                  <TD>
                    <button type="button" className="font-medium text-zinc-900 outline-none hover:underline focus-visible:underline">
                      {order.number}
                    </button>
                    <p className="text-xs text-zinc-500">{formatDate(order.date)}</p>
                  </TD>
                  <TD>
                    <p className="max-w-56 truncate text-zinc-900">{customer.name}</p>
                    <p className="text-xs text-zinc-500">{customer.city}</p>
                  </TD>
                  <TD className="hidden text-zinc-600 md:table-cell">{godown.name}</TD>
                  <TD className="text-right text-zinc-600 tabular-nums">{unitCount(order.lines)}</TD>
                  <TD className="text-right font-medium tabular-nums">{formatCurrency(orderTotal(order))}</TD>
                  <TD><SalesStatusBadge status={status} /></TD>
                  <TD className="hidden text-[13px] text-zinc-500 lg:table-cell">{paymentNote(order, status)}</TD>
                  <TD onClick={(event) => event.stopPropagation()}>
                    {order.status === "pending" && (
                      <Button size="sm" onClick={() => quickAction(order)}>
                        <Send /> Dispatch
                      </Button>
                    )}
                    {order.status === "dispatched" && (
                      <Button size="sm" onClick={() => quickAction(order)}>
                        <CircleDollarSign /> Mark paid
                      </Button>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {openOrderId && <SalesOrderSheet orderId={openOrderId} onClose={() => setOpenOrderId(null)} />}
    </>
  );
}
