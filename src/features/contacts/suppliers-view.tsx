"use client";

import { ArrowUpRight, Factory, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useOpenDialog } from "@/components/layout/dialog-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { Table, TBody, TD, TH, THead, TR, clickableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { orderTotal, purchaseDisplayStatus } from "@/lib/selectors";
import { useInventory } from "@/lib/store";
import { daysBetween, matches, sum } from "@/lib/utils";

export function SuppliersView() {
  const state = useInventory();
  const router = useRouter();
  const openDialog = useOpenDialog();
  const [query, setQuery] = useState("");

  const rows = state.suppliers
    .filter((s) => matches(query, s.name, s.city, s.contactName))
    .map((supplier) => {
      const orders = state.purchaseOrders.filter((po) => po.supplierId === supplier.id);
      const received = orders.filter((po) => po.status === "received");
      const open = orders.filter((po) => po.status === "ordered");
      const onTime = received.filter((po) => new Date(po.receivedAt!) <= new Date(po.expectedDate)).length;
      const avgLead = received.length
        ? Math.round(sum(received, (po) => daysBetween(po.date, po.receivedAt!)) / received.length)
        : null;
      return {
        supplier,
        spend: sum(received, orderTotal),
        open,
        delayed: open.some((po) => purchaseDisplayStatus(po) === "delayed"),
        onTimeRate: received.length ? Math.round((onTime / received.length) * 100) : null,
        avgLead,
        items: state.items.filter((item) => item.preferredSupplierId === supplier.id).length,
      };
    })
    .sort((a, b) => b.spend - a.spend);

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Who you buy from, how much, and how reliably they deliver."
        actions={
          <Button variant="primary" onClick={() => openDialog({ type: "supplier" })}>
            <Plus /> Add supplier
          </Button>
        }
      />
      <Card>
        <div className="p-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Search name or city" />
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={Factory} title="No suppliers match" className="border-t border-zinc-950/[0.06]" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Supplier</TH>
                <TH className="hidden md:table-cell">Contact</TH>
                <TH className="hidden text-right lg:table-cell">Items supplied</TH>
                <TH className="text-right">Purchased</TH>
                <TH className="text-right">Open POs</TH>
                <TH className="hidden text-right sm:table-cell">Avg. lead time</TH>
                <TH className="hidden text-right sm:table-cell">On time</TH>
                <TH className="w-px"><span className="sr-only">Open</span></TH>
              </tr>
            </THead>
            <TBody>
              {rows.map(({ supplier, spend, open, delayed, onTimeRate, avgLead, items }) => {
                const href = `/purchases?supplier=${supplier.id}`;
                return (
                  <TR key={supplier.id} className={clickableRow} onClick={() => router.push(href)}>
                    <TD>
                      <Link href={href} className="font-medium text-zinc-900 hover:underline" onClick={(e) => e.stopPropagation()}>
                        {supplier.name}
                      </Link>
                      <p className="text-xs text-zinc-500">{supplier.city}</p>
                    </TD>
                    <TD className="hidden md:table-cell">
                      <p className="text-zinc-700">{supplier.contactName}</p>
                      <p className="text-xs text-zinc-500">{supplier.email}</p>
                    </TD>
                    <TD className="hidden text-right text-zinc-600 tabular-nums lg:table-cell">{items}</TD>
                    <TD className="text-right font-medium tabular-nums">{formatCurrency(spend)}</TD>
                    <TD className="text-right tabular-nums">
                      {open.length ? (
                        <span className={delayed ? "font-medium text-rose-600" : "text-zinc-900"}>
                          {open.length}
                          {delayed && <span className="block text-[11px] font-normal">delayed</span>}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </TD>
                    <TD className="hidden text-right text-zinc-600 tabular-nums sm:table-cell">
                      {avgLead !== null ? `${avgLead} days` : "—"}
                      <span className="block text-[11px] text-zinc-400">quoted {supplier.leadTimeDays}</span>
                    </TD>
                    <TD className="hidden text-right tabular-nums sm:table-cell">
                      {onTimeRate !== null ? `${onTimeRate}%` : "—"}
                    </TD>
                    <TD>
                      <ArrowUpRight className="size-4 text-zinc-300 transition-colors group-hover:text-zinc-500" aria-hidden />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
