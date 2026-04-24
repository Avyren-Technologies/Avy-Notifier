'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  Clock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  History,
  SlidersHorizontal,
  ArrowUpDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge, alarmSeverityToBadge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { AlarmCard } from '../../components/alarm-card';
import { AlarmDetailsModal } from '../../components/alarm-details-modal';
import {
  useAlarmHistory,
  useAlarmConfigurations,
  useUpdateAlarmStatus,
} from '../../hooks/use-alarms';
import type { Alarm, AlarmStatus } from '../../types/alarm';
import { formatFullDateTimeIST } from '../../lib/timezone';
import { cn } from '../../lib/utils';

// ─── Constants ─────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Acknowledged', value: 'acknowledged' },
  { label: 'Resolved', value: 'resolved' },
] as const;

const SORT_OPTIONS = [
  { label: 'Newest First', value: 'desc' },
  { label: 'Oldest First', value: 'asc' },
] as const;

const PAGE_SIZES = [10, 20, 50, 100] as const;

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatZone(zone?: string): string {
  if (!zone) return '';
  if (zone === 'zone1') return 'Zone 1';
  if (zone === 'zone2') return 'Zone 2';
  return zone;
}

// ─── Sub-components ────────────────────────────────────────────────────────

function AlarmTableRow({
  alarm,
  onClick,
}: {
  alarm: Alarm;
  onClick: () => void;
}) {
  const statusColor = {
    active: 'text-red-600 dark:text-red-400',
    acknowledged: 'text-amber-600 dark:text-amber-400',
    resolved: 'text-emerald-600 dark:text-emerald-400',
  }[alarm.status] ?? 'text-muted-foreground';

  const statusBg = {
    active: 'bg-red-500/10',
    acknowledged: 'bg-amber-500/10',
    resolved: 'bg-emerald-500/10',
  }[alarm.status] ?? 'bg-muted';

  let formattedTime = '';
  try {
    formattedTime = formatFullDateTimeIST(alarm.timestamp);
  } catch {
    formattedTime = 'Unknown';
  }

  return (
    <tr
      className="group cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/30"
      onClick={onClick}
    >
      {/* Description */}
      <td className="px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-card-foreground group-hover:text-primary transition-colors">
            {alarm.description}
          </p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            {alarm.zone && <span>{formatZone(alarm.zone)}</span>}
            {alarm.alarmType && (
              <span className="capitalize">{alarm.alarmType}</span>
            )}
          </div>
        </div>
      </td>

      {/* Severity */}
      <td className="px-4 py-3">
        <Badge
          variant={alarmSeverityToBadge(alarm.severity)}
          className="text-[10px]"
        >
          {alarm.severity.charAt(0).toUpperCase() + alarm.severity.slice(1)}
        </Badge>
      </td>

      {/* Type */}
      <td className="hidden px-4 py-3 md:table-cell">
        <span className="text-sm capitalize text-muted-foreground">
          {alarm.type}
        </span>
      </td>

      {/* Value */}
      <td className="hidden px-4 py-3 lg:table-cell">
        <span className="text-sm tabular-nums text-card-foreground">
          {alarm.value}
          {alarm.unit ?? ''}
        </span>
        {alarm.setPoint && (
          <span className="ml-1 text-xs text-muted-foreground">
            / SP: {alarm.setPoint}
          </span>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
            statusBg,
            statusColor
          )}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              alarm.status === 'active' && 'bg-red-500 animate-pulse',
              alarm.status === 'acknowledged' && 'bg-amber-500',
              alarm.status === 'resolved' && 'bg-emerald-500'
            )}
          />
          {alarm.status.charAt(0).toUpperCase() + alarm.status.slice(1)}
        </span>
      </td>

      {/* Timestamp */}
      <td className="hidden px-4 py-3 xl:table-cell">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3 shrink-0" />
          <span>{formattedTime}</span>
        </div>
      </td>
    </tr>
  );
}

