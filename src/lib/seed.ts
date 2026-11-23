/**
 * Sample data. Master data is declared directly; transactions are replayed
 * through the domain functions in date order, so every stock movement,
 * activity entry and status in the demo is produced by the real business
 * rules. Dates are relative to "now", so the demo never looks stale.
 */
import type { Customer, Godown, InventoryState, Item, Result, SalesStatus, Supplier } from "./types";
import * as domain from "./domain";
import { byId } from "./selectors";
import { DAY_MS } from "./utils";

export const STATE_VERSION = 1;

const godowns: Godown[] = [
  { id: "g-chn", name: "Chennai Central", code: "CHN", city: "Chennai", capacity: 2500 },
  { id: "g-cbe", name: "Coimbatore Hub", code: "CBE", city: "Coimbatore", capacity: 1500 },
  { id: "g-cok", name: "Kochi Depot", code: "COK", city: "Kochi", capacity: 1000 },
];

const suppliers: Supplier[] = [
  { id: "s-apex", name: "Apex Peripherals Pvt Ltd", contactName: "Ravi Shankar", email: "orders@apexperipherals.example", phone: "+91 80 4123 7781", city: "Bengaluru", leadTimeDays: 5 },
  { id: "s-vision", name: "Vision Display Systems", contactName: "Meera Iyer", email: "sales@visiondisplay.example", phone: "+91 22 6651 2290", city: "Mumbai", leadTimeDays: 10 },
  { id: "s-datavault", name: "DataVault Storage Co.", contactName: "Arjun Reddy", email: "supply@datavault.example", phone: "+91 40 2789 4410", city: "Hyderabad", leadTimeDays: 7 },
  { id: "s-netcore", name: "NetCore Networks", contactName: "Sneha Kulkarni", email: "b2b@netcore.example", phone: "+91 20 6720 1185", city: "Pune", leadTimeDays: 6 },
  { id: "s-voltedge", name: "VoltEdge Power Solutions", contactName: "Karthik Rajan", email: "trade@voltedge.example", phone: "+91 44 4211 9063", city: "Chennai", leadTimeDays: 4 },
];

const customers: Customer[] = [
  { id: "c-bluewave", name: "Bluewave Technologies", contactName: "Priya Natarajan", email: "procurement@bluewave.example", phone: "+91 98400 11223", city: "Chennai", gstin: "33AABCB1234F1Z5", paymentTermsDays: 30 },
  { id: "c-murugan", name: "Sri Murugan Computers", contactName: "S. Muthukumar", email: "smc.madurai@example.com", phone: "+91 94431 55678", city: "Madurai", gstin: "33AAKFS5678K1Z2", paymentTermsDays: 30 },
  { id: "c-kovai", name: "Kovai IT Solutions", contactName: "Divya Prakash", email: "accounts@kovaiit.example", phone: "+91 98422 78812", city: "Coimbatore", gstin: "33AAGCK9012M1Z8", paymentTermsDays: 30 },
  { id: "c-malabar", name: "Malabar Systems", contactName: "Anoop Menon", email: "purchase@malabarsys.example", phone: "+91 94470 33419", city: "Kozhikode", gstin: "32AAHCM3456P1Z1", paymentTermsDays: 30 },
  { id: "c-technest", name: "TechNest Co-working", contactName: "Rahul Desai", email: "ops@technest.example", phone: "+91 99000 45123", city: "Bengaluru", gstin: "29AAICT7890Q1Z4", paymentTermsDays: 30 },
  { id: "c-pinnacle", name: "Pinnacle Engineering College", contactName: "Dr. R. Balaji", email: "stores@pinnacle.example", phone: "+91 431 240 7788", city: "Tiruchirappalli", gstin: "33AAATP2345R1Z9", paymentTermsDays: 45 },
  { id: "c-lotus", name: "Lotus Diagnostics", contactName: "Fathima Rasheed", email: "it@lotusdiag.example", phone: "+91 484 402 5566", city: "Kochi", gstin: "32AACCL6789S1Z3", paymentTermsDays: 15 },
  { id: "c-greenline", name: "Greenline Logistics", contactName: "Vignesh Kumar", email: "admin@greenline.example", phone: "+91 98410 66790", city: "Chennai", gstin: "33AADCG1122T1Z6", paymentTermsDays: 30 },
];

type ItemSeed = Omit<Item, "stock"> & {
  /** Quantity each godown should hold today, after all seeded history. */
  target: [chennai: number, coimbatore: number, kochi: number];
};

