import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBRL, formatPercent } from "@/lib/format-reports";
import { cn } from "@/lib/utils";

export type ExpenseCategoryRow = {
  label: string;
  valor: number;
  percentualDoTotal: number;
  ocorrencias: number;
};

export function ExpensesTable({
  rows,
  total,
  visual = "default",
}: {
  rows: ExpenseCategoryRow[];
  total: number;
  visual?: "default" | "cockpit";
}) {
  const cockpit = visual === "cockpit";

  if (rows.length === 0) {
    return (
      <p
        className={cn(
          "text-sm",
          cockpit ? "text-[#3b3b3b]" : "text-muted-foreground",
        )}
      >
        Nenhum gasto registrado neste período.
      </p>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow
              className={cn(
                "border-0 hover:bg-transparent",
                cockpit && "bg-black",
              )}
            >
              <TableHead
                className={cn(
                  cockpit &&
                    "rounded-tl-md py-3 text-[10px] font-bold uppercase tracking-wider text-white",
                )}
              >
                Categoria
              </TableHead>
              <TableHead
                className={cn(
                  "text-right",
                  cockpit &&
                    "py-3 text-[10px] font-bold uppercase tracking-wider text-white",
                )}
              >
                Valor
              </TableHead>
              <TableHead
                className={cn(
                  "w-[120px] text-right",
                  cockpit &&
                    "rounded-tr-md py-3 text-[10px] font-bold uppercase tracking-wider text-white",
                )}
              >
                % do total
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, idx) => (
              <TableRow
                key={r.label}
                className={cn(
                  cockpit && idx % 2 === 1 && "bg-[#f3f3f3]",
                  cockpit && "border-0 hover:bg-[#ebebeb]",
                )}
              >
                <TableCell>
                  <div className="font-medium">{r.label}</div>
                  <div className="mt-1 h-[3px] w-full overflow-hidden rounded-none bg-[#EEEEEE]">
                    <div
                      className="h-full bg-black"
                      style={{
                        width: `${Math.min(100, Math.max(0, r.percentualDoTotal))}%`,
                      }}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatBRL(r.valor)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatPercent(r.percentualDoTotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="mt-3 text-right text-sm font-bold">
        Total: {formatBRL(total)}
      </p>
    </div>
  );
}
