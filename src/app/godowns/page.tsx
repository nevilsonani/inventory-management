import type { Metadata } from "next";
import { ClientPage } from "@/components/layout/client-only";
import { GodownsView } from "@/features/godowns/godowns-view";

export const metadata: Metadata = { title: "Godowns" };

export default function GodownsPage() {
  return (
    <ClientPage>
      <GodownsView />
    </ClientPage>
  );
}
