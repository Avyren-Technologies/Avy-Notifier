import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { useAuth } from '../context/auth-context';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Setpoint {
  id: string;
  name: string;
  type: string;
  zone?: string | null;
  scadaField: string;
  lowDeviation: number;
  highDeviation: number;
  createdAt: string;
  updatedAt: string;
}

interface UpdateSetpointParams {
  id: string;
  lowDeviation: number;
  highDeviation: number;
}

// ─── Query keys ─────────────────────────────────────────────────────────────

export const SETPOINT_KEYS = {
  all: ['setpoints'] as const,
  detail: (id: string) => [...SETPOINT_KEYS.all, 'detail', id] as const,
};

// ─── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Hook for fetching all setpoints (admin only).
 */
export const useSetpoints = () => {
  const { authState } = useAuth();
  const isAdmin = authState?.user?.role === 'ADMIN';

  return useQuery<Setpoint[]>({
    queryKey: SETPOINT_KEYS.all,
    queryFn: async () => {
      if (!isAdmin) {
        return [];
      }

      const { data } = await apiClient.get<Setpoint[]>(
        '/api/admin/setpoints',
      );
      return data;
    },
    staleTime: 30000, // 30 seconds
    enabled: isAdmin,
  });
};

/**
 * Hook for updating setpoint deviations (admin only).
 */
export const useUpdateSetpoint = () => {
  const queryClient = useQueryClient();
  const { authState } = useAuth();
  const isAdmin = authState?.user?.role === 'ADMIN';

  return useMutation<Setpoint, Error, UpdateSetpointParams>({
    mutationFn: async ({ id, lowDeviation, highDeviation }) => {
      if (!isAdmin) {
        throw new Error('Unauthorized: Only admins can update setpoints');
      }

      const { data } = await apiClient.put<Setpoint>(
        `/api/admin/setpoints/${id}`,
        { lowDeviation, highDeviation },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETPOINT_KEYS.all });
    },
  });
};