const itemSeeds: ItemSeed[] = [
  { id: "i-mouse", sku: "PER-MSE-210", name: "Wireless Mouse M210", category: "Peripherals", unit: "pcs", costPrice: 420, sellPrice: 649, minStock: 40, preferredSupplierId: "s-apex", target: [86, 52, 30] },
  { id: "i-keyboard", sku: "PER-KBD-087", name: "Mechanical Keyboard TKL", category: "Peripherals", unit: "pcs", costPrice: 2150, sellPrice: 3299, minStock: 15, preferredSupplierId: "s-apex", target: [9, 3, 0] },
  { id: "i-mon27", sku: "DSP-MON-27K", name: '27" 4K IPS Monitor', category: "Displays", unit: "pcs", costPrice: 18500, sellPrice: 24990, minStock: 8, preferredSupplierId: "s-vision", target: [14, 6, 4] },
  { id: "i-mon24", sku: "DSP-MON-24F", name: '24" Full HD Monitor', category: "Displays", unit: "pcs", costPrice: 7200, sellPrice: 9490, minStock: 12, preferredSupplierId: "s-vision", target: [22, 15, 8] },
  { id: "i-ssd", sku: "STO-SSD-1TB", name: "1TB NVMe SSD", category: "Storage", unit: "pcs", costPrice: 4100, sellPrice: 5799, minStock: 20, preferredSupplierId: "s-datavault", target: [7, 4, 2] },
  { id: "i-hdd", sku: "STO-HDD-2TB", name: "2TB External HDD", category: "Storage", unit: "pcs", costPrice: 4600, sellPrice: 6199, minStock: 10, preferredSupplierId: "s-datavault", target: [20, 10, 6] },
  { id: "i-hub", sku: "ACC-HUB-7C", name: "USB-C Hub 7-in-1", category: "Accessories", unit: "pcs", costPrice: 1050, sellPrice: 1799, minStock: 25, preferredSupplierId: "s-apex", target: [41, 23, 12] },
  { id: "i-hdmi", sku: "CBL-HDM-2M", name: "HDMI 2.1 Cable 2m", category: "Cables", unit: "pcs", costPrice: 180, sellPrice: 349, minStock: 100, preferredSupplierId: "s-netcore", target: [210, 120, 80] },
  { id: "i-cat6", sku: "CBL-CAT6-3M", name: "Cat6 Patch Cable 3m", category: "Cables", unit: "pcs", costPrice: 95, sellPrice: 199, minStock: 150, preferredSupplierId: "s-netcore", target: [60, 25, 0] },
  { id: "i-router", sku: "NET-RTR-AX3", name: "Wi-Fi 6 Router AX3000", category: "Networking", unit: "pcs", costPrice: 3900, sellPrice: 5499, minStock: 10, preferredSupplierId: "s-netcore", target: [0, 0, 0] },
  { id: "i-switch", sku: "NET-SW-24G", name: "24-Port Gigabit Switch", category: "Networking", unit: "pcs", costPrice: 6800, sellPrice: 9250, minStock: 5, preferredSupplierId: "s-netcore", target: [6, 3, 2] },
  { id: "i-ups", sku: "PWR-UPS-1K", name: "1kVA Online UPS", category: "Power", unit: "pcs", costPrice: 7400, sellPrice: 9999, minStock: 6, preferredSupplierId: "s-voltedge", target: [3, 1, 0] },
  { id: "i-charger", sku: "PWR-GAN-65", name: "65W GaN Charger", category: "Power", unit: "pcs", costPrice: 1250, sellPrice: 2199, minStock: 30, preferredSupplierId: "s-voltedge", target: [48, 30, 18] },
  { id: "i-stand", sku: "ACC-STD-ALU", name: "Aluminium Laptop Stand", category: "Accessories", unit: "pcs", costPrice: 650, sellPrice: 1199, minStock: 20, preferredSupplierId: "s-apex", target: [35, 20, 14] },
  { id: "i-webcam", sku: "PER-CAM-1080", name: "1080p Webcam", category: "Peripherals", unit: "pcs", costPrice: 1450, sellPrice: 2499, minStock: 15, preferredSupplierId: "s-apex", target: [0, 0, 0] },
  { id: "i-headset", sku: "PER-HST-ANC", name: "ANC Headset Pro", category: "Peripherals", unit: "pcs", costPrice: 2900, sellPrice: 4299, minStock: 12, preferredSupplierId: "s-apex", target: [16, 8, 5] },
];

