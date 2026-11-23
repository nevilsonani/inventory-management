import type { Metadata } from "next";
import { ClientPage } from "@/components/layout/client-only";
import { CustomersView } from "@/features/contacts/customers-view";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage() {
  return (
    <ClientPage>
      <CustomersView />
    </ClientPage>
  );
}
