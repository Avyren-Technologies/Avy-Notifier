import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subDays, format as formatDate } from 'date-fns';
import type { MeterReport, MeterReportParams } from '../types/meter';
import { apiClient } from '../lib/api-client';
import { useAuth } from '../context/auth-context';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ReportTimeRange {
  startDate: Date;
  endDate: Date;
}

export interface MeterReportFilter {
  parameters?: string[];
  title?: string;
  sortOrder?: string;
}

export enum ReportFormat {
  EXCEL = 'excel',
  PDF = 'pdf',
}

export enum SortOrder {
  NEWEST_FIRST = 'newest_first',
  OLDEST_FIRST = 'oldest_first',
}

// ─── Browser download helper ────────────────────────────────────────────────

/**
 * Trigger a browser file download from a Blob.
 */
function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useMeterReports() {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReportId, setGeneratedReportId] = useState<string | null>(
    null,
  );
  const { authState } = useAuth();
  const enabled = authState.isAuthenticated && !!authState.user;

  // ── List reports ────────────────────────────────────────────────────────
  const {
    data: reports,
    isLoading: isLoadingReports,
    isError: isReportsError,
    refetch: refetchReports,
  } = useQuery<MeterReport[]>({
    queryKey: ['meterReports'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/meter/reports');
      return data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled,
  });

  // ── Generate report mutation ────────────────────────────────────────────
  const generateReportMutation = useMutation<
    MeterReport,
    Error,
    { params: MeterReportParams }
  >({
    mutationFn: async ({ params }) => {
      const { data } = await apiClient.post('/api/meter/reports', params);
      return data.data;
    },
    onSuccess: (data) => {
      setGeneratedReportId(data.id);
      queryClient.invalidateQueries({ queryKey: ['meterReports'] });
    },
  });

  // ── Generate report ─────────────────────────────────────────────────────
  const generateReport = useCallback(
    async (
      _format: ReportFormat,
      timeRange: ReportTimeRange,
      parameters: string[] = [],
      sortOrder: SortOrder = SortOrder.NEWEST_FIRST,
      title?: string,
    ): Promise<string | null> => {
      try {
        setIsGenerating(true);

        if (!timeRange || !timeRange.startDate || !timeRange.endDate) {
          throw new Error('Invalid time range provided');
        }

        if (timeRange.endDate < timeRange.startDate) {
          throw new Error('End date must be after start date');
        }

        const params: MeterReportParams = {
          startDate: timeRange.startDate,
          endDate: timeRange.endDate,
          parameters: parameters.length > 0 ? parameters : undefined,
          title:
            title ||
            `Meter_Readings_${formatDate(new Date(), 'yyyyMMdd_HHmmss')}`,
          sortOrder,
        };

        const report = await generateReportMutation.mutateAsync({ params });

        if (!report || !report.id) {
          throw new Error('Failed to generate report - no report ID returned');
        }

        return report.id;
      } catch (error) {
        console.error('Error generating report:', error);
        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    [generateReportMutation],
  );

  // ── Download / open report (browser) ────────────────────────────────────
  const openReport = useCallback(
    async (reportId: string): Promise<void> => {
      try {
        const cachedReports = queryClient.getQueryData<MeterReport[]>([
          'meterReports',
        ]);
        const reportMetadata = cachedReports?.find(
          (report) => report.id === reportId,
        );

        if (!reportMetadata) {
          throw new Error('Report metadata not found');
        }

        const response = await apiClient.get(
          `/api/meter/reports/${reportId}`,
          { responseType: 'blob' },
        );

        const contentType =
          (response.headers['content-type'] as string | undefined) ||
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        const blob = new Blob([response.data], { type: contentType });

        triggerBrowserDownload(blob, reportMetadata.fileName);
      } catch (error) {
        console.error('Error opening report:', error);
        throw error;
      }
    },
    [queryClient],
  );

  // ── Share report (download in browser context) ──────────────────────────
  const shareReport = useCallback(
    async (reportId: string): Promise<void> => {
      // On web, "share" is equivalent to downloading the file.
      await openReport(reportId);
    },
    [openReport],
  );

  // ── Default time range ──────────────────────────────────────────────────
  const getDefaultTimeRange = useCallback((): ReportTimeRange => {
    return {
      startDate: subDays(new Date(), 7),
      endDate: new Date(),
    };
  }, []);

  return {
    reports,
    isLoadingReports,
    isReportsError,
    isGenerating,
    generatedReportId,
    generateReport,
    openReport,
    shareReport,
    refetchReports,
    getDefaultTimeRange,
  };
}
