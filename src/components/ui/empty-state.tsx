import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      <div className="grid size-11 place-items-center rounded-xl bg-white shadow-card ring-1 ring-zinc-950/[0.08]">
        <Icon className="size-5 text-zinc-400" aria-hidden />
      </div>
      <p className="mt-4 text-sm font-medium text-zinc-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-zinc-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
