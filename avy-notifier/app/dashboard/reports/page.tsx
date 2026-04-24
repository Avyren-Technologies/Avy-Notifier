'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Share2,
  Plus,
  FileBarChart,
  RefreshCw,
  AlertCircle,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '../../components/ui/tooltip';
import { cn } from '../../lib/utils';
import { useFurnaceReports, type FurnaceReport } from '../../hooks/use-furnace-reports';
import { useMeterReports } from '../../hooks/use-meter-reports';
import type { MeterReport } from '../../types/meter';
import { ReportGenerator, type ReportFilters } from '../../components/report-generator';
import { MeterReportGenerator } from '../../components/meter-report-generator';
import { formatFullDateTimeIST } from '../../lib/timezone';

/* ------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------*/

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '--';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(1) + ' GB';
}

function formatDateRange(start: string, end: string): string {
  try {
    const s = new Date(start);
    const e = new Date(end);
    return `${formatDate(s, 'MMM d, yyyy')} - ${formatDate(e, 'MMM d, yyyy')}`;
  } catch {
    return '--';
  }
}

/* ------------------------------------------------------------------
 * Skeleton loader
 * ----------------------------------------------------------------*/

function ReportTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-lg border border-border/50 bg-card p-4"
        >
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------
 * Empty state
 * ----------------------------------------------------------------*/

