import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { SuperAdminMetrics, SuperAdminUser } from '../types/organization';
import { apiClient } from '../lib/api-client';
import { useAuth } from '../context/auth-context';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UserForm {
  name: string;
  email: string;
  password?: string;
  role: 'ADMIN' | 'OPERATOR';
  organizationId: string;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Hook for fetching super admin dashboard metrics.
 */
export function useSuperAdminMetrics() {
  const { authState } = useAuth();

  const enabled =
    authState.isAuthenticated && authState.user?.role === 'SUPER_ADMIN';

  const {
    data: metrics,
    isLoading,
    error,
    refetch,
  } = useQuery<SuperAdminMetrics>({
    queryKey: ['superAdminMetrics'],
    queryFn: async () => {
      const { data } = await apiClient.get<SuperAdminMetrics>(
        '/api/admin/metrics',
      );
      return data;
    },
    refetchInterval: enabled ? 30000 : false,
    staleTime: 60000, // 1 minute
    enabled,
  });

  return {
    metrics,
    isLoading,
    error,
    refetchMetrics: refetch,
  };
}

/**
 * Hook for managing users as a super admin.
 * Provides list (optionally filtered by org), create, update, and delete operations.
 */
export function useSuperAdminUsers(organizationId?: string) {
  const queryClient = useQueryClient();
  const { authState } = useAuth();

  const enabled =
    authState.isAuthenticated && authState.user?.role === 'SUPER_ADMIN';

  // ── Fetch users ─────────────────────────────────────────────────────────
  const {
    data: users = [],
    isLoading,
    refetch,
  } = useQuery<SuperAdminUser[]>({
    queryKey: ['superAdminUsers', organizationId],
    queryFn: async () => {
      const params = organizationId ? { organizationId } : {};
      const { data } = await apiClient.get<SuperAdminUser[]>(
        '/api/admin/users',
        { params },
      );
      return data;
    },
    enabled,
  });

  // ── Create user ─────────────────────────────────────────────────────────
  const createMutation = useMutation<SuperAdminUser, Error, UserForm>({
    mutationFn: async (form) => {
      const { data } = await apiClient.post<SuperAdminUser>(
        '/api/admin/users',
        form,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superAdminUsers'] });
    },
  });

  // ── Update user ─────────────────────────────────────────────────────────
  const updateMutation = useMutation<
    SuperAdminUser,
    Error,
    { id: string; form: Partial<UserForm> }
  >({
    mutationFn: async ({ id, form }) => {
      const { data } = await apiClient.put<SuperAdminUser>(
        `/api/admin/users/${id}`,
        form,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superAdminUsers'] });
    },
  });

  // ── Delete user ─────────────────────────────────────────────────────────
  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/api/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superAdminUsers'] });
    },
  });

  return {
    users,
    isLoading,
    createUser: createMutation.mutateAsync,
    updateUser: (id: string, form: Partial<UserForm>) =>
      updateMutation.mutateAsync({ id, form }),
    deleteUser: deleteMutation.mutateAsync,
    refetchUsers: refetch,
  };
}
