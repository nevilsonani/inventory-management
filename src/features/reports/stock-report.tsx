import Link from "next/link";
import { BarList } from "@/components/charts/bar-list";
import { Card, CardHeader } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { downloadCsv } from "@/lib/csv";
import { formatCompactCurrency, formatCurrency, formatNumber } from "@/lib/format";
import { groupTotals, inventoryValue, onHand, qtyAt, stockStatus, stockValue } from "@/lib/selectors";
import type { InventoryState } from "@/lib/types";
import { sum } from "@/lib/utils";
import { StockStatusBadge } from "../shared/status";
import { ReportTableCard } from "./report-table-card";

const statusLabel = { in_stock: "In stock", low: "Low stock", out: "Out of stock" };

export function StockReport({ state }: { state: InventoryState }) {
  const items = [...state.items].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  const totalValue = inventoryValue(items);
  const byCategory = groupTotals(items, (item) => item.category, stockValue);
  const byGodown = state.godowns
    .map((g) => ({ godown: g, value: sum(items, (item) => qtyAt(item, g.id) * item.costPrice) }))
    .sort((a, b) => b.value - a.value);

  function exportCsv() {
    downloadCsv(
      "stock-report.csv",
      ["SKU", "Item", "Category", ...state.godowns.map((g) => g.name), "Total", "Min level", "Status", "Unit cost", "Value"],
      items.map((item) => [
        item.sku,
        item.name,
        item.category,
        ...state.godowns.map((g) => qtyAt(item, g.id)),
        onHand(item),
        item.minStock,
        statusLabel[stockStatus(item)],
        item.costPrice,
        stockValue(item),
      ]),
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat label="Stock value" value={formatCompactCurrency(totalValue)} footer="At cost price" />
        <Stat label="Units on hand" value={formatNumber(sum(items, onHand))} footer={`${state.godowns.length} godowns`} />
        <Stat label="Items" value={items.length} footer={`${byCategory.length} categories`} />
        <Stat
          label="Needs reorder"
          value={items.filter((i) => stockStatus(i) !== "in_stock").length}
          footer={`${items.filter((i) => stockStatus(i) === "out").length} out of stock`}
        />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Value by category" description="Share of stock value at cost" />
          <div className="px-5 pb-5">
            <BarList
              title="Stock value by category"
              formatValue={formatCompactCurrency}
              items={byCategory.map(({ key, total }) => ({
                key,
                label: key,
                value: total,
                meta: `${Math.round((total / totalValue) * 100)}%`,
                href: `/stock?category=${encodeURIComponent(key)}`,
              }))}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="Value by godown" description="Where your money is sitting" />
          <div className="px-5 pb-5">
            <BarList
              title="Stock value by godown"
              formatValue={formatCompactCurrency}
              items={byGodown.map(({ godown, value }) => ({
                key: godown.id,
                label: godown.name,
                value,
                meta: `${Math.round((value / totalValue) * 100)}%`,
                href: `/stock?godown=${godown.id}`,
              }))}
            />
          </div>
        </Card>
      </div>

      <ReportTableCard title="Stock position" description="Quantity per godown and valuation for every item" onExport={exportCsv}>
        <Table>
          <THead>
            <tr>
              <TH>Item</TH>
              <TH className="hidden md:table-cell">Category</TH>
              {state.godowns.map((g) => (
                <TH key={g.id} className="hidden text-right lg:table-cell" title={g.name}>{g.code}</TH>
              ))}
              <TH className="text-right">Total</TH>
              <TH className="hidden text-right sm:table-cell">Min</TH>
              <TH>Status</TH>
              <TH className="hidden text-right md:table-cell">Unit cost</TH>
              <TH className="text-right">Value</TH>
            </tr>
          </THead>
          <TBody>
            {items.map((item) => (
              <TR key={item.id}>
                <TD>
                  <Link href={`/stock/${item.id}`} className="font-medium hover:text-brand-700 hover:underline">{item.name}</Link>
                  <p className="font-mono text-[11px] text-zinc-500">{item.sku}</p>
                </TD>
                <TD className="hidden text-zinc-600 md:table-cell">{item.category}</TD>
                {state.godowns.map((g) => (
                  <TD key={g.id} className="hidden text-right text-zinc-500 tabular-nums lg:table-cell">{qtyAt(item, g.id)}</TD>
                ))}
                <TD className="text-right font-medium tabular-nums">{onHand(item)}</TD>
                <TD className="hidden text-right text-zinc-500 tabular-nums sm:table-cell">{item.minStock}</TD>
                <TD><StockStatusBadge status={stockStatus(item)} /></TD>
                <TD className="hidden text-right text-zinc-600 tabular-nums md:table-cell">{formatCurrency(item.costPrice)}</TD>
                <TD className="text-right font-medium tabular-nums">{formatCurrency(stockValue(item))}</TD>
              </TR>
            ))}
          </TBody>
          <tfoot>
            <tr className="border-t border-zinc-950/[0.08] bg-zinc-50/80 font-semibold">
              <TD>Total</TD>
              <TD className="hidden md:table-cell" />
              {state.godowns.map((g) => (
                <TD key={g.id} className="hidden text-right tabular-nums lg:table-cell">
                  {formatNumber(sum(items, (item) => qtyAt(item, g.id)))}
                </TD>
              ))}
              <TD className="text-right tabular-nums">{formatNumber(sum(items, onHand))}</TD>
              <TD className="hidden sm:table-cell" />
              <TD />
              <TD className="hidden md:table-cell" />
              <TD className="text-right tabular-nums">{formatCurrency(totalValue)}</TD>
            </tr>
          </tfoot>
        </Table>
      </ReportTableCard>
    </>
  );
}
