"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface MenuItem {
  label: string;
  description?: string;
  icon: LucideIcon;
  onSelect: () => void;
}

interface MenuProps {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  items: MenuItem[];
  align?: "start" | "end";
}

/** Small dropdown menu with keyboard support (arrows, Escape, Tab). */
export function Menu({ trigger, items, align = "end" }: MenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Close when this route is hidden by Next.js so it isn't open on return.
  useLayoutEffect(() => () => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    itemRefs.current[0]?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function onKeyDown(event: React.KeyboardEvent) {
    const current = itemRefs.current.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "Escape") {
      setOpen(false);
      root.current?.querySelector("button")?.focus(); // the trigger renders first
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      itemRefs.current[(current + step + items.length) % items.length]?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={root} className="relative" onKeyDown={open ? onKeyDown : undefined}>
      {trigger({ open, toggle: () => setOpen((value) => !value) })}
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-full z-30 mt-1.5 w-64 animate-fade-in rounded-xl bg-white p-1.5 shadow-overlay",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {items.map((item, index) => (
            <button
              key={item.label}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className="flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left outline-none hover:bg-zinc-100 focus-visible:bg-zinc-100"
            >
              <item.icon className="mt-0.5 size-4 shrink-0 text-zinc-500" aria-hidden />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-zinc-900">{item.label}</span>
                {item.description && (
                  <span className="block text-xs text-zinc-500">{item.description}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
