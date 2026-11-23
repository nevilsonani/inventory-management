/**
 * Business rules. Every function is pure: it takes the current state and
 * returns either the next state or a human-readable error. The store applies
 * the result; the seed data is built by replaying these same functions, so
 * sample data always follows the same rules as the UI.
 */
import type {
  Activity,
  Customer,
  InventoryState,
  Item,
  LineItem,
  PurchaseOrder,
  Result,
  SalesOrder,
  StockMovement,
  Supplier,
} from "./types";
import { byId, orderTotal, qtyAt, unitCount } from "./selectors";
import { formatCurrency, pluralize } from "./format";
import { addDays, uid } from "./utils";

export const GST_RATE = 0.18;
const MAX_ACTIVITY = 150;

/* ---------- Helpers ---------- */

const ok = (state: InventoryState, id?: string): Result => ({ ok: true, state, id });
const fail = (error: string): Result => ({ ok: false, error });

function nextNumber(docs: { number: string }[], prefix: string, start: number) {
  const highest = docs.reduce(
    (max, doc) => Math.max(max, Number(doc.number.split("-")[1]) || 0),
    start - 1,
  );
  return `${prefix}-${highest + 1}`;
}

function log(state: InventoryState, entry: Omit<Activity, "id">): InventoryState {
  const activity = [{ ...entry, id: uid("act") }, ...state.activity].slice(0, MAX_ACTIVITY);
  return { ...state, activity };
}

/** Writes ledger rows and updates the per-godown quantity cache in one step. */
function applyMovements(
  state: InventoryState,
  moves: Omit<StockMovement, "id">[],
): InventoryState {
  const items = state.items.map((item) => {
    const own = moves.filter((move) => move.itemId === item.id);
    if (own.length === 0) return item;
    const stock = { ...item.stock };
    for (const move of own) stock[move.godownId] = (stock[move.godownId] ?? 0) + move.qty;
    return { ...item, stock };
  });
  const rows = moves.map((move) => ({ ...move, id: uid("mv") }));
  return { ...state, items, movements: [...rows.reverse(), ...state.movements] };
}

/** Combines repeated items into one line so stock checks see the full quantity. */
function mergeLines(lines: LineItem[]): LineItem[] {
  const merged = new Map<string, LineItem>();
  for (const line of lines) {
    const existing = merged.get(line.itemId);
    if (existing) existing.qty += line.qty;
    else merged.set(line.itemId, { ...line });
  }
  return [...merged.values()];
}

function validateLines(state: InventoryState, lines: LineItem[]) {
  if (lines.length === 0) return "Add at least one item.";
  for (const line of lines) {
    const item = byId(state.items, line.itemId);
    if (!item) return "Choose an item for every line.";
    if (!Number.isInteger(line.qty) || line.qty <= 0) {
      return `Enter a whole-number quantity for ${item.name}.`;
    }
    if (!(line.rate >= 0)) return `Enter a valid rate for ${item.name}.`;
  }
  return null;
}

export interface Shortage {
  item: Item;
  needed: number;
  available: number;
}

/** Lines that need more stock than the godown has on hand. */
export function findShortages(
  state: InventoryState,
  godownId: string,
  lines: LineItem[],
): Shortage[] {
  return mergeLines(lines).flatMap((line) => {
    const item = byId(state.items, line.itemId);
    if (!item) return [];
    const available = qtyAt(item, godownId);
    return line.qty > available ? [{ item, needed: line.qty, available }] : [];
  });
}

function shortageMessage(shortages: Shortage[], godownName: string) {
  const [first] = shortages;
  const others = shortages.length > 1 ? ` (+${shortages.length - 1} more)` : "";
  return `Not enough stock at ${godownName}: ${first.item.name} needs ${first.needed}, only ${first.available} available${others}.`;
}

/* ---------- Sales ---------- */

