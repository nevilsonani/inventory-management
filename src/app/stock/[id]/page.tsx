import type { Metadata } from "next";
import { ItemView } from "@/features/stock/item-view";

export const metadata: Metadata = { title: "Item" };

/** Items live in browser storage, so the id is read on the client (useParams). */
export default function ItemPage() {
  return <ItemView />;
}
