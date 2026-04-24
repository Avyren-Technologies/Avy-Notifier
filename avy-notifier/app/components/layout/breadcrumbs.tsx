'use client';

import { usePathname } from 'next/navigation';
import { cn } from '../../lib/utils';

// ─── Route-to-label map ──────────────────────────────────────────────────────

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard/operator': 'Furnace Dashboard',
  '/dashboard/meter-readings': 'Meter Readings',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/alarms': 'Alarm History',
  '/dashboard/reports': 'Reports',
  '/dashboard/notifications': 'Notifications',
  '/dashboard/profile': 'Profile & Settings',
  '/dashboard/admin/users': 'User Management',
  '/dashboard/admin/meter-limits': 'Meter Limits',
  '/dashboard/admin/setpoints': 'Setpoints',
  '/dashboard/admin/organizations': 'Organizations',
  '/dashboard/admin/super-users': 'User Management',
};

// ─── Component ───────────────────────────────────────────────────────────────

interface BreadcrumbsProps {
  className?: string;
}

export function Breadcrumbs({ className }: BreadcrumbsProps) {
  const pathname = usePathname();

  const label =
    ROUTE_LABELS[pathname] ?? pathname.split('/').pop()?.replace(/-/g, ' ') ?? 'Dashboard';

  // Build breadcrumb segments (Dashboard > current)
  const isNested = pathname.startsWith('/dashboard/admin/');
  const segments: { label: string; active: boolean }[] = [
    { label: 'Dashboard', active: false },
  ];

  if (isNested) {
    segments.push({ label: 'Admin', active: false });
  }

  segments.push({ label, active: true });

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1.5 text-sm', className)}>
      {segments.map((segment, idx) => (
        <span key={idx} className="flex items-center gap-1.5">
          {idx > 0 && (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground/50"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          )}
          <span
            className={cn(
              'capitalize transition-colors duration-150',
              segment.active
                ? 'font-semibold text-foreground'
                : 'text-muted-foreground'
            )}
          >
            {segment.label}
          </span>
        </span>
      ))}
    </nav>
  );
}