export interface NewSalesOrder {
  customerId: string;
  godownId: string;
  lines: LineItem[];
  notes?: string;
  /** Dispatch immediately (reduces stock) instead of saving as pending. */
  dispatch: boolean;
}

export function createSalesOrder(
  state: InventoryState,
  input: NewSalesOrder,
  now = new Date(),
): Result {
  const customer = byId(state.customers, input.customerId);
  if (!customer) return fail("Choose a customer.");
  const godown = byId(state.godowns, input.godownId);
  if (!godown) return fail("Choose a godown to sell from.");
  const lineError = validateLines(state, input.lines);
  if (lineError) return fail(lineError);

  const lines = mergeLines(input.lines);
  if (input.dispatch) {
    const shortages = findShortages(state, godown.id, lines);
    if (shortages.length) return fail(shortageMessage(shortages, godown.name));
  }

  const order: SalesOrder = {
    id: uid("so"),
    number: nextNumber(state.salesOrders, "SO", 1001),
    customerId: customer.id,
    godownId: godown.id,
    date: now.toISOString(),
    lines,
    taxRate: GST_RATE,
    status: "pending",
    notes: input.notes?.trim() || undefined,
  };
  const next = { ...state, salesOrders: [order, ...state.salesOrders] };

  if (input.dispatch) return dispatchSalesOrder(next, order.id, now);

  return ok(
    log(next, {
      date: order.date,
      kind: "sale_created",
      title: `${order.number} awaiting dispatch`,
      detail: `${customer.name} · ${formatCurrency(orderTotal(order))}`,
      href: `/sales?order=${order.id}`,
    }),
    order.id,
  );
}

export function dispatchSalesOrder(
  state: InventoryState,
  orderId: string,
  now = new Date(),
): Result {
  const order = byId(state.salesOrders, orderId);
  if (!order) return fail("Sales order not found.");
  if (order.status !== "pending") return fail(`${order.number} is already ${order.status}.`);
  const godown = byId(state.godowns, order.godownId)!;
  const customer = byId(state.customers, order.customerId)!;

  const shortages = findShortages(state, order.godownId, order.lines);
  if (shortages.length) return fail(shortageMessage(shortages, godown.name));

  const date = now.toISOString();
  let next = applyMovements(
    state,
    order.lines.map((line) => ({
      date,
      itemId: line.itemId,
      godownId: order.godownId,
      qty: -line.qty,
      type: "sale" as const,
      ref: order.number,
    })),
  );
  next = updateSalesOrder(next, order.id, {
    status: "dispatched",
    dispatchedAt: date,
    dueDate: addDays(now, customer.paymentTermsDays).toISOString(),
  });
  next = log(next, {
    date,
    kind: "sale_dispatched",
    title: `${order.number} dispatched to ${customer.name}`,
    detail: `${pluralize(unitCount(order.lines), "unit")} from ${godown.name} · ${formatCurrency(orderTotal(order))}`,
    href: `/sales?order=${order.id}`,
  });
  return ok(next, order.id);
}

export function markSalesOrderPaid(
  state: InventoryState,
  orderId: string,
  now = new Date(),
): Result {
  const order = byId(state.salesOrders, orderId);
  if (!order) return fail("Sales order not found.");
  if (order.status !== "dispatched") {
    return fail(`Only dispatched invoices can be marked paid. ${order.number} is ${order.status}.`);
  }
  const customer = byId(state.customers, order.customerId)!;
  const date = now.toISOString();
  let next = updateSalesOrder(state, order.id, { status: "paid", paidAt: date });
  next = log(next, {
    date,
    kind: "sale_paid",
    title: `Payment received for ${order.number}`,
    detail: `${formatCurrency(orderTotal(order))} from ${customer.name}`,
    href: `/sales?order=${order.id}`,
  });
  return ok(next, order.id);
}

