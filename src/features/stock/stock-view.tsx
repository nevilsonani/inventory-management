"use client";

import { ArrowLeftRight, Download, History, PackagePlus, PackageSearch, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useOpenDialog } from "@/components/layout/dialog-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/field";
import { Meter } from "@/components/ui/meter";
import { SearchInput } from "@/components/ui/search-input";
import { Segmented } from "@/components/ui/segmented";
import { Stat } from "@/components/ui/stat";
import { Table, TBody, TD, TH, THead, TR, clickableRow } from "@/components/ui/table";
import { downloadCsv } from "@/lib/csv";
import { formatCompactCurrency, formatCurrency, formatNumber } from "@/lib/format";
import { byId, inventoryValue, onHand, qtyAt, stockStatus } from "@/lib/selectors";
import { useInventory } from "@/lib/store";
import type { InventoryState, MovementType } from "@/lib/types";
import { useQueryState } from "@/lib/use-query-state";
import { cn, matches, sum } from "@/lib/utils";
import { movementLabels, StockStatusBadge, stockTone } from "../shared/status";
import { MovementsTable } from "./movements-table";

const views = ["items", "history"] as const;
const statusFilters = ["all", "reorder", "in_stock"] as const;
type StatusFilter = (typeof statusFilters)[number];

export function StockView() {
  const state = useInventory();
  const openDialog = useOpenDialog();
  const [view, setView] = useQueryState("view", "items", views);
  const [godownId, setGodownId] = useQueryState("godown", "");

  const alerts = state.items.filter((item) => stockStatus(item) !== "in_stock");

  return (
    <>
      <PageHeader
        title="Stock"
        description="Every item across all godowns. Purchases add stock, sales and transfers move it."
        actions={
          <>
            <Button onClick={() => openDialog({ type: "adjust" })}>
              <SlidersHorizontal /> Adjust
            </Button>
            <Button onClick={() => openDialog({ type: "transfer" })}>
              <ArrowLeftRight /> Transfer
            </Button>
            <Button variant="primary" onClick={() => openDialog({ type: "item" })}>
              <PackagePlus /> Add item
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat label="Items" value={state.items.length} footer={`${new Set(state.items.map((i) => i.category)).size} categories`} />
        <Stat label="Units on hand" value={formatNumber(sum(state.items, onHand))} footer={`Across ${state.godowns.length} godowns`} />
        <Stat label="Stock value" value={formatCompactCurrency(inventoryValue(state.items))} footer="At cost price" />
        <Stat
          label="Needs reorder"
          value={alerts.length}
          footer={`${alerts.filter((i) => stockStatus(i) === "out").length} out of stock`}
          href="/stock?status=reorder"
        />
      </div>

      <div className="mb-4 flex items-center gap-1 border-b border-zinc-950/[0.08]" role="tablist" aria-label="Stock views">
        {views.map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={cn(
              "-mb-px flex h-10 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors",
              view === v ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-800",
            )}
          >
            {v === "items" ? <PackageSearch className="size-4" /> : <History className="size-4" />}
            {v === "items" ? "Items" : "Stock history"}
          </button>
        ))}
      </div>

      {view === "items" ? (
        <ItemsTable state={state} godownId={godownId} setGodownId={setGodownId} />
      ) : (
        <HistoryTable state={state} godownId={godownId} setGodownId={setGodownId} />
      )}
    </>
  );
}

interface TabProps {
  state: InventoryState;
  godownId: string;
  setGodownId: (id: string | null) => void;
}

function GodownSelect({ state, godownId, setGodownId }: TabProps) {
  return (
    <Select value={godownId} onChange={(e) => setGodownId(e.target.value || null)} aria-label="Godown" className="sm:w-44">
      <option value="">All godowns</option>
      {state.godowns.map((g) => (
        <option key={g.id} value={g.id}>{g.name}</option>
      ))}
    </Select>
  );
}

