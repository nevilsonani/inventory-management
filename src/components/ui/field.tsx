import { ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-lg bg-white text-sm text-zinc-900 shadow-card ring-1 ring-zinc-950/10 transition-shadow outline-none placeholder:text-zinc-400 hover:ring-zinc-950/20 focus:ring-2 focus:ring-brand-500 disabled:bg-zinc-50 disabled:text-zinc-500 aria-invalid:ring-rose-500";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-9 px-3", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-20 px-3 py-2", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className={cn("relative", className)}>
      <select className={cn(control, "h-9 appearance-none truncate pr-8 pl-3")} {...props}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-zinc-400"
        aria-hidden
      />
    </div>
  );
}

interface FieldProps {
  label: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Wraps a single control in its <label>, so no id wiring is needed. */
export function Field({ label, hint, className, children }: FieldProps) {
  return (
    <label className={cn("grid content-start gap-1.5", className)}>
      <span className="text-[13px] font-medium text-zinc-700">{label}</span>
      {children}
      {hint && <span className="text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}
