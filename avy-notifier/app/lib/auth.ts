import { apiClient } from './api-client';
import type {
  LoginCredentials,
  AuthResponse,
  RegisterData,
  User,
} from '../types/auth';

// ─── Auth API functions ─────────────────────────────────────────────────────

/** Login with email and password. */
export async function loginApi(
  credentials: LoginCredentials,
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>(
    '/api/auth/login',
    credentials,
  );
  return data;
}

/** Register a new user account. */
export async function registerApi(
  registerData: RegisterData,
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>(
    '/api/auth/register',
    registerData,
  );
  return data;
}

/** Refresh the auth token using a refresh token. */
export async function refreshTokenApi(
  refreshToken: string,
): Promise<{ token: string; refreshToken?: string; user: User }> {
  const { data } = await apiClient.post('/api/auth/refresh', { refreshToken });
  return data;
}

/** Fetch the currently authenticated user's profile. */
export async function fetchProfile(): Promise<User> {
  const { data } = await apiClient.get<User>('/api/auth/profile');
  return data;
}

/** Update the currently authenticated user's profile. */
export async function updateProfile(
  profileData: Partial<Pick<User, 'name' | 'email' | 'avatar'>>,
): Promise<User> {
  const { data } = await apiClient.put<User>('/api/auth/profile', profileData);
  return data;
}

/** Change the currently authenticated user's password. */
export async function changePassword(passwordData: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ message: string }> {
  const { data } = await apiClient.put<{ message: string }>(
    '/api/auth/change-password',
    passwordData,
  );
  return data;
}

/** Delete the currently authenticated user's avatar. */
export async function deleteAvatar(): Promise<{ message: string }> {
  const { data } = await apiClient.delete<{ message: string }>(
    '/api/auth/avatar',
  );
  return data;
}
