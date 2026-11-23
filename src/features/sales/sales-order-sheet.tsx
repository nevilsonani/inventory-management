"use client";

import { Ban, CircleDollarSign, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, FormError } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { byId, orderTotal, qtyAt, salesDisplayStatus } from "@/lib/selectors";
import { actions, useInventory } from "@/lib/store";
import type { Result, SalesOrder } from "@/lib/types";
import { daysBetween } from "@/lib/utils";
import { InfoList, LinesTable, SectionTitle, Steps, SuccessNotice, type Step } from "../shared/order-parts";
import { SalesStatusBadge } from "../shared/status";

function salesSteps(order: SalesOrder): Step[] {
  if (order.status === "cancelled") {
    return [
      { label: "Created", date: order.date, state: "done" },
      { label: "Cancelled", date: order.cancelledAt, state: "cancelled" },
    ];
  }
  return [
    { label: "Created", date: order.date, state: "done" },
    { label: "Dispatched", date: order.dispatchedAt, state: order.dispatchedAt ? "done" : "current" },
    {
      label: "Paid",
      date: order.paidAt,
      state: order.paidAt ? "done" : order.dispatchedAt ? "current" : "upcoming",
    },
  ];
}

export function SalesOrderSheet({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const state = useInventory();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const order = byId(state.salesOrders, orderId);
  if (!order) {
    return (
      <Dialog title="Order not found" variant="sheet" onClose={onClose}>
        <p className="text-sm text-zinc-600">This sales order no longer exists. It may have been reset.</p>
      </Dialog>
    );
  }

  const customer = byId(state.customers, order.customerId)!;
  const godown = byId(state.godowns, order.godownId)!;
  const status = salesDisplayStatus(order);

  function run(result: Result, message: string) {
    setError(result.ok ? null : result.error);
    setNotice(result.ok ? message : null);
  }

  const dueLine =
    order.status === "dispatched" && order.dueDate
      ? status === "overdue"
        ? `Overdue by ${daysBetween(order.dueDate, new Date())} days`
        : `Due ${formatDate(order.dueDate)}`
      : undefined;

  return (
    <Dialog
      variant="sheet"
      size="lg"
      title={order.number}
      meta={<SalesStatusBadge status={status} />}
      description={`${customer.name} · ${formatCurrency(orderTotal(order))}${dueLine ? ` · ${dueLine}` : ""}`}
      onClose={onClose}
      footer={
        <>
          {order.status === "pending" && (
            <>
              <Button
                variant="danger"
                className="mr-auto"
                onClick={() => run(actions.cancelSalesOrder(order.id), `${order.number} cancelled. No stock was moved.`)}
              >
                <Ban /> Cancel order
              </Button>
              <Button
                variant="primary"
                onClick={() =>
                  run(
                    actions.dispatchSalesOrder(order.id),
                    `Dispatched. Stock reduced at ${godown.name} and invoice raised (Net ${customer.paymentTermsDays}).`,
                  )
                }
              >
                <Send /> Dispatch order
              </Button>
            </>
          )}
          {order.status === "dispatched" && (
            <Button
              variant="primary"
              onClick={() =>
                run(actions.markSalesOrderPaid(order.id), `Payment of ${formatCurrency(orderTotal(order))} recorded.`)
              }
            >
              <CircleDollarSign /> Record payment
            </Button>
          )}
          {(order.status === "paid" || order.status === "cancelled") && <Button onClick={onClose}>Close</Button>}
        </>
      }
    >
      <div className="space-y-6">
        <SuccessNotice message={notice} />
        <FormError message={error} />

        <Steps steps={salesSteps(order)} />

        <section>
          <SectionTitle>Customer</SectionTitle>
          <InfoList
            items={[
              ["Name", customer.name],
              ["Contact", customer.contactName],
              ["Phone", customer.phone],
              ["Email", customer.email],
              ["GSTIN", <span key="gstin" className="font-mono text-[13px]">{customer.gstin}</span>],
              ["Payment terms", `Net ${customer.paymentTermsDays} days`],
            ]}
          />
        </section>

        <section>
          <SectionTitle>Items · from {godown.name}</SectionTitle>
          <LinesTable
            state={state}
            lines={order.lines}
            taxRate={order.taxRate}
            renderNote={(line) => {
              if (order.status !== "pending") return null;
              const item = byId(state.items, line.itemId);
              const available = item ? qtyAt(item, order.godownId) : 0;
              return available < line.qty ? (
                <p className="mt-0.5 text-xs font-medium text-rose-600">Only {available} available</p>
              ) : (
                <p className="mt-0.5 text-xs text-emerald-700">{available} available</p>
              );
            }}
          />
        </section>

        {order.notes && (
          <section>
            <SectionTitle>Notes</SectionTitle>
            <p className="text-sm text-zinc-700">{order.notes}</p>
          </section>
        )}
      </div>
    </Dialog>
  );
}