export function cancelSalesOrder(
  state: InventoryState,
  orderId: string,
  now = new Date(),
): Result {
  const order = byId(state.salesOrders, orderId);
  if (!order) return fail("Sales order not found.");
  if (order.status !== "pending") {
    return fail(`${order.number} has already left the godown and can't be cancelled.`);
  }
  const customer = byId(state.customers, order.customerId)!;
  const date = now.toISOString();
  let next = updateSalesOrder(state, order.id, { status: "cancelled", cancelledAt: date });
  next = log(next, {
    date,
    kind: "sale_cancelled",
    title: `${order.number} cancelled`,
    detail: customer.name,
    href: `/sales?order=${order.id}`,
  });
  return ok(next, order.id);
}

function updateSalesOrder(state: InventoryState, id: string, patch: Partial<SalesOrder>) {
  return {
    ...state,
    salesOrders: state.salesOrders.map((so) => (so.id === id ? { ...so, ...patch } : so)),
  };
}

/* ---------- Purchases ---------- */

export interface NewPurchaseOrder {
  supplierId: string;
  godownId: string;
  lines: LineItem[];
  expectedDate?: string;
  notes?: string;
  /** Goods already arrived: receive immediately (increases stock). */
  receive: boolean;
}

export function createPurchaseOrder(
  state: InventoryState,
  input: NewPurchaseOrder,
  now = new Date(),
): Result {
  const supplier = byId(state.suppliers, input.supplierId);
  if (!supplier) return fail("Choose a supplier.");
  const godown = byId(state.godowns, input.godownId);
  if (!godown) return fail("Choose the godown that will receive the goods.");
  const lineError = validateLines(state, input.lines);
  if (lineError) return fail(lineError);

  const order: PurchaseOrder = {
    id: uid("po"),
    number: nextNumber(state.purchaseOrders, "PO", 2001),
    supplierId: supplier.id,
    godownId: godown.id,
    date: now.toISOString(),
    expectedDate: input.expectedDate ?? addDays(now, supplier.leadTimeDays).toISOString(),
    lines: mergeLines(input.lines),
    taxRate: GST_RATE,
    status: "ordered",
    notes: input.notes?.trim() || undefined,
  };
  const next = { ...state, purchaseOrders: [order, ...state.purchaseOrders] };

  if (input.receive) return receivePurchaseOrder(next, order.id, now);

  return ok(
    log(next, {
      date: order.date,
      kind: "purchase_created",
      title: `${order.number} sent to ${supplier.name}`,
      detail: `${pluralize(unitCount(order.lines), "unit")} for ${godown.name} · ${formatCurrency(orderTotal(order))}`,
      href: `/purchases?order=${order.id}`,
    }),
    order.id,
  );
}

export function receivePurchaseOrder(
  state: InventoryState,
  orderId: string,
  now = new Date(),
): Result {
  const order = byId(state.purchaseOrders, orderId);
  if (!order) return fail("Purchase order not found.");
  if (order.status !== "ordered") return fail(`${order.number} is already ${order.status}.`);
  const godown = byId(state.godowns, order.godownId)!;
  const supplier = byId(state.suppliers, order.supplierId)!;

  const date = now.toISOString();
  let next = applyMovements(
    state,
    order.lines.map((line) => ({
      date,
      itemId: line.itemId,
      godownId: order.godownId,
      qty: line.qty,
      type: "purchase" as const,
      ref: order.number,
    })),
  );
  next = updatePurchaseOrder(next, order.id, { status: "received", receivedAt: date });
  next = log(next, {
    date,
    kind: "purchase_received",
    title: `${order.number} received at ${godown.name}`,
    detail: `${pluralize(unitCount(order.lines), "unit")} from ${supplier.name}`,
    href: `/purchases?order=${order.id}`,
  });
  return ok(next, order.id);
}

