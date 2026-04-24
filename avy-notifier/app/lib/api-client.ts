import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// ─── Constants ───────────────────────────────────────────────────────────────

const BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  'https://Avy-I-server-eyckc9gmbvf7bqgq.centralindia-01.azurewebsites.net'
).replace(/\/+$/, ''); // strip trailing slashes to prevent double-slash URLs

const TIMEOUT = 15000;

// localStorage keys
const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const ORGANIZATION_ID_KEY = 'organization_id';
const USER_KEY = 'user';

// ─── Helper functions ────────────────────────────────────────────────────────

/** Read the current auth token from localStorage (returns null on the server). */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/** Persist an auth token in localStorage. */
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

/** Read the current refresh token from localStorage. */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/** Persist a refresh token in localStorage. */
export function setRefreshToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

/** Read the current organization ID from localStorage. */
export function getOrganizationId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ORGANIZATION_ID_KEY);
}

/** Persist the organization ID in localStorage. */
export function setOrganizationId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ORGANIZATION_ID_KEY, id);
}

/** Read the stored user object from localStorage. */
export function getStoredUser(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_KEY);
}

/** Persist the user object (as JSON string) in localStorage. */
export function setStoredUser(user: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, user);
}

/** Remove all auth-related data from localStorage. */
export function clearAuthData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ORGANIZATION_ID_KEY);
  localStorage.removeItem(USER_KEY);
}

// ─── Auth state callback (set by AuthContext) ──────────────────────────────

type AuthStateCallback = (user: unknown) => void;
type LogoutCallback = () => void;

let _onTokenRefreshed: AuthStateCallback | null = null;
let _onAuthFailure: LogoutCallback | null = null;

/**
 * Called by AuthContext on mount to wire up the interceptor
 * to the React auth state. This allows the module-level interceptor
 * to update the React context after a successful token refresh.
 */
export function registerAuthCallbacks(
  onTokenRefreshed: AuthStateCallback,
  onAuthFailure: LogoutCallback,
) {
  _onTokenRefreshed = onTokenRefreshed;
  _onAuthFailure = onAuthFailure;
}

export function unregisterAuthCallbacks() {
  _onTokenRefreshed = null;
  _onAuthFailure = null;
}

// ─── Axios instance ─────────────────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Request interceptor ────────────────────────────────────────────────────

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const orgId = getOrganizationId();
    if (orgId) {
      config.headers['x-organization-id'] = orgId;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor (token refresh on 401) ────────────────────────────

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((p) => {
    if (error) {
      p.reject(error);
    } else {
      p.resolve(token);
    }
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only attempt refresh for 401 errors on non-auth endpoints
    const isAuthEndpoint =
      originalRequest?.url?.includes('/api/auth/login') ||
      originalRequest?.url?.includes('/api/auth/register') ||
      originalRequest?.url?.includes('/api/auth/refresh');

    if (
      error.response?.status !== 401 ||
      isAuthEndpoint ||
      originalRequest?._retry
    ) {
      return Promise.reject(error);
    }

    // If we are already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      isRefreshing = false;
      processQueue(new Error('No refresh token'), null);
      // Use the auth callback to trigger proper logout through React context
      if (_onAuthFailure) {
        _onAuthFailure();
      } else {
        clearAuthData();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }

    try {
      // Use a fresh axios instance (not apiClient) to avoid interceptor loops
      const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, {
        refreshToken,
      });

      const newToken: string = data.token;
      const newRefreshToken: string | undefined = data.refreshToken;
      const user = data.user;

      // Update localStorage
      setAuthToken(newToken);
      if (newRefreshToken) {
        setRefreshToken(newRefreshToken);
      } else {
        // Keep the old refresh token if the server didn't send a new one
        // (matches mobile behavior: newRefreshToken || refreshToken)
      }
      if (user) {
        setStoredUser(JSON.stringify(user));
      }

      // Notify the React auth context so it updates its state
      if (_onTokenRefreshed && user) {
        _onTokenRefreshed(user);
      }

      processQueue(null, newToken);

      // Retry the original request with the new token
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
      }
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);

      // Use the auth callback to trigger proper logout through React context
      if (_onAuthFailure) {
        _onAuthFailure();
      } else {
        clearAuthData();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default apiClient;
