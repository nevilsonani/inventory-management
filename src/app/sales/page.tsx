import type { Metadata } from "next";
import { ClientPage } from "@/components/layout/client-only";
import { SalesView } from "@/features/sales/sales-view";

export const metadata: Metadata = { title: "Sales" };

export default function SalesPage() {
  return (
    <ClientPage>
      <SalesView />
    </ClientPage>
  );
}
