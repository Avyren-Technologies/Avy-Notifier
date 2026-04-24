'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Activity,
  BarChart3,
  RefreshCw,
  Thermometer,
  FlaskConical,
  Droplets,
  Gauge,
  Fan,
  Flame,
  Cog,
  ArrowRightLeft,
  Waves,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Zap,
  Radio,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { AlarmChart, type AlarmSetpoints } from '../../components/charts/alarm-chart';
import { BarChartComponent, PieChartComponent, type StatsDataPoint } from '../../components/charts/stats-chart';
import { useAnalyticsData, useAlarmConfigurations } from '../../hooks/use-alarms';
import { formatTimestampIST, formatTimestampWithSecondsIST } from '../../lib/timezone';
import { cn } from '../../lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────

type TimeRange = '20s' | '1m' | '5m' | '10m' | '30m' | '1h';

interface AnalogSeries {
  name: string;
  color: string;
  data: number[];
  setpoint: number[];
  thresholds: {
    critical: { low: number[]; high: number[] };
    warning: { low: number[]; high: number[] };
  };
  unit: string;
}

interface BinarySeries {
  name: string;
  color: string;
  data: number[];
  description?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: '20s', value: '20s' },
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '10m', value: '10m' },
  { label: '30m', value: '30m' },
  { label: '1h', value: '1h' },
];

const ALARM_TYPE_ICONS: Record<string, React.ElementType> = {
  temperature: Thermometer,
  carbon: FlaskConical,
  oil: Droplets,
  pressure: Gauge,
  fan: Fan,
  heater: Flame,
  motor: Cog,
  conveyor: ArrowRightLeft,
  level: Waves,
};

const ANALOG_TAB_COLORS: Record<string, string> = {
  temperature: '#ef4444',
  carbon: '#8b5cf6',
  oil: '#f59e0b',
  pressure: '#06b6d4',
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function getAlarmTypeFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('temp')) return 'temperature';
  if (lower.includes('carbon')) return 'carbon';
  if (lower.includes('oil')) return 'oil';
  if (lower.includes('pressure')) return 'pressure';
  if (lower.includes('fan')) return 'fan';
  if (lower.includes('heater')) return 'heater';
  if (lower.includes('motor')) return 'motor';
  if (lower.includes('conveyor')) return 'conveyor';
  if (lower.includes('level')) return 'level';
  return 'temperature';
}

// ─── Sub-components ────────────────────────────────────────────────────────