function ItemsTable({ state, godownId, setGodownId }: TabProps) {
  const router = useRouter();
  const [status, setStatus] = useQueryState<StatusFilter>("status", "all", statusFilters);
  const [category, setCategory] = useQueryState("category", "");
  const [query, setQuery] = useState("");

  const categories = [...new Set(state.items.map((item) => item.category))].sort();
  const godowns = godownId ? state.godowns.filter((g) => g.id === godownId) : state.godowns;

  const rows = state.items
    .map((item) => {
      const qty = godownId ? qtyAt(item, godownId) : onHand(item);
      return { item, qty, total: onHand(item), status: stockStatus(item) };
    })
    .filter(
      (row) =>
        matches(query, row.item.name, row.item.sku) &&
        (!category || row.item.category === category) &&
        (status === "all" || (status === "reorder" ? row.status !== "in_stock" : row.status === "in_stock")),
    )
    .sort((a, b) =>
      status === "reorder" ? a.total / a.item.minStock - b.total / b.item.minStock : a.item.name.localeCompare(b.item.name),
    );

  const counts = {
    all: state.items.length,
    reorder: state.items.filter((i) => stockStatus(i) !== "in_stock").length,
    in_stock: state.items.filter((i) => stockStatus(i) === "in_stock").length,
  };

  function exportCsv() {
    downloadCsv(
      "stock.csv",
      ["SKU", "Item", "Category", ...state.godowns.map((g) => g.name), "On hand", "Min level", "Status", "Unit cost", "Value"],
      rows.map(({ item, total, status: s }) => [
        item.sku,
        item.name,
        item.category,
        ...state.godowns.map((g) => qtyAt(item, g.id)),
        total,
        item.minStock,
        s === "in_stock" ? "In stock" : s === "low" ? "Low stock" : "Out of stock",
        item.costPrice,
        total * item.costPrice,
      ]),
    );
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <Segmented
          label="Filter by stock status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All items", count: counts.all },
            { value: "reorder", label: "Needs reorder", count: counts.reorder },
            { value: "in_stock", label: "In stock", count: counts.in_stock },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row lg:ml-auto">
          <SearchInput value={query} onChange={setQuery} placeholder="Search name or SKU" className="sm:w-56" />
          <Select value={category} onChange={(e) => setCategory(e.target.value || null)} aria-label="Category" className="sm:w-40">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
          <GodownSelect state={state} godownId={godownId} setGodownId={setGodownId} />
          <Button onClick={exportCsv} aria-label="Export CSV" title="Export CSV" className="max-sm:w-full">
            <Download /> <span className="sm:hidden">Export</span>
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="No items match"
          description="Try another search, category or status."
          className="border-t border-zinc-950/[0.06]"
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Item</TH>
              <TH className="hidden md:table-cell">Category</TH>
              {godowns.map((g) => (
                <TH key={g.id} className="hidden text-right xl:table-cell" title={g.name}>
                  {g.code}
                </TH>
              ))}
              <TH className="text-right">{godownId ? "At godown" : "On hand"}</TH>
              <TH className="text-right">Min</TH>
              <TH className="w-48">Status</TH>
              <TH className="hidden text-right lg:table-cell">Value</TH>
            </tr>
          </THead>
          <TBody>
            {rows.map(({ item, qty, total, status: s }) => (
              <TR key={item.id} className={clickableRow} onClick={() => router.push(`/stock/${item.id}`)}>
                <TD>
                  <Link href={`/stock/${item.id}`} className="font-medium text-zinc-900 hover:underline" onClick={(e) => e.stopPropagation()}>
                    {item.name}
                  </Link>
                  <p className="font-mono text-[11px] text-zinc-500">{item.sku}</p>
                </TD>
                <TD className="hidden text-zinc-600 md:table-cell">{item.category}</TD>
                {godowns.map((g) => (
                  <TD key={g.id} className="hidden text-right text-zinc-500 tabular-nums xl:table-cell">
                    {qtyAt(item, g.id)}
                  </TD>
                ))}
                <TD className="text-right font-semibold tabular-nums">{formatNumber(qty)}</TD>
                <TD className="text-right text-zinc-500 tabular-nums">{item.minStock}</TD>
                <TD>
                  <div className="flex items-center gap-3">
                    <Meter value={total} max={item.minStock * 3} tone={stockTone(s)} label={`${item.name} stock level`} className="w-14" />
                    <StockStatusBadge status={s} />
                  </div>
                </TD>
                <TD className="hidden text-right text-zinc-600 tabular-nums lg:table-cell">
                  {formatCurrency(total * item.costPrice)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}

const PAGE_SIZE = 40;
const movementTypes = Object.keys(movementLabels) as MovementType[];

function HistoryTable({ state, godownId, setGodownId }: TabProps) {
  const [type, setType] = useQueryState<MovementType | "">("type", "");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const movements = useMemo(
    () => [...state.movements].sort((a, b) => b.date.localeCompare(a.date)),
    [state.movements],
  );
  const visible = movements.filter((move) => {
    const item = byId(state.items, move.itemId);
    return (
      (!type || move.type === type) &&
      (!godownId || move.godownId === godownId) &&
      matches(query, item?.name, item?.sku, move.ref, move.note)
    );
  });

  return (
    <Card>
      <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
        <SearchInput value={query} onChange={setQuery} placeholder="Search item, SKU or reference" />
        <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row">
          <Select value={type} onChange={(e) => setType((e.target.value || null) as MovementType | null)} aria-label="Movement type" className="sm:w-44">
            <option value="">All movements</option>
            {movementTypes.map((t) => (
              <option key={t} value={t}>{movementLabels[t]}</option>
            ))}
          </Select>
          <GodownSelect state={state} godownId={godownId} setGodownId={setGodownId} />
        </div>
      </div>
      {visible.length === 0 ? (
        <EmptyState icon={History} title="No stock movements match" className="border-t border-zinc-950/[0.06]" />
      ) : (
        <>
          <MovementsTable state={state} movements={visible.slice(0, limit)} />
          <div className="flex items-center justify-between border-t border-zinc-950/[0.06] px-5 py-3 text-[13px] text-zinc-500">
            <span>
              Showing {Math.min(limit, visible.length)} of {visible.length} movements
            </span>
            {limit < visible.length && (
              <Button size="sm" onClick={() => setLimit(limit + PAGE_SIZE)}>
                Show more
              </Button>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
