"use client";

import {
  ArrowLeftRight,
  ArrowRight,
  Ban,
  Boxes,
  CircleCheck,
  CircleDollarSign,
  Clock,
  IndianRupee,
  PackageCheck,
  PackagePlus,
  Plus,
  ReceiptText,
  Send,
  SlidersHorizontal,
  TriangleAlert,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { BarList } from "@/components/charts/bar-list";
import { ColumnChart, Legend } from "@/components/charts/column-chart";
import { useOpenDialog } from "@/components/layout/dialog-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { Delta, Stat } from "@/components/ui/stat";
import { formatCompactCurrency, formatCurrency, formatNumber, formatRelative, pluralize } from "@/lib/format";
import {
  byId,
  emptiestGodownId,
  groupTotals,
  incomingQty,
  inventoryValue,
  invoicedBetween,
  isUnpaid,
  lowStockItems,
  monthlyTotals,
  onHand,
  orderTotal,
  purchaseDisplayStatus,
  revenueBetween,
  salesDisplayStatus,
  stockStatus,
  suggestedReorderQty,
} from "@/lib/selectors";
import { useInventory } from "@/lib/store";
import type { ActivityKind, InventoryState, Item } from "@/lib/types";
import { addDays, cn, sum } from "@/lib/utils";
import { stockTone } from "../shared/status";

const series = [
  { key: "sales", name: "Sales", color: "var(--color-series-1)" },
  { key: "purchases", name: "Purchases", color: "var(--color-series-2)" },
];

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardView() {
  const state = useInventory();
  const openDialog = useOpenDialog();
  const now = new Date();

  const last30 = addDays(now, -30);
  const revenue = revenueBetween(state, last30, now);
  const previousRevenue = revenueBetween(state, addDays(now, -60), last30);
  const units = sum(state.items, onHand);
  const unpaid = state.salesOrders.filter(isUnpaid);
  const overdue = unpaid.filter((so) => salesDisplayStatus(so) === "overdue");
  const alerts = lowStockItems(state.items);
  const months = monthlyTotals(state, 6, now);

  return (
    <>
      <PageHeader
        title={greeting(now.getHours())}
        description={`${new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(now)} · Here's how stock is moving across your ${state.godowns.length} godowns.`}
        actions={
          <>
            <Button onClick={() => openDialog({ type: "purchase" })}>
              <Truck /> New purchase
            </Button>
            <Button variant="primary" onClick={() => openDialog({ type: "sale" })}>
              <Plus /> New sale
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat
          label="Revenue · 30 days"
          icon={IndianRupee}
          value={formatCompactCurrency(revenue)}
          footer={<Delta current={revenue} previous={previousRevenue} />}
          href="/reports?tab=sales&range=30d"
        />
        <Stat
          label="Inventory value"
          icon={Boxes}
          value={formatCompactCurrency(inventoryValue(state.items))}
          footer={`${formatNumber(units)} units · ${state.items.length} items`}
          href="/reports?tab=stock"
        />
        <Stat
          label="Receivables"
          icon={Wallet}
          value={formatCompactCurrency(sum(unpaid, orderTotal))}
          footer={
            overdue.length ? (
              <span className="font-medium text-rose-600">{formatCompactCurrency(sum(overdue, orderTotal))} overdue</span>
            ) : (
              "Nothing overdue"
            )
          }
          href={overdue.length ? "/sales?status=overdue" : "/sales?status=dispatched"}
        />
        <Stat
          label="Stock alerts"
          icon={TriangleAlert}
          value={alerts.length}
          footer={`${alerts.filter((i) => stockStatus(i) === "low").length} low · ${alerts.filter((i) => stockStatus(i) === "out").length} out of stock`}
          href="/stock?status=reorder"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Sales vs purchases"
            description="Invoiced sales and received purchases, last 6 months (incl. GST)"
            action={<Legend series={series} />}
            className="flex-col sm:flex-row"
          />
          <div className="px-5 pt-6 pb-5">
            <ColumnChart
              title="Monthly sales and purchases"
              data={months.map((m) => ({ label: m.label, values: { sales: m.sales, purchases: m.purchases } }))}
              series={series}
              formatValue={formatCurrency}
              formatAxis={formatCompactCurrency}
              height={300}
            />
          </div>
        </Card>

        <LowStockCard state={state} items={alerts} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ActivityCard state={state} />
        <div className="space-y-4">
          <AttentionCard state={state} />
          <TopSellersCard state={state} />
        </div>
      </div>
    </>
  );
}

function LowStockCard({ state, items }: { state: InventoryState; items: Item[] }) {
  const openDialog = useOpenDialog();

  function reorder(item: Item) {
    openDialog({
      type: "purchase",
      prefill: {
        supplierId: item.preferredSupplierId,
        godownId: emptiestGodownId(state, item),
        lines: [{ itemId: item.id, qty: suggestedReorderQty(item, incomingQty(state, item.id)) }],
      },
    });
  }

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Low stock alerts"
        description="At or below minimum level"
        action={
          <Link href="/stock?status=reorder" className="text-[13px] font-medium text-brand-700 hover:underline">
            View all
          </Link>
        }
      />
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-5 pb-8 text-center">
          <CircleCheck className="size-8 text-emerald-500" aria-hidden />
          <p className="mt-2 text-sm font-medium">Everything is well stocked</p>
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-zinc-950/[0.05] border-t border-zinc-950/[0.06]">
          {items.slice(0, 6).map((item) => {
            const qty = onHand(item);
            const status = stockStatus(item);
            const incoming = incomingQty(state, item.id);
            return (
              <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/stock/${item.id}`} className="block truncate text-sm font-medium text-zinc-900 hover:underline">
                    {item.name}
                  </Link>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Meter value={qty} max={item.minStock} tone={stockTone(status)} label={`${item.name} stock`} className="w-16" />
                    <span className={cn("text-xs tabular-nums", status === "out" ? "font-medium text-rose-600" : "text-zinc-500")}>
                      {status === "out" ? "Out of stock" : `${qty} left · min ${item.minStock}`}
                    </span>
                  </div>
                </div>
                {incoming > 0 ? (
                  <Link
                    href={`/purchases?status=ordered`}
                    className="shrink-0 rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-600/15 ring-inset hover:bg-brand-100"
                  >
                    +{incoming} incoming
                  </Link>
                ) : (
                  <Button size="sm" onClick={() => reorder(item)}>
                    Reorder
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

const activityIcons: Record<ActivityKind, { icon: LucideIcon; tone: string }> = {
  sale_created: { icon: ReceiptText, tone: "bg-amber-50 text-amber-600" },
  sale_dispatched: { icon: Send, tone: "bg-brand-50 text-brand-600" },
  sale_paid: { icon: CircleDollarSign, tone: "bg-emerald-50 text-emerald-600" },
  sale_cancelled: { icon: Ban, tone: "bg-zinc-100 text-zinc-500" },
  purchase_created: { icon: Truck, tone: "bg-amber-50 text-amber-600" },
  purchase_received: { icon: PackageCheck, tone: "bg-emerald-50 text-emerald-600" },
  purchase_cancelled: { icon: Ban, tone: "bg-zinc-100 text-zinc-500" },
  stock_adjusted: { icon: SlidersHorizontal, tone: "bg-violet-50 text-violet-600" },
  stock_transferred: { icon: ArrowLeftRight, tone: "bg-zinc-100 text-zinc-600" },
  item_created: { icon: PackagePlus, tone: "bg-brand-50 text-brand-600" },
  item_updated: { icon: PackagePlus, tone: "bg-zinc-100 text-zinc-600" },
  contact_created: { icon: Plus, tone: "bg-zinc-100 text-zinc-600" },
};

function ActivityCard({ state }: { state: InventoryState }) {
  const entries = state.activity.slice(0, 9);
  return (
    <Card className="lg:col-span-2">
      <CardHeader
        title="Recent activity"
        description="Every sale, purchase and stock movement, as it happens"
        action={
          <Link href="/stock?view=history" className="text-[13px] font-medium text-brand-700 hover:underline">
            Stock history
          </Link>
        }
      />
      <ol className="px-5 pb-3">
        {entries.map((entry, index) => {
          const { icon: Icon, tone } = activityIcons[entry.kind];
          const content = (
            <>
              <span className={cn("relative z-10 grid size-8 shrink-0 place-items-center rounded-full ring-4 ring-white", tone)}>
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 pt-0.5">
                <span className="block truncate text-sm font-medium text-zinc-900">{entry.title}</span>
                <span className="block truncate text-[13px] text-zinc-500">{entry.detail}</span>
              </span>
              <time dateTime={entry.date} className="shrink-0 pt-0.5 text-xs text-zinc-400">
                {formatRelative(entry.date)}
              </time>
            </>
          );
          return (
            <li key={entry.id} className="relative">
              {index < entries.length - 1 && (
                <span className="absolute top-10 bottom-0 left-[15px] w-px bg-zinc-200" aria-hidden />
              )}
              {entry.href ? (
                <Link href={entry.href} className="-mx-2 flex gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-zinc-50">
                  {content}
                </Link>
              ) : (
                <div className="flex gap-3 py-2">{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function AttentionCard({ state }: { state: InventoryState }) {
  const now = new Date();
  const pending = state.salesOrders.filter((so) => so.status === "pending");
  const overdue = state.salesOrders.filter((so) => salesDisplayStatus(so) === "overdue");
  const open = state.purchaseOrders.filter((po) => po.status === "ordered");
  const delayed = open.filter((po) => purchaseDisplayStatus(po) === "delayed");
  const arriving = open.filter((po) => !delayed.includes(po) && new Date(po.expectedDate) <= addDays(now, 7));

  const tasks = [
    { count: pending.length, label: `${pluralize(pending.length, "order")} to dispatch`, href: "/sales?status=pending", icon: Send, tone: "text-amber-600" },
    { count: overdue.length, label: `${pluralize(overdue.length, "invoice")} overdue`, href: "/sales?status=overdue", icon: Clock, tone: "text-rose-600" },
    { count: delayed.length, label: `${pluralize(delayed.length, "delivery", "deliveries")} delayed`, href: "/purchases?status=delayed", icon: TriangleAlert, tone: "text-rose-600" },
    { count: arriving.length, label: `${pluralize(arriving.length, "delivery", "deliveries")} due this week`, href: "/purchases?status=ordered", icon: Truck, tone: "text-brand-600" },
  ].filter((task) => task.count > 0);

  return (
    <Card>
      <CardHeader title="Needs attention" />
      {tasks.length === 0 ? (
        <p className="flex items-center gap-2 px-5 pb-5 text-sm text-zinc-500">
          <CircleCheck className="size-4 text-emerald-500" aria-hidden /> All caught up
        </p>
      ) : (
        <ul className="px-2 pb-2">
          {tasks.map((task) => (
            <li key={task.href}>
              <Link href={task.href} className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-zinc-50">
                <task.icon className={cn("size-4 shrink-0", task.tone)} aria-hidden />
                <span className="flex-1 text-zinc-700">{task.label}</span>
                <ArrowRight className="size-4 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function TopSellersCard({ state }: { state: InventoryState }) {
  const now = new Date();
  const lines = invoicedBetween(state, addDays(now, -30), now).flatMap((so) => so.lines);
  const top = groupTotals(lines, (line) => line.itemId, (line) => line.qty * line.rate).slice(0, 5);
  const unitsOf = (itemId: string) => sum(lines.filter((l) => l.itemId === itemId), (l) => l.qty);

  return (
    <Card>
      <CardHeader title="Top sellers" description="Revenue excl. GST, last 30 days" />
      <div className="px-5 pb-5">
        {top.length === 0 ? (
          <p className="text-sm text-zinc-500">No sales in the last 30 days.</p>
        ) : (
          <BarList
            title="Top selling items by revenue"
            formatValue={formatCompactCurrency}
            items={top.map(({ key, total }) => ({
              key,
              label: byId(state.items, key)?.name ?? "Item",
              value: total,
              meta: `${unitsOf(key)} sold`,
              href: `/stock/${key}`,
            }))}
          />
        )}
      </div>
    </Card>
  );
}
