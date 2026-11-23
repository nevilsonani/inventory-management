import type { Metadata } from "next";
import { GodownsView } from "@/features/godowns/godowns-view";

export const metadata: Metadata = { title: "Godowns" };

export default function GodownsPage() {
  return <GodownsView />;
}
