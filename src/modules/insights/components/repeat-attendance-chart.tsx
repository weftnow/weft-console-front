"use client";

import { RadialBar, RadialBarChart } from "recharts";

import { useI18n } from "@/shared/i18n/I18nProvider";
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
  const { dict, t } = useI18n();
  const copy = dict.insights.repeat;
  const data = [{ returning: percentage, fill: "var(--color-returning)" }];

  return (
    <div className="radial-chart-shell" role="img" aria-label={t(copy.label, { percentage })}>
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
        <span>{copy.line1}<br />{copy.line2}<br />{copy.line3}</span>
      </div>
    </div>
  );
}
