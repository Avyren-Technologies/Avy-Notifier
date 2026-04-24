import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { useAuth } from '../context/auth-context';
import * as XLSX from 'xlsx';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ReportTimeRange {
  startDate: Date;
  endDate: Date;
}

export type ReportFormat = 'excel' | 'pdf';
export type SortOrder = 'newest_first' | 'oldest_first';

/** Column grouping / ordering for Excel reports. */
export enum ColumnGrouping {
  NEWEST_FIRST = 'newest_first',
  OLDEST_FIRST = 'oldest_first',
}

export interface FurnaceReport {
  id: string;
  userId: string;
  title: string;
  format: string;
  fileName: string;
  fileSize: number;
  startDate: string;
  endDate: string;
  grouping: string;
  includeThresholds: boolean;
  includeStatusFields: boolean;
  alarmTypes: string[];
  severityLevels: string[];
  zones: string[];
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface PaginatedReportsResponse {
  reports: FurnaceReport[];
  pagination: {
    currentPage: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// ─── Browser download helper ────────────────────────────────────────────────

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

export function useFurnaceReports() {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [allReports, setAllReports] = useState<FurnaceReport[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { authState } = useAuth();

  // ── Fetch reports with pagination ───────────────────────────────────────
  const {
    data: reportsData,
    isLoading: isLoadingReports,
    isError: isReportsError,
    refetch: refetchReports,
  } = useQuery<PaginatedReportsResponse>({
    queryKey: ['furnaceReports', currentPage],
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/api/reports/furnace?page=${currentPage}&limit=10`,
      );

      if (currentPage === 1) {
        setAllReports(data.reports);
      } else {
        setAllReports((prev) => [...prev, ...data.reports]);
      }

      return data;
    },
    enabled: authState.isAuthenticated && !!authState.user,
  });

  const reports = allReports;
  const hasNextPage = reportsData?.pagination?.hasNextPage ?? false;

  // ── Load more reports (infinite scroll) ─────────────────────────────────
  const loadMoreReports = useCallback(async () => {
    if (isLoadingMore || !hasNextPage) return;

    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;

      const { data } = await apiClient.get(
        `/api/reports/furnace?page=${nextPage}&limit=10`,
      );

      setAllReports((prev) => [...prev, ...data.reports]);
      setCurrentPage(nextPage);
    } catch (error) {
      console.error('Error loading more reports:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, hasNextPage, isLoadingMore]);

  // ── Reset & refetch ─────────────────────────────────────────────────────
  const handleRefetchReports = useCallback(async () => {
    setCurrentPage(1);
    setAllReports([]);
    await refetchReports();
  }, [refetchReports]);

  // ── Default time range ──────────────────────────────────────────────────
  const getDefaultTimeRange = useCallback((): ReportTimeRange => {
    return {
      startDate: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      endDate: new Date(),
    };
  }, []);

  // ── Generate report ─────────────────────────────────────────────────────
  const generateReport = useCallback(
    async (
      format: ReportFormat,
      timeRange: ReportTimeRange,
      alarmTypes: string[] = [],
      severityLevels: string[] = [],
      zones: string[] = [],
      grouping: ColumnGrouping = ColumnGrouping.NEWEST_FIRST,
      title?: string,
      includeThresholds: boolean = true,
      includeStatusFields: boolean = true,
    ): Promise<string> => {
      try {
        setIsGenerating(true);

        const reportTitle =
          title ||
          (() => {
            const startFormatted = timeRange.startDate
              .toISOString()
              .split('T')[0];
            const endFormatted = timeRange.endDate
              .toISOString()
              .split('T')[0];
            return `Furnace_Report_${startFormatted}_to_${endFormatted}`;
          })();

        const startDate = new Date(timeRange.startDate);
        const endDate = new Date(timeRange.endDate);

        const timeDifferenceHours =
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
        const maxRecommendedHours = 6;

        if (timeDifferenceHours > maxRecommendedHours) {
          throw new Error(
            `Time range too large for SCADA data. Maximum recommended: ${maxRecommendedHours} hours (current: ${timeDifferenceHours.toFixed(1)} hours). SCADA generates 3,600 records per hour.`,
          );
        }

        // Fetch alarm data
        const actualRecordsPerHour = 3600;
        const maxSafeRecords = 5000;
        const estimatedTotal = Math.ceil(
          timeDifferenceHours * actualRecordsPerHour,
        );
        const calculatedLimit = Math.min(estimatedTotal, maxSafeRecords);

        const params = new URLSearchParams({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          limit: calculatedLimit.toString(),
          orderBy:
            grouping === ColumnGrouping.OLDEST_FIRST ? 'asc' : 'desc',
        });

        if (alarmTypes.length > 0) {
          alarmTypes.forEach((type) => params.append('alarmTypes', type));
        }
        if (severityLevels.length > 0) {
          severityLevels.forEach((level) =>
            params.append('severityLevels', level),
          );
        }
        if (zones.length > 0) {
          zones.forEach((zone) => params.append('zones', zone));
        }

        const { data: result } = await apiClient.get(
          `/api/reports/alarm-data?${params.toString()}`,
          { timeout: 60000 },
        );

        if (!result || !result.data || result.data.length === 0) {
          throw new Error(
            `No data found for the selected date range (${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}).`,
          );
        }

        const processedRecordCount = result.data.length;
        if (processedRecordCount > 5000) {
          throw new Error(
            `Dataset too large for report generation (${processedRecordCount} records). Please select a smaller time range.`,
          );
        }

        // Generate Excel file client-side
        const sanitizedTitle = reportTitle.replace(/\s+/g, '_');
        const timestamp = new Date()
          .toISOString()
          .replace(/[:.-]/g, '_');
        const fileName = `${sanitizedTitle}_${timestamp}.xlsx`;

        // Build Excel workbook from alarm data
        const wb = XLSX.utils.book_new();
        const wsData = result.data.map((row: Record<string, unknown>) => {
          const entry: Record<string, unknown> = {
            Timestamp: row.created_timestamp,
            ID: row.id,
          };
          if (includeThresholds) {
            // Add threshold columns if requested
            Object.keys(row).forEach((key) => {
              if (!['created_timestamp', 'id'].includes(key)) {
                entry[key] = row[key];
              }
            });
          } else {
            Object.keys(row).forEach((key) => {
              if (
                !['created_timestamp', 'id'].includes(key) &&
                !key.endsWith('_ht') &&
                !key.endsWith('_lt')
              ) {
                entry[key] = row[key];
              }
            });
          }
          return entry;
        });
        const ws = XLSX.utils.json_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, 'Alarm Data');

        // Convert workbook to binary string, then to base64
        const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const fileSize = Math.ceil((wbOut.length * 3) / 4); // approximate decoded size

        // Also trigger a browser download
        const binaryStr = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([binaryStr], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        triggerBrowserDownload(blob, fileName);

        const savePayload = {
          title: reportTitle,
          format,
          fileContent: wbOut,
          fileName,
          fileSize,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          grouping: grouping.toString(),
          includeThresholds,
          includeStatusFields,
          alarmTypes,
          severityLevels,
          zones,
          metadata: {
            generatedAt: new Date().toISOString(),
            recordCount: processedRecordCount,
          },
        };

        const { data: saveResult } = await apiClient.post(
          '/api/reports/furnace',
          savePayload,
        );

        handleRefetchReports();
        return saveResult.id || '';
      } catch (error) {
        console.error('Error generating furnace report:', error);
        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    [handleRefetchReports],
  );

  // ── Open / download report (browser) ────────────────────────────────────
  const openReport = useCallback(
    async (reportId: string): Promise<void> => {
      try {
        const meta = reports?.find((r) => r.id === reportId);
        if (!meta) throw new Error('Report metadata not found');

        const response = await apiClient.get(
          `/api/reports/furnace/${reportId}`,
          { responseType: 'arraybuffer' },
        );

        const mime =
          meta.format === 'excel'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/pdf';

        const blob = new Blob([response.data], { type: mime });
        triggerBrowserDownload(blob, meta.fileName);
      } catch (error) {
        console.error('Error opening report:', error);
        throw error;
      }
    },
    [reports],
  );

  // ── Share report (download in browser) ──────────────────────────────────
  const shareReport = useCallback(
    async (reportId: string): Promise<void> => {
      try {
        const meta = reports?.find((r) => r.id === reportId);
        const fileName = meta?.fileName || `furnace_report_${reportId}.xlsx`;

        const response = await apiClient.get(
          `/api/reports/furnace/${reportId}`,
          { responseType: 'arraybuffer' },
        );

        const blob = new Blob([response.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        triggerBrowserDownload(blob, fileName);
      } catch (error) {
        console.error('Error sharing report:', error);
        throw error;
      }
    },
    [reports],
  );

  return {
    reports,
    isLoadingReports,
    isReportsError,
    isGenerating,
    generateReport,
    openReport,
    shareReport,
    refetchReports: handleRefetchReports,
    loadMoreReports,
    isLoadingMore,
    hasNextPage,
    getDefaultTimeRange,
  };
}
