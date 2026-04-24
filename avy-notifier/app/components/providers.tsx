'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/auth-context';
import { ThemeProvider } from '../context/theme-context';
import { MaintenanceProvider } from '../context/maintenance-context';
import { Toaster } from 'sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000, retry: 1 },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <MaintenanceProvider>
            {children}
            <Toaster richColors position="top-right" />
          </MaintenanceProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
