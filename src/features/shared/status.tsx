import { Badge, type Tone } from "@/components/ui/badge";
import type { PurchaseDisplayStatus, SalesDisplayStatus, StockStatus } from "@/lib/selectors";
import type { MovementType } from "@/lib/types";

const salesStatus: Record<SalesDisplayStatus, [Tone, string]> = {
  pending: ["amber", "Pending"],
  dispatched: ["blue", "Dispatched"],
  overdue: ["red", "Overdue"],
  paid: ["green", "Paid"],
  cancelled: ["zinc", "Cancelled"],
};

const purchaseStatus: Record<PurchaseDisplayStatus, [Tone, string]> = {
  ordered: ["amber", "Pending"],
  delayed: ["red", "Delayed"],
  received: ["green", "Received"],
  cancelled: ["zinc", "Cancelled"],
};

const stockStatus: Record<StockStatus, [Tone, string]> = {
  in_stock: ["green", "In stock"],
  low: ["amber", "Low stock"],
  out: ["red", "Out of stock"],
};

export const movementLabels: Record<MovementType, string> = {
  opening: "Opening stock",
  purchase: "Purchase in",
  sale: "Sale out",
  adjustment: "Adjustment",
  transfer: "Transfer",
};

const movementTones: Record<MovementType, Tone> = {
  opening: "zinc",
  purchase: "green",
  sale: "blue",
  adjustment: "violet",
  transfer: "zinc",
};

export function SalesStatusBadge({ status }: { status: SalesDisplayStatus }) {
  const [tone, label] = salesStatus[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function PurchaseStatusBadge({ status }: { status: PurchaseDisplayStatus }) {
  const [tone, label] = purchaseStatus[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const [tone, label] = stockStatus[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function MovementBadge({ type }: { type: MovementType }) {
  return (
    <Badge tone={movementTones[type]} dot={false}>
      {movementLabels[type]}
    </Badge>
  );
}

export const stockTone = (status: StockStatus) =>
  status === "out" ? "red" : status === "low" ? "amber" : "green";
