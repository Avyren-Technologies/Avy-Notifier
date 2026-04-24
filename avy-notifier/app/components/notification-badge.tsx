'use client';

import { cn } from '../lib/utils';
import { useUnreadCount } from '../hooks/use-notifications';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NotificationBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function NotificationBadge({ size = 'md', className }: NotificationBadgeProps) {
  const { data: count = 0 } = useUnreadCount();

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
