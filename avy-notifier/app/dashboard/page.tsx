'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';
import { Spinner } from '../components/ui/button';

export default function DashboardIndex() {
  const router = useRouter();
  const { authState, selectedAppType } = useAuth();

  useEffect(() => {
    if (authState.isLoading) return;

    if (!authState.isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (!selectedAppType) {
      router.replace('/select-app');
      return;
    }

    if (selectedAppType === 'furnace') {
      router.replace('/dashboard/operator');
    } else {
      router.replace('/dashboard/meter-readings');
    }
  }, [authState.isLoading, authState.isAuthenticated, selectedAppType, router]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner className="h-6 w-6 text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          Loading dashboard...
        </p>
      </div>
    </div>
  );
}
