'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap,
  Battery,
  ChevronRight,
  RefreshCw,
  Info,
  Pencil,
  ArrowUpDown,
  Gauge,
  Activity,
  Waves,
  TrendingUp,
  BatteryCharging,
  CircuitBoard,
} from 'lucide-react';
import { useAuth } from '../../../context/auth-context';
import { useMeterLimits, useUpdateMeterLimit } from '../../../hooks/use-meter-readings';
import type { MeterLimit } from '../../../types/meter';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Skeleton } from '../../../components/ui/skeleton';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
} from '../../../components/ui/modal';
import { cn } from '../../../lib/utils';

// ─── Parameter visual config ─────────────────────────────────────────────────

const PARAMETER_CONFIG: Record<
  string,
  {
    icon: React.ElementType;
    color: string;
    gradient: string;
    bgTint: string;
    accentBorder: string;
  }
> = {
  voltage: {
    icon: Zap,
    color: 'text-amber-500',
    gradient: 'from-amber-500/20 to-amber-600/5',
    bgTint: 'bg-amber-500/10',
    accentBorder: 'border-l-amber-500',
  },
  current: {
    icon: Activity,
    color: 'text-cyan-500',
    gradient: 'from-cyan-500/20 to-cyan-600/5',
    bgTint: 'bg-cyan-500/10',
    accentBorder: 'border-l-cyan-500',
  },
  frequency: {
    icon: Waves,
    color: 'text-emerald-500',
    gradient: 'from-emerald-500/20 to-emerald-600/5',
    bgTint: 'bg-emerald-500/10',
    accentBorder: 'border-l-emerald-500',
  },
  power: {
    icon: TrendingUp,
    color: 'text-orange-500',
    gradient: 'from-orange-500/20 to-orange-600/5',
    bgTint: 'bg-orange-500/10',
    accentBorder: 'border-l-orange-500',
  },
  energy: {
    icon: BatteryCharging,
    color: 'text-rose-500',
    gradient: 'from-rose-500/20 to-rose-600/5',
    bgTint: 'bg-rose-500/10',
    accentBorder: 'border-l-rose-500',
  },
  pf: {
    icon: CircuitBoard,
    color: 'text-violet-500',
    gradient: 'from-violet-500/20 to-violet-600/5',
    bgTint: 'bg-violet-500/10',
    accentBorder: 'border-l-violet-500',
  },
};

function getParamConfig(parameter: string) {
  return (
    PARAMETER_CONFIG[parameter] ?? {
      icon: Gauge,
      color: 'text-muted-foreground',
      gradient: 'from-muted/20 to-muted/5',
      bgTint: 'bg-muted/10',
      accentBorder: 'border-l-muted-foreground',
    }
  );
}

// ─── Limit Card ──────────────────────────────────────────────────────────────