function EmptyReports({ type }: { type: 'furnace' | 'meter' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div
        className={cn(
          'flex h-16 w-16 items-center justify-center rounded-2xl',
          'bg-muted/50 text-muted-foreground'
        )}
      >
        <FileBarChart className="h-8 w-8" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">
        No Reports Yet
      </h3>
      <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
        {type === 'furnace'
          ? 'Generate your first furnace alarm report using the button above.'
          : 'Generate your first meter readings report using the button above.'}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Error state
 * ----------------------------------------------------------------*/

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div
        className={cn(
          'flex h-16 w-16 items-center justify-center rounded-2xl',
          'bg-destructive/10 text-destructive'
        )}
      >
        <AlertCircle className="h-8 w-8" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">
        Error Loading Reports
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Failed to load reports. Please try again.
      </p>
      <Button variant="outline" className="mt-4" onClick={onRetry}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Furnace report row
 * ----------------------------------------------------------------*/

function FurnaceReportRow({
  report,
  onDownload,
  onShare,
}: {
  report: FurnaceReport;
  onDownload: (id: string) => void;
  onShare: (id: string) => void;
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await onDownload(report.id);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className={cn(
        'group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4',
        'rounded-lg border border-border/50 bg-card p-4',
        'transition-all duration-200 hover:border-border hover:shadow-sm'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          report.format === 'pdf'
            ? 'bg-red-500/10 text-red-500'
            : 'bg-blue-500/10 text-blue-500'
        )}
      >
        {report.format === 'pdf' ? (
          <FileText className="h-5 w-5" />
        ) : (
          <FileSpreadsheet className="h-5 w-5" />
        )}
      </div>

      {/* Title & date */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {report.title.replace(/_/g, ' ')}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatDateRange(report.startDate, report.endDate)}
        </p>
      </div>

      {/* Format badge */}
      <Badge
        variant={report.format === 'pdf' ? 'destructive' : 'info'}
        className="shrink-0 uppercase text-[10px]"
      >
        {report.format === 'pdf' ? 'PDF' : 'Excel'}
      </Badge>

      {/* File size */}
      <span className="hidden lg:block text-xs text-muted-foreground w-16 text-right">
        {formatFileSize(report.fileSize)}
      </span>

      {/* Generated At */}
      <span className="hidden md:block text-xs text-muted-foreground w-40 text-right">
        {formatFullDateTimeIST(report.createdAt)}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onShare(report.id)}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Share</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Meter report row
 * ----------------------------------------------------------------*/

function MeterReportRow({
  report,
  onDownload,
  onShare,
}: {
  report: MeterReport;
  onDownload: (id: string) => void;
  onShare: (id: string) => void;
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await onDownload(report.id);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className={cn(
        'group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4',
        'rounded-lg border border-border/50 bg-card p-4',
        'transition-all duration-200 hover:border-border hover:shadow-sm'
      )}
    >
      {/* Icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
        <FileSpreadsheet className="h-5 w-5" />
      </div>

      {/* Title & date */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {report.title.replace(/_/g, ' ')}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatDateRange(report.startDate, report.endDate)}
        </p>
      </div>

      {/* Format badge */}
      <Badge
        variant={report.format === 'pdf' ? 'destructive' : 'success'}
        className="shrink-0 uppercase text-[10px]"
      >
        {report.format === 'pdf' ? 'PDF' : 'Excel'}
      </Badge>

      {/* File size */}
      <span className="hidden lg:block text-xs text-muted-foreground w-16 text-right">
        {formatFileSize(report.fileSize)}
      </span>

      {/* Generated At */}
      <span className="hidden md:block text-xs text-muted-foreground w-40 text-right">
        {formatFullDateTimeIST(report.createdAt)}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onShare(report.id)}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Share</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Main page
 * ----------------------------------------------------------------*/

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'furnace' | 'meter'>('furnace');
  const [showFurnaceGenerator, setShowFurnaceGenerator] = useState(false);
  const [showMeterGenerator, setShowMeterGenerator] = useState(false);

  // ── Furnace reports hook ────────────────────────────────────────────────────
  const {
    reports: furnaceReports,
    isLoadingReports: isLoadingFurnace,
    isReportsError: isFurnaceError,
    isGenerating: isFurnaceGenerating,
    generateReport: generateFurnaceReport,
    openReport: openFurnaceReport,
    shareReport: shareFurnaceReport,
    refetchReports: refetchFurnaceReports,
    loadMoreReports: loadMoreFurnace,
    isLoadingMore: isLoadingMoreFurnace,
    hasNextPage: hasNextFurnacePage,
    getDefaultTimeRange: getFurnaceDefaultTimeRange,
  } = useFurnaceReports();

  // ── Meter reports hook ──────────────────────────────────────────────────────
  const {
    reports: meterReports,
    isLoadingReports: isLoadingMeter,
    isReportsError: isMeterError,
    isGenerating: isMeterGenerating,
    generateReport: generateMeterReport,
    openReport: openMeterReport,
    shareReport: shareMeterReport,
    refetchReports: refetchMeterReports,
    getDefaultTimeRange: getMeterDefaultTimeRange,
  } = useMeterReports();

  // ── Default time ranges ─────────────────────────────────────────────────────
  const furnaceDefaultRange = useMemo(
    () => getFurnaceDefaultTimeRange(),
    [getFurnaceDefaultTimeRange]
  );
  const meterDefaultRange = useMemo(
    () => getMeterDefaultTimeRange(),
    [getMeterDefaultTimeRange]
  );

  // ── Generate button handler ─────────────────────────────────────────────────
  const handleGenerateClick = useCallback(() => {
    if (activeTab === 'furnace') {
      setShowFurnaceGenerator(true);
    } else {
      setShowMeterGenerator(true);
    }
  }, [activeTab]);

  // ── Furnace generate handler ────────────────────────────────────────────────
  const handleFurnaceGenerate = useCallback(
    async (
      format: 'excel' | 'pdf',
      timeRange: { startDate: Date; endDate: Date },
      filters: ReportFilters
    ): Promise<string> => {
      const startFormatted = formatDate(timeRange.startDate, 'MMM_d_yyyy');
      const endFormatted = formatDate(timeRange.endDate, 'MMM_d_yyyy');
      const title = `Furnace_Report_${startFormatted}_to_${endFormatted}`;

      const result = await generateFurnaceReport(
        format,
        timeRange,
        filters.alarmTypes,
        filters.severityLevels,
        filters.zones,
        filters.grouping as any,
        title,
        filters.includeThresholds,
        filters.includeStatusFields
      );

      return result;
    },
    [generateFurnaceReport]
  );

  // ── Meter generate handler ──────────────────────────────────────────────────
  const handleMeterGenerate = useCallback(
    async (
      format: 'excel' | 'pdf',
      timeRange: { startDate: Date; endDate: Date },
      parameters: string[],
      sortOrder?: string,
      title?: string
    ): Promise<string> => {
      const result = await generateMeterReport(
        format as any,
        timeRange,
        parameters,
        sortOrder as any,
        title
      );
      return result || '';
    },
    [generateMeterReport]
  );

  const isGenerating = isFurnaceGenerating || isMeterGenerating;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Reports
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate, download, and share alarm and meter reports.
          </p>
        </div>

        <Button
          onClick={handleGenerateClick}
          disabled={isGenerating}
          loading={isGenerating}
          className="shrink-0"
        >
          <Plus className="mr-2 h-4 w-4" />
          Generate Report
        </Button>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'furnace' | 'meter')}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="furnace">Furnace Reports</TabsTrigger>
          <TabsTrigger value="meter">Meter Reports</TabsTrigger>
        </TabsList>

        {/* ── Furnace Tab Content ──────────────────────────────────────── */}
        <TabsContent value="furnace" className="mt-4">
          {isLoadingFurnace ? (
            <ReportTableSkeleton />
          ) : isFurnaceError ? (
            <ErrorState onRetry={refetchFurnaceReports} />
          ) : !furnaceReports || furnaceReports.length === 0 ? (
            <EmptyReports type="furnace" />
          ) : (
            <div className="space-y-2">
              {/* Column headers (desktop) */}
              <div className="hidden sm:flex items-center gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <span className="w-10" />
                <span className="flex-1">Title</span>
                <span className="w-14 text-center">Format</span>
                <span className="hidden lg:block w-16 text-right">Size</span>
                <span className="hidden md:block w-40 text-right">Generated At</span>
                <span className="w-[72px]" />
              </div>

              {/* Report rows */}
              {furnaceReports.map((report) => (
                <FurnaceReportRow
                  key={report.id}
                  report={report}
                  onDownload={openFurnaceReport}
                  onShare={shareFurnaceReport}
                />
              ))}

              {/* Load More */}
              {hasNextFurnacePage && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={loadMoreFurnace}
                    loading={isLoadingMoreFurnace}
                    disabled={isLoadingMoreFurnace}
                  >
                    <ChevronDown className="mr-2 h-4 w-4" />
                    Load More
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Meter Tab Content ────────────────────────────────────────── */}
        <TabsContent value="meter" className="mt-4">
          {isLoadingMeter ? (
            <ReportTableSkeleton />
          ) : isMeterError ? (
            <ErrorState onRetry={refetchMeterReports} />
          ) : !meterReports || meterReports.length === 0 ? (
            <EmptyReports type="meter" />
          ) : (
            <div className="space-y-2">
              {/* Column headers (desktop) */}
              <div className="hidden sm:flex items-center gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <span className="w-10" />
                <span className="flex-1">Title</span>
                <span className="w-14 text-center">Format</span>
                <span className="hidden lg:block w-16 text-right">Size</span>
                <span className="hidden md:block w-40 text-right">Generated At</span>
                <span className="w-[72px]" />
              </div>

              {/* Report rows */}
              {meterReports.map((report) => (
                <MeterReportRow
                  key={report.id}
                  report={report}
                  onDownload={openMeterReport}
                  onShare={shareMeterReport}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <ReportGenerator
        open={showFurnaceGenerator}
        onClose={() => setShowFurnaceGenerator(false)}
        onGenerate={handleFurnaceGenerate}
        defaultTimeRange={furnaceDefaultRange}
      />

      <MeterReportGenerator
        open={showMeterGenerator}
        onClose={() => setShowMeterGenerator(false)}
        onGenerate={handleMeterGenerate}
        defaultTimeRange={meterDefaultRange}
      />
    </div>
  );
}