export function cancelPurchaseOrder(
  state: InventoryState,
  orderId: string,
  now = new Date(),
): Result {
  const order = byId(state.purchaseOrders, orderId);
  if (!order) return fail("Purchase order not found.");
  if (order.status !== "ordered") {
    return fail(`${order.number} is ${order.status} and can't be cancelled.`);
  }
  const supplier = byId(state.suppliers, order.supplierId)!;
  const date = now.toISOString();
  let next = updatePurchaseOrder(state, order.id, { status: "cancelled", cancelledAt: date });
  next = log(next, {
    date,
    kind: "purchase_cancelled",
    title: `${order.number} cancelled`,
    detail: supplier.name,
    href: `/purchases?order=${order.id}`,
  });
  return ok(next, order.id);
}

function updatePurchaseOrder(state: InventoryState, id: string, patch: Partial<PurchaseOrder>) {
  return {
    ...state,
    purchaseOrders: state.purchaseOrders.map((po) => (po.id === id ? { ...po, ...patch } : po)),
  };
}

/* ---------- Stock ---------- */

export interface StockAdjustment {
  itemId: string;
  godownId: string;
  /** Physically counted quantity; the difference is booked as an adjustment. */
  countedQty: number;
  reason: string;
}

export function adjustStock(
  state: InventoryState,
  input: StockAdjustment,
  now = new Date(),
): Result {
  const item = byId(state.items, input.itemId);
  const godown = byId(state.godowns, input.godownId);
  if (!item || !godown) return fail("Choose an item and godown.");
  if (!Number.isInteger(input.countedQty) || input.countedQty < 0) {
    return fail("Counted quantity must be a whole number, zero or more.");
  }
  const diff = input.countedQty - qtyAt(item, godown.id);
  if (diff === 0) return fail("The counted quantity matches the system. Nothing to adjust.");

  const date = now.toISOString();
  let next = applyMovements(state, [
    {
      date,
      itemId: item.id,
      godownId: godown.id,
      qty: diff,
      type: "adjustment",
      note: input.reason,
    },
  ]);
  next = log(next, {
    date,
    kind: "stock_adjusted",
    title: `${item.name} adjusted ${diff > 0 ? "+" : "−"}${Math.abs(diff)}`,
    detail: `${godown.name} · ${input.reason}`,
    href: `/stock/${item.id}`,
  });
  return ok(next, item.id);
}

export interface NewTransfer {
  itemId: string;
  fromGodownId: string;
  toGodownId: string;
  qty: number;
  note?: string;
}

export function transferStock(
  state: InventoryState,
  input: NewTransfer,
  now = new Date(),
): Result {
  const item = byId(state.items, input.itemId);
  const from = byId(state.godowns, input.fromGodownId);
  const to = byId(state.godowns, input.toGodownId);
  if (!item) return fail("Choose an item to transfer.");
  if (!from || !to) return fail("Choose both godowns.");
  if (from.id === to.id) return fail("Source and destination must be different godowns.");
  if (!Number.isInteger(input.qty) || input.qty <= 0) return fail("Enter a whole-number quantity.");
  const available = qtyAt(item, from.id);
  if (input.qty > available) {
    return fail(`Only ${available} ${item.unit} of ${item.name} at ${from.name}.`);
  }

  const date = now.toISOString();
  const number = nextNumber(state.transfers, "TR", 301);
  const note = input.note?.trim() || undefined;
  let next = applyMovements(state, [
    { date, itemId: item.id, godownId: from.id, qty: -input.qty, type: "transfer", ref: number, note },
    { date, itemId: item.id, godownId: to.id, qty: input.qty, type: "transfer", ref: number, note },
  ]);
  next = {
    ...next,
    transfers: [
      { id: uid("tr"), number, itemId: item.id, fromGodownId: from.id, toGodownId: to.id, qty: input.qty, date, note },
      ...next.transfers,
    ],
  };
  next = log(next, {
    date,
    kind: "stock_transferred",
    title: `${number}: ${input.qty} × ${item.name}`,
    detail: `${from.name} → ${to.name}`,
    href: `/godowns`,
  });
  return ok(next, number);
}

/* ---------- Master data ---------- */

export type ItemInput = Omit<Item, "id" | "stock">;

