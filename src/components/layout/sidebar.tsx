"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { Count } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { lowStockItems } from "@/lib/selectors";
import { actions, useInventory } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ClientOnly } from "./client-only";
import { isActive, navSections, type NavItem } from "./nav";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-lg">
      <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-800 shadow-sm ring-1 shadow-brand-900/20 ring-black/10">
        <svg viewBox="0 0 24 24" className="size-4.5 text-white" fill="none" aria-hidden>
          <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M4 7.5 12 12l8-4.5M12 12v9" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="leading-none">
        <span className="block text-sm font-semibold tracking-tight text-zinc-950">SasthaSoft</span>
        <span className="mt-0.5 block text-[11px] font-medium text-zinc-500">Inventory</span>
      </span>
    </Link>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-5">
        <Logo />
      </div>
      {/* usePathname suspends on dynamic routes during prerender; the
          fallback is the same nav without the active highlight. */}
      <Suspense fallback={<NavLinks pathname={null} onNavigate={onNavigate} />}>
        <ActiveNavLinks onNavigate={onNavigate} />
      </Suspense>
      <WorkspaceFooter />
    </div>
  );
}

function ActiveNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return <NavLinks pathname={usePathname()} onNavigate={onNavigate} />;
}

function NavLinks({ pathname, onNavigate }: { pathname: string | null; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 pt-3" aria-label="Main">
      {navSections.map((section, index) => (
        <div key={section.title ?? index}>
          {section.title && (
            <p className="mb-1 px-2.5 text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
              {section.title}
            </p>
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => (
              <li key={item.href}>
                <NavLink item={item} active={!!pathname && isActive(pathname, item.href)} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={item.href}
      onNavigate={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-white text-zinc-950 shadow-card ring-1 ring-zinc-950/[0.08]"
          : "text-zinc-600 hover:bg-zinc-950/[0.04] hover:text-zinc-900",
      )}
    >
      <item.icon
        className={cn("size-4", active ? "text-brand-600" : "text-zinc-400 group-hover:text-zinc-500")}
        aria-hidden
      />
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <ClientOnly>
          <NavBadge kind={item.badge} />
        </ClientOnly>
      )}
    </Link>
  );
}

function NavBadge({ kind }: { kind: NonNullable<NavItem["badge"]> }) {
  const state = useInventory();
  const count =
    kind === "pendingSales"
      ? state.salesOrders.filter((so) => so.status === "pending").length
      : kind === "openPurchases"
        ? state.purchaseOrders.filter((po) => po.status === "ordered").length
        : lowStockItems(state.items).length;
  if (count === 0) return null;
  const label =
    kind === "pendingSales" ? "awaiting dispatch" : kind === "openPurchases" ? "open orders" : "stock alerts";
  return (
    <Count className={kind === "stockAlerts" ? "bg-amber-100 text-amber-800" : undefined}>
      {count}
      <span className="sr-only"> {label}</span>
    </Count>
  );
}

function WorkspaceFooter() {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="border-t border-zinc-950/[0.06] p-3">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
          KD
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[13px] font-medium text-zinc-900">Kaveri Distributors</p>
          <p className="truncate text-xs text-zinc-500">Demo workspace</p>
        </div>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="grid size-8 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-950/5 hover:text-zinc-700"
          title="Reset demo data"
          aria-label="Reset demo data"
        >
          <RotateCcw className="size-4" />
        </button>
      </div>
      {confirming && (
        <Dialog
          title="Reset demo data?"
          description="All orders, stock changes and contacts you added in this browser will be replaced with fresh sample data."
          onClose={() => setConfirming(false)}
          footer={
            <>
              <Button onClick={() => setConfirming(false)}>Keep my changes</Button>
              <Button
                variant="primary"
                onClick={() => {
                  actions.resetDemoData();
                  setConfirming(false);
                  toast.success("Demo data restored");
                }}
              >
                Reset data
              </Button>
            </>
          }
        >
          <p className="text-sm text-zinc-600">
            Data is stored only in this browser (localStorage), so a reset affects nobody else.
          </p>
        </Dialog>
      )}
    </div>
  );
}
