'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '../context/auth-context';
import { Sidebar, SIDEBAR_EXPANDED, SIDEBAR_COLLAPSED } from '../components/layout/sidebar';
import { Header } from '../components/layout/header';
import { Spinner } from '../components/ui';
import { cn } from '../lib/utils';

// ─── Breakpoint for auto-collapse ───────────────────────────────────────────

const COLLAPSE_BREAKPOINT = 1024;

// ─── Component ──────────────────────────────────────────────────────────────

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { authState } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  // ── Auto-collapse on smaller screens ───────────────────────────────────────

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${COLLAPSE_BREAKPOINT}px)`);

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setCollapsed(e.matches);
    };

    // Set initial value
    handleChange(mql);

    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  // ── Auth guard ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authState.isLoading && !authState.isAuthenticated) {
      router.replace('/login');
    }
  }, [authState.isLoading, authState.isAuthenticated, router]);

  // ── Loading state ──────────────────────────────────────────────────────────

  if (authState.isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl',
              'bg-gradient-to-br from-primary to-info shadow-lg shadow-primary/25'
            )}
          >
            <span className="text-lg font-extrabold text-white">AV</span>
          </div>
          <Spinner className="h-5 w-5 text-primary" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ── Not authenticated ──────────────────────────────────────────────────────

  if (!authState.isAuthenticated) {
    return null;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      {/* Main area (offset by sidebar width) */}
      <motion.div
        className="flex flex-1 flex-col overflow-hidden"
        initial={false}
        animate={{ marginLeft: sidebarWidth }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* Header */}
        <Header />

        {/* Content area */}
        <main
          className={cn(
            'flex-1 overflow-y-auto overflow-x-hidden',
            'px-6 py-6',
            'scrollbar-thin'
          )}
        >
          {children}
        </main>
      </motion.div>
    </div>
  );
}
