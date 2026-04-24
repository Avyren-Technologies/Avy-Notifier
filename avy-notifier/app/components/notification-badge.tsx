'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api-client';
import { cn } from '../lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NotificationBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function NotificationBadge({ size = 'md', className }: NotificationBadgeProps) {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/api/notifications/unread-count');
      const total =
        typeof data === 'number'
          ? data
          : data?.count ?? data?.pagination?.total ?? 0;
      setCount(total);
    } catch {
      // Silently fail - badge simply won't update
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  if (count === 0) return null;

  const sizeStyles = {
    sm: 'h-4 min-w-4 text-[10px]',
    md: 'h-5 min-w-5 text-[11px]',
    lg: 'h-6 min-w-6 text-xs',
  };

  return (
    <span
      className={cn(
        'absolute -top-1 -right-1 z-10 flex items-center justify-center',
        'rounded-full bg-destructive px-1 font-bold text-destructive-foreground',
        'ring-2 ring-background',
        'animate-in zoom-in-50 fade-in-0 duration-200',
        sizeStyles[size],
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
