'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { User, AuthState, LoginCredentials } from '../types/auth';
import { loginApi, refreshTokenApi } from '../lib/auth';
import {
  getAuthToken,
  setAuthToken,
  getRefreshToken,
  setRefreshToken,
  getStoredUser,
  setStoredUser,
  clearAuthData,
  setOrganizationId,
  apiClient,
} from '../lib/api-client';

// ─── Storage keys ──────────────────────────────────────────────────────────────

const ONBOARDING_KEY = 'hasSeenOnboarding';
const SELECTED_APP_KEY = 'selected_app_type';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ErrorType = 'error' | 'warning' | 'info';

interface AuthContextProps {
  authState: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (userData: Partial<User>) => void;
  hasSeenOnboarding: boolean | null;
  refreshAuthToken: () => Promise<string | null>;
  selectedAppType: string | null;
  setSelectedAppType: (type: string) => void;
  organizationId: string | null;
  role: string | null;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// ─── Provider ──────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
    errorType: 'error',
    organizationId: null,
    role: null,
  });

  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(
    null,
  );
  const [selectedAppType, setSelectedAppTypeState] = useState<string | null>(
    null,
  );

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Read a value from localStorage (SSR-safe). */
  const readLocal = (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  };

  /** Write a value to localStorage (SSR-safe). */
  const writeLocal = (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  };

  /** Remove a value from localStorage (SSR-safe). */
  const removeLocal = (key: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  };

  // ── Load session on mount ──────────────────────────────────────────────────

  useEffect(() => {
    const loadSession = () => {
      try {
        const token = getAuthToken();
        const userJson = getStoredUser();
        const onboardingValue = readLocal(ONBOARDING_KEY);
        const appType = readLocal(SELECTED_APP_KEY);

        setHasSeenOnboarding(onboardingValue === 'true');
        setSelectedAppTypeState(appType);

        if (token && userJson) {
          const user = JSON.parse(userJson) as User;

          setAuthState({
            user,
            isLoading: false,
            isAuthenticated: true,
            error: null,
            errorType: 'error',
            organizationId: user.organizationId || null,
            role: user.role || null,
          });
        } else {
          setAuthState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: 'Failed to load user data',
          errorType: 'error',
          organizationId: null,
          role: null,
        });
      }
    };

    loadSession();
  }, []);

  // ── Route protection ───────────────────────────────────────────────────────

  useEffect(() => {
    if (authState.isLoading) return;

    const isLoginPage = pathname === '/login' || pathname === '/';
    const isDashboardRoute = pathname.startsWith('/dashboard');

    // Not authenticated and trying to access protected page
    if (!authState.isAuthenticated && isDashboardRoute) {
      router.replace('/login');
      return;
    }

    // Authenticated but on login page — redirect to dashboard
    if (authState.isAuthenticated && isLoginPage) {
      router.replace('/dashboard');
      return;
    }
  }, [authState.isAuthenticated, authState.isLoading, pathname, router]);

  // ── Login ──────────────────────────────────────────────────────────────────

  const login = async (credentials: LoginCredentials) => {
    setAuthState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      errorType: 'error',
    }));

    try {
      const response = await loginApi(credentials);
      const { user, token, refreshToken } = response;

      const organizationId = user?.organizationId || null;
      const role = user?.role || null;

      // Persist to localStorage
      setAuthToken(token);
      if (refreshToken) setRefreshToken(refreshToken);
      setStoredUser(JSON.stringify(user));
      if (organizationId) setOrganizationId(organizationId);
      writeLocal('organizationId', organizationId || '');
      writeLocal('role', role || '');

      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: true,
        error: null,
        errorType: 'error',
        organizationId,
        role,
      });

      router.replace('/dashboard');
    } catch (error: unknown) {
      let errorMessage = 'An error occurred while logging in';
      let errorType: ErrorType = 'error';

      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error
      ) {
        const axiosErr = error as {
          response?: {
            status: number;
            data?: { error?: { message?: string }; message?: string };
          };
          request?: unknown;
          code?: string;
          message?: string;
        };

        if (axiosErr.response) {
          const status = axiosErr.response.status;
          const serverMsg =
            axiosErr.response.data?.error?.message ||
            axiosErr.response.data?.message;

          switch (status) {
            case 400:
              errorMessage =
                'Please check your login details and try again';
              break;
            case 401:
              errorMessage = serverMsg || 'Your email or password is incorrect. Please try again.';
              break;
            case 403:
              if (serverMsg?.includes('organization is currently disabled')) {
                errorMessage = serverMsg;
                errorType = 'warning';
              } else {
                errorMessage =
                  'Your account is not authorized to access this application.';
              }
              break;
            case 404:
              errorMessage =
                'Login service is currently unavailable. Please try again later.';
              errorType = 'warning';
              break;
            case 429:
              errorMessage =
                'Too many login attempts. Please try again later.';
              errorType = 'warning';
              break;
            case 500:
            case 502:
            case 503:
            case 504:
              errorMessage =
                'Service is currently unavailable. Please try again later.';
              errorType = 'warning';
              break;
            default:
              if (serverMsg) {
                errorMessage = serverMsg;
                if (serverMsg.includes('organization is currently disabled')) {
                  errorType = 'warning';
                }
              }
          }
        } else if (axiosErr.request) {
          if (axiosErr.code === 'ERR_NETWORK') {
            errorMessage =
              'Cannot connect to server. Please check your network connection.';
            errorType = 'warning';
          } else if (axiosErr.code === 'ECONNABORTED') {
            errorMessage = 'The request timed out. Please try again.';
            errorType = 'warning';
          } else {
            errorMessage =
              'No response from server. Please try again later.';
            errorType = 'warning';
          }
        }
      }

      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: errorMessage,
        errorType,
        organizationId: null,
        role: null,
      });
    }
  };

  // ── Logout ─────────────────────────────────────────────────────────────────

  const logout = async () => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      // Clear React Query cache
      queryClient.clear();

      // Clear all stored auth data
      clearAuthData();
      removeLocal('organizationId');
      removeLocal('role');
      // Keep app selection for next login

      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
        errorType: 'error',
        organizationId: null,
        role: null,
      });

      router.replace('/login');
    } catch {
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to logout',
        errorType: 'error',
      }));
    }
  };

  // ── Update user ────────────────────────────────────────────────────────────

  const updateUser = useCallback((userData: Partial<User>) => {
    setAuthState((prev) => {
      const updatedUser = prev.user ? { ...prev.user, ...userData } : null;
      if (updatedUser) {
        setStoredUser(JSON.stringify(updatedUser));
      }
      return { ...prev, user: updatedUser };
    });
  }, []);

  // ── Refresh auth token ─────────────────────────────────────────────────────

  const refreshAuthToken = async (): Promise<string | null> => {
    try {
      const storedRefreshToken = getRefreshToken();
      if (!storedRefreshToken) return null;

      const data = await refreshTokenApi(storedRefreshToken);
      const { token: newToken, refreshToken: newRefreshToken, user } = data;

      setAuthToken(newToken);
      if (newRefreshToken) setRefreshToken(newRefreshToken);
      setStoredUser(JSON.stringify(user));

      setAuthState((prev) => ({
        ...prev,
        user,
        isAuthenticated: true,
        error: null,
        errorType: 'error',
      }));

      return newToken;
    } catch {
      clearAuthData();
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: 'Session expired. Please log in again.',
        errorType: 'error',
        organizationId: null,
        role: null,
      });
      return null;
    }
  };

  // ── Selected app type ──────────────────────────────────────────────────────

  const setSelectedAppType = (type: string) => {
    writeLocal(SELECTED_APP_KEY, type);
    setSelectedAppTypeState(type);
  };

  // ── Clear error ────────────────────────────────────────────────────────────

  const clearError = () => {
    setAuthState((prev) => ({ ...prev, error: null }));
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider
      value={{
        authState,
        login,
        logout,
        clearError,
        updateUser,
        hasSeenOnboarding,
        refreshAuthToken,
        selectedAppType,
        setSelectedAppType,
        organizationId: authState.organizationId,
        role: authState.role,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ──────────────────────────────────────────────────────────────────────

export const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
