import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBRL, formatInt } from "@/lib/format-reports";
import { cn } from "@/lib/utils";

export type PlatformRow = {
  platform: string;
  platformKey: "uber" | "99" | "indrive" | "particular";
  corridas: number;
  faturamento: number;
  lucroLiquido: number;
  lucroPorHora: number;
  isBestLucroHora: boolean;
};

function platformBadgeClass(key: PlatformRow["platformKey"]): string {
  switch (key) {
    case "uber":
      return "border-0 bg-black text-white hover:bg-black";
    case "99":
      return "border-0 bg-[#F7C948] text-black hover:bg-[#F7C948]";
    case "indrive":
      return "border-0 bg-[#2B9C34] text-white hover:bg-[#2B9C34]";
    default:
      return "border-0 bg-[#F0F0F0] text-[#555555] hover:bg-[#F0F0F0]";
  }
}

export function PlatformTable({
  rows,
  visual = "default",
}: {
  rows: PlatformRow[];
  visual?: "default" | "cockpit";
}) {
  const display = rows.filter((r) => r.corridas > 0);
  const cockpit = visual === "cockpit";

  if (display.length === 0) {
    return (
      <p
        className={cn(
          "text-sm",
          cockpit ? "text-[#3b3b3b]" : "text-muted-foreground",
        )}
      >
        Nenhuma corrida por plataforma neste período.
      </p>
    );
  }

  return (
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
              Plataforma
            </TableHead>
            <TableHead
              className={cn(
                "text-right",
                cockpit &&
                  "py-3 text-[10px] font-bold uppercase tracking-wider text-white",
              )}
            >
              Corridas
            </TableHead>
            <TableHead
              className={cn(
                "text-right",
                cockpit &&
                  "py-3 text-[10px] font-bold uppercase tracking-wider text-white",
              )}
            >
              Faturamento
            </TableHead>
            <TableHead
              className={cn(
                "text-right",
                cockpit &&
                  "py-3 text-[10px] font-bold uppercase tracking-wider text-white",
              )}
            >
              Lucro líq.
            </TableHead>
            <TableHead
              className={cn(
                "text-right",
                cockpit &&
                  "rounded-tr-md py-3 text-[10px] font-bold uppercase tracking-wider text-white",
              )}
            >
              Lucro/hora
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {display.map((r, idx) => (
            <TableRow
              key={r.platform}
              className={cn(
                r.isBestLucroHora && "font-bold",
                cockpit && idx % 2 === 1 && "bg-[#f3f3f3]",
                cockpit && "border-0 hover:bg-[#ebebeb]",
              )}
            >
              <TableCell>
                <Badge
                  className={cn("font-medium", platformBadgeClass(r.platformKey))}
                >
                  {r.platform}
                  {r.isBestLucroHora ? " ★" : ""}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatInt(r.corridas)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatBRL(r.faturamento)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatBRL(r.lucroLiquido)}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums",
                  r.isBestLucroHora && "font-bold text-[#006d33]",
                )}
              >
                {formatBRL(r.lucroPorHora)}
                <span className="text-xs font-normal text-muted-foreground">
                  /h
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
