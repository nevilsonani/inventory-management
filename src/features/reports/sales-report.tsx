import Link from "next/link";
import { BarList } from "@/components/charts/bar-list";
import { ColumnChart } from "@/components/charts/column-chart";
import { Card, CardHeader } from "@/components/ui/card";
import { Delta, Stat } from "@/components/ui/stat";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { downloadCsv } from "@/lib/csv";
import { formatCompactCurrency, formatCurrency, formatDate, formatNumber } from "@/lib/format";
import {
  byId,
  groupTotals,
  invoicedBetween,
  invoiceDate,
  orderTotal,
  orderTotals,
  revenueBetween,
  salesDisplayStatus,
  unitCount,
} from "@/lib/selectors";
import type { InventoryState } from "@/lib/types";
import { daysBetween, sum } from "@/lib/utils";
import { SalesStatusBadge } from "../shared/status";
import { timeBuckets } from "./buckets";
import { ReportTableCard } from "./report-table-card";

const SALES = [{ key: "sales", name: "Revenue", color: "var(--color-series-1)" }];

export function SalesReport({ state, from, to }: { state: InventoryState; from: Date; to: Date }) {
  const invoices = invoicedBetween(state, from, to).sort((a, b) => invoiceDate(b).localeCompare(invoiceDate(a)));
  const revenue = sum(invoices, orderTotal);
  const gst = sum(invoices, (so) => orderTotals(so).tax);
  const span = daysBetween(from, to);
  const previous = revenueBetween(state, new Date(from.getTime() - (to.getTime() - from.getTime())), from);

  const lines = invoices.flatMap((so) => so.lines);
  const topItems = groupTotals(lines, (l) => l.itemId, (l) => l.qty * l.rate).slice(0, 6);
  const topCustomers = groupTotals(invoices, (so) => so.customerId, orderTotal).slice(0, 6);
  const byGodown = groupTotals(invoices, (so) => so.godownId, orderTotal);
  const buckets = timeBuckets(from, to);

  function exportCsv() {
    downloadCsv(
      "sales-report.csv",
      ["Invoice", "Invoice date", "Customer", "Godown", "Units", "Taxable value", "GST", "Total", "Status"],
      invoices.map((so) => {
        const t = orderTotals(so);
        return [
          so.number,
          formatDate(invoiceDate(so)),
          byId(state.customers, so.customerId)?.name,
          byId(state.godowns, so.godownId)?.name,
          unitCount(so.lines),
          t.subtotal,
          t.tax,
          t.total,
          salesDisplayStatus(so),
        ];
      }),
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat
          label="Revenue"
          value={formatCompactCurrency(revenue)}
          footer={<Delta current={revenue} previous={previous} suffix={`vs previous ${span} days`} />}
        />
        <Stat label="Invoices" value={invoices.length} footer={`${formatNumber(sum(invoices, (so) => unitCount(so.lines)))} units sold`} />
        <Stat label="Average invoice" value={formatCompactCurrency(invoices.length ? revenue / invoices.length : 0)} footer="Including GST" />
        <Stat label="GST collected" value={formatCompactCurrency(gst)} footer="Output tax at 18%" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Revenue over time" description={`${span <= 92 ? "Weekly" : "Monthly"}, including GST`} />
          <div className="px-5 pt-6 pb-5">
            <ColumnChart
              title="Revenue by period"
              data={buckets.map((b) => ({ label: b.label, values: { sales: revenueBetween(state, b.from, b.to) } }))}
              series={SALES}
              formatValue={formatCurrency}
              formatAxis={formatCompactCurrency}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="Top customers" description="By invoiced value" />
          <div className="px-5 pb-5">
            <BarList
              title="Top customers by revenue"
              formatValue={formatCompactCurrency}
              items={topCustomers.map(({ key, total }) => ({
                key,
                label: byId(state.customers, key)?.name ?? "Customer",
                value: total,
                href: `/sales?customer=${key}`,
              }))}
            />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Best-selling items" description="Revenue excl. GST, with units sold" />
          <div className="px-5 pb-5">
            <BarList
              title="Best-selling items"
              formatValue={formatCompactCurrency}
              items={topItems.map(({ key, total }) => ({
                key,
                label: byId(state.items, key)?.name ?? "Item",
                value: total,
                meta: `${sum(lines.filter((l) => l.itemId === key), (l) => l.qty)} units`,
                href: `/stock/${key}`,
              }))}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="Sales by godown" description="Invoiced value dispatched from each godown" />
          <div className="px-5 pb-5">
            <BarList
              title="Sales by godown"
              formatValue={formatCompactCurrency}
              items={byGodown.map(({ key, total }) => ({
                key,
                label: byId(state.godowns, key)?.name ?? "Godown",
                value: total,
                meta: `${Math.round((total / revenue) * 100)}%`,
                href: `/sales?godown=${key}`,
              }))}
            />
          </div>
        </Card>
      </div>

      <ReportTableCard title="Invoices" description={`${invoices.length} invoices raised in this period`} onExport={exportCsv}>
        <Table>
          <THead>
            <tr>
              <TH>Invoice</TH>
              <TH>Customer</TH>
              <TH className="hidden text-right sm:table-cell">Units</TH>
              <TH className="hidden text-right md:table-cell">Taxable</TH>
              <TH className="hidden text-right md:table-cell">GST</TH>
              <TH className="text-right">Total</TH>
              <TH>Status</TH>
            </tr>
          </THead>
          <TBody>
            {invoices.map((so) => {
              const t = orderTotals(so);
              return (
                <TR key={so.id}>
                  <TD>
                    <Link href={`/sales?order=${so.id}`} className="font-medium hover:text-brand-700 hover:underline">{so.number}</Link>
                    <p className="text-xs text-zinc-500">{formatDate(invoiceDate(so))}</p>
                  </TD>
                  <TD className="max-w-60 truncate">{byId(state.customers, so.customerId)?.name}</TD>
                  <TD className="hidden text-right text-zinc-600 tabular-nums sm:table-cell">{unitCount(so.lines)}</TD>
                  <TD className="hidden text-right text-zinc-600 tabular-nums md:table-cell">{formatCurrency(t.subtotal)}</TD>
                  <TD className="hidden text-right text-zinc-600 tabular-nums md:table-cell">{formatCurrency(t.tax)}</TD>
                  <TD className="text-right font-medium tabular-nums">{formatCurrency(t.total)}</TD>
                  <TD><SalesStatusBadge status={salesDisplayStatus(so)} /></TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </ReportTableCard>
    </>
  );
}
