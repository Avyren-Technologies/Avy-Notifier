'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '../context/auth-context';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

// ─── App options ──────────────────────────────────────────────────────────────

const APP_OPTIONS = [
  {
    id: 'furnace',
    label: 'Furnace Notifier',
    description: 'Real-time furnace alarm monitoring',
    details:
      'Monitor temperature, pressure, and alarms for furnace systems in real time.',
    accentFrom: 'from-orange-500',
    accentTo: 'to-red-500',
    accentBg: 'bg-orange-500/10 dark:bg-orange-500/15',
    accentBorder: 'border-orange-500',
    accentText: 'text-orange-500',
    accentRing: 'ring-orange-500/30',
    accentShadow: 'shadow-orange-500/20',
    icon: (
      <svg
        className="h-10 w-10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22c-4.97 0-9-2.69-9-6v0c0-2.5 2.5-5 5-7 0 3 2 5 4 5s4-2.5 4-6c2 2.5 5 5.5 5 8v0c0 3.31-4.03 6-9 6z" />
        <path d="M12 22c-1.66 0-3-1.12-3-2.5S10.34 17 12 17s3 1.12 3 2.5S13.66 22 12 22z" />
      </svg>
    ),
  },
  {
    id: 'meter',
    label: 'Meter Notifier',
    description: 'Electrical meter parameter tracking',
    details:
      'Track voltage, current, power consumption, and energy parameters across meters.',
    accentFrom: 'from-cyan-500',
    accentTo: 'to-blue-500',
    accentBg: 'bg-cyan-500/10 dark:bg-cyan-500/15',
    accentBorder: 'border-cyan-500',
    accentText: 'text-cyan-500',
    accentRing: 'ring-cyan-500/30',
    accentShadow: 'shadow-cyan-500/20',
    icon: (
      <svg
        className="h-10 w-10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function SelectAppPage() {
  const router = useRouter();
  const { authState, selectedAppType, setSelectedAppType } = useAuth();

  const [selected, setSelected] = useState<string | null>(
    selectedAppType ?? null
  );

  // Auth guard
  useEffect(() => {
    if (!authState.isLoading && !authState.isAuthenticated) {
      router.replace('/login');
    }
  }, [authState.isLoading, authState.isAuthenticated, router]);

  // Sync from context if user already had a selection
  useEffect(() => {
    if (selectedAppType) {
      setSelected(selectedAppType);
    }
  }, [selectedAppType]);

  const handleContinue = () => {
    if (!selected) return;
    setSelectedAppType(selected);
    router.replace('/dashboard');
  };

  // Loading gate
  if (authState.isLoading || !authState.isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <svg
          className="h-6 w-6 animate-spin text-primary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Subtle radial gradient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[500px] translate-x-1/4 translate-y-1/4 rounded-full bg-[hsl(var(--info))]/5 blur-3xl" />
      </div>

      <motion.div
        className="relative z-10 flex w-full max-w-3xl flex-col items-center"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Header */}
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-[hsl(var(--info))] to-primary shadow-lg shadow-primary/20">
          <span className="text-xl font-extrabold text-white">AV</span>
        </div>

        <h1 className="mb-2 text-center text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Choose Your Application
        </h1>

        <div className="mb-10 inline-flex rounded-full bg-primary/10 px-5 py-1.5">
          <p className="text-sm font-semibold text-primary">
            Select your monitoring application
          </p>
        </div>

        {/* Cards */}
        <div className="mb-10 grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
          {APP_OPTIONS.map((option) => {
            const isSelected = selected === option.id;

            return (
              <motion.button
                key={option.id}
                type="button"
                onClick={() => setSelected(option.id)}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'group relative flex flex-col items-center rounded-2xl border-2 p-8 text-center transition-all duration-200',
                  'bg-card shadow-sm hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isSelected
                    ? cn(option.accentBorder, option.accentShadow, 'shadow-lg')
                    : 'border-border hover:border-muted-foreground/25'
                )}
              >
                {/* Selection checkmark */}
                {isSelected && (
                  <motion.div
                    className={cn(
                      'absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br',
                      option.accentFrom,
                      option.accentTo
                    )}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 25,
                    }}
                  >
                    <svg
                      className="h-4 w-4 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </motion.div>
                )}

                {/* Icon */}
                <div
                  className={cn(
                    'mb-5 flex h-20 w-20 items-center justify-center rounded-2xl transition-colors duration-200',
                    isSelected ? option.accentBg : 'bg-muted',
                    isSelected ? option.accentText : 'text-muted-foreground'
                  )}
                >
                  {option.icon}
                </div>

                <h3 className="mb-1.5 text-lg font-bold text-card-foreground">
                  {option.label}
                </h3>

                <p className="mb-3 text-sm font-semibold text-primary/80">
                  {option.description}
                </p>

                <p className="text-xs leading-relaxed text-muted-foreground">
                  {option.details}
                </p>
              </motion.button>
            );
          })}
        </div>

        {/* Continue button */}
        <Button
          size="lg"
          onClick={handleContinue}
          disabled={!selected}
          className={cn(
            'w-full max-w-xs text-[15px] font-semibold transition-all duration-200',
            !selected && 'opacity-50'
          )}
        >
          Continue
          <svg
            className="ml-1 h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Button>

        {/* Footer hint */}
        <div className="mt-6 flex items-center gap-2 text-muted-foreground">
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span className="text-xs font-medium">
            You can change this selection later in settings
          </span>
        </div>
      </motion.div>
    </div>
  );
}
