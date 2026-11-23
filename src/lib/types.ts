/** Domain model for the inventory app. Every date is an ISO-8601 string. */

export interface Godown {
  id: string;
  name: string;
  code: string;
  city: string;
  /** Total units the godown can hold. Used for utilisation. */
  capacity: number;
}

export interface Item {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  sellPrice: number;
  /** Reorder point: at or below this total quantity the item is "low". */
  minStock: number;
  preferredSupplierId: string;
  /** Quantity on hand per godown id. */
  stock: Record<string, number>;
}

export interface Customer {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  gstin: string;
  paymentTermsDays: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  leadTimeDays: number;
}

export interface LineItem {
  itemId: string;
  qty: number;
  /** Price per unit, excluding tax. */
  rate: number;
}

export type SalesStatus = "pending" | "dispatched" | "paid" | "cancelled";

export interface SalesOrder {
  id: string;
  number: string;
  customerId: string;
  godownId: string;
  date: string;
  lines: LineItem[];
  taxRate: number;
  status: SalesStatus;
  /** Set when the invoice is raised (on dispatch). */
  dueDate?: string;
  dispatchedAt?: string;
  paidAt?: string;
  cancelledAt?: string;
  notes?: string;
}

export type PurchaseStatus = "ordered" | "received" | "cancelled";

export interface PurchaseOrder {
  id: string;
  number: string;
  supplierId: string;
  godownId: string;
  date: string;
  expectedDate: string;
  lines: LineItem[];
  taxRate: number;
  status: PurchaseStatus;
  receivedAt?: string;
  cancelledAt?: string;
  notes?: string;
}

export interface Transfer {
  id: string;
  number: string;
  itemId: string;
  fromGodownId: string;
  toGodownId: string;
  qty: number;
  date: string;
  note?: string;
}

export type MovementType =
  | "opening"
  | "purchase"
  | "sale"
  | "adjustment"
  | "transfer";

/** One row in the stock ledger. `qty` is signed: + stock in, - stock out. */
export interface StockMovement {
  id: string;
  date: string;
  itemId: string;
  godownId: string;
  qty: number;
  type: MovementType;
  /** Document number the movement came from, e.g. SO-1042. */
  ref?: string;
  note?: string;
}

export type ActivityKind =
  | "sale_created"
  | "sale_dispatched"
  | "sale_paid"
  | "sale_cancelled"
  | "purchase_created"
  | "purchase_received"
  | "purchase_cancelled"
  | "stock_adjusted"
  | "stock_transferred"
  | "item_created"
  | "item_updated"
  | "contact_created";

export interface Activity {
  id: string;
  date: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  href?: string;
}

export interface InventoryState {
  version: number;
  godowns: Godown[];
  items: Item[];
  customers: Customer[];
  suppliers: Supplier[];
  salesOrders: SalesOrder[];
  purchaseOrders: PurchaseOrder[];
  transfers: Transfer[];
  movements: StockMovement[];
  activity: Activity[];
}

/** Every domain operation returns either the next state or a readable error. */
export type Result =
  | { ok: true; state: InventoryState; id?: string }
  | { ok: false; error: string };
