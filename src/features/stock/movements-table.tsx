import Link from "next/link";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime, formatNumber, formatSigned } from "@/lib/format";
import { byId } from "@/lib/selectors";
import type { InventoryState, StockMovement } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MovementBadge } from "../shared/status";

/** Link a ledger reference (SO-1004, PO-2003, TR-301) back to its document. */
function refHref(state: InventoryState, ref: string) {
  if (ref.startsWith("SO-")) {
    const order = state.salesOrders.find((so) => so.number === ref);
    return order && `/sales?order=${order.id}`;
  }
  if (ref.startsWith("PO-")) {
    const order = state.purchaseOrders.find((po) => po.number === ref);
    return order && `/purchases?order=${order.id}`;
  }
  return "/godowns";
}

interface MovementsTableProps {
  state: InventoryState;
  movements: StockMovement[];
  showItem?: boolean;
  /** Running balance after each row. Only meaningful for one item's full history. */
  balances?: Map<string, number>;
}

export function MovementsTable({ state, movements, showItem = true, balances }: MovementsTableProps) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Date</TH>
          {showItem && <TH>Item</TH>}
          <TH>Type</TH>
          <TH>Godown</TH>
          <TH className="hidden md:table-cell">Reference</TH>
          <TH className="text-right">Change</TH>
          {balances && <TH className="text-right">Balance</TH>}
        </tr>
      </THead>
      <TBody>
        {movements.map((move) => {
          const item = byId(state.items, move.itemId);
          const godown = byId(state.godowns, move.godownId);
          const href = move.ref && refHref(state, move.ref);
          return (
            <TR key={move.id}>
              <TD className="text-[13px] text-zinc-500 tabular-nums">{formatDateTime(move.date)}</TD>
              {showItem && (
                <TD>
                  <Link href={`/stock/${move.itemId}`} className="font-medium text-zinc-900 hover:text-brand-700 hover:underline">
                    {item?.name}
                  </Link>
                  <p className="font-mono text-[11px] text-zinc-500">{item?.sku}</p>
                </TD>
              )}
              <TD>
                <MovementBadge type={move.type} />
              </TD>
              <TD className="text-zinc-600">{godown?.name}</TD>
              <TD className="hidden max-w-64 truncate text-[13px] text-zinc-500 md:table-cell">
                {href ? (
                  <Link href={href} className="font-medium text-zinc-700 hover:text-brand-700 hover:underline">
                    {move.ref}
                  </Link>
                ) : (
                  move.ref
                )}
                {move.ref && move.note && " · "}
                {move.note}
              </TD>
              <TD
                className={cn(
                  "text-right font-medium tabular-nums",
                  move.qty > 0 ? "text-emerald-600" : "text-rose-600",
                )}
              >
                {formatSigned(move.qty)}
              </TD>
              {balances && (
                <TD className="text-right text-zinc-600 tabular-nums">{formatNumber(balances.get(move.id) ?? 0)}</TD>
              )}
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
