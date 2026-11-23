import type { Metadata } from "next";
import { ClientPage } from "@/components/layout/client-only";
import { StockView } from "@/features/stock/stock-view";

export const metadata: Metadata = { title: "Stock" };

export default function StockPage() {
  return (
    <ClientPage>
      <StockView />
    </ClientPage>
  );
}
