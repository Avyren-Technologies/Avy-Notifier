'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

const badgeVariants = {
  default:
    'bg-primary text-primary-foreground border-transparent shadow-sm',
  secondary:
    'bg-secondary text-secondary-foreground border-transparent',
  destructive:
    'bg-destructive text-destructive-foreground border-transparent shadow-sm',
  outline:
    'border-border text-foreground',
  success:
    'bg-success text-success-foreground border-transparent shadow-sm',
  warning:
    'bg-warning text-warning-foreground border-transparent shadow-sm',
  info:
    'bg-info text-info-foreground border-transparent shadow-sm',
} as const;

type BadgeVariant = keyof typeof badgeVariants;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

/**
 * Map alarm severity strings to badge variants.
 *
 * Usage:
 *   <Badge variant={alarmSeverityToBadge('critical')}>Critical</Badge>
 */
export function alarmSeverityToBadge(
  severity: string | undefined | null
): BadgeVariant {
  switch (severity?.toLowerCase()) {
    case 'critical':
    case 'emergency':
      return 'destructive';
    case 'major':
    case 'high':
      return 'warning';
    case 'minor':
    case 'medium':
      return 'info';
    case 'warning':
    case 'low':
      return 'secondary';
    case 'clear':
    case 'resolved':
      return 'success';
    default:
      return 'default';
  }
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        'transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  )
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
