"use client";

import { RadialBar, RadialBarChart } from "recharts";

import { ChartContainer, type ChartConfig } from "@/shared/ui/chart";

const chartConfig = {
  returning: {
    color: "#ff6a35",
    label: "Repeat attendees",
  },
} satisfies ChartConfig;

interface RepeatAttendanceChartProps {
  percentage: number;
}

export function RepeatAttendanceChart({ percentage }: RepeatAttendanceChartProps) {
  const data = [{ returning: percentage, fill: "var(--color-returning)" }];

  return (
    <div className="radial-chart-shell" role="img" aria-label={`${percentage}% of attendees returned to another event`}>
      <div aria-hidden="true" className="radial-track" />
      <ChartContainer className="radial-chart" config={chartConfig}>
        <RadialBarChart
          data={data}
          endAngle={90 - percentage * 3.6}
          innerRadius={51}
          outerRadius={66}
          startAngle={90}
        >
          <RadialBar
            background={{ fill: "transparent" }}
            cornerRadius={10}
            dataKey="returning"
            isAnimationActive={false}
          />
        </RadialBarChart>
      </ChartContainer>
      <div className="radial-chart__center">
        <strong>{percentage}%</strong>
        <span>of attendees<br />returned to another<br />event</span>
      </div>
    </div>
  );
}
