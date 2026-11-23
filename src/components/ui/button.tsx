import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "brand";
type Size = "sm" | "md" | "icon";

const base =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-[background-color,box-shadow,color,transform] select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

const variants: Record<Variant, string> = {
  primary:
    "bg-zinc-900 text-white shadow-sm shadow-zinc-950/10 hover:bg-zinc-800 [&_svg]:text-zinc-300",
  brand: "bg-brand-600 text-white shadow-sm shadow-brand-900/20 hover:bg-brand-700",
  secondary:
    "bg-white text-zinc-800 shadow-card ring-1 ring-zinc-950/10 hover:bg-zinc-50 [&_svg]:text-zinc-500",
  ghost: "text-zinc-600 hover:bg-zinc-950/5 hover:text-zinc-900 [&_svg]:text-zinc-500",
  danger: "bg-white text-rose-700 shadow-card ring-1 ring-rose-600/20 hover:bg-rose-50",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-2.5 text-[13px]",
  md: "h-9 px-3.5 text-sm",
  icon: "size-8",
};

export function buttonClass(variant: Variant = "secondary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size };

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
