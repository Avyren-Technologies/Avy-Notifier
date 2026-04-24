'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useLatestMeterReading,
  useMeterHistory,
  useMeterLimits,
  useUpdateMeterLimit,
  METER_KEYS,
} from '../../hooks/use-meter-readings';
import { useAuth } from '../../context/auth-context';
import { cn } from '../../lib/utils';
import { formatTimeIST, formatTimestampIST } from '../../lib/timezone';
import { MeterChart } from '../../components/charts/meter-chart';
import type { MeterTimeframe } from '../../components/charts/meter-chart';
import type { MeterReading, MeterLimit } from '../../types/meter';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Button, Spinner } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '../../components/ui/data-table';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
} from '../../components/ui/modal';
import { Skeleton } from '../../components/ui/skeleton';

/* ================================================================
 * Parameter configuration
 * ================================================================ */

interface ParameterConfig {
  id: string;
  key: keyof MeterReading;
  name: string;
  unit: string;
  accent: string;       // tailwind text/border color
  accentBg: string;     // tailwind bg color (muted)
  iconPath: string;     // SVG path for the icon
  decimals: number;
}

const PARAMETERS: ParameterConfig[] = [
  {
    id: 'voltage',
    key: 'voltage',
    name: 'Voltage',
    unit: 'V',
    accent: 'text-amber-500',
    accentBg: 'bg-amber-500/10',
    iconPath: 'M13 10V3L4 14h7v7l9-11h-7z', // lightning bolt
    decimals: 1,
  },
  {
    id: 'current',
    key: 'current',
    name: 'Current',
    unit: 'A',
    accent: 'text-cyan-500',
    accentBg: 'bg-cyan-500/10',
    iconPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
    decimals: 1,
  },
  {
    id: 'frequency',
    key: 'frequency',
    name: 'Frequency',
    unit: 'Hz',
    accent: 'text-emerald-500',
    accentBg: 'bg-emerald-500/10',
    iconPath: 'M3 12h4l3-9 4 18 3-9h4', // wave/pulse
    decimals: 1,
  },
  {
    id: 'pf',
    key: 'pf',
    name: 'Power Factor',
    unit: '',
    accent: 'text-violet-500',
    accentBg: 'bg-violet-500/10',
    iconPath: 'M12 3v18M3 12h18M5.636 5.636l12.728 12.728M18.364 5.636L5.636 18.364',
    decimals: 2,
  },
  {
    id: 'energy',
    key: 'energy',
    name: 'Energy',
    unit: 'kWh',
    accent: 'text-rose-500',
    accentBg: 'bg-rose-500/10',
    iconPath: 'M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z',
    decimals: 1,
  },
  {
    id: 'power',
    key: 'power',
    name: 'Power',
    unit: 'kW',
    accent: 'text-orange-500',
    accentBg: 'bg-orange-500/10',
    iconPath: 'M22 12h-4l-3 9L11 3l-3 9H4',
    decimals: 1,
  },
];

const ACCENT_BORDER: Record<string, string> = {
  voltage: 'border-l-amber-500',
  current: 'border-l-cyan-500',
  frequency: 'border-l-emerald-500',
  pf: 'border-l-violet-500',
  energy: 'border-l-rose-500',
  power: 'border-l-orange-500',
};

/* ================================================================
 * Helpers
 * ================================================================ */

function timeframeToHours(tf: MeterTimeframe): number {
  switch (tf) {
    case '1h':
      return 1;
    case '6h':
      return 6;
    case '24h':
      return 24;
    default:
      return 1;
  }
}

function formatNumber(
  value: number | undefined | null,
  decimals: number = 1,
): string {
  if (value === undefined || value === null || isNaN(value)) return '--';
  return value.toFixed(decimals);
}

function isValueExceeded(
  value: number,
  parameter: string,
  limits: MeterLimit[] | undefined,
): 'high' | 'low' | false {
  if (!limits) return false;
  const limit = limits.find((l) => l.parameter === parameter);
  if (!limit) return false;
  if (value > limit.highLimit) return 'high';
  if (limit.lowLimit !== null && value < limit.lowLimit) return 'low';
  return false;
}

/* ================================================================
 * Trend Arrow
 * ================================================================ */

function TrendArrow({
  current,
  previous,
}: {
  current: number | undefined;
  previous: number | undefined;
}) {
  if (
    current === undefined ||
    previous === undefined ||
    current === null ||
    previous === null
  ) {
    return <span className="text-xs text-muted-foreground">--</span>;
  }
  const diff = current - previous;
  if (Math.abs(diff) < 0.001) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Stable
      </span>
    );
  }
  if (diff > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-emerald-500">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
        +{diff.toFixed(2)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-red-500">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
      {diff.toFixed(2)}
    </span>
  );
}

