'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/auth-context';
import { useTheme } from '../../context/theme-context';
import { useMaintenance } from '../../context/maintenance-context';
import { apiClient } from '../../lib/api-client';
import type { NotificationSettings } from '../../types/notification';
import { Button, Spinner } from '../../components/ui/button';
import { Input, PasswordInput } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Avatar, AvatarImage, AvatarFallback, getInitials } from '../../components/ui/avatar';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
} from '../../components/ui/modal';
import { TimeRangePicker } from '../../components/time-range-picker';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProfileResponse {
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    createdAt: string;
    updatedAt: string;
  };
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { authState, updateUser, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { isMaintenanceMode, toggleMaintenanceMode } = useMaintenance();
  const queryClient = useQueryClient();

  // ── Profile form state ──────────────────────────────────────────────────
  const [name, setName] = useState(authState.user?.name || '');
  const [email, setEmail] = useState(authState.user?.email || '');
  const [editingProfile, setEditingProfile] = useState(false);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');

  // ── Password form state ─────────────────────────────────────────────────
  const [passwordFormVisible, setPasswordFormVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // ── Notification settings state ─────────────────────────────────────────
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    pushEnabled: true,
    emailEnabled: false,
    criticalOnly: false,
  });

  // ── Modal states ────────────────────────────────────────────────────────
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [maintenanceAction, setMaintenanceAction] = useState<'enable' | 'disable'>('enable');
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const isSuperAdmin = authState.user?.role === 'SUPER_ADMIN';
  const isAdmin = authState.user?.role === 'ADMIN';

  // ── Fetch profile ─────────────────────────────────────────────────────
  useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await apiClient.get<ProfileResponse>('/api/auth/profile');
      if (response.data.user) {
        updateUser(response.data.user);
      }
      return response.data;
    },
    staleTime: 300000,
    enabled: authState.isAuthenticated && !!authState.user,
  });

  // ── Fetch notification settings ───────────────────────────────────────
  const { data: settingsData } = useQuery({
    queryKey: ['notificationSettings'],
    queryFn: async () => {
      const { data } = await apiClient.get<NotificationSettings>(
        '/api/notifications/settings',
      );
      return data;
    },
    enabled: authState.isAuthenticated && !isSuperAdmin,
  });

  useEffect(() => {
    if (settingsData) {
      setNotificationSettings(settingsData);
    }
  }, [settingsData]);

  useEffect(() => {
    setName(authState.user?.name || '');
    setEmail(authState.user?.email || '');
  }, [authState.user]);

  // ── Profile update mutation ───────────────────────────────────────────
  const profileMutation = useMutation({
    mutationFn: async (data: { name: string; email: string }) => {
      const response = await apiClient.put<ProfileResponse>('/api/auth/profile', data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.user) updateUser(data.user);
      setEditingProfile(false);
    },
  });

  // ── Password change mutation ──────────────────────────────────────────
  const passwordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiClient.put('/api/auth/change-password', data);
      return response.data;
    },
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordFormVisible(false);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err?.response?.data?.message || 'An error occurred';
      if (msg.includes('Current password')) {
        setCurrentPasswordError(msg);
      }
    },
  });

  // ── Notification settings mutation ────────────────────────────────────
  const notificationMutation = useMutation({
    mutationFn: async (settings: Partial<NotificationSettings>) => {
      const { data } = await apiClient.put<NotificationSettings>(
        '/api/notifications/settings',
        settings,
      );
      return data;
    },
    onSuccess: (data) => {
      setNotificationSettings(data);
      queryClient.invalidateQueries({ queryKey: ['notificationSettings'] });
    },
  });

  // ── Avatar mutations ──────────────────────────────────────────────────
  const removeAvatarMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete<ProfileResponse>('/api/auth/avatar');
      return response.data;
    },
    onSuccess: (data) => {
      if (data.user) updateUser(data.user);
    },
  });

  // ── Validation functions ──────────────────────────────────────────────
  const validateName = useCallback((value: string): boolean => {
    if (!value.trim()) {
      setNameError('Name is required');
      return false;
    }
    if (value.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      return false;
    }
    setNameError('');
    return true;
  }, []);

  const validateEmail = useCallback((value: string): boolean => {
    if (!value.trim()) {
      setEmailError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  }, []);

  const validateCurrentPassword = useCallback((value: string): boolean => {
    if (!value) {
      setCurrentPasswordError('Current password is required');
      return false;
    }
    setCurrentPasswordError('');
    return true;
  }, []);

  const validateNewPassword = useCallback((value: string): boolean => {
    if (!value) {
      setNewPasswordError('New password is required');
      return false;
    }
    if (value.length < 6) {
      setNewPasswordError('Password must be at least 6 characters');
      return false;
    }
    setNewPasswordError('');
    return true;
  }, []);

  const validateConfirmPassword = useCallback(
    (value: string): boolean => {
      if (!value) {
        setConfirmPasswordError('Please confirm your password');
        return false;
      }
      if (value !== newPassword) {
        setConfirmPasswordError('Passwords do not match');
        return false;
      }
      setConfirmPasswordError('');
      return true;
    },
    [newPassword],
  );

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleProfileSave = useCallback(() => {
    const isNameValid = validateName(name);
    const isEmailValid = validateEmail(email);
    if (isNameValid && isEmailValid) {
      profileMutation.mutate({ name, email });
    }
  }, [name, email, validateName, validateEmail, profileMutation]);

  const handlePasswordChange = useCallback(() => {
    const a = validateCurrentPassword(currentPassword);
    const b = validateNewPassword(newPassword);
    const c = validateConfirmPassword(confirmPassword);
    if (a && b && c) {
      passwordMutation.mutate({ currentPassword, newPassword });
    }
  }, [
    currentPassword,
    newPassword,
    confirmPassword,
    validateCurrentPassword,
    validateNewPassword,
    validateConfirmPassword,
    passwordMutation,
  ]);

  const cancelProfileEdit = useCallback(() => {
    setName(authState.user?.name || '');
    setEmail(authState.user?.email || '');
    setNameError('');
    setEmailError('');
    setEditingProfile(false);
  }, [authState.user]);

  const handleToggleSetting = useCallback(
    (setting: keyof NotificationSettings) => {
      setNotificationSettings((prev) => {
        const newSettings = { ...prev, [setting]: !prev[setting] };
        notificationMutation.mutate(newSettings);
        return newSettings;
      });
    },
    [notificationMutation],
  );

  const handleMuteHoursSelected = useCallback(
    (fromHour: number, toHour: number) => {
      const updated = { ...notificationSettings, muteFrom: fromHour, muteTo: toHour };
      setNotificationSettings(updated);
      notificationMutation.mutate(updated);
      setTimePickerOpen(false);
    },
    [notificationSettings, notificationMutation],
  );

  const handleMaintenanceToggle = useCallback(
    (action: 'enable' | 'disable') => {
      setMaintenanceAction(action);
      setMaintenanceModalOpen(true);
    },
    [],
  );

  const confirmMaintenanceToggle = useCallback(async () => {
    try {
      await toggleMaintenanceMode();
      setMaintenanceModalOpen(false);
    } catch {
      // Error is handled internally
    }
  }, [toggleMaintenanceMode]);

  const handleAvatarUpload = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setAvatarUploading(true);
      setAvatarMenuOpen(false);

      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          const response = await apiClient.put<ProfileResponse>('/api/auth/profile', {
            avatar: base64,
          });
          if (response.data.user) {
            updateUser(response.data.user);
            queryClient.invalidateQueries({ queryKey: ['profile'] });
          }
          setAvatarUploading(false);
        };
        reader.readAsDataURL(file);
      } catch {
        setAvatarUploading(false);
      }
    };
    input.click();
  }, [updateUser, queryClient]);

  const handleRemoveAvatar = useCallback(() => {
    setAvatarMenuOpen(false);
    if (authState.user?.avatar) {
      removeAvatarMutation.mutate();
    }
  }, [authState.user, removeAvatarMutation]);

  const handleLogout = useCallback(() => {
    setLogoutModalOpen(false);
    logout();
  }, [logout]);

  // ── Loading state ─────────────────────────────────────────────────────
  if (authState.isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Profile &amp; Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* ── User Profile Section ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>User Profile</CardTitle>
          {!editingProfile ? (
            <Button variant="ghost" size="sm" onClick={() => setEditingProfile(true)}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-1.5"
              >
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
              Edit
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={cancelProfileEdit}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleProfileSave}
                disabled={profileMutation.isPending}
              >
                {profileMutation.isPending ? (
                  <Spinner className="mr-1.5 h-3.5 w-3.5" />
                ) : null}
                Save
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6 sm:flex-row">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  {avatarUploading || removeAvatarMutation.isPending ? (
                    <AvatarFallback>
                      <Spinner className="h-5 w-5" />
                    </AvatarFallback>
                  ) : authState.user?.avatar ? (
                    <AvatarImage src={authState.user.avatar} alt={authState.user.name} />
                  ) : (
                    <AvatarFallback className="text-lg">
                      {getInitials(authState.user?.name)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <button
                  type="button"
                  onClick={() => setAvatarMenuOpen(true)}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                </button>
              </div>
              <Badge variant={authState.user?.role === 'ADMIN' ? 'default' : authState.user?.role === 'SUPER_ADMIN' ? 'destructive' : 'secondary'}>
                {authState.user?.role === 'ADMIN'
                  ? 'Admin'
                  : authState.user?.role === 'SUPER_ADMIN'
                    ? 'Super Admin'
                    : 'Operator'}
              </Badge>
            </div>

            {/* Profile fields */}
            <div className="flex-1 space-y-4">
              {editingProfile ? (
                <>
                  <Input
                    label="Name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      validateName(e.target.value);
                    }}
                    error={nameError}
                    placeholder="Your name"
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      validateEmail(e.target.value);
                    }}
                    error={emailError}
                    placeholder="Your email"
                  />
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Name</p>
                    <p className="text-sm font-medium text-foreground">
                      {authState.user?.name || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Email</p>
                    <p className="text-sm font-medium text-foreground">
                      {authState.user?.email || 'Not set'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Change Password (collapsible) ──────────────────────── */}
          <div className="mt-6 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setPasswordFormVisible(!passwordFormVisible)}
              className="flex w-full items-center justify-between py-1 text-sm font-semibold text-foreground"
            >
              Change Password
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-200 ${passwordFormVisible ? 'rotate-180' : ''}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {passwordFormVisible && (
              <div className="mt-4 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Current Password
                  </label>
                  <PasswordInput
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      validateCurrentPassword(e.target.value);
                    }}
                    placeholder="Enter current password"
                    error={currentPasswordError}
                  />
                  {currentPasswordError && (
                    <p className="text-xs text-destructive">{currentPasswordError}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">
                    New Password
                  </label>
                  <PasswordInput
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      validateNewPassword(e.target.value);
                    }}
                    placeholder="Enter new password"
                    error={newPasswordError}
                  />
                  {newPasswordError && (
                    <p className="text-xs text-destructive">{newPasswordError}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Confirm New Password
                  </label>
                  <PasswordInput
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      validateConfirmPassword(e.target.value);
                    }}
                    placeholder="Confirm new password"
                    error={confirmPasswordError}
                  />
                  {confirmPasswordError && (
                    <p className="text-xs text-destructive">{confirmPasswordError}</p>
                  )}
                </div>
                <Button
                  onClick={handlePasswordChange}
                  disabled={passwordMutation.isPending}
                  className="w-full"
                >
                  {passwordMutation.isPending ? (
                    <Spinner className="mr-1.5 h-3.5 w-3.5" />
                  ) : null}
                  Change Password
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Notification Settings ────────────────────────────────────── */}
      {!isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {/* Push Notifications */}
            <div className="flex items-center justify-between border-b border-border py-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">Push Notifications</p>
                <p className="text-xs text-muted-foreground">
                  Receive notifications on your device
                </p>
              </div>
              <Switch
                checked={notificationSettings.pushEnabled}
                onCheckedChange={() => handleToggleSetting('pushEnabled')}
                disabled={notificationMutation.isPending}
              />
            </div>

            {/* Email Notifications */}
            <div className="flex items-center justify-between border-b border-border py-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">Email Notifications</p>
                <p className="text-xs text-muted-foreground">
                  Receive alarm notifications via email
                </p>
              </div>
              <Switch
                checked={notificationSettings.emailEnabled}
                onCheckedChange={() => handleToggleSetting('emailEnabled')}
                disabled={notificationMutation.isPending}
              />
            </div>

            {/* Critical Only */}
            <div className="flex items-center justify-between border-b border-border py-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">Critical Alarms Only</p>
                <p className="text-xs text-muted-foreground">
                  Only receive notifications for critical alarms
                </p>
              </div>
              <Switch
                checked={notificationSettings.criticalOnly}
                onCheckedChange={() => handleToggleSetting('criticalOnly')}
                disabled={notificationMutation.isPending}
              />
            </div>

            {/* Mute Hours */}
            <div className="flex items-center justify-between py-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">Mute Hours</p>
                <p className="text-xs text-muted-foreground">
                  {notificationSettings.muteFrom != null && notificationSettings.muteTo != null
                    ? `Muted from ${formatHour(notificationSettings.muteFrom)} to ${formatHour(notificationSettings.muteTo)}`
                    : 'Set quiet hours for notifications'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setTimePickerOpen(true)}>
                Configure
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── App Settings ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>App Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">Dark Mode</p>
              <p className="text-xs text-muted-foreground">
                Use dark theme for the app
              </p>
            </div>
            <Switch checked={isDarkMode} onCheckedChange={toggleTheme} />
          </div>
        </CardContent>
      </Card>

      {/* ── Maintenance Mode (admin only) ───────────────────────────── */}
      {isAdmin && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Maintenance Mode</CardTitle>
            <Badge variant={isMaintenanceMode ? 'destructive' : 'success'}>
              {isMaintenanceMode ? 'Active' : 'Inactive'}
            </Badge>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              {isMaintenanceMode
                ? 'Maintenance mode is currently active. Non-admin users will see a maintenance screen.'
                : 'Maintenance mode is currently inactive. All users have normal access.'}
            </p>
            <Button
              variant={isMaintenanceMode ? 'default' : 'destructive'}
              onClick={() =>
                handleMaintenanceToggle(isMaintenanceMode ? 'disable' : 'enable')
              }
              className="w-full"
            >
              {isMaintenanceMode ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Logout ───────────────────────────────────────────────────── */}
      <Button
        variant="destructive"
        className="w-full"
        onClick={() => setLogoutModalOpen(true)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-2"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Logout
      </Button>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <p className="pb-4 text-center text-xs text-muted-foreground">
        &copy; 2025 Avyren Technologies. All rights reserved.
      </p>

      {/* ── Logout Confirmation Modal ──────────────────────────────── */}
      <Modal open={logoutModalOpen} onOpenChange={setLogoutModalOpen}>
        <ModalContent className="max-w-sm">
          <ModalHeader>
            <ModalTitle>Confirm Logout</ModalTitle>
            <ModalDescription>Are you sure you want to log out?</ModalDescription>
          </ModalHeader>
          <ModalFooter className="mt-4">
            <Button variant="outline" onClick={() => setLogoutModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Logout
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── Maintenance Confirmation Modal ──────────────────────────── */}
      <Modal open={maintenanceModalOpen} onOpenChange={setMaintenanceModalOpen}>
        <ModalContent className="max-w-sm">
          <ModalHeader>
            <ModalTitle>
              {maintenanceAction === 'enable'
                ? 'Enable Maintenance Mode'
                : 'Disable Maintenance Mode'}
            </ModalTitle>
            <ModalDescription>
              {maintenanceAction === 'enable'
                ? 'This will restrict access for all non-admin users.'
                : 'This will restore access for all users.'}
            </ModalDescription>
          </ModalHeader>
          <ModalFooter className="mt-4">
            <Button variant="outline" onClick={() => setMaintenanceModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={maintenanceAction === 'enable' ? 'destructive' : 'default'}
              onClick={confirmMaintenanceToggle}
            >
              {maintenanceAction === 'enable' ? 'Enable' : 'Disable'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── Avatar Options Modal ───────────────────────────────────── */}
      <Modal open={avatarMenuOpen} onOpenChange={setAvatarMenuOpen}>
        <ModalContent className="max-w-xs">
          <ModalHeader>
            <ModalTitle>Update Profile Picture</ModalTitle>
          </ModalHeader>
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={handleAvatarUpload}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Choose from File
            </button>
            <button
              type="button"
              onClick={handleRemoveAvatar}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Remove Photo
            </button>
          </div>
          <ModalFooter className="mt-4">
            <Button variant="outline" className="w-full" onClick={() => setAvatarMenuOpen(false)}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── Time Range Picker ──────────────────────────────────────── */}
      <TimeRangePicker
        open={timePickerOpen}
        onClose={() => setTimePickerOpen(false)}
        onTimeSelected={handleMuteHoursSelected}
        initialFrom={notificationSettings.muteFrom ?? 22}
        initialTo={notificationSettings.muteTo ?? 7}
      />
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatHour(hour: number): string {
  if (hour === 0) return '12:00 AM';
  if (hour === 12) return '12:00 PM';
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}
