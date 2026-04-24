'use client';

import React from 'react';
import Link from 'next/link';
import { Sun, Moon, Bell, LogOut, UserCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { useTheme } from '../../context/theme-context';
import { cn } from '../../lib/utils';
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  getInitials,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '../ui';
import { Breadcrumbs } from './breadcrumbs';
import { NotificationBadge } from '../notification-badge';

// ─── Component ───────────────────────────────────────────────────────────────

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const { authState, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const user = authState.user;

  // Format the role for display
  const roleDisplay = user?.role
    ? user.role
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : '';

  const roleBadgeVariant =
    user?.role === 'SUPER_ADMIN'
      ? 'destructive'
      : user?.role === 'ADMIN'
        ? 'warning'
        : 'secondary';

  return (
    <TooltipProvider delayDuration={200}>
      <header
        className={cn(
          'sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4',
          'border-b border-border bg-card/80 backdrop-blur-md',
          'px-6',
          className
        )}
      >
        {/* ── Left: Breadcrumb ──────────────────────────────── */}
        <Breadcrumbs className="mr-auto" />

        {/* ── Right: Actions ────────────────────────────────── */}
        <div className="flex items-center gap-1">
          {/* Theme toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
              >
                {isDarkMode ? (
                  <Sun className="h-[18px] w-[18px]" />
                ) : (
                  <Moon className="h-[18px] w-[18px]" />
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            </TooltipContent>
          </Tooltip>

          {/* Notification bell */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/notifications"
                className={cn(
                  'relative inline-flex h-9 w-9 items-center justify-center rounded-md',
                  'text-muted-foreground transition-colors duration-200',
                  'hover:bg-accent hover:text-foreground',
                  'outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
              >
                <Bell className="h-[18px] w-[18px]" />
                <NotificationBadge size="sm" />
                <span className="sr-only">Notifications</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Notifications</TooltipContent>
          </Tooltip>

          {/* Separator dot */}
          <div className="mx-1.5 h-5 w-px bg-border" />

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-2 py-1.5',
                  'transition-colors duration-200',
                  'hover:bg-accent',
                  'outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
              >
                <Avatar className="h-8 w-8">
                  {user?.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden flex-col items-start md:flex">
                  <span className="text-sm font-semibold text-foreground leading-tight">
                    {user?.name ?? 'User'}
                  </span>
                  <span className="text-[11px] text-muted-foreground leading-tight">
                    {user?.email ?? ''}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-1.5 pb-3">
                <span className="text-sm font-semibold">{user?.name ?? 'User'}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user?.email ?? ''}
                </span>
                {roleDisplay && (
                  <Badge
                    variant={roleBadgeVariant as 'destructive' | 'warning' | 'secondary'}
                    className="mt-0.5 w-fit text-[10px]"
                  >
                    {roleDisplay}
                  </Badge>
                )}
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile" className="cursor-pointer gap-2">
                  <UserCircle className="h-4 w-4" />
                  Profile & Settings
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                onClick={() => logout()}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── Maintenance banner ──────────────────────────────── */}
      <MaintenanceBanner />
    </TooltipProvider>
  );
}

// ─── Maintenance Banner ──────────────────────────────────────────────────────

function MaintenanceBanner() {
  // This reads from a simple global state or API check.
  // For now, check localStorage for a maintenance flag that other parts of the
  // app can set when the server responds with maintenance-mode headers.
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const check = () => {
      if (typeof window === 'undefined') return;
      const flag = localStorage.getItem('maintenance_mode');
      setVisible(flag === 'true');
    };
    check();
    // Re-check periodically
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 px-4 py-2',
        'bg-warning/15 text-warning',
        'text-xs font-semibold'
      )}
    >
      <AlertTriangle className="h-3.5 w-3.5" />
      System is in maintenance mode. Some features may be unavailable.
    </div>
  );
}
