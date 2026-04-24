'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../context/auth-context';
import { apiClient } from '../../../lib/api-client';
import type { User } from '../../../types/auth';
import { Button, Spinner } from '../../../components/ui/button';
import { Input, PasswordInput } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '../../../components/ui/data-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
} from '../../../components/ui/modal';

// ─── Types ──────────────────────────────────────────────────────────────────

type FormMode = 'create' | 'edit';

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'OPERATOR';
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { authState } = useAuth();
  const queryClient = useQueryClient();

  // ── Form state ──────────────────────────────────────────────────────────
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [formVisible, setFormVisible] = useState(false);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'OPERATOR',
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // ── Delete modal ────────────────────────────────────────────────────────
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // ── Fetch users ─────────────────────────────────────────────────────────
  const {
    data: users = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<User[]>({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const { data } = await apiClient.get<User[]>('/api/admin/users');
      return data;
    },
    enabled: authState.isAuthenticated && authState.user?.role === 'ADMIN',
  });

  // ── Create user mutation ────────────────────────────────────────────────
  const createMutation = useMutation<User, Error, UserFormData>({
    mutationFn: async (formValues) => {
      const { data } = await apiClient.post<User>('/api/admin/users', formValues);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      closeForm();
    },
  });

  // ── Update user mutation ────────────────────────────────────────────────
  const updateMutation = useMutation<
    User,
    Error,
    { id: string; userData: Partial<UserFormData> }
  >({
    mutationFn: async ({ id, userData }) => {
      const { data } = await apiClient.put<User>(`/api/admin/users/${id}`, userData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      closeForm();
    },
  });

  // ── Delete user mutation ────────────────────────────────────────────────
  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/api/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setDeleteModalOpen(false);
      setUserToDelete(null);
    },
  });

  // ── Filter out current user ─────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    if (!authState.user) return users;
    return users.filter((u) => u.id !== authState.user?.id);
  }, [users, authState.user]);

  // ── Validation ──────────────────────────────────────────────────────────
  const validateForm = useCallback((): boolean => {
    const errors: FormErrors = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'A valid email is required';
    } else {
      // Check for duplicate email
      const duplicate = users.find(
        (u) =>
          u.email.toLowerCase() === formData.email.trim().toLowerCase() &&
          u.id !== selectedUserId,
      );
      if (duplicate) {
        errors.email = 'A user with this email already exists';
      }
    }

    if (formMode === 'create' && (!formData.password.trim() || formData.password.length < 6)) {
      errors.password = 'Password is required and must be at least 6 characters';
    }
    if (formMode === 'edit' && formData.password.trim() && formData.password.length < 6) {
      errors.password = 'New password must be at least 6 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, formMode, selectedUserId, users]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const closeForm = useCallback(() => {
    setFormVisible(false);
    setFormData({ name: '', email: '', password: '', role: 'OPERATOR' });
    setFormErrors({});
    setSelectedUserId(null);
  }, []);

  const handleCreateUser = useCallback(() => {
    setFormMode('create');
    setFormData({ name: '', email: '', password: '', role: 'OPERATOR' });
    setFormErrors({});
    setSelectedUserId(null);
    setFormVisible(true);
  }, []);

  const handleEditUser = useCallback(
    (user: User) => {
      if (authState.user && user.id === authState.user.id) return;
      setFormMode('edit');
      setSelectedUserId(user.id);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role as 'ADMIN' | 'OPERATOR',
      });
      setFormErrors({});
      setFormVisible(true);
    },
    [authState.user],
  );

  const handleDeleteUser = useCallback(
    (user: User) => {
      if (authState.user && user.id === authState.user.id) return;
      setUserToDelete(user);
      setDeleteModalOpen(true);
    },
    [authState.user],
  );

  const handleSubmit = useCallback(() => {
    if (!validateForm()) return;

    const payload: Partial<UserFormData> = {
      name: formData.name,
      email: formData.email,
      role: formData.role,
    };
    if (formData.password.trim()) {
      payload.password = formData.password;
    }

    if (formMode === 'create') {
      createMutation.mutate(payload as UserFormData);
    } else if (selectedUserId) {
      updateMutation.mutate({ id: selectedUserId, userData: payload });
    }
  }, [formData, formMode, selectedUserId, validateForm, createMutation, updateMutation]);

  const isMutating = createMutation.isPending || updateMutation.isPending;

  // ── Loading state ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-28" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 p-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-destructive"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h3 className="text-lg font-semibold text-foreground">Error Loading Users</h3>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'Failed to load users'}
        </p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            User Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create, edit, and manage users
          </p>
        </div>
        <Button onClick={handleCreateUser}>
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
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          Add User
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableEmpty colSpan={5} message="No users found. Add a new user to get started." />
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={user.role === 'ADMIN' ? 'default' : 'secondary'}
                      >
                        {user.role === 'ADMIN' ? 'Admin' : 'Operator'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditUser(user)}
                          title="Edit user"
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
                          >
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            <path d="m15 5 4 4" />
                          </svg>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteUser(user)}
                          title="Delete user"
                          className="text-destructive hover:text-destructive"
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
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Add / Edit User Modal ──────────────────────────────────── */}
      <Modal open={formVisible} onOpenChange={(open) => !open && closeForm()}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>
              {formMode === 'create' ? 'Create New User' : 'Edit User'}
            </ModalTitle>
            <ModalDescription>
              {formMode === 'create'
                ? 'Fill in the details to create a new user.'
                : 'Update the user details below.'}
            </ModalDescription>
          </ModalHeader>

          <div className="mt-4 space-y-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (formErrors.name) setFormErrors((p) => ({ ...p, name: undefined }));
              }}
              error={formErrors.name}
              placeholder="Enter name"
              autoCapitalize="words"
            />

            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (formErrors.email) setFormErrors((p) => ({ ...p, email: undefined }));
              }}
              error={formErrors.email}
              placeholder="Enter email"
              autoCapitalize="none"
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Password{' '}
                {formMode === 'edit' && (
                  <span className="font-normal text-muted-foreground">
                    (leave blank to keep current)
                  </span>
                )}
              </label>
              <PasswordInput
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (formErrors.password)
                    setFormErrors((p) => ({ ...p, password: undefined }));
                }}
                placeholder="Enter password"
                error={formErrors.password}
              />
              {formErrors.password && (
                <p className="text-xs text-destructive">{formErrors.password}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Role</label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value as 'ADMIN' | 'OPERATOR' })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPERATOR">Operator</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <ModalFooter className="mt-6">
            <Button variant="outline" onClick={closeForm} disabled={isMutating}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isMutating}>
              {isMutating ? <Spinner className="mr-1.5 h-3.5 w-3.5" /> : null}
              {formMode === 'create' ? 'Create' : 'Update'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── Delete Confirmation Modal ──────────────────────────────── */}
      <Modal open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <ModalContent className="max-w-sm">
          <ModalHeader>
            <ModalTitle>Confirm Delete</ModalTitle>
            <ModalDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-destructive">{userToDelete?.email}</span>?
              This action cannot be undone.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => userToDelete && deleteMutation.mutate(userToDelete.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Spinner className="mr-1.5 h-3.5 w-3.5" />
              ) : null}
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
