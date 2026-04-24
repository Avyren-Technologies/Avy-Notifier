'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Bell,
  BellOff,
  Wrench,
  Info,
  AlertTriangle,
  CheckCheck,
  Trash2,
  Loader2,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { isToday, isYesterday, isThisWeek, format as formatDate } from 'date-fns';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '../../components/ui/tooltip';
import { cn } from '../../lib/utils';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useUnreadCount,
} from '../../hooks/use-notifications';
import type { Notification, NotificationType } from '../../types/notification';
import { formatTimestampIST } from '../../lib/timezone';

/* ------------------------------------------------------------------
 * Constants
 * ----------------------------------------------------------------*/

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
] as const;

const SOURCE_FILTERS = [
  { id: undefined, label: 'All Sources' },
  { id: 'Furnace', label: 'Furnace' },
  { id: 'Meter', label: 'Meter' },
] as const;

/* ------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------*/

function getTypeIcon(type: NotificationType) {
  switch (type) {
    case 'ALARM':
      return Bell;
    case 'MAINTENANCE':
      return Wrench;
    case 'SYSTEM':
      return AlertTriangle;
    case 'INFO':
    default:
      return Info;
  }
}

function getTypeColor(type: NotificationType): string {
  switch (type) {
    case 'ALARM':
      return 'text-red-500 bg-red-500/10';
    case 'MAINTENANCE':
      return 'text-amber-500 bg-amber-500/10';
    case 'SYSTEM':
      return 'text-purple-500 bg-purple-500/10';
    case 'INFO':
    default:
      return 'text-blue-500 bg-blue-500/10';
  }
}

function getRelativeTime(dateString: string): string {
  try {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return formatDate(date, 'MMM d');
  } catch {
    return '';
  }
}

