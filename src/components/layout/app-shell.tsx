"use client";

import {
  ArrowLeftRight,
  ChevronDown,
  Menu as MenuIcon,
  PackagePlus,
  Plus,
  ReceiptText,
  Search,
  SlidersHorizontal,
  Truck,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { useModal } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { Menu } from "@/components/ui/menu";
import { ClientOnly } from "./client-only";
import { CommandMenu } from "./command-menu";
import { DialogProvider, useOpenDialog } from "./dialog-provider";
import { Logo, Sidebar } from "./sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <DialogProvider>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 border-r border-zinc-950/[0.06] bg-zinc-50 lg:block print:hidden">
        <Sidebar />
      </aside>

      <div className="lg:pl-60">
        <TopBar onOpenNav={() => setNavOpen(true)} onOpenCommand={() => setCommandOpen(true)} />
        <main className="mx-auto w-full max-w-[1360px] px-4 pt-6 pb-16 sm:px-6 lg:px-10 lg:pt-8">
          <ClientOnly fallback={<PageSkeleton />}>{children}</ClientOnly>
        </main>
      </div>

      {navOpen && <MobileNav onClose={() => setNavOpen(false)} />}
      {commandOpen && (
        <ClientOnly>
          <CommandMenu onClose={() => setCommandOpen(false)} />
        </ClientOnly>
      )}
      <Toaster
        position="bottom-right"
        toastOptions={{ className: "!font-sans !rounded-xl !shadow-overlay !border-0" }}
      />
    </DialogProvider>
  );
}

function TopBar({ onOpenNav, onOpenCommand }: { onOpenNav: () => void; onOpenCommand: () => void }) {
  const openDialog = useOpenDialog();

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-950/[0.06] bg-zinc-50/85 backdrop-blur-md print:hidden">
      <div className="mx-auto flex h-14 w-full max-w-[1360px] items-center gap-3 px-4 sm:px-6 lg:px-10">
        <button
          type="button"
          onClick={onOpenNav}
          className="-ml-1.5 grid size-9 place-items-center rounded-lg text-zinc-600 hover:bg-zinc-950/5 lg:hidden"
          aria-label="Open navigation"
        >
          <MenuIcon className="size-5" />
        </button>
        <div className="lg:hidden">
          <Logo />
        </div>

        <button
          type="button"
          onClick={onOpenCommand}
          className="ml-auto flex h-9 items-center gap-2.5 rounded-lg bg-white px-3 text-sm text-zinc-500 shadow-card ring-1 ring-zinc-950/10 transition-shadow hover:ring-zinc-950/20 max-sm:size-9 max-sm:justify-center max-sm:px-0 lg:ml-0 lg:w-80"
          aria-label="Search or jump to (Ctrl+K)"
        >
          <Search className="size-4 shrink-0 text-zinc-400" aria-hidden />
          <span className="flex-1 text-left max-sm:hidden">Search or jump to…</span>
          <Kbd className="max-sm:hidden">Ctrl K</Kbd>
        </button>

        <div className="flex items-center gap-2 lg:ml-auto">
          <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/15 ring-inset xl:inline-flex">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
            Demo data · saved in this browser
          </span>
          <Menu
            trigger={({ open, toggle }) => (
              <Button variant="primary" onClick={toggle} aria-expanded={open} aria-haspopup="menu">
                <Plus />
                <span className="max-sm:hidden">New</span>
                <ChevronDown className="-mr-1 max-sm:hidden" />
              </Button>
            )}
            items={[
              { label: "Sales order", description: "Sell and dispatch from a godown", icon: ReceiptText, onSelect: () => openDialog({ type: "sale" }) },
              { label: "Purchase order", description: "Order stock from a supplier", icon: Truck, onSelect: () => openDialog({ type: "purchase" }) },
              { label: "Item", description: "Add a product to the catalogue", icon: PackagePlus, onSelect: () => openDialog({ type: "item" }) },
              { label: "Stock transfer", description: "Move stock between godowns", icon: ArrowLeftRight, onSelect: () => openDialog({ type: "transfer" }) },
              { label: "Stock adjustment", description: "Record a physical count", icon: SlidersHorizontal, onSelect: () => openDialog({ type: "adjust" }) },
            ]}
          />
        </div>
      </div>
    </header>
  );
}

function MobileNav({ onClose }: { onClose: () => void }) {
  const modal = useModal(onClose);
  return (
    <dialog
      {...modal}
      aria-label="Navigation"
      className="dialog-sheet dialog-sheet-left hidden h-dvh w-72 max-w-[85vw] overflow-hidden rounded-r-2xl bg-zinc-50 p-0 shadow-overlay outline-none open:block"
    >
      <Sidebar onNavigate={onClose} />
    </dialog>
  );
}

function PageSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="mb-6 space-y-2">
        <div className="h-7 w-48 rounded-lg bg-zinc-200/70" />
        <div className="h-4 w-80 max-w-full rounded bg-zinc-200/50" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 rounded-xl bg-white ring-1 ring-zinc-950/[0.05]" />
        ))}
      </div>
      <div className="mt-4 h-80 rounded-xl bg-white ring-1 ring-zinc-950/[0.05]" />
    </div>
  );
}
