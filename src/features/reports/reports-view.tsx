"use client";

import { Printer } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { formatDate } from "@/lib/format";
import { useInventory } from "@/lib/store";
import { useQueryState } from "@/lib/use-query-state";
import { addDays } from "@/lib/utils";
import { PurchaseReport } from "./purchase-report";
import { SalesReport } from "./sales-report";
import { StockReport } from "./stock-report";

const tabs = ["stock", "sales", "purchases"] as const;
const ranges = { "30d": 30, "90d": 90, "6m": 182, "12m": 365 } as const;
type Range = keyof typeof ranges;
const rangeKeys = Object.keys(ranges) as Range[];
const rangeLabels: Record<Range, string> = { "30d": "30 days", "90d": "90 days", "6m": "6 months", "12m": "12 months" };

export function ReportsView() {
  const state = useInventory();
  const [tab, setTab] = useQueryState("tab", "stock", tabs);
  const [range, setRange] = useQueryState<Range>("range", "90d", rangeKeys);

  const to = new Date();
  const from = addDays(to, -ranges[range]);

  return (
    <>
      <PageHeader
        title="Reports"
        description={
          tab === "stock"
            ? `Stock position as of ${formatDate(to.toISOString())}`
            : `${formatDate(from.toISOString())} – ${formatDate(to.toISOString())}`
        }
        actions={
          <Button onClick={() => window.print()} className="print:hidden">
            <Printer /> Print
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <Segmented
          label="Report"
          value={tab}
          onChange={setTab}
          options={[
            { value: "stock", label: "Stock report" },
            { value: "sales", label: "Sales report" },
            { value: "purchases", label: "Purchase report" },
          ]}
        />
        {tab !== "stock" && (
          <Segmented
            label="Date range"
            value={range}
            onChange={setRange}
            options={rangeKeys.map((key) => ({ value: key, label: rangeLabels[key] }))}
          />
        )}
      </div>

      {tab === "stock" && <StockReport state={state} />}
      {tab === "sales" && <SalesReport state={state} from={from} to={to} />}
      {tab === "purchases" && <PurchaseReport state={state} from={from} to={to} />}
    </>
  );
}
