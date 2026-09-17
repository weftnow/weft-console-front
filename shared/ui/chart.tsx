"use client";

import type { CSSProperties, ReactElement, ReactNode } from "react";
import { createContext, forwardRef, useContext, useId } from "react";
import * as RechartsPrimitive from "recharts";
import type { TooltipContentProps } from "recharts";

export type ChartConfig = Record<
  string,
  {
    color?: string;
    label?: ReactNode;
  }
>;

const ChartContext = createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const context = useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a ChartContainer");
  }

  return context;
}

type ChartContainerProps = React.ComponentPropsWithoutRef<"div"> & {
  children: ReactElement;
  config: ChartConfig;
};

export const ChartContainer = forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ children, className = "", config, id, style, ...props }, ref) => {
    const generatedId = useId().replace(/:/g, "");
    const chartId = `chart-${id ?? generatedId}`;
    const chartColors = Object.fromEntries(
      Object.entries(config).flatMap(([key, item]) =>
        item.color ? [[`--color-${key}`, item.color]] : [],
      ),
    ) as CSSProperties;

    return (
      <ChartContext.Provider value={{ config }}>
        <div
          className={`chart-container ${className}`.trim()}
          data-chart={chartId}
          ref={ref}
          style={{ ...chartColors, ...style }}
          {...props}
        >
          <RechartsPrimitive.ResponsiveContainer>
            {children}
          </RechartsPrimitive.ResponsiveContainer>
        </div>
      </ChartContext.Provider>
    );
  },
);

ChartContainer.displayName = "ChartContainer";

export const ChartTooltip = RechartsPrimitive.Tooltip;

type ChartTooltipContentProps = Partial<TooltipContentProps<number, string>> & {
  hideLabel?: boolean;
};

export function ChartTooltipContent({
  active,
  hideLabel = false,
  label,
  payload,
}: ChartTooltipContentProps) {
  const { config } = useChart();

  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="chart-tooltip surface-floating">
      {!hideLabel ? <div className="chart-tooltip__label">{label}</div> : null}
      {payload.map((item) => {
        const key = String(item.dataKey ?? item.name ?? "value");
        const entry = config[key];

        return (
          <div className="chart-tooltip__item" key={key}>
            <span
              className="chart-tooltip__dot"
              style={{ backgroundColor: item.color ?? entry?.color }}
            />
            <span>{entry?.label ?? item.name}</span>
            <strong>{item.value}%</strong>
          </div>
        );
      })}
    </div>
  );
}
