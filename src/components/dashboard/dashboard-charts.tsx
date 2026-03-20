"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

export type DailyProfitPoint = { date: string; profit: number };

export type CategoryBarPoint = {
  category: string;
  label: string;
  amount: number;
};

type DashboardChartsProps = {
  dailyProfit: DailyProfitPoint[];
  expensesByCategory: CategoryBarPoint[];
};

function formatDayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function DashboardCharts({
  dailyProfit,
  expensesByCategory,
}: DashboardChartsProps) {
  const lineData = dailyProfit.map((p) => ({
    ...p,
    label: formatDayLabel(p.date),
  }));

  const barData = expensesByCategory.map((c) => ({
    ...c,
  }));

  const maxBar = Math.max(1, ...barData.map((b) => b.amount));

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="flex flex-col rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-black tracking-widest text-black uppercase">
            Lucro por dia
          </h3>
        </div>
        <div className="h-44 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={lineData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#000" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#000" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeeeee" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#777777" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#777777" }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(v) =>
                  new Intl.NumberFormat("pt-BR", {
                    notation: "compact",
                    maximumFractionDigits: 0,
                  }).format(v)
                }
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #eeeeee",
                  fontSize: 12,
                }}
                formatter={(value) => [
                  money.format(typeof value === "number" ? value : Number(value)),
                  "Lucro",
                ]}
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload as { date?: string } | undefined;
                  return p?.date ? formatDayLabel(p.date) : "";
                }}
              />
              <Area
                type="monotone"
                dataKey="profit"
                stroke="#000000"
                strokeWidth={2}
                fill="url(#fillProfit)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex flex-col rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-black tracking-widest text-black uppercase">
            Gastos por categoria
          </h3>
        </div>
        <div className="h-44 w-full min-w-0">
          {barData.length === 0 ? (
            <p className="text-sm text-[#777777]">Sem gastos no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={barData}
                margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eeeeee" horizontal={false} />
                <XAxis
                  type="number"
                  hide
                  domain={[0, maxBar * 1.05]}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={88}
                  tick={{ fontSize: 10, fill: "#1a1c1c", fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #eeeeee",
                    fontSize: 12,
                  }}
                  formatter={(value) =>
                    money.format(typeof value === "number" ? value : Number(value))
                  }
                />
                <Bar dataKey="amount" fill="#000000" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}
