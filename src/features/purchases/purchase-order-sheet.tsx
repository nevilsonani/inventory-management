"use client";

import { Ban, PackageCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, FormError } from "@/components/ui/dialog";
import { formatCurrency, formatDate, pluralize } from "@/lib/format";
import { byId, onHand, orderTotal, purchaseDisplayStatus, unitCount } from "@/lib/selectors";
import { actions, useInventory } from "@/lib/store";
import type { PurchaseOrder, Result } from "@/lib/types";
import { daysBetween } from "@/lib/utils";
import { InfoList, LinesTable, SectionTitle, Steps, SuccessNotice, type Step } from "../shared/order-parts";
import { PurchaseStatusBadge } from "../shared/status";

function purchaseSteps(order: PurchaseOrder): Step[] {
  if (order.status === "cancelled") {
    return [
      { label: "Ordered", date: order.date, state: "done" },
      { label: "Cancelled", date: order.cancelledAt, state: "cancelled" },
    ];
  }
  return [
    { label: "Ordered", date: order.date, state: "done" },
    { label: "In transit", state: order.receivedAt ? "done" : "current" },
    { label: "Received", date: order.receivedAt, state: order.receivedAt ? "done" : "upcoming" },
  ];
}

export function PurchaseOrderSheet({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const state = useInventory();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const order = byId(state.purchaseOrders, orderId);
  if (!order) {
    return (
      <Dialog title="Purchase order not found" variant="sheet" onClose={onClose}>
        <p className="text-sm text-zinc-600">This purchase order no longer exists. It may have been reset.</p>
      </Dialog>
    );
  }

  const supplier = byId(state.suppliers, order.supplierId)!;
  const godown = byId(state.godowns, order.godownId)!;
  const status = purchaseDisplayStatus(order);

  function run(result: Result, message: string) {
    setError(result.ok ? null : result.error);
    setNotice(result.ok ? message : null);
  }

  const expectedLine =
    status === "delayed"
      ? `${daysBetween(order.expectedDate, new Date())} days late`
      : order.status === "ordered"
        ? `Expected ${formatDate(order.expectedDate)}`
        : undefined;

  return (
    <Dialog
      variant="sheet"
      size="lg"
      title={order.number}
      meta={<PurchaseStatusBadge status={status} />}
      description={`${supplier.name} · ${formatCurrency(orderTotal(order))}${expectedLine ? ` · ${expectedLine}` : ""}`}
      onClose={onClose}
      footer={
        order.status === "ordered" ? (
          <>
            <Button
              variant="danger"
              className="mr-auto"
              onClick={() => run(actions.cancelPurchaseOrder(order.id), `${order.number} cancelled.`)}
            >
              <Ban /> Cancel PO
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                run(
                  actions.receivePurchaseOrder(order.id),
                  `Received. ${pluralize(unitCount(order.lines), "unit")} added to ${godown.name}.`,
                )
              }
            >
              <PackageCheck /> Mark as received
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>Close</Button>
        )
      }
    >
      <div className="space-y-6">
        <SuccessNotice message={notice} />
        <FormError message={error} />

        <Steps steps={purchaseSteps(order)} />

        <section>
          <SectionTitle>Supplier</SectionTitle>
          <InfoList
            items={[
              ["Name", supplier.name],
              ["Contact", supplier.contactName],
              ["Phone", supplier.phone],
              ["Email", supplier.email],
              ["Deliver to", `${godown.name}, ${godown.city}`],
              ["Expected", formatDate(order.expectedDate)],
            ]}
          />
        </section>

        <section>
          <SectionTitle>Items</SectionTitle>
          <LinesTable
            state={state}
            lines={order.lines}
            taxRate={order.taxRate}
            renderNote={(line) => {
              const item = byId(state.items, line.itemId);
              return item ? (
                <p className="mt-0.5 text-xs text-zinc-500">
                  {onHand(item)} on hand · min {item.minStock}
                </p>
              ) : null;
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
