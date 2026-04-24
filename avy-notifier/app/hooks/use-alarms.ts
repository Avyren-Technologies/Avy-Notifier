import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import type { Alarm, AlarmStatus } from '../types/alarm';
import { useAlarmStore } from '../store/alarm-store';
import { apiClient, getOrganizationId } from '../lib/api-client';
import { useAuth } from '../context/auth-context';

// ─── Query keys ─────────────────────────────────────────────────────────────

export const ALARM_KEYS = {
  all: ['alarms'] as const,
  active: () => [...ALARM_KEYS.all, 'active'] as const,
  history: (params: Record<string, unknown>) =>
    [...ALARM_KEYS.all, 'history', params] as const,
  detail: (id: string) => [...ALARM_KEYS.all, 'detail', id] as const,
  scada: (forceRefresh?: boolean) => ['scada-alarms', forceRefresh] as const,
  analytics: (timeFilter: string) =>
    ['scada-analytics', timeFilter] as const,
  alarmHistory: (params: {
    alarmId: string;
    status?: string;
    hours?: number;
    search?: string;
    startTime?: string;
    endTime?: string;
    timeFilter?: string;
  }) => [...ALARM_KEYS.all, 'alarm-history', params.alarmId, params] as const,
};

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ScadaAlarmResponse {
  analogAlarms: Alarm[];
  binaryAlarms: Alarm[];
  maintenanceMode?: boolean;
  timestamp?: string;
  lastUpdate?: string;
  fromCache?: boolean;
}

interface UpdateAlarmStatusParams {
  id: string;
  status: AlarmStatus;
  resolutionMessage?: string;
}

export interface AlarmHistoryParams {
  page?: number;
  limit?: number;
  status?: string;
  hours?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  type?: string;
  alarmId?: string;
  startTime?: string;
  endTime?: string;
  timeFilter?: string;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Hook for fetching active SCADA alarms with real-time polling.
 */
export const useActiveAlarms = (initialForceRefresh = false) => {
  const { setAlarms, setLoading, setError } = useAlarmStore();
  const { authState } = useAuth();

  return useQuery<ScadaAlarmResponse, Error>({
    queryKey: ALARM_KEYS.scada(initialForceRefresh),
    queryFn: async ({ queryKey }) => {
      setLoading(true);
      try {
        const forceRefresh = queryKey[1] as boolean;

        if (!authState.isAuthenticated || !getOrganizationId()) {
          throw new Error(
            'Unauthorized: Missing organization or authentication',
          );
        }

        const { data } = await apiClient.get<ScadaAlarmResponse>(
          `/api/scada/alarms${forceRefresh ? '?force=true' : ''}`,
        );

        const analogAlarms = Array.isArray(data.analogAlarms)
          ? data.analogAlarms
          : [];
        const binaryAlarms = Array.isArray(data.binaryAlarms)
          ? data.binaryAlarms
          : [];

        const markedAnalogAlarms = analogAlarms.map((alarm) => ({
          ...alarm,
          alarmType: 'analog' as const,
        }));

        const markedBinaryAlarms = binaryAlarms.map((alarm) => ({
          ...alarm,
          alarmType: 'binary' as const,
        }));

        setAlarms([...markedAnalogAlarms, ...markedBinaryAlarms]);
        setLoading(false);

        return {
          analogAlarms: markedAnalogAlarms,
          binaryAlarms: markedBinaryAlarms,
          maintenanceMode: data.maintenanceMode,
          timestamp: data.timestamp,
          lastUpdate: data.lastUpdate,
          fromCache: data.fromCache,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch alarms';
        setError(errorMessage);
        setLoading(false);
        throw error;
      }
    },
    enabled:
      authState.isAuthenticated && !!authState.user?.organizationId,
    refetchInterval: 30000,
    staleTime: 25000,
    retry: 3,
    retryDelay: (attemptIndex) =>
      Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * Hook for updating the status of an alarm (acknowledge / resolve).
 */
export const useUpdateAlarmStatus = () => {
  const queryClient = useQueryClient();
  const { updateAlarmStatus: updateStoreAlarmStatus } = useAlarmStore();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      resolutionMessage,
    }: UpdateAlarmStatusParams) => {
      await apiClient.put(`/api/alarms/${id}/status`, {
        status,
        resolutionMessage,
      });
      updateStoreAlarmStatus(id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALARM_KEYS.scada() });
    },
  });
};

