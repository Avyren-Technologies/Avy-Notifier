'use client';

import React, { useState, useCallback } from 'react';
import {
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
} from './ui/modal';
import { cn } from '../lib/utils';

/* ------------------------------------------------------------------
 * Types
 * ----------------------------------------------------------------*/

export type ReportFormat = 'excel' | 'pdf';

export interface ReportTimeRange {
  startDate: Date;
  endDate: Date;
}

export enum ColumnGrouping {
  NEWEST_FIRST = 'newest_first',
  OLDEST_FIRST = 'oldest_first',
  BY_TYPE = 'by_type',
  BY_ZONE = 'by_zone',
}

export interface ReportFilters {
  alarmTypes: string[];
  severityLevels: string[];
  zones: string[];
  grouping: ColumnGrouping;
  includeThresholds: boolean;
  includeStatusFields: boolean;
  shouldSplit?: boolean;
}

interface ReportGeneratorProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (
    format: ReportFormat,
    timeRange: ReportTimeRange,
    filters: ReportFilters
  ) => Promise<string>;
  defaultTimeRange?: ReportTimeRange;
}

/* ------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------*/

function toLocalDatetimeStr(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const ALARM_TYPES = [
  { id: 'temperature', label: 'Temperature' },
  { id: 'carbon', label: 'Carbon' },
  { id: 'oil', label: 'Oil' },
  { id: 'fan', label: 'Fan' },
  { id: 'conveyor', label: 'Conveyor' },
] as const;

const SEVERITY_OPTIONS = [
  { id: 'critical', label: 'Critical' },
  { id: 'warning', label: 'Warning' },
] as const;

const ZONE_OPTIONS = [
  { id: 'zone1', label: 'Zone 1' },
  { id: 'zone2', label: 'Zone 2' },
] as const;

const GROUPING_OPTIONS = [
  { id: ColumnGrouping.NEWEST_FIRST, label: 'Newest First' },
  { id: ColumnGrouping.OLDEST_FIRST, label: 'Oldest First' },
  { id: ColumnGrouping.BY_TYPE, label: 'By Type' },
  { id: ColumnGrouping.BY_ZONE, label: 'By Zone' },
] as const;

/* ------------------------------------------------------------------
 * Filter Chip
 * ----------------------------------------------------------------*/

function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium',
        'border-2 transition-all duration-200',
        selected
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:border-muted-foreground/30'
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------
 * Component
 * ----------------------------------------------------------------*/

export function ReportGenerator({
  open,
  onClose,
  onGenerate,
  defaultTimeRange,
}: ReportGeneratorProps) {
  // Format
  const [format, setFormat] = useState<ReportFormat>('excel');

  // Time range
  const [startDate, setStartDate] = useState<string>(
    toLocalDatetimeStr(defaultTimeRange?.startDate ?? new Date(Date.now() - 1 * 60 * 60 * 1000))
  );
  const [endDate, setEndDate] = useState<string>(
    toLocalDatetimeStr(defaultTimeRange?.endDate ?? new Date())
  );

  // Filters
  const [alarmTypes, setAlarmTypes] = useState<string[]>([]);
  const [severityLevels, setSeverityLevels] = useState<string[]>([]);
  const [zones, setZones] = useState<string[]>([]);
  const [grouping, setGrouping] = useState<ColumnGrouping>(ColumnGrouping.NEWEST_FIRST);
  const [includeThresholds, setIncludeThresholds] = useState(true);
  const [includeStatusFields, setIncludeStatusFields] = useState(true);

  // State
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const toggleItem = useCallback((setter: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setter((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  }, []);

  const handleGenerate = useCallback(async (shouldSplit = false) => {
    setError('');

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setError('Please enter valid dates.');
      return;
    }
    if (end <= start) {
      setError('End date must be after start date.');
      return;
    }

    // Check for large time range
    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (diffHours > 2 && !shouldSplit) {
      const proceed = window.confirm(
        `You've selected ${diffHours.toFixed(1)} hours of data. This will be split into multiple reports for optimal performance.\n\nProceed with split reports?`
      );
      if (!proceed) return;
      return handleGenerate(true);
    }

    try {
      setIsGenerating(true);
      await onGenerate(
        format,
        { startDate: start, endDate: end },
        {
          alarmTypes,
          severityLevels,
          zones,
          grouping,
          includeThresholds,
          includeStatusFields,
          shouldSplit,
        }
      );
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to generate report.');
    } finally {
      setIsGenerating(false);
    }
  }, [startDate, endDate, format, alarmTypes, severityLevels, zones, grouping, includeThresholds, includeStatusFields, onGenerate, onClose]);

  return (
    <Modal open={open} onOpenChange={(v) => !v && onClose()}>
      <ModalContent className="max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <ModalHeader>
          <ModalTitle>Generate Furnace Report</ModalTitle>
        </ModalHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-1 scrollbar-thin py-2">
          {/* Format Selection */}
          <section>
            <h4 className="text-sm font-semibold text-foreground mb-2">Report Format</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-all duration-200',
                  format === 'excel'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50'
                )}
                onClick={() => setFormat('excel')}
              >
                <FileSpreadsheet className="h-5 w-5" />
                Excel (.xlsx)
              </button>
              <button
                type="button"
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium',
                  'border-border bg-muted/20 text-muted-foreground/50 cursor-not-allowed opacity-50'
                )}
                disabled
                title="PDF generation coming soon"
              >
                <FileText className="h-5 w-5" />
                PDF (Coming Soon)
              </button>
            </div>
          </section>

          {/* Date Range */}
          <section>
            <h4 className="text-sm font-semibold text-foreground mb-2">Date & Time Range</h4>

            {/* Warning */}
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                SCADA Data: Recommended maximum 30 minutes to 2 hours (~3,600 records/hour).
              </p>
            </div>

            {/* Recommendations */}
            <div className="mb-3 rounded-lg border border-border/50 bg-muted/20 p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1">
                <Info className="h-3 w-3" /> Recommended Time Ranges
              </p>
              <p className="text-emerald-600 dark:text-emerald-400">30 min: Fast & Reliable (~1,800 records)</p>
              <p className="text-emerald-600 dark:text-emerald-400">1 hour: Good Performance (~3,600 records)</p>
              <p className="text-amber-600 dark:text-amber-400">2 hours: Slower but works (~7,200 records)</p>
              <p className="text-red-600 dark:text-red-400">3+ hours: May hit Excel limits</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Start</label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={toLocalDatetimeStr(new Date())}
                  className={cn(
                    'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm',
                    'text-foreground transition-colors duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    '[color-scheme:dark] dark:[color-scheme:dark] [color-scheme:light] light:[color-scheme:light]'
                  )}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">End</label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  max={toLocalDatetimeStr(new Date())}
                  className={cn(
                    'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm',
                    'text-foreground transition-colors duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    '[color-scheme:dark] dark:[color-scheme:dark] [color-scheme:light] light:[color-scheme:light]'
                  )}
                />
              </div>
            </div>
          </section>

          {/* Alarm Type Filters */}
          <section>
            <h4 className="text-sm font-semibold text-foreground mb-2">
              Alarm Types
              {alarmTypes.length === 0 && (
                <span className="ml-1 font-normal text-xs text-muted-foreground">(All)</span>
              )}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {ALARM_TYPES.map((t) => (
                <FilterChip
                  key={t.id}
                  label={t.label}
                  selected={alarmTypes.includes(t.id)}
                  onClick={() => toggleItem(setAlarmTypes, t.id)}
                />
              ))}
            </div>
          </section>

          {/* Severity Filters */}
          <section>
            <h4 className="text-sm font-semibold text-foreground mb-2">
              Severity
              {severityLevels.length === 0 && (
                <span className="ml-1 font-normal text-xs text-muted-foreground">(All)</span>
              )}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {SEVERITY_OPTIONS.map((s) => (
                <FilterChip
                  key={s.id}
                  label={s.label}
                  selected={severityLevels.includes(s.id)}
                  onClick={() => toggleItem(setSeverityLevels, s.id)}
                />
              ))}
            </div>
          </section>

          {/* Zone Filters */}
          <section>
            <h4 className="text-sm font-semibold text-foreground mb-2">
              Zones
              {zones.length === 0 && (
                <span className="ml-1 font-normal text-xs text-muted-foreground">(All)</span>
              )}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {ZONE_OPTIONS.map((z) => (
                <FilterChip
                  key={z.id}
                  label={z.label}
                  selected={zones.includes(z.id)}
                  onClick={() => toggleItem(setZones, z.id)}
                />
              ))}
            </div>
          </section>

          {/* Grouping */}
          {format === 'excel' && (
            <section>
              <h4 className="text-sm font-semibold text-foreground mb-2">Data Grouping</h4>
              <div className="flex flex-wrap gap-1.5">
                {GROUPING_OPTIONS.map((g) => (
                  <FilterChip
                    key={g.id}
                    label={g.label}
                    selected={grouping === g.id}
                    onClick={() => setGrouping(g.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Additional Options */}
          {format === 'excel' && (
            <section>
              <h4 className="text-sm font-semibold text-foreground mb-3">Additional Options</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-3">
                  <label htmlFor="include-thresholds" className="text-sm text-foreground cursor-pointer">
                    Include Threshold Values
                  </label>
                  <Switch
                    id="include-thresholds"
                    checked={includeThresholds}
                    onCheckedChange={setIncludeThresholds}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-3">
                  <label htmlFor="include-status" className="text-sm text-foreground cursor-pointer">
                    Include Status Fields
                  </label>
                  <Switch
                    id="include-status"
                    checked={includeStatusFields}
                    onCheckedChange={setIncludeStatusFields}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <ModalFooter className="mt-4 pt-4 border-t border-border/50">
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button
            onClick={() => handleGenerate(false)}
            loading={isGenerating}
            className={cn(
              format === 'excel'
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-red-600 text-white hover:bg-red-700'
            )}
          >
            Generate {format === 'excel' ? 'Excel' : 'PDF'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default ReportGenerator;
