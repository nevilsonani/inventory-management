import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-zinc-950/10 bg-white px-1 font-sans text-[11px] font-medium text-zinc-500 shadow-[0_1px_0_rgb(0_0_0/0.06)]",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