type Lines = [itemId: string, qty: number][];

/** [days ago, customer, godown, lines, final status] */
type SaleSeed = [number, string, string, Lines, SalesStatus];

const sales: SaleSeed[] = [
  [172, "c-bluewave", "g-chn", [["i-mouse", 25], ["i-hub", 10], ["i-hdmi", 40]], "paid"],
  [165, "c-kovai", "g-cbe", [["i-mon24", 10], ["i-hdmi", 20]], "paid"],
  [158, "c-pinnacle", "g-chn", [["i-mon24", 20], ["i-mouse", 20]], "paid"],
  [152, "c-lotus", "g-cok", [["i-router", 4], ["i-cat6", 40], ["i-ups", 2]], "paid"],
  [146, "c-murugan", "g-chn", [["i-ssd", 15], ["i-hdd", 6], ["i-charger", 10]], "paid"],
  [139, "c-technest", "g-chn", [["i-mon27", 6], ["i-stand", 12], ["i-keyboard", 8]], "paid"],
  [133, "c-malabar", "g-cok", [["i-router", 6], ["i-switch", 2], ["i-cat6", 60]], "paid"],
  [127, "c-greenline", "g-chn", [["i-ups", 3], ["i-hdmi", 30]], "paid"],
  [116, "c-bluewave", "g-chn", [["i-mon27", 5], ["i-hub", 15], ["i-charger", 15]], "paid"],
  [110, "c-pinnacle", "g-chn", [["i-switch", 4], ["i-cat6", 120], ["i-router", 6]], "paid"],
  [104, "c-murugan", "g-chn", [["i-ssd", 12], ["i-mouse", 30]], "paid"],
  [98, "c-lotus", "g-cok", [["i-headset", 4], ["i-webcam", 6]], "paid"],
  [97, "c-kovai", "g-cbe", [["i-webcam", 10], ["i-headset", 6]], "paid"],
  [93, "c-technest", "g-cbe", [["i-mon24", 8], ["i-keyboard", 6], ["i-stand", 10]], "paid"],
  [91, "c-malabar", "g-cok", [["i-hdmi", 25]], "cancelled"],
  [86, "c-kovai", "g-cbe", [["i-ssd", 10], ["i-hdd", 5], ["i-hub", 12]], "paid"],
  [80, "c-bluewave", "g-chn", [["i-router", 8], ["i-cat6", 80]], "paid"],
  [74, "c-greenline", "g-chn", [["i-ups", 4], ["i-charger", 20], ["i-mouse", 20]], "paid"],
  [68, "c-pinnacle", "g-chn", [["i-mon27", 10], ["i-headset", 10]], "paid"],
  [63, "c-murugan", "g-cbe", [["i-webcam", 8], ["i-keyboard", 5]], "paid"],
  [57, "c-technest", "g-chn", [["i-mon27", 8], ["i-stand", 15], ["i-hub", 10]], "paid"],
  [52, "c-lotus", "g-cok", [["i-ups", 3], ["i-router", 5]], "paid"],
  [47, "c-malabar", "g-cok", [["i-cat6", 50], ["i-hdmi", 40], ["i-switch", 2]], "dispatched"],
  [41, "c-bluewave", "g-chn", [["i-ssd", 14], ["i-keyboard", 6], ["i-webcam", 6]], "paid"],
  [36, "c-kovai", "g-cbe", [["i-mon24", 12], ["i-mouse", 25]], "dispatched"],
  [32, "c-pinnacle", "g-chn", [["i-router", 9], ["i-cat6", 90], ["i-ups", 4]], "paid"],
  [26, "c-greenline", "g-chn", [["i-charger", 18], ["i-hdmi", 35], ["i-stand", 8]], "paid"],
  [21, "c-murugan", "g-chn", [["i-ssd", 10], ["i-headset", 6], ["i-webcam", 10]], "dispatched"],
  [16, "c-technest", "g-chn", [["i-mon27", 7], ["i-keyboard", 7], ["i-hub", 14]], "dispatched"],
  [11, "c-lotus", "g-cok", [["i-router", 6], ["i-cat6", 40], ["i-ups", 2]], "dispatched"],
  [7, "c-bluewave", "g-chn", [["i-webcam", 8], ["i-ssd", 9], ["i-mouse", 30]], "dispatched"],
  [4, "c-pinnacle", "g-cbe", [["i-mon24", 14], ["i-cat6", 60]], "dispatched"],
  [2, "c-kovai", "g-cbe", [["i-keyboard", 6], ["i-headset", 5]], "pending"],
  [1, "c-malabar", "g-cok", [["i-hub", 8], ["i-stand", 6], ["i-charger", 10]], "pending"],
  [0, "c-greenline", "g-chn", [["i-mon27", 4], ["i-hdmi", 30]], "pending"],
];

