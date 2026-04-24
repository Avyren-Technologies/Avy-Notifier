import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  Notification,
  NotificationResponse,
  NotificationSettings,
} from '../types/notification';
import { apiClient } from '../lib/api-client';
import { useAuth } from '../context/auth-context';

// ─── Query keys ─────────────────────────────────────────────────────────────

const NOTIFICATIONS_KEY = 'notifications';
const SETTINGS_KEY = 'notificationSettings';
const UNREAD_COUNT_KEY = 'unreadCount';

// ─── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Hook for fetching notifications with pagination and infinite loading.
 */
export const useNotifications = (
  filter: 'all' | 'unread' = 'all',
  limit: number = 10,
  source?: string,
) => {
  const { authState } = useAuth();
  const enabled = authState.isAuthenticated && !!authState.user;

  return useInfiniteQuery<NotificationResponse>({
    queryKey: [NOTIFICATIONS_KEY, filter, limit, source],
    queryFn: async ({ pageParam = 1 }) => {
      let url = `/api/notifications?page=${pageParam}&limit=${limit}&filter=${filter}`;
      if (source) {
        url += `&source=${source}`;
      }
      const { data } = await apiClient.get<NotificationResponse>(url);
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasMore) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    staleTime: 60 * 1000, // 1 minute
    enabled,
  });
};

/**
 * Hook for fetching unread notifications count.
 */
export const useUnreadCount = () => {
  const { authState } = useAuth();
  const enabled = authState.isAuthenticated && !!authState.user;

  return useQuery<number>({
    queryKey: [UNREAD_COUNT_KEY],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get('/api/notifications/unread-count');
        return data.count;
      } catch {
        return 0;
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    enabled,
  });
};

/**
 * Hook for marking a single notification as read.
 */
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation<Notification, Error, string>({
    mutationFn: async (notificationId: string) => {
      const { data } = await apiClient.patch<Notification>(
        `/api/notifications/${notificationId}/read`,
        {},
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] });

      // Optimistically update the unread count
      queryClient.setQueryData(
        [UNREAD_COUNT_KEY],
        (old: number | undefined) => Math.max(0, (old || 0) - 1),
      );
    },
  });
};

/**
 * Hook for marking all notifications as read.
 */
export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, void>({
    mutationFn: async () => {
      const { data } = await apiClient.patch(
        '/api/notifications/mark-all-read',
        {},
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] });

      // Optimistically update the unread count to 0
      queryClient.setQueryData([UNREAD_COUNT_KEY], 0);
    },
  });
};

/**
 * Hook for deleting a notification.
 */
export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, string>({
    mutationFn: async (notificationId: string) => {
      const { data } = await apiClient.delete(
        `/api/notifications/${notificationId}`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] });
    },
  });
};

/**
 * Hook for fetching notification settings.
 */
export const useNotificationSettings = (enabled = true) => {
  const { authState } = useAuth();
  const isSuperAdmin = authState.user?.role === 'SUPER_ADMIN';

  return useQuery<NotificationSettings>({
    queryKey: [SETTINGS_KEY],
    queryFn: async () => {
      const { data } = await apiClient.get<NotificationSettings>(
        '/api/notifications/settings',
      );
      return data;
    },
    enabled: enabled && authState.isAuthenticated && !isSuperAdmin,
  });
};

/**
 * Hook for updating notification settings.
 */
export const useUpdateNotificationSettings = () => {
  const queryClient = useQueryClient();

  return useMutation<NotificationSettings, Error, Partial<NotificationSettings>>(
    {
      mutationFn: async (settings: Partial<NotificationSettings>) => {
        const { data } = await apiClient.put<NotificationSettings>(
          '/api/notifications/settings',
          settings,
        );
        return data;
      },
      onSuccess: (updatedSettings) => {
        queryClient.setQueryData([SETTINGS_KEY], updatedSettings);
      },
    },
  );
};
