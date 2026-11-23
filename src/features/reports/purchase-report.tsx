import Link from "next/link";
import { BarList } from "@/components/charts/bar-list";
import { ColumnChart } from "@/components/charts/column-chart";
import { Card, CardHeader } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { downloadCsv } from "@/lib/csv";
import { formatCompactCurrency, formatCurrency, formatDate, pluralize } from "@/lib/format";
import {
  byId,
  groupTotals,
  inRange,
  orderTotal,
  orderTotals,
  purchaseDisplayStatus,
  purchasesBetween,
  receivedBetween,
  unitCount,
} from "@/lib/selectors";
import type { InventoryState } from "@/lib/types";
import { daysBetween, sum } from "@/lib/utils";
import { PurchaseStatusBadge } from "../shared/status";
import { timeBuckets } from "./buckets";
import { ReportTableCard } from "./report-table-card";

const PURCHASES_COLOR = "var(--color-series-2)";
const PURCHASES = [{ key: "purchases", name: "Purchases", color: PURCHASES_COLOR }];

export function PurchaseReport({ state, from, to }: { state: InventoryState; from: Date; to: Date }) {
  const raised = state.purchaseOrders
    .filter((po) => inRange(po.date, from, to))
    .sort((a, b) => b.date.localeCompare(a.date));
  const received = receivedBetween(state, from, to);
  const spend = sum(received, orderTotal);
  const open = state.purchaseOrders.filter((po) => po.status === "ordered");
  const onTime = received.filter((po) => new Date(po.receivedAt!) <= new Date(po.expectedDate)).length;
  const span = daysBetween(from, to);

  const bySupplier = groupTotals(received, (po) => po.supplierId, orderTotal);
  const byGodown = groupTotals(received, (po) => po.godownId, orderTotal);
  const byCategory = groupTotals(
    received.flatMap((po) => po.lines),
    (line) => byId(state.items, line.itemId)?.category ?? "Other",
    (line) => line.qty * line.rate,
  );
  const buckets = timeBuckets(from, to);

  function exportCsv() {
    downloadCsv(
      "purchase-report.csv",
      ["PO", "Date", "Supplier", "Deliver to", "Units", "Taxable value", "GST", "Total", "Status", "Expected", "Received"],
      raised.map((po) => {
        const t = orderTotals(po);
        return [
          po.number,
          formatDate(po.date),
          byId(state.suppliers, po.supplierId)?.name,
          byId(state.godowns, po.godownId)?.name,
          unitCount(po.lines),
          t.subtotal,
          t.tax,
          t.total,
          purchaseDisplayStatus(po),
          formatDate(po.expectedDate),
          po.receivedAt ? formatDate(po.receivedAt) : "",
        ];
      }),
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat label="Goods received" value={formatCompactCurrency(spend)} footer={pluralize(received.length, "delivery", "deliveries")} />
        <Stat label="Orders raised" value={raised.length} footer={`Worth ${formatCompactCurrency(sum(raised, orderTotal))}`} />
        <Stat label="Open orders" value={formatCompactCurrency(sum(open, orderTotal))} footer={`${open.length} awaiting delivery`} />
        <Stat
          label="On-time delivery"
          value={received.length ? `${Math.round((onTime / received.length) * 100)}%` : "—"}
          footer={`${onTime} of ${received.length} by expected date`}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Purchases over time" description={`${span <= 92 ? "Weekly" : "Monthly"} value received, including GST`} />
          <div className="px-5 pt-6 pb-5">
            <ColumnChart
              title="Purchases received by period"
              data={buckets.map((b) => ({ label: b.label, values: { purchases: purchasesBetween(state, b.from, b.to) } }))}
              series={PURCHASES}
              formatValue={formatCurrency}
              formatAxis={formatCompactCurrency}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="By supplier" description="Value received" />
          <div className="px-5 pb-5">
            <BarList
              title="Purchases by supplier"
              color={PURCHASES_COLOR}
              formatValue={formatCompactCurrency}
              items={bySupplier.map(({ key, total }) => ({
                key,
                label: byId(state.suppliers, key)?.name ?? "Supplier",
                value: total,
                href: `/purchases?supplier=${key}`,
              }))}
            />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="By category" description="Value received excl. GST" />
          <div className="px-5 pb-5">
            <BarList
              title="Purchases by category"
              color={PURCHASES_COLOR}
              formatValue={formatCompactCurrency}
              items={byCategory.map(({ key, total }) => ({ key, label: key, value: total }))}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="By godown" description="Where received goods were delivered" />
          <div className="px-5 pb-5">
            <BarList
              title="Purchases by godown"
              color={PURCHASES_COLOR}
              formatValue={formatCompactCurrency}
              items={byGodown.map(({ key, total }) => ({
                key,
                label: byId(state.godowns, key)?.name ?? "Godown",
                value: total,
                href: `/purchases?godown=${key}`,
              }))}
            />
          </div>
        </Card>
      </div>

      <ReportTableCard title="Purchase orders" description={`${raised.length} orders raised in this period`} onExport={exportCsv}>
        <Table>
          <THead>
            <tr>
              <TH>PO</TH>
              <TH>Supplier</TH>
              <TH className="hidden md:table-cell">Deliver to</TH>
              <TH className="hidden text-right sm:table-cell">Units</TH>
              <TH className="text-right">Total</TH>
              <TH>Status</TH>
              <TH className="hidden lg:table-cell">Received</TH>
            </tr>
          </THead>
          <TBody>
            {raised.map((po) => (
              <TR key={po.id}>
                <TD>
                  <Link href={`/purchases?order=${po.id}`} className="font-medium hover:text-brand-700 hover:underline">{po.number}</Link>
                  <p className="text-xs text-zinc-500">{formatDate(po.date)}</p>
                </TD>
                <TD className="max-w-60 truncate">{byId(state.suppliers, po.supplierId)?.name}</TD>
                <TD className="hidden text-zinc-600 md:table-cell">{byId(state.godowns, po.godownId)?.name}</TD>
                <TD className="hidden text-right text-zinc-600 tabular-nums sm:table-cell">{unitCount(po.lines)}</TD>
                <TD className="text-right font-medium tabular-nums">{formatCurrency(orderTotal(po))}</TD>
                <TD><PurchaseStatusBadge status={purchaseDisplayStatus(po)} /></TD>
                <TD className="hidden text-[13px] text-zinc-500 lg:table-cell">{po.receivedAt ? formatDate(po.receivedAt) : "—"}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </ReportTableCard>
    </>
  );
}