/**
 * Hook for fetching alarm history with pagination, filtering and sorting.
 */
export function useAlarmHistory({
  page = 1,
  limit = 20,
  status = 'all',
  hours,
  search,
  sortBy = 'timestamp',
  sortOrder = 'desc',
  type,
  alarmId,
}: AlarmHistoryParams = {}) {
  const params = {
    page,
    limit,
    status,
    hours,
    search,
    sortBy,
    sortOrder,
    type,
    alarmId,
  };

  return useQuery({
    queryKey: ALARM_KEYS.history(params),
    queryFn: async () => {
      const urlParams = new URLSearchParams();
      urlParams.append('page', page.toString());
      urlParams.append('limit', limit.toString());
      urlParams.append('status', status);
      if (hours) urlParams.append('hours', hours.toString());
      if (search) urlParams.append('search', search);
      urlParams.append('sortBy', sortBy);
      urlParams.append('sortOrder', sortOrder);
      if (type) urlParams.append('type', type);
      if (alarmId) urlParams.append('alarmId', alarmId);

      const { data } = await apiClient.get(
        `/api/scada/history?${urlParams.toString()}`,
      );
      return data;
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData: unknown) => previousData,
  });
}

/**
 * Hook for fetching history of a specific alarm with infinite scrolling.
 */
export function useSpecificAlarmHistory(
  alarmId: string,
  params: Partial<AlarmHistoryParams> = {},
) {
  const { limit = 50, status, hours, startTime, endTime, timeFilter } =
    params;

  return useInfiniteQuery({
    queryKey: ALARM_KEYS.alarmHistory({
      alarmId,
      status,
      hours,
      startTime,
      endTime,
      timeFilter,
    }),
    queryFn: async ({ pageParam = 1 }) => {
      if (!alarmId) return null;

      const urlParams = new URLSearchParams();
      urlParams.append('page', pageParam.toString());
      urlParams.append('limit', limit.toString());
      urlParams.append('alarmId', alarmId);
      urlParams.append('sortBy', 'timestamp');
      urlParams.append('sortOrder', 'desc');

      if (status && status !== 'all') urlParams.append('status', status);
      if (hours) urlParams.append('hours', hours.toString());
      if (startTime) urlParams.append('startTime', startTime);
      if (endTime) urlParams.append('endTime', endTime);
      if (timeFilter) urlParams.append('timeFilter', timeFilter);

      const { data } = await apiClient.get(
        `/api/scada/history?${urlParams.toString()}`,
      );
      return data;
    },
    getNextPageParam: (lastPage: { pagination?: { page: number; pages: number } } | null) => {
      if (!lastPage?.pagination) return undefined;
      const { page: p, pages } = lastPage.pagination;
      return p < pages ? p + 1 : undefined;
    },
    enabled: !!alarmId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    initialPageParam: 1,
    retry: 3,
    retryDelay: (attemptIndex) =>
      Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook for fetching SCADA analytics data (real-time).
 */
export const useAnalyticsData = (timeFilter: string) => {
  return useQuery({
    queryKey: ALARM_KEYS.analytics(timeFilter),
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/api/scada/analytics?timeFilter=${timeFilter}`,
      );
      return data;
    },
    refetchInterval: 5000,
    staleTime: 500,
    gcTime: 30000,
    retry: 3,
    retryDelay: (attemptIndex) =>
      Math.min(1000 * 2 ** attemptIndex, 10000),
    enabled: !!timeFilter,
    refetchOnMount: 'always' as const,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for fetching dynamic alarm configurations.
 */
export const useAlarmConfigurations = () => {
  const { organizationId } = useAuth();

  return useQuery({
    queryKey: ['scada', 'config', organizationId],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/scada/config');
      return data;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
