import type { Metadata } from "next";
import { ClientPage } from "@/components/layout/client-only";
import { SuppliersView } from "@/features/contacts/suppliers-view";

export const metadata: Metadata = { title: "Suppliers" };

export default function SuppliersPage() {
  return (
    <ClientPage>
      <SuppliersView />
    </ClientPage>
  );
}