/** [days ago, supplier, godown, lines, days until received (null = still open, "x" = cancelled)] */
type PurchaseSeed = [number, string, string, Lines, number | null | "x"];

const purchases: PurchaseSeed[] = [
  [178, "s-vision", "g-chn", [["i-mon27", 20], ["i-mon24", 30]], 8],
  [170, "s-apex", "g-chn", [["i-mouse", 100], ["i-keyboard", 15], ["i-stand", 40]], 5],
  [150, "s-netcore", "g-cok", [["i-router", 17], ["i-cat6", 150], ["i-switch", 6]], 6],
  [135, "s-datavault", "g-chn", [["i-ssd", 40], ["i-hdd", 20]], 7],
  [120, "s-voltedge", "g-chn", [["i-ups", 11], ["i-charger", 60]], 4],
  [112, "s-vision", "g-chn", [["i-mon24", 10]], 7],
  [105, "s-apex", "g-cbe", [["i-webcam", 18], ["i-headset", 14], ["i-hub", 15]], 5],
  [88, "s-netcore", "g-chn", [["i-cat6", 200], ["i-hdmi", 150], ["i-router", 17]], 6],
  [72, "s-vision", "g-cbe", [["i-mon24", 30], ["i-mon27", 6]], 10],
  [60, "s-datavault", "g-cbe", [["i-hdd", 10]], 7],
  [45, "s-apex", "g-chn", [["i-mouse", 80], ["i-keyboard", 10], ["i-stand", 30], ["i-webcam", 18]], 5],
  [40, "s-datavault", "g-chn", [["i-hdd", 15]], "x"],
  [30, "s-voltedge", "g-chn", [["i-charger", 25]], 4],
  [18, "s-netcore", "g-cok", [["i-hdmi", 70]], 6],
  [14, "s-apex", "g-chn", [["i-hub", 40]], 5],
  [12, "s-netcore", "g-chn", [["i-router", 25]], null],
  [9, "s-vision", "g-chn", [["i-mon27", 12], ["i-mon24", 10]], null],
  [3, "s-apex", "g-cbe", [["i-keyboard", 30], ["i-mouse", 60]], null],
];

/** [days ago, item, from, to, qty] */
type TransferSeed = [number, string, string, string, number];

const transfers: TransferSeed[] = [
  [100, "i-hdmi", "g-chn", "g-cok", 50],
  [60, "i-mouse", "g-chn", "g-cbe", 40],
  [20, "i-hub", "g-chn", "g-cbe", 20],
];

/* ---------- Builder ---------- */

interface SeedEvent {
  at: Date;
  run: (state: InventoryState) => Result;
}

/** Signed stock change per item+godown, in date order, implied by the seed. */
function plannedFlows(at: (daysAgo: number, slot: number) => Date) {
  const flows = new Map<string, { time: number; qty: number }[]>();
  const add = (itemId: string, godownId: string, time: Date, qty: number) => {
    const key = `${itemId}|${godownId}`;
    flows.set(key, [...(flows.get(key) ?? []), { time: time.getTime(), qty }]);
  };
  sales.forEach(([days, , godown, lines, status], i) => {
    if (status === "pending" || status === "cancelled") return;
    lines.forEach(([item, qty]) => add(item, godown, at(days, i), -qty));
  });
  purchases.forEach(([days, , godown, lines, receivedAfter], i) => {
    if (typeof receivedAfter !== "number") return;
    lines.forEach(([item, qty]) => add(item, godown, at(days - receivedAfter, i + 3), qty));
  });
  transfers.forEach(([days, item, from, to, qty], i) => {
    add(item, from, at(days, i + 5), -qty);
    add(item, to, at(days, i + 5), qty);
  });
  return flows;
}

/**
 * Opening stock that lands each godown on its target quantity today, while
 * never letting the running balance dip below zero along the way.
 */
