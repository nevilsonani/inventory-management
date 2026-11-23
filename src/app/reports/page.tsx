import type { Metadata } from "next";
import { ClientPage } from "@/components/layout/client-only";
import { ReportsView } from "@/features/reports/reports-view";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <ClientPage>
      <ReportsView />
    </ClientPage>
  );
}
