'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  Settings2,
  Wrench,
  Activity,
  Radio,
  Clock,
  Loader2,
  ServerCrash,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { useMaintenance } from '../../context/maintenance-context';
import {
  useActiveAlarms,
  useUpdateAlarmStatus,
  ALARM_KEYS,
  type ScadaAlarmResponse,
} from '../../hooks/use-alarms';
import { useSetpoints, useUpdateSetpoint, type Setpoint } from '../../hooks/use-setpoints';
import type { Alarm } from '../../types/alarm';
import { AlarmCard } from '../../components/alarm-card';
import { AlarmDetailsModal } from '../../components/alarm-details-modal';
import { ResolutionModal } from '../../components/resolution-modal';
import { SetpointConfigModal } from '../../components/setpoint-config-modal';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
import { formatTimestampWithSecondsIST } from '../../lib/timezone';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';

// ─── Types ──────────────────────────────────────────────────────────────────

type SeverityFilter = 'all' | 'critical' | 'warning' | 'info';
type ZoneTab = 'all' | 'zone1' | 'zone2';

// ─── Page Component ─────────────────────────────────────────────────────────

export default function OperatorDashboard() {
  const { authState } = useAuth();
  const { isMaintenanceMode } = useMaintenance();
  const queryClient = useQueryClient();

  const isAdmin = authState?.user?.role === 'ADMIN';
  const isSuperAdmin = authState?.user?.role === 'SUPER_ADMIN';

  // ── Data hooks ──────────────────────────────────────────────────────────────

  const {
    data: alarmData,
    isLoading,
    isError,
    error,
    refetch,
    dataUpdatedAt,
  } = useActiveAlarms();

  const updateAlarmStatus = useUpdateAlarmStatus();
  const { data: setpoints } = useSetpoints();
  const updateSetpointMutation = useUpdateSetpoint();

  // ── UI state ────────────────────────────────────────────────────────────────

  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [zoneTab, setZoneTab] = useState<ZoneTab>('all');
  const [selectedAlarm, setSelectedAlarm] = useState<Alarm | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAlarmForResolution, setSelectedAlarmForResolution] = useState<Alarm | null>(null);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [selectedSetpoint, setSelectedSetpoint] = useState<Setpoint | null>(null);
  const [showSetpointModal, setShowSetpointModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // ── Derived data ────────────────────────────────────────────────────────────

  const analogAlarms = useMemo(() => alarmData?.analogAlarms ?? [], [alarmData]);
  const binaryAlarms = useMemo(() => alarmData?.binaryAlarms ?? [], [alarmData]);

  const isScadaMaintenanceMode = useMemo(
    () => (isSuperAdmin ? false : alarmData?.maintenanceMode ?? false),
    [alarmData, isSuperAdmin],
  );

  // Counts
  const criticalCount = useMemo(
    () =>
      analogAlarms.filter((a) => a.severity === 'critical').length +
      binaryAlarms.filter((a) => a.severity === 'critical').length,
    [analogAlarms, binaryAlarms],
  );
  const warningCount = useMemo(
    () =>
      analogAlarms.filter((a) => a.severity === 'warning').length +
      binaryAlarms.filter((a) => a.severity === 'warning').length,
    [analogAlarms, binaryAlarms],
  );
  const infoCount = useMemo(
    () =>
      analogAlarms.filter((a) => a.severity === 'info').length +
      binaryAlarms.filter((a) => a.severity === 'info').length,
    [analogAlarms, binaryAlarms],
  );
  const totalActive = criticalCount + warningCount + infoCount;

  // Filtered alarms
  const filteredAnalogAlarms = useMemo(() => {
    let alarms = analogAlarms;
    if (severityFilter !== 'all') {
      alarms = alarms.filter((a) => a.severity === severityFilter);
    }
    if (zoneTab !== 'all') {
      alarms = alarms.filter((a) => a.zone === zoneTab);
    }
    return alarms;
  }, [analogAlarms, severityFilter, zoneTab]);

  const filteredBinaryAlarms = useMemo(() => {
    if (severityFilter === 'all') return binaryAlarms;
    return binaryAlarms.filter((a) => a.severity === severityFilter);
  }, [binaryAlarms, severityFilter]);

  // ── Refresh timestamp tracking ──────────────────────────────────────────────

  useEffect(() => {
    if (dataUpdatedAt) {
      setLastRefreshed(new Date(dataUpdatedAt));
    }
  }, [dataUpdatedAt]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.fetchQuery({
        queryKey: ALARM_KEYS.scada(true),
        queryFn: async () => {
          const { data } = await apiClient.get<ScadaAlarmResponse>(
            '/api/scada/alarms?force=true',
          );
          return data;
        },
      });
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Manual refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  const handleAcknowledge = useCallback(
    (id: string) => {
      updateAlarmStatus.mutate({ id, status: 'acknowledged' });
      if (selectedAlarm?.id === id) {
        setSelectedAlarm((prev) => (prev ? { ...prev, status: 'acknowledged' } : null));
      }
    },
    [updateAlarmStatus, selectedAlarm],
  );

  const handleResolveClick = useCallback((alarm: Alarm) => {
    setSelectedAlarmForResolution(alarm);
    setShowResolutionModal(true);
  }, []);

  const handleResolutionSubmit = useCallback(
    (message: string) => {
      if (!selectedAlarmForResolution) return;
      updateAlarmStatus.mutate({
        id: selectedAlarmForResolution.id,
        status: 'resolved',
        resolutionMessage: message,
      });
      setShowResolutionModal(false);
      setSelectedAlarmForResolution(null);
      if (selectedAlarm?.id === selectedAlarmForResolution.id) {
        setSelectedAlarm((prev) => (prev ? { ...prev, status: 'resolved' } : null));
      }
    },
    [selectedAlarmForResolution, updateAlarmStatus, selectedAlarm],
  );

  const handleAlarmPress = useCallback((alarm: Alarm) => {
    setSelectedAlarm(alarm);
    setShowDetailsModal(true);
  }, []);

  const handleConfigureSetpoint = useCallback(
    (alarm: Alarm) => {
      if (!isAdmin || !setpoints) return;
      const match = setpoints.find(
        (sp) => sp.name.trim().toLowerCase() === alarm.description.trim().toLowerCase(),
      );
      if (match) {
        setSelectedSetpoint(match);
        setShowSetpointModal(true);
      }
    },
    [isAdmin, setpoints],
  );

  const handleSetpointUpdate = useCallback(
    async (lowDeviation: number, highDeviation: number) => {
      if (!selectedSetpoint || !isAdmin) return;
      try {
        await updateSetpointMutation.mutateAsync({
          id: selectedSetpoint.id,
          lowDeviation,
          highDeviation,
        });
        setShowSetpointModal(false);
        setSelectedSetpoint(null);
      } catch (err) {
        console.error('Setpoint update failed:', err);
      }
    },
    [selectedSetpoint, isAdmin, updateSetpointMutation],
  );

  const handleSeverityFilter = useCallback((severity: SeverityFilter) => {
    setSeverityFilter((prev) => (prev === severity ? 'all' : severity));
  }, []);

  // ── Format last refreshed ──────────────────────────────────────────────────

  const lastRefreshedIST = useMemo(
    () => formatTimestampWithSecondsIST(lastRefreshed.toISOString()),
    [lastRefreshed],
  );

  // ── Loading state ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/25">
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Loading SCADA Alarms</p>
          <p className="mt-1 text-xs text-muted-foreground">Establishing connection to monitoring system...</p>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────

  if (isError) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10">
          <ServerCrash className="h-10 w-10 text-destructive" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">Connection Error</h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'Failed to establish connection with alarm monitoring system.'}
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry Connection
        </Button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Maintenance Alert ─────────────────────────────────────────── */}
      {!isSuperAdmin && (isScadaMaintenanceMode || isMaintenanceMode) && (
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg border px-4 py-3',
            'border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10',
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
            <Wrench className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
              SCADA Maintenance Mode Active
            </p>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/70">
              Data fetching is paused. Showing last known readings.
            </p>
          </div>
          <Badge variant="warning" className="shrink-0 text-[10px]">
            Maintenance
          </Badge>
        </div>
      )}

      {/* ── Summary Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Critical */}
        <button
          onClick={() => handleSeverityFilter('critical')}
          className="text-left"
        >
          <Card
            className={cn(
              'group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer',
              severityFilter === 'critical'
                ? 'ring-2 ring-red-500 border-red-500/50'
                : 'hover:border-red-500/30',
            )}
          >
            <div className="absolute inset-y-0 left-0 w-1 bg-red-500 transition-all duration-300 group-hover:w-1.5" />
            <div className="p-4 pl-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Critical
                  </p>
                  <p className="mt-1 text-3xl font-bold text-red-600 dark:text-red-400">
                    {criticalCount}
                  </p>
                </div>
                <div
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110',
                    'bg-red-500/10 dark:bg-red-500/15',
                    criticalCount > 0 && 'animate-pulse',
                  )}
                >
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Immediate action required
              </p>
            </div>
          </Card>
        </button>

        {/* Warning */}
        <button
          onClick={() => handleSeverityFilter('warning')}
          className="text-left"
        >
          <Card
            className={cn(
              'group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer',
              severityFilter === 'warning'
                ? 'ring-2 ring-amber-500 border-amber-500/50'
                : 'hover:border-amber-500/30',
            )}
          >
            <div className="absolute inset-y-0 left-0 w-1 bg-amber-500 transition-all duration-300 group-hover:w-1.5" />
            <div className="p-4 pl-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Warning
                  </p>
                  <p className="mt-1 text-3xl font-bold text-amber-600 dark:text-amber-400">
                    {warningCount}
                  </p>
                </div>
                <div
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110',
                    'bg-amber-500/10 dark:bg-amber-500/15',
                  )}
                >
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Monitor closely
              </p>
            </div>
          </Card>
        </button>

        {/* Info */}
        <button
          onClick={() => handleSeverityFilter('info')}
          className="text-left"
        >
          <Card
            className={cn(
              'group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer',
              severityFilter === 'info'
                ? 'ring-2 ring-emerald-500 border-emerald-500/50'
                : 'hover:border-emerald-500/30',
            )}
          >
            <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500 transition-all duration-300 group-hover:w-1.5" />
            <div className="p-4 pl-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Info
                  </p>
                  <p className="mt-1 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    {infoCount}
                  </p>
                </div>
                <div
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110',
                    'bg-emerald-500/10 dark:bg-emerald-500/15',
                  )}
                >
                  <Info className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Within normal range
              </p>
            </div>
          </Card>
        </button>

        {/* Total Active */}
        <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
          <div className="absolute inset-y-0 left-0 w-1 bg-primary transition-all duration-300 group-hover:w-1.5" />
          <div className="p-4 pl-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Total Active
                </p>
                <p className="mt-1 text-3xl font-bold text-foreground">
                  {totalActive}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                <Zap className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              All monitored alarms
            </p>
          </div>
        </Card>
      </div>

      {/* ── Controls Row ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 p-1">
          {(['all', 'critical', 'warning', 'info'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200',
                severityFilter === sev
                  ? cn(
                      'shadow-sm',
                      sev === 'all' && 'bg-card text-foreground',
                      sev === 'critical' && 'bg-red-500 text-white',
                      sev === 'warning' && 'bg-amber-500 text-white',
                      sev === 'info' && 'bg-emerald-500 text-white',
                    )
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
            >
              {sev === 'all' ? 'All' : sev.charAt(0).toUpperCase() + sev.slice(1)}
            </button>
          ))}
        </div>

        {/* Right side controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Last Refreshed */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Last refresh: {lastRefreshedIST} IST</span>
          </div>

          {/* Auto-refresh indicator */}
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px] text-muted-foreground">Auto-refresh 30s</span>
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>

          {/* Setpoint Config (Admin only) */}
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => {
                if (setpoints && setpoints.length > 0) {
                  setSelectedSetpoint(setpoints[0]);
                  setShowSetpointModal(true);
                }
              }}
            >
              <Settings2 className="h-3.5 w-3.5" />
              Setpoints
            </Button>
          )}
        </div>
      </div>

      {/* ── Analog Alarms Section ─────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
              <Activity className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Analog Alarms
              </h2>
              <p className="text-xs text-muted-foreground">
                {filteredAnalogAlarms.length} alarm{filteredAnalogAlarms.length !== 1 ? 's' : ''} &middot; Continuous threshold monitoring
              </p>
            </div>
          </div>

          {/* Zone Tabs */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
            {(['all', 'zone1', 'zone2'] as const).map((z) => (
              <button
                key={z}
                onClick={() => setZoneTab(z)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200',
                  zoneTab === z
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                )}
              >
                {z === 'all' ? 'All Zones' : z === 'zone1' ? 'Zone 1' : 'Zone 2'}
              </button>
            ))}
          </div>
        </div>

        {filteredAnalogAlarms.length === 0 ? (
          <Card className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
                <Activity className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No analog alarms</p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                {severityFilter !== 'all' || zoneTab !== 'all'
                  ? 'Try adjusting your filters'
                  : 'All parameters within normal range'}
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredAnalogAlarms.map((alarm) => (
              <AlarmCard
                key={alarm.id}
                alarm={alarm}
                onPress={() => handleAlarmPress(alarm)}
                onAcknowledge={
                  alarm.status === 'active'
                    ? () => handleAcknowledge(alarm.id)
                    : undefined
                }
                onResolve={
                  alarm.status === 'active' || alarm.status === 'acknowledged'
                    ? () => handleResolveClick(alarm)
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Binary Alarms Section ─────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
            <Radio className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Binary Alarms
            </h2>
            <p className="text-xs text-muted-foreground">
              {filteredBinaryAlarms.length} indicator{filteredBinaryAlarms.length !== 1 ? 's' : ''} &middot; Status OK/Alarm monitoring
            </p>
          </div>
        </div>

        {filteredBinaryAlarms.length === 0 ? (
          <Card className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
                <Radio className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No binary alarms</p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                {severityFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'All binary indicators normal'}
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredBinaryAlarms.map((alarm) => {
              const isNormal = alarm.value === alarm.setPoint;
              const isCritical = alarm.severity === 'critical';
              return (
                <Card
                  key={alarm.id}
                  onClick={() => handleAlarmPress(alarm)}
                  className={cn(
                    'group cursor-pointer overflow-hidden transition-all duration-300',
                    'hover:shadow-md hover:-translate-y-0.5',
                    isCritical
                      ? 'border-red-500/30 dark:border-red-500/20'
                      : 'border-border',
                  )}
                >
                  <div className="flex items-center gap-3 p-3">
                    {/* Status Dot */}
                    <div className="relative shrink-0">
                      <div
                        className={cn(
                          'h-3 w-3 rounded-full transition-all duration-300',
                          isNormal
                            ? 'bg-emerald-500 shadow-emerald-500/40 shadow-sm'
                            : 'bg-red-500 shadow-red-500/40 shadow-sm',
                          !isNormal && 'animate-pulse',
                        )}
                      />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-card-foreground group-hover:text-foreground">
                        {alarm.description}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span
                          className={cn(
                            'text-xs font-semibold',
                            isNormal
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400',
                          )}
                        >
                          {alarm.value}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          (Expected: {alarm.setPoint})
                        </span>
                        {alarm.zone && (
                          <span className="text-[10px] text-muted-foreground/70">
                            {alarm.zone === 'zone1' ? 'Z1' : 'Z2'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Severity Indicator */}
                    <Badge
                      variant={isCritical ? 'destructive' : 'success'}
                      className="shrink-0 text-[9px] px-1.5 py-0"
                    >
                      {isCritical ? 'ALARM' : 'OK'}
                    </Badge>
                  </div>

                  {/* Action Row */}
                  {(alarm.status === 'active' || alarm.status === 'acknowledged') && (
                    <div
                      className="flex items-center justify-end gap-1.5 border-t border-border/50 px-3 py-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {alarm.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 gap-1 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-500/10 dark:text-blue-400"
                          onClick={() => handleAcknowledge(alarm.id)}
                        >
                          Ack
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                        onClick={() => handleResolveClick(alarm)}
                      >
                        Resolve
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Footer Info ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-2 pb-4 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>Data refreshes every 30 seconds</span>
        <span className="text-muted-foreground/50">&middot;</span>
        <span>Last update: {lastRefreshedIST} IST</span>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────── */}

      {/* Alarm Details Modal */}
      <AlarmDetailsModal
        alarm={selectedAlarm}
        open={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedAlarm(null);
        }}
        onAcknowledge={
          selectedAlarm?.status === 'active'
            ? () => handleAcknowledge(selectedAlarm.id)
            : undefined
        }
        onResolve={
          selectedAlarm &&
          (selectedAlarm.status === 'active' || selectedAlarm.status === 'acknowledged')
            ? () => handleResolveClick(selectedAlarm)
            : undefined
        }
      />

      {/* Resolution Modal */}
      <ResolutionModal
        open={showResolutionModal}
        onClose={() => {
          setShowResolutionModal(false);
          setSelectedAlarmForResolution(null);
        }}
        onSubmit={handleResolutionSubmit}
        alarmDescription={selectedAlarmForResolution?.description ?? ''}
        loading={updateAlarmStatus.isPending}
      />

      {/* Setpoint Config Modal (Admin only) */}
      {isAdmin && selectedSetpoint && (
        <SetpointConfigModal
          open={showSetpointModal}
          onClose={() => {
            setShowSetpointModal(false);
            setSelectedSetpoint(null);
          }}
          onSubmit={handleSetpointUpdate}
          setpoint={
            selectedSetpoint
              ? {
                  id: selectedSetpoint.id,
                  name: selectedSetpoint.name,
                  lowDeviation: selectedSetpoint.lowDeviation,
                  highDeviation: selectedSetpoint.highDeviation,
                }
              : null
          }
          isSubmitting={updateSetpointMutation.isPending}
        />
      )}
    </div>
  );
}
