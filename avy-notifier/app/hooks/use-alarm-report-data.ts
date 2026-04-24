import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { useAuth } from '../context/auth-context';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AlarmReportFilters {
  startDate?: Date;
  endDate?: Date;
  alarmTypes?: string[];
  severityLevels?: string[];
  zones?: string[];
  limit?: number;
}

export interface AlarmData {
  id: number;
  created_timestamp: string;
  // Temperature-related fields
  hz1sv?: number;
  hz1pv?: number;
  hz1ht?: number;
  hz1lt?: number;
  hz2sv?: number;
  hz2pv?: number;
  hz2ht?: number;
  hz2lt?: number;
  tz1sv?: number;
  tz1pv?: number;
  tz1ht?: number;
  tz1lt?: number;
  tz2sv?: number;
  tz2pv?: number;
  tz2ht?: number;
  tz2lt?: number;
  // Carbon-related fields
  cpsv?: number;
  cppv?: number;
  cph?: number;
  cpl?: number;
  // Other sensor readings
  oilpv?: number;
  deppv?: number;
  postpv?: number;
  // Boolean status fields
  oiltemphigh?: boolean;
  oillevelhigh?: boolean;
  oillevellow?: boolean;
  hz1hfail?: boolean;
  hz2hfail?: boolean;
  hardconfail?: boolean;
  hardcontraip?: boolean;
  oilconfail?: boolean;
  oilcontraip?: boolean;
  hz1fanfail?: boolean;
  hz2fanfail?: boolean;
  hz1fantrip?: boolean;
  hz2fantrip?: boolean;
  tempconfail?: boolean;
  tempcontraip?: boolean;
  tz1fanfail?: boolean;
  tz2fanfail?: boolean;
  tz1fantrip?: boolean;
  tz2fantrip?: boolean;
}

export interface AlarmReportResponse {
  count: number;
  data: AlarmData[];
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Hook for fetching alarm report data with filtering support.
 */
export const useAlarmReportData = (
  filters: AlarmReportFilters = {},
  enabled = true,
) => {
  const { authState } = useAuth();
  const isEnabled = enabled && authState.isAuthenticated && !!authState.user;

  return useQuery<AlarmReportResponse>({
    queryKey: ['alarmReport', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.startDate) {
        params.append('startDate', filters.startDate.toISOString());
      }

      if (filters.endDate) {
        params.append('endDate', filters.endDate.toISOString());
      }

      if (filters.alarmTypes && filters.alarmTypes.length > 0) {
        filters.alarmTypes.forEach((type) =>
          params.append('alarmTypes', type),
        );
      }

      if (filters.severityLevels && filters.severityLevels.length > 0) {
        filters.severityLevels.forEach((level) =>
          params.append('severityLevels', level),
        );
      }

      if (filters.zones && filters.zones.length > 0) {
        filters.zones.forEach((zone) => params.append('zones', zone));
      }

      if (filters.limit) {
        params.append('limit', filters.limit.toString());
      }

      const { data } = await apiClient.get<AlarmReportResponse>(
        '/api/reports/alarm-data',
        { params },
      );

      return data;
    },
    enabled: isEnabled,
  });
};
