'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/auth-context';

export default function Home() {
  const { authState } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authState.isLoading) return;

    if (authState.isAuthenticated) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [authState.isLoading, authState.isAuthenticated, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-5">
        {/* Logo mark */}
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-[hsl(var(--info))] to-primary shadow-xl shadow-primary/20">
          <span className="text-xl font-extrabold tracking-tight text-white">
            AV
          </span>
          {/* Pulse ring */}
          <span className="absolute inset-0 animate-ping rounded-2xl bg-primary/20" />
        </div>

        {/* Spinner */}
        <svg
          className="h-5 w-5 animate-spin text-primary"
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

        <p className="text-sm font-medium text-muted-foreground">
          Initializing...
        </p>
      </div>
    </div>
  );
}
