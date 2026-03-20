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
}: {
  rows: ShiftRow[];
  blur: boolean;
}) {
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
            <TableRow className="hover:bg-transparent">
              <TableHead>Turno</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead className="text-right">Lucro/hora</TableHead>
              <TableHead className="text-right">Ranking</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.turno}
                className={cn(
                  r.isBest && "font-bold",
                  r.isWorst && "text-muted-foreground",
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
                    r.isBest && "font-bold text-[#00A651]",
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
