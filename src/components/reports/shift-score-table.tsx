import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBRL } from "@/lib/format-reports";
import { cn } from "@/lib/utils";

export type ShiftRow = {
  rank: number;
  turno: string;
  horario: string;
  lucroPorHora: number;
  isBest: boolean;
  isWorst: boolean;
};

export function ShiftScoreTable({
  rows,
  blur,
  visual = "default",
}: {
  rows: ShiftRow[];
  blur: boolean;
  visual?: "default" | "cockpit";
}) {
  const cockpit = visual === "cockpit";
  return (
    <div className="relative">
      {blur ? (
        <div className="absolute inset-0 z-10 flex items-start justify-end p-2">
          <Badge className="bg-black text-white hover:bg-black">Premium</Badge>
        </div>
      ) : null}
      <div
        className={cn(
          "overflow-x-auto rounded-lg",
          blur && "pointer-events-none select-none blur-[4px]",
        )}
      >
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
                Turno
              </TableHead>
              <TableHead
                className={cn(
                  cockpit &&
                    "py-3 text-[10px] font-bold uppercase tracking-wider text-white",
                )}
              >
                Horário
              </TableHead>
              <TableHead
                className={cn(
                  "text-right",
                  cockpit &&
                    "py-3 text-[10px] font-bold uppercase tracking-wider text-white",
                )}
              >
                Lucro/hora
              </TableHead>
              <TableHead
                className={cn(
                  "text-right",
                  cockpit &&
                    "rounded-tr-md py-3 text-[10px] font-bold uppercase tracking-wider text-white",
                )}
              >
                Ranking
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, idx) => (
              <TableRow
                key={r.turno}
                className={cn(
                  r.isBest && "font-bold",
                  r.isWorst && "text-muted-foreground",
                  cockpit && idx % 2 === 1 && "bg-[#f3f3f3]",
                  cockpit && "border-0 hover:bg-[#ebebeb]",
                )}
              >
                <TableCell>
                  {r.turno}
                  {r.isBest ? " ★" : ""}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {r.horario}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    r.isBest && "font-bold text-[#006d33]",
                  )}
                >
                  {formatBRL(r.lucroPorHora)}/h
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.rank}º
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
