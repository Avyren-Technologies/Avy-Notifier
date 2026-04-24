'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatChartLabelIST, formatTimestampIST } from '../../lib/timezone';
import { cn } from '../../lib/utils';

/* ------------------------------------------------------------------
 * Types
 * ----------------------------------------------------------------*/

export interface AlarmChartDataPoint {
  timestamp: string;
  value: number;
  [key: string]: string | number;
}

export interface AlarmSetpoints {
  setPoint?: number;
  lowLimit?: number;
  highLimit?: number;
  criticalLow?: number;
  criticalHigh?: number;
}

export interface AlarmChartProps {
  data: AlarmChartDataPoint[];
  timeframe?: number;
  setpoints?: AlarmSetpoints;
  valueKey?: string;
  valueName?: string;
  alarmType?: string;
  unit?: string;
  className?: string;
  height?: number;
}

/* ------------------------------------------------------------------
 * Color mapping by alarm type
 * ----------------------------------------------------------------*/

const ALARM_TYPE_COLORS: Record<string, string> = {
  temperature: '#ef4444',
  carbon: '#8b5cf6',
  oil: '#f59e0b',
  pressure: '#06b6d4',
  fan: '#10b981',
  heater: '#f97316',
  motor: '#6366f1',
  conveyor: '#ec4899',
  level: '#3b82f6',
};

/* ------------------------------------------------------------------
 * Custom tooltip
 * ----------------------------------------------------------------*/

function ChartTooltip({
  active,
  payload,
  label,
  unit,
  setpoints,
}: any) {
  if (!active || !payload?.length) return null;

  const dataPoint = payload[0];
  const value = dataPoint?.value;
  const formattedTime =
    typeof label === 'string' && label.includes('T')
      ? formatTimestampIST(label)
      : label;

  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-xl">
      <p className="text-xs font-medium text-muted-foreground mb-1.5">{formattedTime}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: dataPoint?.color || dataPoint?.stroke }}
          />
          <span className="text-sm font-semibold text-card-foreground">
            {typeof value === 'number' ? value.toFixed(2) : value}
            {unit ? ` ${unit}` : ''}
          </span>
        </div>
        {setpoints?.setPoint !== undefined && (
          <p className="text-xs text-muted-foreground">
            Set Point: {setpoints.setPoint}{unit ? ` ${unit}` : ''}
          </p>
        )}
        {setpoints?.highLimit !== undefined && (
          <p className="text-xs text-amber-500">
            High: {setpoints.highLimit}{unit ? ` ${unit}` : ''}
          </p>
        )}
        {setpoints?.lowLimit !== undefined && (
          <p className="text-xs text-blue-500">
            Low: {setpoints.lowLimit}{unit ? ` ${unit}` : ''}
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Component
 * ----------------------------------------------------------------*/

export function AlarmChart({
  data,
  timeframe = 1,
  setpoints,
  valueKey = 'value',
  valueName = 'Value',
  alarmType = 'temperature',
  unit = '',
  className,
  height = 300,
}: AlarmChartProps) {
  const lineColor = ALARM_TYPE_COLORS[alarmType] ?? '#3b82f6';

  const formattedData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      formattedTime: formatChartLabelIST(point.timestamp, timeframe),
    }));
  }, [data, timeframe]);

  // Compute Y axis domain with breathing room
  const [yMin, yMax] = useMemo(() => {
    const values = data.map((d) => d[valueKey] as number).filter((v) => typeof v === 'number');
    const allValues = [
      ...values,
      setpoints?.setPoint,
      setpoints?.lowLimit,
      setpoints?.highLimit,
      setpoints?.criticalLow,
      setpoints?.criticalHigh,
    ].filter((v): v is number => v !== undefined && v !== null);

    if (allValues.length === 0) return [0, 100];

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1 || 5;
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [data, valueKey, setpoints]);

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
        <LineChart data={formattedData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id={`gradient-${alarmType}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.15} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>

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

          <YAxis
            domain={[yMin, yMax]}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            width={50}
            tickFormatter={(v) => `${v}${unit ? '' : ''}`}
          />

          <Tooltip
            content={
              <ChartTooltip
                unit={unit}
                setpoints={setpoints}
              />
            }
          />

          <Legend
            wrapperStyle={{ paddingTop: 8, fontSize: 12 }}
            iconType="circle"
            iconSize={8}
          />

          {/* Critical zones (red shaded areas) */}
          {setpoints?.criticalHigh !== undefined && (
            <ReferenceArea
              y1={setpoints.criticalHigh}
              y2={yMax}
              fill="#ef4444"
              fillOpacity={0.06}
              label={{ value: 'Critical', position: 'insideTopRight', fill: '#ef4444', fontSize: 10 }}
            />
          )}
          {setpoints?.criticalLow !== undefined && (
            <ReferenceArea
              y1={yMin}
              y2={setpoints.criticalLow}
              fill="#ef4444"
              fillOpacity={0.06}
            />
          )}

          {/* Warning zones (amber shaded areas) */}
          {setpoints?.highLimit !== undefined && setpoints?.criticalHigh !== undefined && (
            <ReferenceArea
              y1={setpoints.highLimit}
              y2={setpoints.criticalHigh}
              fill="#f59e0b"
              fillOpacity={0.06}
            />
          )}
          {setpoints?.highLimit !== undefined && setpoints?.criticalHigh === undefined && (
            <ReferenceArea
              y1={setpoints.highLimit}
              y2={yMax}
              fill="#f59e0b"
              fillOpacity={0.06}
              label={{ value: 'Warning', position: 'insideTopRight', fill: '#f59e0b', fontSize: 10 }}
            />
          )}
          {setpoints?.lowLimit !== undefined && setpoints?.criticalLow === undefined && (
            <ReferenceArea
              y1={yMin}
              y2={setpoints.lowLimit}
              fill="#f59e0b"
              fillOpacity={0.06}
            />
          )}

          {/* Set point reference line */}
          {setpoints?.setPoint !== undefined && (
            <ReferenceLine
              y={setpoints.setPoint}
              stroke="#10b981"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              label={{
                value: `SP: ${setpoints.setPoint}`,
                position: 'right',
                fill: '#10b981',
                fontSize: 10,
              }}
            />
          )}

          {/* High limit reference line */}
          {setpoints?.highLimit !== undefined && (
            <ReferenceLine
              y={setpoints.highLimit}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: `H: ${setpoints.highLimit}`,
                position: 'right',
                fill: '#f59e0b',
                fontSize: 10,
              }}
            />
          )}

          {/* Low limit reference line */}
          {setpoints?.lowLimit !== undefined && (
            <ReferenceLine
              y={setpoints.lowLimit}
              stroke="#3b82f6"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: `L: ${setpoints.lowLimit}`,
                position: 'right',
                fill: '#3b82f6',
                fontSize: 10,
              }}
            />
          )}

          {/* Main data line */}
          <Line
            type="monotone"
            dataKey={valueKey}
            name={valueName}
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, fill: lineColor }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default AlarmChart;
