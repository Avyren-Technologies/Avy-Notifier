import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  MeterReading,
  MeterLimit,
  PaginatedMeterReadings,
} from '../types/meter';
import { apiClient } from '../lib/api-client';
import { useAuth } from '../context/auth-context';

// ─── Query keys ─────────────────────────────────────────────────────────────

export const METER_KEYS = {
  latest: ['meter', 'latest'] as const,
  history: (hours: number, startTime?: string) =>
    ['meter', 'history', hours, startTime] as const,
  limits: ['meter', 'limits'] as const,
  limit: (id: string) => ['meter', 'limit', id] as const,
};

// ─── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Hook for fetching the latest meter reading.
 */
export const useLatestMeterReading = () => {
  const { authState } = useAuth();
  const enabled = authState.isAuthenticated && !!authState.user;

  return useQuery<MeterReading | null>({
    queryKey: METER_KEYS.latest,
    queryFn: async () => {
      const { data } = await apiClient.get('/api/meter/latest');
      return data.data ?? null;
    },
    staleTime: 25000,
    refetchInterval: 30000,
    placeholderData: (prev: MeterReading | null | undefined) => prev,
    enabled,
    retry: 1,
    retryDelay: 1000,
  });
};

/**
 * Hook for fetching historical meter readings.
 */
export const useMeterHistory = (hours: number = 1, startTime?: string) => {
  const { authState, organizationId } = useAuth();
  const enabled = authState.isAuthenticated && !!authState.user;

  return useQuery<PaginatedMeterReadings>({
    queryKey: METER_KEYS.history(hours, startTime),
    queryFn: async () => {
      if (!organizationId) throw new Error('organizationId is required');

      let queryParams = `hours=${hours}&page=1&limit=20`;
      if (startTime) {
        queryParams += `&startTime=${encodeURIComponent(startTime)}`;
      }

      const { data } = await apiClient.get(
        `/api/meter/history?${queryParams}`,
      );
      return data.data;
    },
    staleTime: 25000,
    refetchInterval: 30000,
    placeholderData: (prev: PaginatedMeterReadings | undefined) => prev,
    enabled,
    retry: 1,
    retryDelay: 1000,
  });
};

/**
 * Hook for fetching all meter parameter limits.
 */
export const useMeterLimits = () => {
  const { authState } = useAuth();
  const enabled = authState.isAuthenticated && !!authState.user;

  return useQuery<MeterLimit[]>({
    queryKey: METER_KEYS.limits,
    queryFn: async () => {
      const { data } = await apiClient.get('/api/meter/limits');
      return data.data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled,
  });
};

/**
 * Hook for updating meter parameter limits.
 */
export const useUpdateMeterLimit = () => {
  const queryClient = useQueryClient();

  return useMutation<
    MeterLimit,
    Error,
    { id: string; values: { highLimit?: number; lowLimit?: number } }
  >({
    mutationFn: async ({ id, values }) => {
      const { data } = await apiClient.put<{ data: MeterLimit }>(
        `/api/meter/limits/${id}`,
        values,
      );
      return data.data;
    },
    onSuccess: (updatedLimit) => {
      queryClient.invalidateQueries({ queryKey: METER_KEYS.limits });
      queryClient.invalidateQueries({
        queryKey: METER_KEYS.limit(updatedLimit.id),
      });
    },
  });
};
