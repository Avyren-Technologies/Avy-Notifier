'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileSpreadsheet, FileText, ArrowDown, ArrowUp } from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { Input } from './ui/input';
import { Button } from './ui/button';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
} from './ui/modal';
import { cn } from '../lib/utils';
import type { ReportFormat, ReportTimeRange, SortOrder } from '../types/meter';

/* ------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------*/

function toLocalDatetimeStr(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function convertISTToUTC(date: Date): Date {
  return new Date(date.getTime() - 5.5 * 60 * 60 * 1000);
}

/* ------------------------------------------------------------------
 * Constants
 * ----------------------------------------------------------------*/

const PARAMETERS = [
  { id: 'voltage', label: 'Voltage (V)' },
  { id: 'current', label: 'Current (A)' },
  { id: 'frequency', label: 'Frequency (Hz)' },
  { id: 'pf', label: 'Power Factor' },
  { id: 'power', label: 'Power (kW)' },
  { id: 'energy', label: 'Energy (kWh)' },
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
          ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm'
          : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:border-muted-foreground/30'
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------
 * Props
 * ----------------------------------------------------------------*/

interface MeterReportGeneratorProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (
    format: ReportFormat,
    timeRange: ReportTimeRange,
    parameters: string[],
    sortOrder?: SortOrder,
    title?: string
  ) => Promise<string>;
  defaultTimeRange?: ReportTimeRange;
}

/* ------------------------------------------------------------------
 * Component
 * ----------------------------------------------------------------*/

export function MeterReportGenerator({
  open,
  onClose,
  onGenerate,
  defaultTimeRange,
}: MeterReportGeneratorProps) {
  const [format, setFormat] = useState<ReportFormat>('excel');
  const [reportTitle, setReportTitle] = useState('Meter_Readings_Report');

  const [startDate, setStartDate] = useState(
    toLocalDatetimeStr(defaultTimeRange?.startDate ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
  );
  const [endDate, setEndDate] = useState(
    toLocalDatetimeStr(defaultTimeRange?.endDate ?? new Date())
  );

  const [selectedParameters, setSelectedParameters] = useState<string[]>([
    'voltage', 'current', 'frequency', 'pf', 'power', 'energy',
  ]);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest_first');

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  // Auto-update title from date range
  useEffect(() => {
    try {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        const sf = formatDate(s, 'MMM_d_yyyy');
        const ef = formatDate(e, 'MMM_d_yyyy');
        setReportTitle(`Meter_Readings_${sf}_to_${ef}`);
      }
    } catch {
      // keep current title
    }
  }, [startDate, endDate]);

  const toggleParameter = useCallback((param: string) => {
    setSelectedParameters((prev) =>
      prev.includes(param) ? prev.filter((p) => p !== param) : [...prev, param]
    );
  }, []);

  const handleGenerate = useCallback(async () => {
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
    if (selectedParameters.length === 0) {
      setError('Please select at least one parameter.');
      return;
    }

    try {
      setIsGenerating(true);
      const utcStart = convertISTToUTC(start);
      const utcEnd = convertISTToUTC(end);
      await onGenerate(
        format,
        { startDate: utcStart, endDate: utcEnd },
        selectedParameters,
        sortOrder,
        reportTitle
      );
      onClose();
    } catch (err: any) {
      if (!err?.handled) {
        setError(err?.message ?? 'Failed to generate report.');
      }
    } finally {
      setIsGenerating(false);
    }
  }, [startDate, endDate, selectedParameters, format, sortOrder, reportTitle, onGenerate, onClose]);

  return (
    <Modal open={open} onOpenChange={(v) => !v && onClose()}>
      <ModalContent className="max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <ModalHeader>
          <ModalTitle>Generate Meter Report</ModalTitle>
        </ModalHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-1 scrollbar-thin py-2">
          {/* Report Title */}
          <section>
            <h4 className="text-sm font-semibold text-foreground mb-2">Report Title</h4>
            <Input
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="Enter report title"
            />
          </section>

          {/* Format Selection */}
          <section>
            <h4 className="text-sm font-semibold text-foreground mb-2">Report Format</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-all duration-200',
                  format === 'excel'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
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

          {/* Date & Time Range */}
          <section>
            <h4 className="text-sm font-semibold text-foreground mb-2">Date & Time Range</h4>
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

          {/* Parameters */}
          <section>
            <h4 className="text-sm font-semibold text-foreground mb-2">
              Parameters to Include
              <span className="ml-1 font-normal text-xs text-muted-foreground">
                ({selectedParameters.length}/{PARAMETERS.length})
              </span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {PARAMETERS.map((p) => (
                <FilterChip
                  key={p.id}
                  label={p.label}
                  selected={selectedParameters.includes(p.id)}
                  onClick={() => toggleParameter(p.id)}
                />
              ))}
            </div>
          </section>

          {/* Sort Order */}
          <section>
            <h4 className="text-sm font-semibold text-foreground mb-2">Sort Order</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-all duration-200',
                  sortOrder === 'newest_first'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50'
                )}
                onClick={() => setSortOrder('newest_first')}
              >
                <ArrowDown className="h-4 w-4" />
                Newest First
              </button>
              <button
                type="button"
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-all duration-200',
                  sortOrder === 'oldest_first'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50'
                )}
                onClick={() => setSortOrder('oldest_first')}
              >
                <ArrowUp className="h-4 w-4" />
                Oldest First
              </button>
            </div>
          </section>

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
            onClick={handleGenerate}
            loading={isGenerating}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Generate {format === 'excel' ? 'Excel' : 'PDF'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default MeterReportGenerator;
