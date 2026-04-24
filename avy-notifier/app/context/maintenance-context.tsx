'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './auth-context';
import { apiClient } from '../lib/api-client';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface MaintenanceContextType {
  isMaintenanceMode: boolean;
  checkMaintenanceStatus: () => Promise<void>;
  toggleMaintenanceMode: () => Promise<void>;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(
  undefined,
);

// ─── Provider ──────────────────────────────────────────────────────────────────

export const MaintenanceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const { authState } = useAuth();

  const checkMaintenanceStatus = async () => {
    // Prevent SUPER_ADMIN from calling this route
    if (authState.role === 'SUPER_ADMIN') return;

    try {
      const response = await apiClient.get('/api/maintenance/status');
      setIsMaintenanceMode(response.data.maintenanceMode);
    } catch (error) {
      console.error('Error checking maintenance status:', error);
    }
  };

  const toggleMaintenanceMode = async () => {
    // Prevent SUPER_ADMIN from calling this route
    if (authState.role === 'SUPER_ADMIN') return;

    try {
      const response = await apiClient.post('/api/maintenance/toggle', {});
      setIsMaintenanceMode(response.data.maintenanceMode);

      console.log(
        `Maintenance mode ${response.data.maintenanceMode ? 'ENABLED' : 'DISABLED'}`,
      );
      if (response.data.maintenanceMode) {
        console.log('SCADA data fetching will be stopped');
      } else {
        console.log('SCADA data fetching will resume');
      }
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
      throw error;
    }
  };

  // Check maintenance status on mount and when auth state changes
  useEffect(() => {
    if (authState.isAuthenticated && authState.role !== 'SUPER_ADMIN') {
      checkMaintenanceStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState.isAuthenticated, authState.role]);

  return (
    <MaintenanceContext.Provider
      value={{
        isMaintenanceMode,
        checkMaintenanceStatus,
        toggleMaintenanceMode,
      }}
    >
      {children}
    </MaintenanceContext.Provider>
  );
};

// ─── Hook ──────────────────────────────────────────────────────────────────────

export const useMaintenance = () => {
  const context = useContext(MaintenanceContext);
  if (context === undefined) {
    throw new Error(
      'useMaintenance must be used within a MaintenanceProvider',
    );
  }
  return context;
};
