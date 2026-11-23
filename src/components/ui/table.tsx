import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Horizontal scroll on small screens, full width otherwise. `relative` makes
 * the scroller contain absolutely positioned children (e.g. sr-only labels),
 * which would otherwise widen the page.
 */
export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="relative overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function THead(props: ComponentProps<"thead">) {
  return <thead {...props} />;
}

export function TBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={cn("divide-y divide-zinc-950/[0.05]", className)} {...props} />;
}

export function TH({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "h-9 border-y border-zinc-950/[0.06] bg-zinc-50/80 px-4 text-left text-xs font-medium whitespace-nowrap text-zinc-500 first:pl-5 last:pr-5",
        className,
      )}
      {...props}
    />
  );
}

export function TR({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn("group transition-colors", className)} {...props} />;
}

export function TD({ className, ...props }: ComponentProps<"td">) {
  return (
    <td
      className={cn("h-12 px-4 align-middle whitespace-nowrap first:pl-5 last:pr-5", className)}
      {...props}
    />
  );
}

/** Classes for a row that opens something on click. */
export const clickableRow = "cursor-pointer hover:bg-zinc-50/80";
