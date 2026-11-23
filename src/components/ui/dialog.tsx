"use client";

import { X } from "lucide-react";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DialogProps {
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** "modal" is centred; "sheet" slides in from the right edge. */
  variant?: "modal" | "sheet";
  size?: "md" | "lg" | "xl";
  /** Extra content in the header, e.g. a status badge. */
  meta?: ReactNode;
}

const widths = {
  modal: { md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" },
  sheet: { md: "max-w-md", lg: "max-w-xl", xl: "max-w-2xl" },
};

/**
 * Native <dialog> shown with showModal(): focus trapping, Escape, inert
 * background and top-layer stacking come from the browser. The dialog is open
 * while mounted. Render it conditionally to open and close it.
 */
export function Dialog({
  title,
  description,
  onClose,
  children,
  footer,
  variant = "modal",
  size = "md",
  meta,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const closingFromCode = useRef(false);
  const pressedBackdrop = useRef(false);

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    // Runs on unmount and when Next.js hides this route (Activity), so a
    // hidden page can never leave an open modal making the app inert.
    return () => {
      closingFromCode.current = true;
      dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={typeof title === "string" ? title : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        // Browsers can force-close on repeated Escape; keep React in sync.
        if (closingFromCode.current) closingFromCode.current = false;
        else onClose();
      }}
      // Close on backdrop click, but not when a text selection drag ends there.
      onPointerDown={(event) => {
        pressedBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (pressedBackdrop.current && event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "hidden w-full flex-col overflow-hidden bg-white p-0 text-zinc-900 shadow-overlay outline-none open:flex",
        variant === "modal"
          ? "dialog-modal max-h-[min(90dvh,860px)] w-[calc(100%-2rem)] rounded-2xl"
          : "dialog-sheet sm:rounded-l-2xl",
        widths[variant][size],
      )}
    >
      <header className="flex items-start gap-4 border-b border-zinc-950/[0.06] px-6 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            {meta}
          </div>
          {description && <p className="mt-1 text-[13px] text-zinc-500">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-2 grid size-8 shrink-0 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      {footer && (
        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-950/[0.06] bg-zinc-50/70 px-6 py-3.5">
          {footer}
        </footer>
      )}
    </dialog>
  );
}
