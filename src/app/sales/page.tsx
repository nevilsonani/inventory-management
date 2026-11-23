import type { Metadata } from "next";
import { SalesView } from "@/features/sales/sales-view";

export const metadata: Metadata = { title: "Sales" };

export default function SalesPage() {
  return <SalesView />;
}
