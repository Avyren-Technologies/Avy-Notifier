'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart as RechartsPieChart,
  Pie,
  Legend,
} from 'recharts';
import { cn } from '../../lib/utils';

/* ------------------------------------------------------------------
 * Types
 * ----------------------------------------------------------------*/

export interface StatsDataPoint {
  name: string;
  value: number;
  color: string;
}

interface ChartCommonProps {
  data: StatsDataPoint[];
  className?: string;
  height?: number;
}

/* ------------------------------------------------------------------
 * Custom tooltips
 * ----------------------------------------------------------------*/

function BarTooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;

  const entry = payload[0];
  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-xl">
      <div className="flex items-center gap-2">
        <div
          className="h-3 w-3 rounded"
          style={{ backgroundColor: entry.payload.color }}
        />
        <span className="text-sm font-semibold text-card-foreground">{entry.payload.name}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Count: <span className="font-semibold text-card-foreground">{entry.value}</span>
      </p>
    </div>
  );
}

function PieTooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;

  const entry = payload[0];
  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-xl">
      <div className="flex items-center gap-2">
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: entry.payload.color }}
        />
        <span className="text-sm font-semibold text-card-foreground">{entry.name}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Count: <span className="font-semibold text-card-foreground">{entry.value}</span>
        {entry.payload.percent !== undefined && (
          <span className="ml-1">
            ({(entry.payload.percent * 100).toFixed(1)}%)
          </span>
        )}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Custom legend
 * ----------------------------------------------------------------*/

function CustomLegend({ payload }: any) {
  if (!payload?.length) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-2">
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-1.5">
          <div
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------
 * BarChartComponent
 * ----------------------------------------------------------------*/

export function BarChartComponent({
  data,
  className,
  height = 300,
}: ChartCommonProps) {
  if (data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center rounded-lg border border-border bg-muted/20', className)} style={{ height }}>
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            opacity={0.4}
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            allowDecimals={false}
          />
          <Tooltip content={<BarTooltipContent />} />
          <Bar
            dataKey="value"
            radius={[6, 6, 0, 0]}
            maxBarSize={48}
          >
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------
 * PieChartComponent
 * ----------------------------------------------------------------*/

export function PieChartComponent({
  data,
  className,
  height = 300,
}: ChartCommonProps) {
  if (data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center rounded-lg border border-border bg-muted/20', className)} style={{ height }}>
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className={cn('rounded-lg', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
            nameKey="name"
            label={({ name, value }) => `${name}: ${value}`}
            labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
          >
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
          {/* Center label showing total */}
          <text
            x="50%"
            y="45%"
            textAnchor="middle"
            dominantBaseline="central"
            className="text-lg font-bold"
            fill="hsl(var(--card-foreground))"
          >
            {total}
          </text>
          <Tooltip content={<PieTooltipContent />} />
          <Legend content={<CustomLegend />} />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}
