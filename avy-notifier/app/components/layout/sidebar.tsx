'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  BarChart3,
  Bell,
  FileText,
  Inbox,
  User,
  Users,
  Gauge,
  Settings,
  Building2,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { cn } from '../../lib/utils';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '../ui/tooltip';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  /** If true, href is computed dynamically based on selectedAppType */
  dynamic?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
  /** Return true to show this group */
  visible: (role: string | null) => boolean;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

// ─── Navigation config ──────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'MAIN',
    visible: () => true,
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, dynamic: true },
      { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
      { label: 'Alarm History', href: '/dashboard/alarms', icon: Bell },
      { label: 'Reports', href: '/dashboard/reports', icon: FileText },
      { label: 'Notifications', href: '/dashboard/notifications', icon: Inbox },
    ],
  },
  {
    title: 'ACCOUNT',
    visible: () => true,
    items: [
      { label: 'Profile', href: '/dashboard/profile', icon: User },
    ],
  },
  {
    title: 'ADMIN',
    visible: (role) => role === 'ADMIN' || role === 'SUPER_ADMIN',
    items: [
      { label: 'User Management', href: '/dashboard/admin/users', icon: Users },
      { label: 'Meter Limits', href: '/dashboard/admin/meter-limits', icon: Gauge },
      { label: 'Setpoints', href: '/dashboard/admin/setpoints', icon: Settings },
    ],
  },
  {
    title: 'SUPER ADMIN',
    visible: (role) => role === 'SUPER_ADMIN',
    items: [
      { label: 'Organizations', href: '/dashboard/admin/organizations', icon: Building2 },
      { label: 'All Users', href: '/dashboard/admin/super-users', icon: Users },
    ],
  },
];

// ─── Sidebar width constants ────────────────────────────────────────────────

const SIDEBAR_EXPANDED = 260;
const SIDEBAR_COLLAPSED = 72;

// ─── Component ──────────────────────────────────────────────────────────────

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { authState, selectedAppType } = useAuth();
  const role = authState.user?.role ?? null;

  /** Resolve the href for the Dashboard link based on selected app type */
  function resolveHref(item: NavItem): string {
    if (item.dynamic) {
      return selectedAppType === 'meter'
        ? '/dashboard/meter-readings'
        : '/dashboard/operator';
    }
    return item.href;
  }

  /** Check if the current item is the active route */
  function isActive(item: NavItem): boolean {
    const href = resolveHref(item);
    if (item.dynamic) {
      return (
        pathname === '/dashboard' ||
        pathname === '/dashboard/operator' ||
        pathname === '/dashboard/meter-readings'
      );
    }
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col',
          'border-r border-border bg-card',
          'select-none overflow-hidden'
        )}
      >
        {/* ── Logo ──────────────────────────────────────────────── */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4">
          {/* Logo mark */}
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              'bg-gradient-to-br from-primary to-info shadow-md shadow-primary/20'
            )}
          >
            <span className="text-sm font-extrabold text-white tracking-tight">AV</span>
          </div>

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col overflow-hidden whitespace-nowrap"
              >
                <span className="text-sm font-bold text-foreground tracking-tight">
                  Avy Notifier
                </span>
                <span className="text-[10px] font-medium text-muted-foreground leading-none">
                  SCADA Monitoring
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Navigation ────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 scrollbar-thin">
          {NAV_GROUPS.filter((g) => g.visible(role)).map((group) => (
            <div key={group.title} className="mb-6">
              {/* Group label */}
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className={cn(
                      'mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest',
                      'text-muted-foreground/60'
                    )}
                  >
                    {group.title}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Items */}
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const href = resolveHref(item);
                  const active = isActive(item);
                  const Icon = item.icon;

                  const linkContent = (
                    <Link
                      href={href}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5',
                        'text-sm font-medium transition-all duration-200',
                        'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      {/* Active accent bar */}
                      {active && (
                        <motion.div
                          layoutId="sidebar-active-indicator"
                          className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary"
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      )}

                      <Icon
                        className={cn(
                          'h-[18px] w-[18px] shrink-0 transition-colors duration-200',
                          active
                            ? 'text-primary'
                            : 'text-muted-foreground group-hover:text-foreground'
                        )}
                      />

                      <AnimatePresence initial={false}>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden whitespace-nowrap"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Link>
                  );

                  return (
                    <li key={item.label}>
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                          <TooltipContent side="right" sideOffset={8}>
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        linkContent
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* ── Collapse toggle ───────────────────────────────────── */}
        <div className="shrink-0 border-t border-border p-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggle}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5',
                  'text-sm font-medium text-muted-foreground',
                  'transition-colors duration-200',
                  'hover:bg-accent hover:text-foreground',
                  'outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
              >
                {collapsed ? (
                  <PanelLeft className="h-[18px] w-[18px] shrink-0" />
                ) : (
                  <PanelLeftClose className="h-[18px] w-[18px] shrink-0" />
                )}
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      Collapse
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            </TooltipContent>
          </Tooltip>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}

export { SIDEBAR_EXPANDED, SIDEBAR_COLLAPSED };