function AutoRefreshDot({ isRefetching }: { isRefetching: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span
        className={cn(
          'inline-block h-2 w-2 rounded-full',
          isRefetching
            ? 'bg-amber-500 animate-pulse'
            : 'bg-emerald-500'
        )}
      />
      <span>{isRefetching ? 'Updating...' : 'Live'}</span>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  className,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  className?: string;
}) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className="text-2xl font-bold text-card-foreground tabular-nums">
              {value}
            </p>
            {trend && (
              <p className="text-xs text-muted-foreground">{trend}</p>
            )}
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BinaryStatusCard({
  name,
  isActive,
  lastValue,
  timestamp,
}: {
  name: string;
  isActive: boolean;
  lastValue: number;
  timestamp?: string;
}) {
  const Icon = ALARM_TYPE_ICONS[getAlarmTypeFromName(name)] ?? Activity;

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-300',
        isActive
          ? 'border-red-500/40 shadow-red-500/10 shadow-md'
          : 'border-emerald-500/20'
      )}
    >
      {/* Accent stripe */}
      <div
        className={cn(
          'absolute inset-y-0 left-0 w-1 rounded-l-lg',
          isActive ? 'bg-red-500' : 'bg-emerald-500'
        )}
      />
      <CardContent className="p-4 pl-5">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              isActive
                ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-card-foreground">
              {name}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-xs font-medium',
                  isActive
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    isActive
                      ? 'bg-red-500 animate-pulse'
                      : 'bg-emerald-500'
                  )}
                />
                {isActive ? 'FAULT' : 'Normal'}
              </span>
              {timestamp && (
                <span className="text-[10px] text-muted-foreground">
                  {timestamp}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-16" />
                </div>
                <Skeleton className="h-11 w-11 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Chart area */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full rounded-lg" />
        </CardContent>
      </Card>
      {/* Binary grid */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState<TimeRange>('20s');
  const [selectedAnalogIdx, setSelectedAnalogIdx] = useState(0);

  // Data hooks
  const {
    data: analyticsData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useAnalyticsData(timeRange);

  const { data: configData } = useAlarmConfigurations();

  // Invalidate on time range change for instant switching
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['scada-analytics'] });
  }, [timeRange, queryClient]);

  // ── Derived data ──────────────────────────────────────────────────────

  const analogSeries: AnalogSeries[] = useMemo(
    () => analyticsData?.analogData ?? [],
    [analyticsData]
  );

  const binarySeries: BinarySeries[] = useMemo(
    () => analyticsData?.binaryData ?? [],
    [analyticsData]
  );

  const timeLabels: string[] = useMemo(() => {
    return (analyticsData?.timeLabels ?? []).map((t: string) => {
      if (t.includes('-') || t.includes('T')) {
        return formatTimestampIST(t);
      }
      return t;
    });
  }, [analyticsData?.timeLabels]);

  // Currently selected analog series for the chart
  const currentSeries = analogSeries[selectedAnalogIdx] ?? null;

  // Convert selected analog series to AlarmChart format
  const chartData = useMemo(() => {
    if (!currentSeries || !timeLabels.length) return [];
    return currentSeries.data.map((value, i) => ({
      timestamp: analyticsData?.timeLabels?.[i] ?? timeLabels[i],
      value,
    }));
  }, [currentSeries, timeLabels, analyticsData?.timeLabels]);

  const chartSetpoints: AlarmSetpoints | undefined = useMemo(() => {
    if (!currentSeries) return undefined;
    const idx = Math.floor(currentSeries.data.length / 2);
    return {
      setPoint: currentSeries.setpoint?.[idx],
      lowLimit: currentSeries.thresholds?.warning?.low?.[idx],
      highLimit: currentSeries.thresholds?.warning?.high?.[idx],
      criticalLow: currentSeries.thresholds?.critical?.low?.[idx],
      criticalHigh: currentSeries.thresholds?.critical?.high?.[idx],
    };
  }, [currentSeries]);

  // ── Statistics ────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalAnalog = analogSeries.length;
    const totalBinary = binarySeries.length;
    const activeBinary = binarySeries.filter(
      (s) => s.data.length > 0 && s.data[s.data.length - 1] === 1
    ).length;

    // Count analog alarms in warning/critical zones
    let criticalCount = 0;
    let warningCount = 0;
    let normalCount = 0;
    analogSeries.forEach((s) => {
      if (s.data.length === 0) return;
      const latest = s.data[s.data.length - 1];
      const lastIdx = s.data.length - 1;
      const critLow = s.thresholds?.critical?.low?.[lastIdx];
      const critHigh = s.thresholds?.critical?.high?.[lastIdx];
      const warnLow = s.thresholds?.warning?.low?.[lastIdx];
      const warnHigh = s.thresholds?.warning?.high?.[lastIdx];
      if (
        (critLow !== undefined && latest <= critLow) ||
        (critHigh !== undefined && latest >= critHigh)
      ) {
        criticalCount++;
      } else if (
        (warnLow !== undefined && latest <= warnLow) ||
        (warnHigh !== undefined && latest >= warnHigh)
      ) {
        warningCount++;
      } else {
        normalCount++;
      }
    });

    return {
      totalAlarms: totalAnalog + totalBinary,
      activeFaults: activeBinary + criticalCount,
      criticalCount,
      warningCount,
      normalCount: normalCount + (totalBinary - activeBinary),
    };
  }, [analogSeries, binarySeries]);

  // Bar chart data: severity breakdown
  const severityData: StatsDataPoint[] = useMemo(
    () => [
      { name: 'Critical', value: stats.criticalCount, color: '#ef4444' },
      { name: 'Warning', value: stats.warningCount, color: '#f59e0b' },
      { name: 'Normal', value: stats.normalCount, color: '#10b981' },
    ],
    [stats]
  );

  // Pie chart data: type breakdown
  const typeData: StatsDataPoint[] = useMemo(() => {
    const map = new Map<string, number>();
    analogSeries.forEach((s) => {
      const type = getAlarmTypeFromName(s.name);
      map.set(type, (map.get(type) || 0) + 1);
    });
    binarySeries.forEach((s) => {
      const type = getAlarmTypeFromName(s.name);
      map.set(type, (map.get(type) || 0) + 1);
    });
    const colors: Record<string, string> = {
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
    return Array.from(map.entries()).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: colors[name] || '#6b7280',
    }));
  }, [analogSeries, binarySeries]);

  // ── Handlers ─────────────────────────────────────────────────────────

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['scada-analytics', timeRange] });
    refetch();
  }, [queryClient, timeRange, refetch]);

  const handleTimeRangeChange = useCallback((value: string) => {
    setTimeRange(value as TimeRange);
    setSelectedAnalogIdx(0);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────

  const hasData =
    !isLoading &&
    !error &&
    analyticsData &&
    (analogSeries.length > 0 || binarySeries.length > 0) &&
    !analyticsData.message;

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Alarm Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time SCADA alarm trends and patterns
          </p>
        </div>

        <div className="flex items-center gap-3">
          <AutoRefreshDot isRefetching={isFetching && !isLoading} />
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw
              className={cn('h-4 w-4', isFetching && 'animate-spin')}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Time range selector ─────────────────────────────────────── */}
      <Tabs
        value={timeRange}
        onValueChange={handleTimeRangeChange}
      >
        <TabsList className="w-full justify-start sm:w-auto">
          {TIME_RANGES.map((r) => (
            <TabsTrigger key={r.value} value={r.value} className="px-4">
              {r.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* ── Loading state ───────────────────────────────────────────── */}
      {isLoading && <LoadingSkeleton />}

      {/* ── Error state ─────────────────────────────────────────────── */}
      {error && !isLoading && (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <div className="text-center">
              <p className="font-semibold text-card-foreground">
                Error Loading Data
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Unable to fetch analytics data for {timeRange.toUpperCase()}.
                Check the SCADA connection.
              </p>
            </div>
            <Button variant="outline" onClick={handleRefresh}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {!isLoading && !error && !hasData && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <BarChart3 className="h-10 w-10 text-muted-foreground" />
            <div className="text-center">
              <p className="font-semibold text-card-foreground">
                No Data Available
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                No SCADA data found for the last {timeRange.toUpperCase()}. Try
                a different time range or refresh.
              </p>
            </div>
            <Button variant="outline" onClick={handleRefresh}>
              Refresh
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Data display ────────────────────────────────────────────── */}
      {hasData && (
        <>
          {/* ── Stats Summary ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Alarms"
              value={stats.totalAlarms}
              icon={Activity}
              trend={`Monitoring ${timeRange.toUpperCase()} window`}
            />
            <StatCard
              title="Active Faults"
              value={stats.activeFaults}
              icon={Zap}
              trend={
                stats.activeFaults > 0
                  ? 'Requires attention'
                  : 'All clear'
              }
              className={
                stats.activeFaults > 0
                  ? 'border-red-500/30 shadow-red-500/5'
                  : ''
              }
            />
            <StatCard
              title="Critical"
              value={stats.criticalCount}
              icon={AlertTriangle}
              trend="Analog alarms in critical zone"
              className={
                stats.criticalCount > 0
                  ? 'border-red-500/30 shadow-red-500/5'
                  : ''
              }
            />
            <StatCard
              title="Normal"
              value={stats.normalCount}
              icon={CheckCircle2}
              trend="Operating within limits"
            />
          </div>

          {/* ── Analog Chart ──────────────────────────────────────── */}
          {analogSeries.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-base">
                      Analog Alarm Trend
                    </CardTitle>
                  </div>

                  {/* Analog type tabs */}
                  <div className="flex flex-wrap gap-1.5">
                    {analogSeries.map((series, idx) => {
                      const type = getAlarmTypeFromName(series.name);
                      const Icon = ALARM_TYPE_ICONS[type] ?? Activity;
                      const isSelected = idx === selectedAnalogIdx;
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedAnalogIdx(idx)}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200',
                            isSelected
                              ? 'text-white shadow-sm'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          )}
                          style={
                            isSelected
                              ? { backgroundColor: series.color }
                              : undefined
                          }
                        >
                          <Icon className="h-3 w-3" />
                          <span className="hidden sm:inline">
                            {series.name}
                          </span>
                          <span className="sm:hidden">
                            {series.name.length > 12
                              ? series.name.slice(0, 10) + '...'
                              : series.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {currentSeries && (
                  <>
                    {/* Current value indicator */}
                    <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg bg-muted/30 px-4 py-3">
                      <div>
                        <span className="text-xs text-muted-foreground">
                          Current Value
                        </span>
                        <p className="text-lg font-bold text-card-foreground tabular-nums">
                          {currentSeries.data.length > 0
                            ? currentSeries.data[
                                currentSeries.data.length - 1
                              ].toFixed(2)
                            : '--'}
                          {currentSeries.unit
                            ? ` ${currentSeries.unit}`
                            : ''}
                        </p>
                      </div>
                      {chartSetpoints?.setPoint !== undefined && (
                        <div>
                          <span className="text-xs text-muted-foreground">
                            Set Point
                          </span>
                          <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {chartSetpoints.setPoint}
                            {currentSeries.unit
                              ? ` ${currentSeries.unit}`
                              : ''}
                          </p>
                        </div>
                      )}
                      {chartSetpoints?.highLimit !== undefined && (
                        <div>
                          <span className="text-xs text-muted-foreground">
                            High Limit
                          </span>
                          <p className="text-sm font-medium text-amber-600 dark:text-amber-400 tabular-nums">
                            {chartSetpoints.highLimit}
                          </p>
                        </div>
                      )}
                      {chartSetpoints?.lowLimit !== undefined && (
                        <div>
                          <span className="text-xs text-muted-foreground">
                            Low Limit
                          </span>
                          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 tabular-nums">
                            {chartSetpoints.lowLimit}
                          </p>
                        </div>
                      )}
                    </div>

                    <AlarmChart
                      data={chartData}
                      setpoints={chartSetpoints}
                      valueKey="value"
                      valueName={currentSeries.name}
                      alarmType={getAlarmTypeFromName(currentSeries.name)}
                      unit={currentSeries.unit}
                      height={350}
                      timeframe={
                        timeRange === '1h'
                          ? 6
                          : timeRange === '30m'
                          ? 6
                          : 1
                      }
                    />
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Binary Status Grid ────────────────────────────────── */}
          {binarySeries.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Radio className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-base">
                    Binary Alarms Status
                  </CardTitle>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {binarySeries.filter(
                      (s) =>
                        s.data.length > 0 &&
                        s.data[s.data.length - 1] === 1
                    ).length}{' '}
                    / {binarySeries.length} active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {binarySeries.map((series, idx) => {
                    const lastValue =
                      series.data.length > 0
                        ? series.data[series.data.length - 1]
                        : 0;
                    const lastTimeLabelRaw =
                      analyticsData?.timeLabels?.[
                        analyticsData.timeLabels.length - 1
                      ];
                    const lastTimeLabel = lastTimeLabelRaw
                      ? formatTimestampWithSecondsIST(lastTimeLabelRaw)
                      : undefined;

                    return (
                      <BinaryStatusCard
                        key={idx}
                        name={series.name}
                        isActive={lastValue === 1}
                        lastValue={lastValue}
                        timestamp={lastTimeLabel}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Statistics Charts ─────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Severity breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-base">By Severity</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <BarChartComponent data={severityData} height={250} />
              </CardContent>
            </Card>

            {/* Type breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-base">By Type</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <PieChartComponent data={typeData} height={250} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
