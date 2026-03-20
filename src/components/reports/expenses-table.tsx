import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBRL, formatPercent } from "@/lib/format-reports";

export type ExpenseCategoryRow = {
  label: string;
  valor: number;
  percentualDoTotal: number;
  ocorrencias: number;
};

export function ExpensesTable({
  rows,
  total,
}: {
  rows: ExpenseCategoryRow[];
  total: number;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum gasto registrado neste período.
      </p>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-[120px] text-right">% do total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.label}>
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
