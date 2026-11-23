"use client";

import { ArrowUpRight, Plus, Users } from "lucide-react";
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
import { formatCurrency, formatShortDate } from "@/lib/format";
import { isInvoiced, orderTotal, salesDisplayStatus } from "@/lib/selectors";
import { useInventory } from "@/lib/store";
import { matches, sum } from "@/lib/utils";

export function CustomersView() {
  const state = useInventory();
  const router = useRouter();
  const openDialog = useOpenDialog();
  const [query, setQuery] = useState("");

  const rows = state.customers
    .filter((c) => matches(query, c.name, c.city, c.contactName, c.gstin))
    .map((customer) => {
      const orders = state.salesOrders.filter((so) => so.customerId === customer.id);
      const unpaid = orders.filter((so) => so.status === "dispatched");
      return {
        customer,
        orders: orders.filter((so) => so.status !== "cancelled").length,
        billed: sum(orders.filter(isInvoiced), orderTotal),
        outstanding: sum(unpaid, orderTotal),
        overdue: unpaid.some((so) => salesDisplayStatus(so) === "overdue"),
        lastOrder: orders.map((so) => so.date).sort().at(-1),
      };
    })
    .sort((a, b) => b.billed - a.billed);

  return (
    <>
      <PageHeader
        title="Customers"
        description="Who you sell to, what they've been billed and what they still owe."
        actions={
          <Button variant="primary" onClick={() => openDialog({ type: "customer" })}>
            <Plus /> Add customer
          </Button>
        }
      />
      <Card>
        <div className="p-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Search name, city or GSTIN" />
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={Users} title="No customers match" className="border-t border-zinc-950/[0.06]" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Customer</TH>
                <TH className="hidden md:table-cell">Contact</TH>
                <TH className="hidden lg:table-cell">GSTIN</TH>
                <TH className="text-right">Orders</TH>
                <TH className="text-right">Billed</TH>
                <TH className="text-right">Outstanding</TH>
                <TH className="hidden text-right sm:table-cell">Last order</TH>
                <TH className="w-px"><span className="sr-only">Open</span></TH>
              </tr>
            </THead>
            <TBody>
              {rows.map(({ customer, orders, billed, outstanding, overdue, lastOrder }) => {
                const href = `/sales?customer=${customer.id}`;
                return (
                  <TR key={customer.id} className={clickableRow} onClick={() => router.push(href)}>
                    <TD>
                      <Link href={href} className="font-medium text-zinc-900 hover:underline" onClick={(e) => e.stopPropagation()}>
                        {customer.name}
                      </Link>
                      <p className="text-xs text-zinc-500">
                        {customer.city} · Net {customer.paymentTermsDays}
                      </p>
                    </TD>
                    <TD className="hidden md:table-cell">
                      <p className="text-zinc-700">{customer.contactName}</p>
                      <p className="text-xs text-zinc-500">{customer.phone}</p>
                    </TD>
                    <TD className="hidden font-mono text-[13px] text-zinc-600 lg:table-cell">{customer.gstin || "—"}</TD>
                    <TD className="text-right text-zinc-600 tabular-nums">{orders}</TD>
                    <TD className="text-right font-medium tabular-nums">{formatCurrency(billed)}</TD>
                    <TD className="text-right tabular-nums">
                      {outstanding > 0 ? (
                        <span className={overdue ? "font-medium text-rose-600" : "text-zinc-900"}>
                          {formatCurrency(outstanding)}
                          {overdue && <span className="block text-[11px] font-normal">includes overdue</span>}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </TD>
                    <TD className="hidden text-right text-[13px] text-zinc-500 sm:table-cell">
                      {lastOrder ? formatShortDate(lastOrder) : "—"}
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