function groupNotificationsByDate(
  notifications: Notification[]
): { title: string; items: Notification[] }[] {
  const groups: Record<string, Notification[]> = {};
  const order = ['Today', 'Yesterday', 'This Week', 'Earlier'];

  for (const notification of notifications) {
    const date = new Date(notification.createdAt);
    let groupKey: string;

    if (isToday(date)) {
      groupKey = 'Today';
    } else if (isYesterday(date)) {
      groupKey = 'Yesterday';
    } else if (isThisWeek(date)) {
      groupKey = 'This Week';
    } else {
      groupKey = 'Earlier';
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(notification);
  }

  return order
    .filter((key) => groups[key] && groups[key].length > 0)
    .map((key) => ({ title: key, items: groups[key] }));
}

/* ------------------------------------------------------------------
 * Skeleton loader
 * ----------------------------------------------------------------*/

function NotificationSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-lg border border-border/50 bg-card p-4"
        >
          <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-3 w-full max-w-md" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------
 * Empty state
 * ----------------------------------------------------------------*/

function EmptyNotifications({
  filter,
  source,
}: {
  filter: 'all' | 'unread';
  source?: string;
}) {
  const sourceLabel = source ? source.toLowerCase() : '';

  if (filter === 'unread') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-2xl',
            'bg-emerald-500/10 text-emerald-500'
          )}
        >
          <CheckCheck className="h-8 w-8" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          All Caught Up
        </h3>
        <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
          {source
            ? `You have no unread ${sourceLabel} notifications.`
            : 'You have no unread notifications.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div
        className={cn(
          'flex h-16 w-16 items-center justify-center rounded-2xl',
          'bg-muted/50 text-muted-foreground'
        )}
      >
        <BellOff className="h-8 w-8" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">
        No Notifications
      </h3>
      <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
        {source
          ? `You have no ${sourceLabel} notifications yet.`
          : 'You have no notifications yet. System alerts will appear here.'}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Notification Item
 * ----------------------------------------------------------------*/

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = getTypeIcon(notification.type);
  const typeColor = getTypeColor(notification.type);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    onDelete(notification.id);
  };

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative flex items-start gap-3 rounded-lg border p-4',
        'transition-all duration-200 cursor-pointer',
        notification.isRead
          ? 'border-border/30 bg-card/50 opacity-75 hover:opacity-100'
          : 'border-border/50 bg-card hover:border-border hover:shadow-sm'
      )}
    >
      {/* Unread indicator */}
      {!notification.isRead && (
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2">
          <span className="block h-2 w-2 rounded-full bg-blue-500" />
        </div>
      )}

      {/* Type icon */}
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          typeColor,
          !notification.isRead ? '' : 'opacity-60'
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-sm text-foreground leading-snug',
              notification.isRead ? 'font-normal' : 'font-semibold'
            )}
          >
            {notification.title}
          </p>

          {/* Priority badge for HIGH */}
          {notification.priority === 'HIGH' && (
            <Badge variant="destructive" className="shrink-0 text-[10px]">
              High
            </Badge>
          )}
        </div>

        <p className="mt-1 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {notification.body}
        </p>

        <div className="mt-2 flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {formatTimestampIST(notification.createdAt)} IST
          </span>
          <span className="text-xs text-muted-foreground/50">
            {getRelativeTime(notification.createdAt)}
          </span>
        </div>
      </div>

      {/* Actions (hover) */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <TooltipProvider>
          {!notification.isRead && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(notification.id);
                  }}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mark as read</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Main page
 * ----------------------------------------------------------------*/

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [source, setSource] = useState<string | undefined>(undefined);

  // ── Hooks ───────────────────────────────────────────────────────────────────
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useNotifications(filter, 15, source);

  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteNotificationMutation = useDeleteNotification();
  const { data: unreadCount } = useUnreadCount();

  // ── Flatten pages ───────────────────────────────────────────────────────────
  const notifications = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page) => page.notifications);
  }, [data]);

  // ── Group by date ───────────────────────────────────────────────────────────
  const groupedNotifications = useMemo(
    () => groupNotificationsByDate(notifications),
    [notifications]
  );

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleMarkAsRead = useCallback(
    (id: string) => {
      markAsReadMutation.mutate(id);
    },
    [markAsReadMutation]
  );

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteNotificationMutation.mutate(id);
    },
    [deleteNotificationMutation]
  );

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const hasUnread = (unreadCount ?? 0) > 0;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stay updated with system alerts and status changes.
          </p>
        </div>

        {hasUnread && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            loading={markAllAsReadMutation.isPending}
            disabled={markAllAsReadMutation.isPending}
            className="shrink-0"
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark All Read
            {unreadCount != null && unreadCount > 0 && (
              <Badge variant="default" className="ml-2 text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </Button>
        )}
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter tabs */}
        <div className="flex items-center gap-1.5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as 'all' | 'unread')}
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-200',
                filter === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Source filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {SOURCE_FILTERS.map((sf) => (
            <button
              key={sf.label}
              onClick={() => setSource(sf.id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200',
                source === sf.id
                  ? 'bg-secondary text-secondary-foreground shadow-sm'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              {sf.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {isLoading ? (
        <NotificationSkeleton />
      ) : notifications.length === 0 ? (
        <EmptyNotifications filter={filter} source={source} />
      ) : (
        <div className="space-y-6">
          {groupedNotifications.map((group) => (
            <div key={group.title}>
              {/* Section header */}
              <div className="sticky top-0 z-10 mb-2">
                <span
                  className={cn(
                    'inline-block rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wider',
                    'bg-background/80 text-muted-foreground backdrop-blur-sm',
                    'border border-border/30'
                  )}
                >
                  {group.title}
                </span>
              </div>

              {/* Notifications in this group */}
              <div className="space-y-2">
                {group.items.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Load More */}
          {hasNextPage && (
            <div className="flex justify-center pt-2 pb-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                loading={isFetchingNextPage}
                disabled={isFetchingNextPage}
              >
                <ChevronDown className="mr-2 h-4 w-4" />
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
