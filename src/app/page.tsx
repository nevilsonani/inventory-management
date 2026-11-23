import { ClientPage } from "@/components/layout/client-only";
import { DashboardView } from "@/features/dashboard/dashboard-view";

export default function DashboardPage() {
  return (
    <ClientPage>
      <DashboardView />
    </ClientPage>
  );
}
