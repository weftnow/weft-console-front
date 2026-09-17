"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../../../shared/ui/chart";
import type { ConnectionPoint } from "../overview-data";

const chartConfig = {
  value: {
    color: "#ff5a1f",
    label: "Valuable connections",
  },
} satisfies ChartConfig;

interface ConnectionQualityChartProps {
  points: ConnectionPoint[];
}

interface AxisTickProps {
  payload?: { value?: string };
  x?: number | string;
  y?: number | string;
}

function CityTick({ payload, x = 0, y = 0 }: AxisTickProps) {
  const [city, date] = (payload?.value ?? "").split("|");

  return (
    <g transform={`translate(${x},${y})`}>
      <text fill="#4f514e" fontSize="10" textAnchor="middle" y="14">
        {city}
      </text>
      <text fill="#8a8b87" fontSize="9" textAnchor="middle" y="29">
        {date}
      </text>
    </g>
  );
}

export function ConnectionQualityChart({ points }: ConnectionQualityChartProps) {
  const data = points.map((point) => ({
    ...point,
    label: `${point.city}|${point.date}`,
  }));

  return (
    <>
      <p className="chart-summary">
        Valuable connections rose from {points[0]?.value}% in {points[0]?.city} to {points.at(-1)?.value}% in {points.at(-1)?.city}.
      </p>
      <ChartContainer className="connection-chart" config={chartConfig}>
        <AreaChart accessibilityLayer data={data} margin={{ top: 22, right: 16, bottom: 32, left: -12 }}>
          <defs>
            <linearGradient id="connectionFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.23} />
              <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0.025} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(85, 78, 69, 0.09)" vertical />
          <XAxis
            axisLine={false}
            dataKey="label"
            height={43}
            interval={0}
            tick={(props: AxisTickProps) => <CityTick {...props} />}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            domain={[0, 100]}
            tick={{ fill: "#777975", fontSize: 9 }}
            tickFormatter={(value: number) => `${value}%`}
            tickLine={false}
            ticks={[0, 25, 50, 75, 100]}
            width={42}
          />
          <ChartTooltip content={<ChartTooltipContent />} cursor={{ stroke: "rgba(255,90,31,.18)", strokeWidth: 1 }} />
          <Area
            activeDot={{ r: 6, fill: "#ff5a1f", stroke: "#fffaf6", strokeWidth: 3 }}
            dataKey="value"
            dot={{ r: 4.5, fill: "#ff5a1f", stroke: "#fffaf6", strokeWidth: 2 }}
            fill="url(#connectionFill)"
            stroke="var(--color-value)"
            strokeWidth={2.2}
            type="monotone"
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
    </>
  );
}
