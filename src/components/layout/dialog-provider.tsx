"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { ContactDialog } from "@/features/contacts/contact-dialog";
import { TransferDialog } from "@/features/godowns/transfer-dialog";
import { PurchaseOrderDialog, type PurchasePrefill } from "@/features/purchases/purchase-order-dialog";
import { SalesOrderDialog, type SalePrefill } from "@/features/sales/sales-order-dialog";
import { AdjustStockDialog } from "@/features/stock/adjust-stock-dialog";
import { ItemDialog } from "@/features/stock/item-dialog";

/** Every create/edit flow, openable from anywhere (top bar, ⌘K, dashboard). */
export type DialogSpec =
  | { type: "sale"; prefill?: SalePrefill }
  | { type: "purchase"; prefill?: PurchasePrefill }
  | { type: "item"; itemId?: string }
  | { type: "adjust"; itemId?: string; godownId?: string }
  | { type: "transfer"; itemId?: string; fromGodownId?: string }
  | { type: "customer" }
  | { type: "supplier" };

const OpenDialogContext = createContext<(spec: DialogSpec) => void>(() => {});

export const useOpenDialog = () => useContext(OpenDialogContext);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<{ spec: DialogSpec; key: number } | null>(null);
  const open = useCallback(
    (spec: DialogSpec) => setActive((current) => ({ spec, key: (current?.key ?? 0) + 1 })),
    [],
  );
  const close = useCallback(() => setActive(null), []);

  return (
    <OpenDialogContext value={open}>
      {children}
      {active && <ActiveDialog key={active.key} spec={active.spec} onClose={close} />}
    </OpenDialogContext>
  );
}

function ActiveDialog({ spec, onClose }: { spec: DialogSpec; onClose: () => void }) {
  switch (spec.type) {
    case "sale":
      return <SalesOrderDialog prefill={spec.prefill} onClose={onClose} />;
    case "purchase":
      return <PurchaseOrderDialog prefill={spec.prefill} onClose={onClose} />;
    case "item":
      return <ItemDialog itemId={spec.itemId} onClose={onClose} />;
    case "adjust":
      return <AdjustStockDialog itemId={spec.itemId} godownId={spec.godownId} onClose={onClose} />;
    case "transfer":
      return <TransferDialog itemId={spec.itemId} fromGodownId={spec.fromGodownId} onClose={onClose} />;
    case "customer":
    case "supplier":
      return <ContactDialog kind={spec.type} onClose={onClose} />;
  }
}
