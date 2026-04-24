'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatChartLabelIST, formatTimestampIST } from '../../lib/timezone';
import { cn } from '../../lib/utils';
import type { MeterReading } from '../../types/meter';

/* ------------------------------------------------------------------
 * Types
 * ----------------------------------------------------------------*/

export type MeterTimeframe = '1h' | '6h' | '24h';

export interface MeterChartProps {
  data: MeterReading[];
  timeframe?: MeterTimeframe;
  selectedParameters?: string[];
  className?: string;
  height?: number;
}

/* ------------------------------------------------------------------
 * Parameter configuration
 * ----------------------------------------------------------------*/

const PARAMETER_CONFIG: Record<
  string,
  { key: keyof MeterReading; label: string; color: string; unit: string; yAxisId: string }
> = {
  voltage: { key: 'voltage', label: 'Voltage', color: '#f59e0b', unit: 'V', yAxisId: 'left' },
  current: { key: 'current', label: 'Current', color: '#06b6d4', unit: 'A', yAxisId: 'left' },
  frequency: { key: 'frequency', label: 'Frequency', color: '#10b981', unit: 'Hz', yAxisId: 'right' },
  pf: { key: 'pf', label: 'Power Factor', color: '#8b5cf6', unit: '', yAxisId: 'right' },
  energy: { key: 'energy', label: 'Energy', color: '#f43f5e', unit: 'kWh', yAxisId: 'left' },
  power: { key: 'power', label: 'Power', color: '#f97316', unit: 'kW', yAxisId: 'left' },
};

const ALL_PARAMETERS = Object.keys(PARAMETER_CONFIG);

/* ------------------------------------------------------------------
 * Timeframe to hours
 * ----------------------------------------------------------------*/

function timeframeToHours(tf: MeterTimeframe): number {
  switch (tf) {
    case '1h': return 1;
    case '6h': return 6;
    case '24h': return 24;
    default: return 1;
  }
}

/* ------------------------------------------------------------------
 * Custom tooltip
 * ----------------------------------------------------------------*/

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const formattedTime =
    typeof label === 'string' && label.includes('T')
      ? formatTimestampIST(label)
      : label;

  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-xl min-w-[180px]">
      <p className="text-xs font-medium text-muted-foreground mb-2">{formattedTime}</p>
      <div className="space-y-1">
        {payload.map((entry: any) => {
          const paramId = Object.entries(PARAMETER_CONFIG).find(
            ([, cfg]) => cfg.key === entry.dataKey
          );
          const config = paramId ? PARAMETER_CONFIG[paramId[0]] : null;

          return (
            <div key={entry.dataKey} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-muted-foreground">{config?.label ?? entry.name}</span>
              </div>
              <span className="text-xs font-semibold text-card-foreground">
                {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
                {config?.unit ? ` ${config.unit}` : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Component
 * ----------------------------------------------------------------*/

export function MeterChart({
  data,
  timeframe = '1h',
  selectedParameters,
  className,
  height = 350,
}: MeterChartProps) {
  const params = selectedParameters ?? ALL_PARAMETERS;
  const hours = timeframeToHours(timeframe);

  const formattedData = useMemo(() => {
    return data.map((reading) => ({
      ...reading,
      formattedTime: formatChartLabelIST(reading.created_at, hours),
    }));
  }, [data, hours]);

  // Determine which parameters need which Y-axis
  const hasLeftAxis = useMemo(() => {
    return params.some((p) => PARAMETER_CONFIG[p]?.yAxisId === 'left');
  }, [params]);

  const hasRightAxis = useMemo(() => {
    return params.some((p) => PARAMETER_CONFIG[p]?.yAxisId === 'right');
  }, [params]);

  if (data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center rounded-lg border border-border bg-muted/20', className)} style={{ height }}>
        <p className="text-sm text-muted-foreground">No meter data available</p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={formattedData} margin={{ top: 10, right: hasRightAxis ? 60 : 20, left: 10, bottom: 5 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            opacity={0.4}
          />

          <XAxis
            dataKey="formattedTime"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />

          {hasLeftAxis && (
            <YAxis
              yAxisId="left"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              width={55}
            />
          )}

          {hasRightAxis && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              width={55}
            />
          )}

          <Tooltip content={<ChartTooltip />} />

          <Legend
            wrapperStyle={{ paddingTop: 8, fontSize: 12 }}
            iconType="circle"
            iconSize={8}
          />

          {params.map((paramId) => {
            const config = PARAMETER_CONFIG[paramId];
            if (!config) return null;

            return (
              <Line
                key={paramId}
                type="monotone"
                dataKey={config.key}
                name={config.label}
                stroke={config.color}
                yAxisId={config.yAxisId}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 2, fill: config.color }}
                connectNulls
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default MeterChart;
