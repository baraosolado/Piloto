"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CostKmPoint } from "@/lib/inteligencia-data";
import { cn } from "@/lib/utils";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});

export type InteligenciaCostKmChartProps = {
  series: CostKmPoint[];
  trend: "up" | "down" | "flat" | null;
  latestLabel: string;
  className?: string;
};

export function InteligenciaCostKmChart({
  series,
  trend,
  latestLabel,
  className,
}: InteligenciaCostKmChartProps) {
  const data = series.map((p) => ({
    ...p,
    valueNum: p.value ?? null,
  }));

  return (
    <div className={cn("space-y-4", className)}>
      <div className="h-[220px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke="#eeeeee" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#474747", fontSize: 10, fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              hide
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#111",
                border: "1px solid #333",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#fff", fontWeight: 700 }}
              formatter={(v) => {
                const n = typeof v === "number" ? v : Number(v);
                return n != null && !Number.isNaN(n) ? brl.format(n) : "—";
              }}
            />
            <Line
              type="monotone"
              dataKey="valueNum"
              stroke="#000000"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#000000", stroke: "#fff", strokeWidth: 1 }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {trend ? (
        <p
          className={cn(
            "text-center text-sm font-bold",
            trend === "up" && "text-[#e53935]",
            trend === "down" && "text-[#00a651]",
            trend === "flat" && "text-muted-foreground",
          )}
        >
          {trend === "up"
            ? `O custo/km subiu em relação a ${latestLabel}.`
            : trend === "down"
              ? `O custo/km caiu em relação a ${latestLabel}.`
              : `O custo/km ficou estável em relação a ${latestLabel}.`}
        </p>
      ) : null}
    </div>
  );
}