function PaginationControls({
  page,
  totalPages,
  onPageChange,
  total,
  limit,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total: number;
  limit: number;
}) {
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  // Generate page numbers to display
  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('ellipsis');
      const rangeStart = Math.max(2, page - 1);
      const rangeEnd = Math.min(totalPages - 1, page + 1);
      for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  }, [page, totalPages]);

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        Showing{' '}
        <span className="font-medium text-card-foreground">
          {start}-{end}
        </span>{' '}
        of{' '}
        <span className="font-medium text-card-foreground">{total}</span>{' '}
        alarms
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pageNumbers.map((p, idx) =>
          p === 'ellipsis' ? (
            <span
              key={`ellipsis-${idx}`}
              className="px-1.5 text-sm text-muted-foreground"
            >
              ...
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="sm"
              className="h-8 w-8 p-0 text-xs"
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          )
        )}

        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-8 w-24" />
      </div>
      {/* Table skeleton */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="hidden h-4 w-20 md:block" />
                <Skeleton className="hidden h-4 w-24 lg:block" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="hidden h-4 w-32 xl:block" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function AlarmHistoryPage() {
  // ── State ─────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [selectedAlarm, setSelectedAlarm] = useState<Alarm | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // ── Data hooks ────────────────────────────────────────────────────
  const {
    data: historyData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useAlarmHistory({
    page: currentPage,
    limit: pageSize,
    status: statusFilter,
    search: searchQuery || undefined,
    sortBy: 'timestamp',
    sortOrder,
  });

  const { data: configData } = useAlarmConfigurations();
  const updateStatus = useUpdateAlarmStatus();

  // ── Derived data ──────────────────────────────────────────────────

  interface AlarmHistoryRecord {
    analogAlarms?: Alarm[];
    binaryAlarms?: Alarm[];
    timestamp: string;
    id: string;
  }

  const allAlarms: Alarm[] = useMemo(() => {
    if (!historyData?.alarms) return [];

    const alarms: Alarm[] = [];
    historyData.alarms.forEach((record: AlarmHistoryRecord) => {
      if (record.analogAlarms) {
        alarms.push(
          ...record.analogAlarms.map((a: Alarm) => ({
            ...a,
            alarmType: 'analog' as const,
          }))
        );
      }
      if (record.binaryAlarms) {
        alarms.push(
          ...record.binaryAlarms.map((a: Alarm) => ({
            ...a,
            alarmType: 'binary' as const,
          }))
        );
      }
    });

    return alarms;
  }, [historyData]);

  const pagination = useMemo(
    () =>
      historyData?.pagination ?? {
        page: currentPage,
        pages: 1,
        total: allAlarms.length,
        limit: pageSize,
      },
    [historyData, currentPage, allAlarms.length, pageSize]
  );

  // ── Handlers ──────────────────────────────────────────────────────

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
      setCurrentPage(1);
    },
    []
  );

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  }, []);

  const handleSortChange = useCallback((value: string) => {
    setSortOrder(value);
    setCurrentPage(1);
  }, []);

  const handlePageSizeChange = useCallback((value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleAlarmClick = useCallback((alarm: Alarm) => {
    setSelectedAlarm(alarm);
    setDetailsOpen(true);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setDetailsOpen(false);
    setSelectedAlarm(null);
  }, []);

  const handleAcknowledge = useCallback(() => {
    if (!selectedAlarm) return;
    updateStatus.mutate(
      { id: selectedAlarm.id, status: 'acknowledged' as AlarmStatus },
      {
        onSuccess: () => {
          refetch();
          handleCloseDetails();
        },
      }
    );
  }, [selectedAlarm, updateStatus, refetch, handleCloseDetails]);

  const handleResolve = useCallback(() => {
    if (!selectedAlarm) return;
    updateStatus.mutate(
      { id: selectedAlarm.id, status: 'resolved' as AlarmStatus },
      {
        onSuccess: () => {
          refetch();
          handleCloseDetails();
        },
      }
    );
  }, [selectedAlarm, updateStatus, refetch, handleCloseDetails]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // ── Count active alarms ───────────────────────────────────────────

  const activeCount = useMemo(
    () => allAlarms.filter((a) => a.status === 'active').length,
    [allAlarms]
  );

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Alarm History
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse past alarms and events
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              {activeCount} Active
            </Badge>
          )}
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

      {/* ── Controls ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {/* Search + Sort row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search alarms..."
              value={searchQuery}
              onChange={handleSearch}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={sortOrder} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[150px] h-10">
                <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={pageSize.toString()}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="w-[90px] h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}/pg
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Status filter tabs */}
        <Tabs value={statusFilter} onValueChange={handleStatusChange}>
          <TabsList>
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="px-4">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* ── Loading state ───────────────────────────────────────────── */}
      {isLoading && <LoadingSkeleton />}

      {/* ── Error state ─────────────────────────────────────────────── */}
      {error && !isLoading && (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <div className="text-center">
              <p className="font-semibold text-card-foreground">
                Failed to Load Alarm History
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Please check your connection and try again.
              </p>
            </div>
            <Button variant="outline" onClick={handleRefresh}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {!isLoading && !error && allAlarms.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <History className="h-10 w-10 text-muted-foreground" />
            <div className="text-center">
              <p className="font-semibold text-card-foreground">
                No Alarms Found
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchQuery
                  ? `No alarms match "${searchQuery}". Try a different search term.`
                  : statusFilter !== 'all'
                  ? `No ${statusFilter} alarms found. Try a different filter.`
                  : 'No alarm history data available.'}
              </p>
            </div>
            {(searchQuery || statusFilter !== 'all') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setCurrentPage(1);
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Data table ──────────────────────────────────────────────── */}
      {!isLoading && !error && allAlarms.length > 0 && (
        <>
          {/* Desktop table view */}
          <Card className="hidden md:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Severity
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                      Type
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
                      Value
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground xl:table-cell">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {allAlarms.map((alarm, idx) => (
                    <AlarmTableRow
                      key={alarm.id || idx}
                      alarm={alarm}
                      onClick={() => handleAlarmClick(alarm)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile card view */}
          <div className="space-y-3 md:hidden">
            {allAlarms.map((alarm, idx) => (
              <AlarmCard
                key={alarm.id || idx}
                alarm={alarm}
                onPress={() => handleAlarmClick(alarm)}
                onAcknowledge={
                  alarm.status === 'active'
                    ? () => {
                        setSelectedAlarm(alarm);
                        updateStatus.mutate(
                          {
                            id: alarm.id,
                            status: 'acknowledged' as AlarmStatus,
                          },
                          { onSuccess: () => refetch() }
                        );
                      }
                    : undefined
                }
                onResolve={
                  alarm.status !== 'resolved'
                    ? () => {
                        setSelectedAlarm(alarm);
                        updateStatus.mutate(
                          {
                            id: alarm.id,
                            status: 'resolved' as AlarmStatus,
                          },
                          { onSuccess: () => refetch() }
                        );
                      }
                    : undefined
                }
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <PaginationControls
              page={pagination.page}
              totalPages={pagination.pages}
              onPageChange={handlePageChange}
              total={pagination.total}
              limit={pagination.limit}
            />
          )}
        </>
      )}

      {/* ── Detail Modal ────────────────────────────────────────────── */}
      <AlarmDetailsModal
        alarm={selectedAlarm}
        open={detailsOpen}
        onClose={handleCloseDetails}
        onAcknowledge={
          selectedAlarm?.status === 'active' ? handleAcknowledge : undefined
        }
        onResolve={
          selectedAlarm?.status !== 'resolved' ? handleResolve : undefined
        }
      />
    </div>
  );
}
