"use client";

import {
  ArrowLeftRight,
  Box,
  CornerDownLeft,
  PackagePlus,
  Plus,
  ReceiptText,
  Search,
  SlidersHorizontal,
  SunMoon,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useModal } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { formatCurrency } from "@/lib/format";
import { byId, onHand, orderTotal } from "@/lib/selectors";
import { toggleTheme } from "@/lib/theme";
import { useInventory } from "@/lib/store";
import type { InventoryState } from "@/lib/types";
import { cn, matches } from "@/lib/utils";
import { useOpenDialog, type DialogSpec } from "./dialog-provider";
import { allNavItems } from "./nav";

interface Entry {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  run: () => void;
}

interface Group {
  title: string;
  entries: Entry[];
}

const PER_GROUP = 5;

function buildGroups(
  state: InventoryState,
  query: string,
  go: (href: string) => void,
  open: (spec: DialogSpec) => void,
): Group[] {
  const actionEntries: Entry[] = [
    { id: "new-sale", label: "New sales order", icon: ReceiptText, run: () => open({ type: "sale" }) },
    { id: "new-po", label: "New purchase order", icon: Truck, run: () => open({ type: "purchase" }) },
    { id: "new-item", label: "Add item", icon: PackagePlus, run: () => open({ type: "item" }) },
    { id: "transfer", label: "Transfer stock between godowns", icon: ArrowLeftRight, run: () => open({ type: "transfer" }) },
    { id: "adjust", label: "Adjust stock (physical count)", icon: SlidersHorizontal, run: () => open({ type: "adjust" }) },
    { id: "new-customer", label: "Add customer", icon: Plus, run: () => open({ type: "customer" }) },
    { id: "new-supplier", label: "Add supplier", icon: Plus, run: () => open({ type: "supplier" }) },
    { id: "theme", label: "Toggle dark mode", icon: SunMoon, run: toggleTheme },
  ];
  const pages: Entry[] = allNavItems.map((item) => ({
    id: `nav-${item.href}`,
    label: item.label,
    hint: "Go to page",
    icon: item.icon,
    run: () => go(item.href),
  }));

  const groups: Group[] = [
    { title: "Actions", entries: actionEntries.filter((e) => matches(query, e.label)) },
    { title: "Pages", entries: pages.filter((e) => matches(query, e.label)) },
  ];

  if (query.trim()) {
    groups.push(
      {
        title: "Items",
        entries: state.items
          .filter((item) => matches(query, item.name, item.sku, item.category))
          .slice(0, PER_GROUP)
          .map((item) => ({
            id: item.id,
            label: item.name,
            hint: `${item.sku} · ${onHand(item)} on hand`,
            icon: Box,
            run: () => go(`/stock/${item.id}`),
          })),
      },
      {
        title: "Sales orders",
        entries: state.salesOrders
          .filter((so) => matches(query, so.number, byId(state.customers, so.customerId)?.name))
          .slice(0, PER_GROUP)
          .map((so) => ({
            id: so.id,
            label: `${so.number} · ${byId(state.customers, so.customerId)?.name ?? ""}`,
            hint: formatCurrency(orderTotal(so)),
            icon: ReceiptText,
            run: () => go(`/sales?order=${so.id}`),
          })),
      },
      {
        title: "Purchase orders",
        entries: state.purchaseOrders
          .filter((po) => matches(query, po.number, byId(state.suppliers, po.supplierId)?.name))
          .slice(0, PER_GROUP)
          .map((po) => ({
            id: po.id,
            label: `${po.number} · ${byId(state.suppliers, po.supplierId)?.name ?? ""}`,
            hint: formatCurrency(orderTotal(po)),
            icon: Truck,
            run: () => go(`/purchases?order=${po.id}`),
          })),
      },
    );
  }
  return groups.filter((group) => group.entries.length > 0);
}

/** ⌘K palette: jump to any page, record, or start any action. */
export function CommandMenu({ onClose }: { onClose: () => void }) {
  const state = useInventory();
  const router = useRouter();
  const openDialog = useOpenDialog();
  const modal = useModal(onClose);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const groups = useMemo(
    () => buildGroups(state, query, (href) => router.push(href), openDialog),
    [state, query, router, openDialog],
  );
  const entries = groups.flatMap((group) => group.entries);
  const active = Math.min(activeIndex, Math.max(entries.length - 1, 0));

  function select(entry: Entry | undefined) {
    if (!entry) return;
    onClose();
    entry.run();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = (active + step + entries.length) % Math.max(entries.length, 1);
      setActiveIndex(next);
      document.getElementById(`cmd-${entries[next]?.id}`)?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter") {
      event.preventDefault();
      select(entries[active]);
    }
  }

  return (
    <dialog
      {...modal}
      aria-label="Command menu"
      className="dialog-modal mt-[12vh] hidden w-[calc(100%-2rem)] max-w-xl flex-col overflow-hidden rounded-2xl bg-white p-0 shadow-overlay outline-none open:flex"
    >
      <div className="flex items-center gap-3 border-b border-zinc-950/[0.06] px-4">
        <Search className="size-4 shrink-0 text-zinc-400" aria-hidden />
        <input
          data-autofocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search items, orders, or type a command…"
          className="h-13 flex-1 bg-transparent text-[15px] outline-none placeholder:text-zinc-400"
          role="combobox"
          aria-expanded="true"
          aria-controls="command-list"
          aria-activedescendant={entries[active] ? `cmd-${entries[active].id}` : undefined}
        />
        <Kbd>Esc</Kbd>
      </div>
      <div id="command-list" role="listbox" className="max-h-[min(60dvh,420px)] overflow-y-auto p-2">
        {groups.length === 0 && (
          <p className="px-3 py-10 text-center text-sm text-zinc-500">No results for “{query}”</p>
        )}
        {groups.map((group) => (
          <div key={group.title} role="group" aria-label={group.title} className="mb-1 last:mb-0">
            <p className="px-2.5 pt-2 pb-1 text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
              {group.title}
            </p>
            {group.entries.map((entry) => {
              const index = entries.indexOf(entry);
              const selected = index === active;
              return (
                <div
                  key={entry.id}
                  id={`cmd-${entry.id}`}
                  role="option"
                  aria-selected={selected}
                  onMouseMove={() => setActiveIndex(index)}
                  onClick={() => select(entry)}
                  className={cn(
                    "flex h-10 cursor-pointer items-center gap-3 rounded-lg px-2.5 text-sm",
                    selected ? "bg-zinc-100 text-zinc-950" : "text-zinc-700",
                  )}
                >
                  <entry.icon className="size-4 shrink-0 text-zinc-400" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                  {entry.hint && <span className="shrink-0 text-xs text-zinc-400">{entry.hint}</span>}
                  {selected && <CornerDownLeft className="size-3.5 shrink-0 text-zinc-400" aria-hidden />}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </dialog>
  );
}
