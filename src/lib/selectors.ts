import type {
  InventoryState,
  Item,
  LineItem,
  PurchaseOrder,
  PurchaseStatus,
  SalesOrder,
  SalesStatus,
} from "./types";
import { formatMonth } from "./format";
import { sum } from "./utils";

/* ---------- Stock ---------- */

export const onHand = (item: Item) => sum(Object.values(item.stock), (qty) => qty);

export const qtyAt = (item: Item, godownId: string) => item.stock[godownId] ?? 0;

export type StockStatus = "in_stock" | "low" | "out";

export function stockStatus(item: Item, qty = onHand(item)): StockStatus {
  if (qty <= 0) return "out";
  if (qty <= item.minStock) return "low";
  return "in_stock";
}

export const stockValue = (item: Item) => onHand(item) * item.costPrice;

export const inventoryValue = (items: Item[]) => sum(items, stockValue);

/** Units on open purchase orders that have not arrived yet. */
export function incomingQty(state: InventoryState, itemId: string) {
  return sum(
    state.purchaseOrders.filter((po) => po.status === "ordered"),
    (po) => sum(po.lines.filter((l) => l.itemId === itemId), (l) => l.qty),
  );
}

/** Units promised on sales orders that have not been dispatched yet. */
export function committedQty(state: InventoryState, itemId: string) {
  return sum(
    state.salesOrders.filter((so) => so.status === "pending"),
    (so) => sum(so.lines.filter((l) => l.itemId === itemId), (l) => l.qty),
  );
}

/** Items at or below their reorder point, most urgent first. */
export function lowStockItems(items: Item[]) {
  return items
    .filter((item) => stockStatus(item) !== "in_stock")
    .sort((a, b) => onHand(a) / a.minStock - onHand(b) / b.minStock);
}

/** Enough to get back to twice the reorder point, in packs of 5. */
export function suggestedReorderQty(item: Item, incoming: number) {
  const needed = item.minStock * 2 - onHand(item) - incoming;
  return Math.max(5, Math.ceil(Math.max(needed, item.minStock) / 5) * 5);
}

/** The godown holding the least of an item: the natural place to restock. */
export function emptiestGodownId(state: InventoryState, item: Item) {
  return [...state.godowns].sort((a, b) => qtyAt(item, a.id) - qtyAt(item, b.id))[0]?.id;
}

/* ---------- Orders ---------- */

export function orderTotals(order: { lines: LineItem[]; taxRate: number }) {
  const subtotal = sum(order.lines, (line) => line.qty * line.rate);
  const tax = Math.round(subtotal * order.taxRate);
  return { subtotal, tax, total: subtotal + tax };
}

export const orderTotal = (order: { lines: LineItem[]; taxRate: number }) =>
  orderTotals(order).total;

export const unitCount = (lines: LineItem[]) => sum(lines, (line) => line.qty);

export type SalesDisplayStatus = SalesStatus | "overdue";

export function salesDisplayStatus(order: SalesOrder, now = new Date()): SalesDisplayStatus {
  if (order.status === "dispatched" && order.dueDate && new Date(order.dueDate) < now) {
    return "overdue";
  }
  return order.status;
}

export type PurchaseDisplayStatus = PurchaseStatus | "delayed";

export function purchaseDisplayStatus(
  order: PurchaseOrder,
  now = new Date(),
): PurchaseDisplayStatus {
  if (order.status === "ordered" && new Date(order.expectedDate) < now) return "delayed";
  return order.status;
}

/** A sale counts as revenue once it is invoiced, i.e. dispatched. */
export const isInvoiced = (order: SalesOrder) =>
  order.status === "dispatched" || order.status === "paid";

export const invoiceDate = (order: SalesOrder) => order.dispatchedAt ?? order.date;

/** Outstanding receivables: invoiced but not yet paid. */
export const isUnpaid = (order: SalesOrder) => order.status === "dispatched";

/* ---------- Time series ---------- */

export function inRange(iso: string | undefined, from: Date, to: Date) {
  if (!iso) return false;
  const time = new Date(iso).getTime();
  return time >= from.getTime() && time < to.getTime();
}

/** Sales invoiced (dispatched) in [from, to). */
export const invoicedBetween = (state: InventoryState, from: Date, to: Date) =>
  state.salesOrders.filter((so) => isInvoiced(so) && inRange(invoiceDate(so), from, to));

/** Purchase orders received in [from, to). */
export const receivedBetween = (state: InventoryState, from: Date, to: Date) =>
  state.purchaseOrders.filter((po) => po.status === "received" && inRange(po.receivedAt, from, to));

export const revenueBetween = (state: InventoryState, from: Date, to: Date) =>
  sum(invoicedBetween(state, from, to), orderTotal);

export const purchasesBetween = (state: InventoryState, from: Date, to: Date) =>
  sum(receivedBetween(state, from, to), orderTotal);

/** Totals per key, largest first. E.g. revenue per customer. */
export function groupTotals<T>(rows: T[], key: (row: T) => string, value: (row: T) => number) {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(key(row), (totals.get(key(row)) ?? 0) + value(row));
  return [...totals]
    .map(([group, total]) => ({ key: group, total }))
    .sort((a, b) => b.total - a.total);
}

export interface MonthPoint {
  key: string;
  label: string;
  sales: number;
  purchases: number;
}

/** Invoiced sales and received purchases for the last `months` calendar months. */
export function monthlyTotals(state: InventoryState, months: number, now = new Date()) {
  const points: MonthPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    points.push({
      key: `${from.getFullYear()}-${from.getMonth()}`,
      label: formatMonth(from),
      sales: revenueBetween(state, from, to),
      purchases: purchasesBetween(state, from, to),
    });
  }
  return points;
}

/** Total on-hand quantity of one item at the end of each of the last `days` days. */
export function stockTimeline(state: InventoryState, item: Item, days: number, now = new Date()) {
  const moves = state.movements
    .filter((m) => m.itemId === item.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  let level = onHand(item);
  let cursor = 0;
  const points: { date: Date; qty: number }[] = [];
  // Walk backwards from today, undoing movements that happened after each day's end.
  for (let i = 0; i < days; i++) {
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
    while (cursor < moves.length && new Date(moves[cursor].date) >= dayEnd) {
      level -= moves[cursor].qty;
      cursor++;
    }
    points.unshift({ date: new Date(dayEnd.getTime() - 1), qty: level });
  }
  return points;
}

/* ---------- Lookups ---------- */

export function byId<T extends { id: string }>(list: T[], id: string | undefined) {
  return list.find((entry) => entry.id === id);
}
