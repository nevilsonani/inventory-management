import type { Metadata } from "next";
import { ClientPage } from "@/components/layout/client-only";
import { PurchasesView } from "@/features/purchases/purchases-view";

export const metadata: Metadata = { title: "Purchases" };

export default function PurchasesPage() {
  return (
    <ClientPage>
      <PurchasesView />
    </ClientPage>
  );
}
