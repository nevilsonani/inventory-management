import { Download } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";

interface ReportTableCardProps {
  title: string;
  description?: string;
  onExport: () => void;
  children: ReactNode;
}

/** Card wrapper for a report's detail table, with CSV export. */
export function ReportTableCard({ title, description, onExport, children }: ReportTableCardProps) {
  return (
    <Card className="mt-4 break-inside-avoid-page">
      <CardHeader
        title={title}
        description={description}
        action={
          <Button size="sm" onClick={onExport} className="print:hidden">
            <Download /> Export CSV
          </Button>
        }
      />
      {children}
    </Card>
  );
}
