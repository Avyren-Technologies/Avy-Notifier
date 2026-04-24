'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/auth-context';
import { apiClient } from '../../lib/api-client';
import { formatFullTimestampIST } from '../../lib/timezone';
import { cn } from '../../lib/utils';
import type { MeterReading, PaginatedMeterReadings } from '../../types/meter';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Zap,
  Activity,
  Waves,
  CircuitBoard,
  BatteryCharging,
  TrendingUp,
  RefreshCw,
  Clock,
  BarChart3,
  Calendar,
  ChevronDown,
  Loader2,
} from 'lucide-react';

// ─── Constants ─────────────────────────────────────────────────────────────────

type TimeFilter = '24h' | '3d' | '7d' | '30d' | 'custom';

const PAGE_SIZE = 20;

const TIME_FILTER_OPTIONS: { label: string; value: TimeFilter }[] = [
  { label: '24h', value: '24h' },
  { label: '3d', value: '3d' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: 'Custom', value: 'custom' },
];

function filterToHours(filter: TimeFilter): number {
  switch (filter) {
    case '24h':
      return 24;
    case '3d':
      return 72;
    case '7d':
      return 168;
    case '30d':
      return 720;
    default:
      return 24;
  }
}

// ─── Parameter definitions ─────────────────────────────────────────────────────

