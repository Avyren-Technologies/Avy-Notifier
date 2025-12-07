import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { apiConfig } from '../api/config';
import { useAuth } from '../context/AuthContext';

export interface SuperAdminMetrics {
  totalOrganizations: number;
  totalUsers: number;
  activeOrganizations: number;
  newOrganizationsThisWeek: number;
  newUsersThisWeek: number;
  disabledOrganizations: number;
}

export function useSuperAdminMetrics() {
  const { authState } = useAuth();

  // Only enable this query for SUPER_ADMIN users who are authenticated
  const enabled = authState.isAuthenticated &&
                  authState.user?.role === 'SUPER_ADMIN';

  const {
    data: metrics,
    isLoading,
    error,
    refetch
  } = useQuery<SuperAdminMetrics>({
    queryKey: ['superAdminMetrics'],
    queryFn: async () => {
      const { data } = await axios.get<SuperAdminMetrics>(`${apiConfig.apiUrl}/api/admin/metrics`);
      return data;
    },
    refetchInterval: enabled ? 30000 : false, // Only refetch when enabled
    staleTime: 60000, // Consider data stale after 1 minute
    enabled, // Only run query when user is authenticated and is SUPER_ADMIN
  });

  return {
    metrics,
    isLoading,
    error,
    refetchMetrics: refetch,
  };
} 