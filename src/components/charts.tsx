"use client";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { money, monthLabel } from "@/lib/finance";
import type { MonthlyTotal } from "@/lib/types";
export default function Charts({ monthly }: { monthly: MonthlyTotal[] }) {
  return (
    <div
      className="chart-container"
      role="img"
      aria-label="Comparação mensal entre o que entrou e o consumo; valores disponíveis na tabela abaixo"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={monthly.map((m) => ({
            ...m,
            label: monthLabel(m.month, true).split(" ")[0],
          }))}
          barGap={5}
        >
          <defs>
            {/* Consumption is hatched so it never reads as the brand red. */}
            <pattern
              id="consumption-hatch"
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="6" height="6" fill="var(--surface)" />
              <rect width="2.5" height="6" fill="var(--text)" />
            </pattern>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 6"
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${Number(v) / 100000}k`}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            width={35}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-soft)" }}
            contentStyle={{
              background: "var(--surface)",
              border: "2px solid var(--frame)",
              borderRadius: 0,
              color: "var(--text)",
            }}
            formatter={(value) => money(Number(value))}
          />
          <Bar
            dataKey="income"
            isAnimationActive={false}
            name="Entrou"
            fill="var(--series-income)"
            maxBarSize={28}
          />
          <Bar
            dataKey="expense"
            isAnimationActive={false}
            name="Consumo"
            fill="url(#consumption-hatch)"
            stroke="var(--text)"
            strokeWidth={2}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