function validateItem(state: InventoryState, input: ItemInput, ignoreId?: string) {
  if (!input.name.trim()) return "Item name is required.";
  if (!input.sku.trim()) return "SKU is required.";
  const sku = input.sku.trim().toUpperCase();
  if (state.items.some((item) => item.sku === sku && item.id !== ignoreId)) {
    return `SKU ${sku} is already used by another item.`;
  }
  if (!(input.costPrice >= 0) || !(input.sellPrice >= 0)) return "Prices must be zero or more.";
  if (!Number.isInteger(input.minStock) || input.minStock < 0) {
    return "Minimum level must be a whole number.";
  }
  return null;
}

export function createItem(
  state: InventoryState,
  input: ItemInput,
  openingStock: Record<string, number>,
  now = new Date(),
): Result {
  const error = validateItem(state, input);
  if (error) return fail(error);
  const item: Item = {
    ...input,
    id: uid("itm"),
    sku: input.sku.trim().toUpperCase(),
    name: input.name.trim(),
    stock: Object.fromEntries(state.godowns.map((g) => [g.id, 0])),
  };
  const date = now.toISOString();
  let next: InventoryState = { ...state, items: [...state.items, item] };
  next = applyMovements(
    next,
    Object.entries(openingStock)
      .filter(([, qty]) => qty > 0)
      .map(([godownId, qty]) => ({ date, itemId: item.id, godownId, qty, type: "opening" as const })),
  );
  next = log(next, {
    date,
    kind: "item_created",
    title: `New item: ${item.name}`,
    detail: `${item.sku} · ${item.category}`,
    href: `/stock/${item.id}`,
  });
  return ok(next, item.id);
}

export function updateItem(
  state: InventoryState,
  itemId: string,
  input: ItemInput,
  now = new Date(),
): Result {
  const item = byId(state.items, itemId);
  if (!item) return fail("Item not found.");
  const error = validateItem(state, input, itemId);
  if (error) return fail(error);
  const updated = { ...item, ...input, sku: input.sku.trim().toUpperCase(), name: input.name.trim() };
  let next = { ...state, items: state.items.map((i) => (i.id === itemId ? updated : i)) };
  next = log(next, {
    date: now.toISOString(),
    kind: "item_updated",
    title: `${updated.name} updated`,
    detail: `${updated.sku} · min level ${updated.minStock}`,
    href: `/stock/${itemId}`,
  });
  return ok(next, itemId);
}

export type CustomerInput = Omit<Customer, "id">;
export type SupplierInput = Omit<Supplier, "id">;

export function createCustomer(state: InventoryState, input: CustomerInput, now = new Date()): Result {
  if (!input.name.trim()) return fail("Customer name is required.");
  const customer: Customer = { ...input, id: uid("cus"), name: input.name.trim() };
  const next = log(
    { ...state, customers: [...state.customers, customer] },
    { date: now.toISOString(), kind: "contact_created", title: `New customer: ${customer.name}`, detail: customer.city, href: "/customers" },
  );
  return ok(next, customer.id);
}

export function createSupplier(state: InventoryState, input: SupplierInput, now = new Date()): Result {
  if (!input.name.trim()) return fail("Supplier name is required.");
  const supplier: Supplier = { ...input, id: uid("sup"), name: input.name.trim() };
  const next = log(
    { ...state, suppliers: [...state.suppliers, supplier] },
    { date: now.toISOString(), kind: "contact_created", title: `New supplier: ${supplier.name}`, detail: supplier.city, href: "/suppliers" },
  );
  return ok(next, supplier.id);
}

/** Used by the seed to book opening balances without logging activity. */
export function openingBalance(
  state: InventoryState,
  entries: { itemId: string; godownId: string; qty: number }[],
  now: Date,
): InventoryState {
  const date = now.toISOString();
  return applyMovements(
    state,
    entries.filter((e) => e.qty > 0).map((e) => ({ ...e, date, type: "opening" as const })),
  );
}