function LimitCard({
  limit,
  onEdit,
}: {
  limit: MeterLimit;
  onEdit: (limit: MeterLimit) => void;
}) {
  const config = getParamConfig(limit.parameter);
  const Icon = config.icon;

  return (
    <button
      onClick={() => onEdit(limit)}
      className={cn(
        'group relative flex w-full items-center gap-4 rounded-xl border border-border/60 p-4',
        'border-l-[3px] transition-all duration-200',
        'hover:border-border hover:shadow-md hover:shadow-black/5',
        'dark:hover:shadow-black/20',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        config.accentBorder,
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
          config.bgTint,
        )}
      >
        <Icon className={cn('h-5 w-5', config.color)} />
      </div>

      {/* Info */}
      <div className="flex-1 text-left">
        <h3 className="text-[15px] font-semibold text-foreground">
          {limit.description}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
          <span>
            High Limit:{' '}
            <span className="font-semibold text-foreground">
              {limit.highLimit} {limit.unit}
            </span>
          </span>
          {limit.lowLimit !== null && (
            <>
              <span className="hidden text-border sm:inline">|</span>
              <span>
                Low Limit:{' '}
                <span className="font-semibold text-foreground">
                  {limit.lowLimit} {limit.unit}
                </span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Edit indicator */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          'bg-muted/50 text-muted-foreground',
          'transition-all duration-200',
          'group-hover:bg-primary/10 group-hover:text-primary',
        )}
      >
        <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  iconColor,
  children,
}: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2.5">
        <Icon className={cn('h-[18px] w-[18px]', iconColor)} />
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </h2>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MeterLimitsPage() {
  const { authState } = useAuth();
  const router = useRouter();
  const isAdmin =
    authState?.user?.role === 'ADMIN' ||
    authState?.user?.role === 'SUPER_ADMIN';

  // ── Fetch limits ──────────────────────────────────────────────────────────
  const { data: limits, isLoading, isError, refetch } = useMeterLimits();
  const updateMutation = useUpdateMeterLimit();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Edit state ────────────────────────────────────────────────────────────
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingLimit, setEditingLimit] = useState<MeterLimit | null>(null);
  const [editHighLimit, setEditHighLimit] = useState('');
  const [editLowLimit, setEditLowLimit] = useState('');
  const [editErrors, setEditErrors] = useState<{ high?: string; low?: string }>(
    {},
  );

  // ── Guard: admin-only ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!authState.isLoading && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [authState.isLoading, isAdmin, router]);

  // ── Group limits ──────────────────────────────────────────────────────────
  const electricalParams = useMemo(
    () =>
      limits?.filter((l) =>
        ['voltage', 'current', 'frequency'].includes(l.parameter),
      ) ?? [],
    [limits],
  );

  const powerParams = useMemo(
    () =>
      limits?.filter((l) =>
        ['power', 'energy', 'pf'].includes(l.parameter),
      ) ?? [],
    [limits],
  );

  const otherParams = useMemo(
    () =>
      limits?.filter(
        (l) =>
          !['voltage', 'current', 'frequency', 'power', 'energy', 'pf'].includes(
            l.parameter,
          ),
      ) ?? [],
    [limits],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleEdit = useCallback((limit: MeterLimit) => {
    setEditingLimit(limit);
    setEditHighLimit(limit.highLimit.toString());
    setEditLowLimit(limit.lowLimit?.toString() ?? '');
    setEditErrors({});
    setEditModalOpen(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const handleSave = useCallback(() => {
    const errors: { high?: string; low?: string } = {};
    const high = parseFloat(editHighLimit);
    const low = editLowLimit.trim() ? parseFloat(editLowLimit) : null;

    if (isNaN(high)) {
      errors.high = 'Please enter a valid number';
    }
    if (editLowLimit.trim() && low !== null && isNaN(low)) {
      errors.low = 'Please enter a valid number';
    }
    if (high && low !== null && !isNaN(low) && low >= high) {
      errors.low = 'Low limit must be less than high limit';
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    if (editingLimit) {
      const values: { highLimit?: number; lowLimit?: number } = {
        highLimit: high,
      };
      if (low !== null) values.lowLimit = low;

      updateMutation.mutate(
        { id: editingLimit.id, values },
        {
          onSuccess: () => {
            setEditModalOpen(false);
            setEditingLimit(null);
          },
        },
      );
    }
  }, [editHighLimit, editLowLimit, editingLimit, updateMutation]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-8 p-6">
        <div>
          <Skeleton className="h-7 w-44" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-5 w-48" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-5 w-40" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-5 p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <Zap className="h-8 w-8 text-destructive" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">
            Error Loading Limits
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Could not fetch parameter limits. Please try again.
          </p>
        </div>
        <Button onClick={handleRefresh} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Parameter Limits
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure thresholds for meter readings
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw
            className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')}
          />
          Refresh
        </Button>
      </div>

      {/* ── Electrical Parameters ───────────────────────────────────────── */}
      {electricalParams.length > 0 && (
        <Section
          title="Electrical Parameters"
          icon={Zap}
          iconColor="text-amber-500"
        >
          {electricalParams.map((limit) => (
            <LimitCard key={limit.id} limit={limit} onEdit={handleEdit} />
          ))}
        </Section>
      )}

      {/* ── Power Parameters ────────────────────────────────────────────── */}
      {powerParams.length > 0 && (
        <Section
          title="Power Parameters"
          icon={Battery}
          iconColor="text-emerald-500"
        >
          {powerParams.map((limit) => (
            <LimitCard key={limit.id} limit={limit} onEdit={handleEdit} />
          ))}
        </Section>
      )}

      {/* ── Other Parameters ────────────────────────────────────────────── */}
      {otherParams.length > 0 && (
        <Section
          title="Other Parameters"
          icon={ArrowUpDown}
          iconColor="text-blue-500"
        >
          {otherParams.map((limit) => (
            <LimitCard key={limit.id} limit={limit} onEdit={handleEdit} />
          ))}
        </Section>
      )}

      {/* ── Help tip ────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex gap-3.5 rounded-xl border p-4',
          'border-emerald-500/20 bg-emerald-500/5',
          'dark:border-emerald-400/15 dark:bg-emerald-400/5',
        )}
      >
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <p className="text-sm leading-relaxed text-emerald-800 dark:text-emerald-300/90">
          Configure thresholds to trigger notifications when meter readings
          exceed their limits. Tap on any parameter to edit its high and low
          limits.
        </p>
      </div>

      {/* ── Edit Modal ──────────────────────────────────────────────────── */}
      <Modal
        open={editModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditModalOpen(false);
            setEditingLimit(null);
          }
        }}
      >
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle className="flex items-center gap-2.5">
              {editingLimit && (() => {
                const cfg = getParamConfig(editingLimit.parameter);
                const Ic = cfg.icon;
                return (
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg',
                      cfg.bgTint,
                    )}
                  >
                    <Ic className={cn('h-4 w-4', cfg.color)} />
                  </span>
                );
              })()}
              Edit Limit
            </ModalTitle>
            <ModalDescription>
              {editingLimit
                ? `Configure limits for ${editingLimit.description}`
                : 'Update parameter limits'}
            </ModalDescription>
          </ModalHeader>

          <div className="mt-5 space-y-4">
            <Input
              label={`High Limit${editingLimit?.unit ? ` (${editingLimit.unit})` : ''}`}
              type="number"
              value={editHighLimit}
              onChange={(e) => {
                setEditHighLimit(e.target.value);
                if (editErrors.high)
                  setEditErrors((p) => ({ ...p, high: undefined }));
              }}
              error={editErrors.high}
              placeholder="Enter high limit"
            />
            <Input
              label={`Low Limit${editingLimit?.unit ? ` (${editingLimit.unit})` : ''}`}
              type="number"
              value={editLowLimit}
              onChange={(e) => {
                setEditLowLimit(e.target.value);
                if (editErrors.low)
                  setEditErrors((p) => ({ ...p, low: undefined }));
              }}
              error={editErrors.low}
              placeholder="Enter low limit (optional)"
            />
          </div>

          <ModalFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setEditModalOpen(false);
                setEditingLimit(null);
              }}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="gap-2"
            >
              {updateMutation.isPending && (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              )}
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
