import {
  Boxes,
  ChartColumn,
  Factory,
  LayoutDashboard,
  ReceiptText,
  Truck,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Which sidebar counter to show next to the label. */
  badge?: "pendingSales" | "openPurchases" | "stockAlerts";
}

export const navSections: { title?: string; items: NavItem[] }[] = [
  { items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    title: "Operations",
    items: [
      { href: "/sales", label: "Sales", icon: ReceiptText, badge: "pendingSales" },
      { href: "/purchases", label: "Purchases", icon: Truck, badge: "openPurchases" },
      { href: "/stock", label: "Stock", icon: Boxes, badge: "stockAlerts" },
      { href: "/godowns", label: "Godowns", icon: Warehouse },
    ],
  },
  {
    title: "Directory",
    items: [
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/suppliers", label: "Suppliers", icon: Factory },
    ],
  },
  { title: "Insights", items: [{ href: "/reports", label: "Reports", icon: ChartColumn }] },
];

export const allNavItems = navSections.flatMap((section) => section.items);

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