/* ================================================================
 * Loading skeleton for parameter cards
 * ================================================================ */

function ParameterCardSkeleton() {
  return (
    <Card className="border-l-4 border-l-muted">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

/* ================================================================
 * Configure Limits Modal
 * ================================================================ */

interface LimitFormValues {
  highLimit: string;
  lowLimit: string;
}

function ConfigureLimitsModal({
  open,
  onOpenChange,
  limits,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limits: MeterLimit[] | undefined;
}) {
  const updateLimit = useUpdateMeterLimit();
  const [editedLimits, setEditedLimits] = useState<
    Record<string, LimitFormValues>
  >({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize form from limits on open
  useEffect(() => {
    if (open && limits) {
      const initial: Record<string, LimitFormValues> = {};
      limits.forEach((limit) => {
        initial[limit.id] = {
          highLimit: String(limit.highLimit),
          lowLimit: limit.lowLimit !== null ? String(limit.lowLimit) : '',
        };
      });
      setEditedLimits(initial);
      setSaveSuccess(false);
    }
  }, [open, limits]);

  const handleValueChange = (
    id: string,
    field: 'highLimit' | 'lowLimit',
    value: string,
  ) => {
    setEditedLimits((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!limits) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      const updates = limits.map((limit) => {
        const edited = editedLimits[limit.id];
        if (!edited) return null;

        const highLimit = parseFloat(edited.highLimit);
        const lowLimit = edited.lowLimit ? parseFloat(edited.lowLimit) : undefined;

        // Only update if values actually changed
        const highChanged = highLimit !== limit.highLimit;
        const lowChanged =
          lowLimit !== undefined
            ? lowLimit !== limit.lowLimit
            : limit.lowLimit !== null;

        if (!highChanged && !lowChanged) return null;

        return updateLimit.mutateAsync({
          id: limit.id,
          values: {
            highLimit: !isNaN(highLimit) ? highLimit : undefined,
            lowLimit: lowLimit !== undefined && !isNaN(lowLimit) ? lowLimit : undefined,
          },
        });
      });

      await Promise.all(updates.filter(Boolean));
      setSaveSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
      }, 800);
    } catch (error) {
      console.error('Failed to update limits:', error);
    } finally {
      setSaving(false);
    }
  };

  const paramForLimit = (limit: MeterLimit) =>
    PARAMETERS.find((p) => p.id === limit.parameter);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>Configure Parameter Limits</ModalTitle>
          <ModalDescription>
            Set high and low thresholds for each meter parameter. Values
            exceeding these limits will be highlighted in red.
          </ModalDescription>
        </ModalHeader>

        <div className="mt-6 space-y-4">
          {limits?.map((limit) => {
            const param = paramForLimit(limit);
            const edited = editedLimits[limit.id];
            if (!edited) return null;

            return (
              <div
                key={limit.id}
                className={cn(
                  'rounded-lg border border-border p-4 transition-colors',
                  'hover:bg-muted/30',
                )}
              >
                <div className="mb-3 flex items-center gap-2">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-md',
                      param?.accentBg ?? 'bg-muted',
                    )}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={param?.accent ?? 'text-muted-foreground'}
                    >
                      <path d={param?.iconPath ?? 'M12 12h.01'} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">
                      {limit.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {limit.unit ? `Unit: ${limit.unit}` : 'Dimensionless'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="High Limit"
                    type="number"
                    step="any"
                    value={edited.highLimit}
                    onChange={(e) =>
                      handleValueChange(limit.id, 'highLimit', e.target.value)
                    }
                    className="tabular-nums"
                  />
                  <Input
                    label="Low Limit"
                    type="number"
                    step="any"
                    placeholder="Not set"
                    value={edited.lowLimit}
                    onChange={(e) =>
                      handleValueChange(limit.id, 'lowLimit', e.target.value)
                    }
                    className="tabular-nums"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <ModalFooter className="mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={saving}>
            {saveSuccess ? (
              <span className="flex items-center gap-1.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Saved
              </span>
            ) : (
              'Save Changes'
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/* ================================================================
 * Main Page Component
 * ================================================================ */

export default function MeterReadingsPage() {
  const { authState, role } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = role === 'ADMIN';

  // ── State ──────────────────────────────────────────────────────
  const [selectedTimeframe, setSelectedTimeframe] =
    useState<MeterTimeframe>('1h');
  const [showLimitModal, setShowLimitModal] = useState(false);

  // ── Data hooks ─────────────────────────────────────────────────
  const {
    data: latestReading,
    isLoading: isLatestLoading,
    isError: isLatestError,
    error: latestError,
    refetch: refetchLatest,
  } = useLatestMeterReading();

  const {
    data: historyData,
    isLoading: isHistoryLoading,
    refetch: refetchHistory,
  } = useMeterHistory(timeframeToHours(selectedTimeframe));

  const {
    data: limitsData,
    isLoading: isLimitsLoading,
    refetch: refetchLimits,
  } = useMeterLimits();

  // Auto-refresh is handled by React Query's refetchInterval (30s) in the hooks

  // ── Derived: previous reading for trends ──────────────────────
  const previousReading = useMemo(() => {
    if (!historyData?.readings || historyData.readings.length < 2) return null;
    // readings are typically newest-first from the API
    return historyData.readings[1] ?? null;
  }, [historyData]);

  // ── Derived: sorted readings for the chart ────────────────────
  const chartReadings = useMemo(() => {
    if (!historyData?.readings) return [];
    return [...historyData.readings].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }, [historyData]);

  // ── Derived: table readings (newest first, max 20) ────────────
  const tableReadings = useMemo(() => {
    if (!historyData?.readings) return [];
    return historyData.readings.slice(0, 20);
  }, [historyData]);

  // ── Refresh handler ────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    refetchLatest();
    refetchHistory();
    refetchLimits();
  }, [refetchLatest, refetchHistory, refetchLimits]);

  // ── Loading state ──────────────────────────────────────────────
  if (isLatestLoading && !latestReading) {
    return (
      <div className="space-y-8 p-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>

        {/* Parameter cards skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ParameterCardSkeleton key={i} />
          ))}
        </div>

        {/* Chart skeleton */}
        <Skeleton className="h-[400px] w-full rounded-lg" />

        {/* Table skeleton */}
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────
  if (isLatestError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-destructive"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-card-foreground">
          Error Loading Meter Data
        </h2>
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          {latestError instanceof Error
            ? latestError.message
            : 'Failed to load meter data. Please try again.'}
        </p>
        <Button onClick={handleRefresh} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────
  if (!latestReading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <path d="M3 12h4l3-9 4 18 3-9h4" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-card-foreground">
          No Meter Data Available
        </h2>
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          No meter readings have been recorded yet. Please ensure your meter
          device is connected and sending data.
        </p>
        <Button onClick={handleRefresh} variant="outline">
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Meter Readings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live monitoring and historical data &middot; Last updated{' '}
            <span className="font-medium text-foreground">
              {formatTimestampIST(latestReading.created_at)}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-1.5"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </Button>

          {isAdmin && (
            <Button
              size="sm"
              onClick={() => setShowLimitModal(true)}
              className="gap-1.5"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Configure Limits
            </Button>
          )}
        </div>
      </div>

      {/* ── Live Parameters Grid ───────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PARAMETERS.map((param) => {
          const value = latestReading[param.key] as number;
          const prevValue = previousReading
            ? (previousReading[param.key] as number)
            : undefined;
          const exceeded = isValueExceeded(value, param.id, limitsData);

          return (
            <Card
              key={param.id}
              className={cn(
                'border-l-4 transition-all duration-300 hover:shadow-md',
                ACCENT_BORDER[param.id],
                exceeded && 'ring-2 ring-destructive/40 bg-destructive/5',
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    {/* Parameter name */}
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {param.name}
                    </p>

                    {/* Value */}
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={cn(
                          'text-2xl font-bold tabular-nums tracking-tight',
                          exceeded
                            ? 'text-destructive'
                            : 'text-card-foreground',
                        )}
                      >
                        {formatNumber(value, param.decimals)}
                      </span>
                      {param.unit && (
                        <span className="text-sm font-medium text-muted-foreground">
                          {param.unit}
                        </span>
                      )}
                    </div>

                    {/* Trend */}
                    <div className="flex items-center gap-2">
                      <TrendArrow current={value} previous={prevValue} />
                      {exceeded && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          {exceeded === 'high' ? 'HIGH' : 'LOW'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Icon */}
                  <div
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
                      param.accentBg,
                    )}
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={param.accent}
                    >
                      <path d={param.iconPath} />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Timeframe Selector + Chart ─────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Parameter History</CardTitle>
              <CardDescription>
                Historical trends for all meter parameters
              </CardDescription>
            </div>

            <Tabs
              value={selectedTimeframe}
              onValueChange={(v) => setSelectedTimeframe(v as MeterTimeframe)}
            >
              <TabsList>
                <TabsTrigger value="1h">1h</TabsTrigger>
                <TabsTrigger value="6h">6h</TabsTrigger>
                <TabsTrigger value="24h">24h</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent>
          {isHistoryLoading ? (
            <div className="flex h-[400px] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Spinner className="h-6 w-6 text-primary" />
                <p className="text-sm text-muted-foreground">
                  Loading chart data...
                </p>
              </div>
            </div>
          ) : chartReadings.length > 0 ? (
            <MeterChart
              data={chartReadings}
              timeframe={selectedTimeframe}
              height={400}
              className="mt-2"
            />
          ) : (
            <div className="flex h-[400px] flex-col items-center justify-center gap-3">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground/50"
              >
                <path d="M3 12h4l3-9 4 18 3-9h4" />
              </svg>
              <p className="text-sm text-muted-foreground">
                No historical data available for this timeframe
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Recent Readings Table ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Readings</CardTitle>
              <CardDescription>
                Latest {tableReadings.length} readings with limit indicators
              </CardDescription>
            </div>
            <Badge variant="outline" className="tabular-nums">
              {historyData?.pagination?.total ?? 0} total
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {isHistoryLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[140px]">Time (IST)</TableHead>
                    <TableHead className="text-right">
                      <span className="text-amber-500">Voltage</span>
                      <span className="ml-1 text-xs text-muted-foreground">V</span>
                    </TableHead>
                    <TableHead className="text-right">
                      <span className="text-cyan-500">Current</span>
                      <span className="ml-1 text-xs text-muted-foreground">A</span>
                    </TableHead>
                    <TableHead className="text-right">
                      <span className="text-emerald-500">Freq</span>
                      <span className="ml-1 text-xs text-muted-foreground">Hz</span>
                    </TableHead>
                    <TableHead className="text-right">
                      <span className="text-violet-500">PF</span>
                    </TableHead>
                    <TableHead className="text-right">
                      <span className="text-rose-500">Energy</span>
                      <span className="ml-1 text-xs text-muted-foreground">kWh</span>
                    </TableHead>
                    <TableHead className="text-right">
                      <span className="text-orange-500">Power</span>
                      <span className="ml-1 text-xs text-muted-foreground">kW</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {tableReadings.length === 0 ? (
                    <TableEmpty
                      colSpan={7}
                      message="No recent readings available"
                    />
                  ) : (
                    tableReadings.map((reading, index) => {
                      // Check if any param in this row exceeds limits
                      const rowHasExceeded = PARAMETERS.some(
                        (p) =>
                          isValueExceeded(
                            reading[p.key] as number,
                            p.id,
                            limitsData,
                          ) !== false,
                      );

                      return (
                        <TableRow
                          key={`${reading.meter_id}-${index}`}
                          className={cn(
                            rowHasExceeded && 'bg-destructive/5 hover:bg-destructive/10',
                          )}
                        >
                          <TableCell className="font-medium text-muted-foreground tabular-nums">
                            {formatTimeIST(reading.created_at)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-right tabular-nums',
                              isValueExceeded(reading.voltage, 'voltage', limitsData)
                                ? 'font-semibold text-destructive'
                                : 'text-card-foreground',
                            )}
                          >
                            {formatNumber(reading.voltage, 1)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-right tabular-nums',
                              isValueExceeded(reading.current, 'current', limitsData)
                                ? 'font-semibold text-destructive'
                                : 'text-card-foreground',
                            )}
                          >
                            {formatNumber(reading.current, 1)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-right tabular-nums',
                              isValueExceeded(reading.frequency, 'frequency', limitsData)
                                ? 'font-semibold text-destructive'
                                : 'text-card-foreground',
                            )}
                          >
                            {formatNumber(reading.frequency, 1)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-right tabular-nums',
                              isValueExceeded(reading.pf, 'pf', limitsData)
                                ? 'font-semibold text-destructive'
                                : 'text-card-foreground',
                            )}
                          >
                            {formatNumber(reading.pf, 2)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-right tabular-nums',
                              isValueExceeded(reading.energy, 'energy', limitsData)
                                ? 'font-semibold text-destructive'
                                : 'text-card-foreground',
                            )}
                          >
                            {formatNumber(reading.energy, 1)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-right tabular-nums',
                              isValueExceeded(reading.power, 'power', limitsData)
                                ? 'font-semibold text-destructive'
                                : 'text-card-foreground',
                            )}
                          >
                            {formatNumber(reading.power, 1)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Table footer note */}
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Values highlighted in red exceed their configured limits.
            {isAdmin && ' Click "Configure Limits" to adjust thresholds.'}
          </p>
        </CardContent>
      </Card>

      {/* ── Admin: Configure Limits Modal ──────────────────────── */}
      {isAdmin && (
        <ConfigureLimitsModal
          open={showLimitModal}
          onOpenChange={setShowLimitModal}
          limits={limitsData}
        />
      )}
    </div>
  );
}
