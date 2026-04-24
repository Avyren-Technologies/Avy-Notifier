import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { Organization } from '../types/organization';
import { apiClient } from '../lib/api-client';
import { useAuth } from '../context/auth-context';

// ─── Types ──────────────────────────────────────────────────────────────────

interface OrgForm {
  name: string;
  scadaDbConfig: Record<string, unknown>;
  schemaConfig: Record<string, unknown>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Hook for managing organizations (SUPER_ADMIN only).
 * Provides list, create, update, delete, and toggle-status operations.
 */
export function useOrganizations() {
  const queryClient = useQueryClient();
  const { authState } = useAuth();

  const enabled =
    authState.isAuthenticated && authState.user?.role === 'SUPER_ADMIN';

  // ── Fetch all organizations ─────────────────────────────────────────────
  const {
    data: organizations = [],
    isLoading,
    refetch,
  } = useQuery<Organization[]>({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data } = await apiClient.get<Organization[]>(
        '/api/admin/organizations',
      );
      return data;
    },
    enabled,
  });

  // ── Create organization ─────────────────────────────────────────────────
  const createMutation = useMutation<Organization, Error, OrgForm>({
    mutationFn: async (form) => {
      const { data } = await apiClient.post<Organization>(
        '/api/admin/organizations',
        form,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });

  // ── Update organization ─────────────────────────────────────────────────
  const updateMutation = useMutation<
    Organization,
    Error,
    { id: string; form: OrgForm }
  >({
    mutationFn: async ({ id, form }) => {
      const { data } = await apiClient.put<Organization>(
        `/api/admin/organizations/${id}`,
        form,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });

  // ── Delete organization ─────────────────────────────────────────────────
  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/api/admin/organizations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });

  // ── Toggle organization status ──────────────────────────────────────────
  const toggleStatusMutation = useMutation<
    Organization,
    Error,
    { id: string; isEnabled: boolean }
  >({
    mutationFn: async ({ id, isEnabled }) => {
      const { data } = await apiClient.patch<Organization>(
        `/api/admin/organizations/${id}/toggle-status`,
        { isEnabled },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });

  return {
    organizations,
    isLoading,
    createOrganization: createMutation.mutateAsync,
    updateOrganization: (id: string, form: OrgForm) =>
      updateMutation.mutateAsync({ id, form }),
    deleteOrganization: deleteMutation.mutateAsync,
    toggleOrganizationStatus: (id: string, isEnabled: boolean) =>
      toggleStatusMutation.mutateAsync({ id, isEnabled }),
    refetchOrganizations: refetch,
  };
}