interface ParameterDef {
  key: keyof MeterReading;
  label: string;
  unit: string;
  decimals: number;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

const PARAMETERS: ParameterDef[] = [
  {
    key: 'voltage',
    label: 'Voltage',
    unit: 'V',
    decimals: 1,
    icon: Zap,
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/20',
  },
  {
    key: 'current',
    label: 'Current',
    unit: 'A',
    decimals: 1,
    icon: Activity,
    colorClass: 'text-cyan-500',
    bgClass: 'bg-cyan-500/10',
    borderClass: 'border-cyan-500/20',
  },
  {
    key: 'frequency',
    label: 'Frequency',
    unit: 'Hz',
    decimals: 1,
    icon: Waves,
    colorClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/20',
  },
  {
    key: 'pf',
    label: 'Power Factor',
    unit: '',
    decimals: 2,
    icon: CircuitBoard,
    colorClass: 'text-violet-500',
    bgClass: 'bg-violet-500/10',
    borderClass: 'border-violet-500/20',
  },
  {
    key: 'energy',
    label: 'Energy',
    unit: 'kWh',
    decimals: 1,
    icon: BatteryCharging,
    colorClass: 'text-rose-500',
    bgClass: 'bg-rose-500/10',
    borderClass: 'border-rose-500/20',
  },
  {
    key: 'power',
    label: 'Power',
    unit: 'kW',
    decimals: 1,
    icon: TrendingUp,
    colorClass: 'text-orange-500',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/20',
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatValue(
  value: number | undefined | null,
  decimals: number = 1,
): string {
  if (value === undefined || value === null || isNaN(value)) return '-';
  const factor = Math.pow(10, decimals);
  return String(Math.round(value * factor) / factor);
}

// ─── Skeleton loading cards ────────────────────────────────────────────────────

function ReadingCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Reading Card ──────────────────────────────────────────────────────────────

const ReadingCard = React.memo(function ReadingCard({
  reading,
}: {
  reading: MeterReading;
}) {
  return (
    <Card className="group overflow-hidden transition-all duration-200 hover:shadow-md hover:border-border/80">
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {formatFullTimestampIST(reading.created_at)}
          </div>
          <Badge variant="outline" className="font-mono text-[11px] tracking-wide">
            ID: {reading.meter_id}
          </Badge>
        </div>
      </CardHeader>

      {/* Parameters grid */}
      <CardContent>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          {PARAMETERS.map((param) => {
            const Icon = param.icon;
            const rawValue = reading[param.key];
            const value =
              typeof rawValue === 'number' ? rawValue : undefined;

            return (
              <div
                key={param.key}
                className="flex items-center gap-3"
              >
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
                    param.bgClass,
                    param.borderClass,
                  )}
                >
                  <Icon className={cn('h-4 w-4', param.colorClass)} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {param.label}
                  </p>
                  <p className="text-sm font-semibold text-foreground tabular-nums">
                    {formatValue(value, param.decimals)}
                    {param.unit && (
                      <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">
                        {param.unit}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function MeterHistoryPage() {
  const { authState, organizationId } = useAuth();
  const queryClient = useQueryClient();

  // Filter state
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24h');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Compute hours and startTime for the API
  const { hours, startTime } = useMemo(() => {
    if (timeFilter === 'custom' && customFrom && customTo) {
      const from = new Date(customFrom);
      const to = new Date(customTo);
      const diffMs = to.getTime() - from.getTime();
      const diffHours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
      return { hours: diffHours, startTime: from.toISOString() };
    }
    return { hours: filterToHours(timeFilter), startTime: undefined };
  }, [timeFilter, customFrom, customTo]);

  // Infinite query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    refetch,
  } = useInfiniteQuery<PaginatedMeterReadings>({
    queryKey: ['meter', 'history', 'infinite', hours, startTime, organizationId],
    queryFn: async ({ pageParam }) => {
      if (!organizationId) throw new Error('organizationId is required');

      let queryParams = `hours=${hours}&page=${pageParam}&limit=${PAGE_SIZE}`;
      if (startTime) {
        queryParams += `&startTime=${encodeURIComponent(startTime)}`;
      }

      const { data } = await apiClient.get(
        `/api/meter/history?${queryParams}`,
      );
      return data.data;
    },
    getNextPageParam: (lastPage) => {
      if (
        lastPage.pagination &&
        lastPage.pagination.page < lastPage.pagination.pages
      ) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    placeholderData: (prev) => prev,
    refetchInterval: 30000,
    enabled:
      authState.isAuthenticated &&
      !!authState.user &&
      !!organizationId,
  });

  // Flatten all pages into a single sorted list
  const allReadings = useMemo(() => {
    if (!data) return [];
    const readings = data.pages.flatMap((page) => page.readings || []);
    return [...readings].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [data]);

  // Total reading count from pagination info
  const totalReadings = data?.pages[0]?.pagination?.total ?? 0;

  // Handle refresh
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['meter', 'history', 'infinite'],
    });
    refetch();
  }, [queryClient, refetch]);

  // Handle filter change
  const handleFilterChange = useCallback((value: string) => {
    setTimeFilter(value as TimeFilter);
  }, []);

  // Whether initial load is in progress
  const isInitialLoading = isLoading && !data;

  return (
    <div className="flex min-h-full flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Meter Reading History
          </h1>
          <p className="text-sm text-muted-foreground">
            Browse past meter readings and measurements
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isFetching && !isInitialLoading && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="hidden sm:inline">Syncing...</span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
            className="gap-1.5"
          >
            <RefreshCw
              className={cn('h-4 w-4', isFetching && 'animate-spin')}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Time filter tabs ────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <Tabs
              value={timeFilter}
              onValueChange={handleFilterChange}
            >
              <TabsList className="w-full sm:w-auto">
                {TIME_FILTER_OPTIONS.map((opt) => (
                  <TabsTrigger
                    key={opt.value}
                    value={opt.value}
                    className="flex-1 sm:flex-none"
                  >
                    {opt.value === 'custom' && (
                      <Calendar className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {opt.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Custom date range picker */}
            {timeFilter === 'custom' && (
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1.5">
                  <label
                    htmlFor="custom-from"
                    className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    From
                  </label>
                  <input
                    id="custom-from"
                    type="datetime-local"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className={cn(
                      'block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground',
                      'transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                    )}
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label
                    htmlFor="custom-to"
                    className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    To
                  </label>
                  <input
                    id="custom-to"
                    type="datetime-local"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className={cn(
                      'block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground',
                      'transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                    )}
                  />
                </div>
              </div>
            )}

            {/* Result count chip */}
            {!isInitialLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <BarChart3 className="h-3.5 w-3.5" />
                <span>
                  {totalReadings.toLocaleString()} reading
                  {totalReadings !== 1 ? 's' : ''} found
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Loading state ───────────────────────────────────────────── */}
      {isInitialLoading && (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <ReadingCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {!isInitialLoading && allReadings.length === 0 && (
        <Card className="py-16">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-foreground">
                No meter readings found
              </p>
              <p className="text-sm text-muted-foreground">
                No meter readings found for this time period.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="mt-2 gap-1.5"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          </div>
        </Card>
      )}

      {/* ── Reading cards ───────────────────────────────────────────── */}
      {!isInitialLoading && allReadings.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {allReadings.map((reading, index) => (
              <ReadingCard
                key={`${reading.meter_id}-${reading.created_at}-${index}`}
                reading={reading}
              />
            ))}
          </div>

          {/* Load more button */}
          {hasNextPage && (
            <div className="flex justify-center pb-4">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="gap-2"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading more...
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Load More
                  </>
                )}
              </Button>
            </div>
          )}

          {/* End of list indicator */}
          {!hasNextPage && allReadings.length > 0 && (
            <p className="pb-4 text-center text-xs text-muted-foreground">
              Showing all {totalReadings.toLocaleString()} readings
            </p>
          )}
        </>
      )}
    </div>
  );
}