function openingStock(flows: ReturnType<typeof plannedFlows>) {
  return itemSeeds.flatMap((item) =>
    godowns.map((godown, g) => {
      const events = (flows.get(`${item.id}|${godown.id}`) ?? []).sort((a, b) => a.time - b.time);
      let running = 0;
      let lowest = 0;
      for (const event of events) {
        running += event.qty;
        lowest = Math.min(lowest, running);
      }
      const qty = Math.max(item.target[g] - running, -lowest, 0);
      return { itemId: item.id, godownId: godown.id, qty };
    }),
  );
}

export function createSeedState(now = new Date()): InventoryState {
  // Spread events across working hours so timestamps look natural.
  const at = (daysAgo: number, slot: number) =>
    new Date(now.getTime() - daysAgo * DAY_MS - (1 + (slot % 7)) * 60 * 60 * 1000 - (slot % 4) * 13 * 60 * 1000);

  let state: InventoryState = {
    version: STATE_VERSION,
    godowns,
    items: itemSeeds.map(({ target: _target, ...item }) => ({
      ...item,
      stock: Object.fromEntries(godowns.map((g) => [g.id, 0])),
    })),
    customers,
    suppliers,
    salesOrders: [],
    purchaseOrders: [],
    transfers: [],
    movements: [],
    activity: [],
  };

  state = domain.openingBalance(state, openingStock(plannedFlows(at)), at(185, 0));

  const ids = new Map<string, string>();
  const events: SeedEvent[] = [];
  const remember = (key: string) => (result: Result) => {
    if (result.ok && result.id) ids.set(key, result.id);
    return result;
  };

  sales.forEach(([days, customerId, godownId, lines, status], i) => {
    const key = `so${i}`;
    const created = at(days, i);
    const customer = byId(customers, customerId)!;
    events.push({
      at: created,
      run: (s) =>
        remember(key)(
          domain.createSalesOrder(
            s,
            {
              customerId,
              godownId,
              lines: lines.map(([itemId, qty]) => ({ itemId, qty, rate: byId(itemSeeds, itemId)!.sellPrice })),
              dispatch: status === "dispatched" || status === "paid",
            },
            created,
          ),
        ),
    });
    if (status === "paid") {
      const paidDaysAgo = Math.max(days - (customer.paymentTermsDays - 4 - (i % 9)), 0.5);
      const paidAt = at(paidDaysAgo, i + 2);
      events.push({ at: paidAt, run: (s) => domain.markSalesOrderPaid(s, ids.get(key)!, paidAt) });
    }
    if (status === "cancelled") {
      const cancelledAt = at(days - 2, i);
      events.push({ at: cancelledAt, run: (s) => domain.cancelSalesOrder(s, ids.get(key)!, cancelledAt) });
    }
  });

  purchases.forEach(([days, supplierId, godownId, lines, outcome], i) => {
    const key = `po${i}`;
    const created = at(days, i + 3);
    events.push({
      at: created,
      run: (s) =>
        remember(key)(
          domain.createPurchaseOrder(
            s,
            {
              supplierId,
              godownId,
              lines: lines.map(([itemId, qty]) => ({ itemId, qty, rate: byId(itemSeeds, itemId)!.costPrice })),
              receive: false,
            },
            created,
          ),
        ),
    });
    if (typeof outcome === "number") {
      const receivedAt = at(days - outcome, i + 3);
      events.push({ at: receivedAt, run: (s) => domain.receivePurchaseOrder(s, ids.get(key)!, receivedAt) });
    }
    if (outcome === "x") {
      const cancelledAt = at(days - 2, i + 3);
      events.push({ at: cancelledAt, run: (s) => domain.cancelPurchaseOrder(s, ids.get(key)!, cancelledAt) });
    }
  });

  transfers.forEach(([days, itemId, fromGodownId, toGodownId, qty], i) => {
    const when = at(days, i + 5);
    events.push({
      at: when,
      run: (s) => domain.transferStock(s, { itemId, fromGodownId, toGodownId, qty, note: "Rebalancing stock" }, when),
    });
  });

  // Stable sort keeps "create" ahead of "receive"/"pay" when they share a timestamp.
  events.sort((a, b) => a.at.getTime() - b.at.getTime());
  for (const event of events) {
    const result = event.run(state);
    if (!result.ok) throw new Error(`Seed data is inconsistent: ${result.error}`);
    state = result.state;
  }
  return state;
}
