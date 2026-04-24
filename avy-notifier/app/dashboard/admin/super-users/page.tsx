'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../../../context/auth-context';
import { useSuperAdminUsers, type UserForm } from '../../../hooks/use-super-admin';
import { useOrganizations } from '../../../hooks/use-organizations';
import type { SuperAdminUser } from '../../../types/organization';
import { Button, Spinner } from '../../../components/ui/button';
import { Input, PasswordInput } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent } from '../../../components/ui/card';
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

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  organizationId?: string;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function SuperUsersPage() {
  const { authState } = useAuth();
  const isSuperAdmin = authState.user?.role === 'SUPER_ADMIN';
  const currentUserId = authState.user?.id;

  const { organizations } = useOrganizations();

  // ── Org filter ──────────────────────────────────────────────────────────
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(
    undefined,
  );
  const {
    users,
    isLoading,
    createUser,
    updateUser,
    deleteUser,
    refetchUsers,
  } = useSuperAdminUsers(selectedOrgId);

  // ── Modal state ─────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit'>('add');
  const [selectedUser, setSelectedUser] = useState<SuperAdminUser | null>(null);
  const [form, setForm] = useState<UserForm>({
    name: '',
    email: '',
    password: '',
    role: 'OPERATOR',
    organizationId: '',
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isMutating, setIsMutating] = useState(false);

  // ── Delete modal ────────────────────────────────────────────────────────
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<SuperAdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Guard ─────────────────────────────────────────────────────────────
  if (!authState.isLoading && !isSuperAdmin) {
    return (
      <div className="flex h-96 items-center justify-center p-6">
        <p className="text-muted-foreground">
          Only Super Admins can access this page.
        </p>
      </div>
    );
  }

  // ── Sort users ────────────────────────────────────────────────────────
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      if (a.role === 'SUPER_ADMIN' && b.role !== 'SUPER_ADMIN') return -1;
      if (a.role !== 'SUPER_ADMIN' && b.role === 'SUPER_ADMIN') return 1;
      return 0;
    });
  }, [users]);

  // ── Validation ──────────────────────────────────────────────────────────
  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateForm = useCallback((): boolean => {
    const errors: FormErrors = {};

    if (!form.name.trim()) {
      errors.name = 'Name is required';
    } else if (form.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!form.email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(form.email.trim())) {
      errors.email = 'Please enter a valid email address';
    } else {
      // Duplicate check
      const duplicate = users.find(
        (u) =>
          u.email.toLowerCase() === form.email.trim().toLowerCase() &&
          u.organizationId === form.organizationId &&
          u.id !== selectedUser?.id,
      );
      if (duplicate) {
        errors.email = 'A user with this email already exists in this organization';
      }
    }

    if (modalType === 'add') {
      if (!form.password) {
        errors.password = 'Password is required';
      } else if (form.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
    } else if (form.password && form.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!form.role || !['ADMIN', 'OPERATOR'].includes(form.role)) {
      errors.role = 'Please select a valid role';
    }

    if (!form.organizationId) {
      errors.organizationId = 'Organization is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form, modalType, users, selectedUser]);

  // ── Real-time email validation ────────────────────────────────────────
  const handleEmailChange = useCallback(
    (email: string) => {
      setForm((f) => ({ ...f, email }));

      if (!email.trim()) {
        setFormErrors((p) => ({ ...p, email: undefined }));
        return;
      }
      if (!validateEmail(email.trim())) {
        setFormErrors((p) => ({ ...p, email: 'Please enter a valid email address' }));
        return;
      }
      const duplicate = users.find(
        (u) =>
          u.email.toLowerCase() === email.trim().toLowerCase() &&
          u.organizationId === form.organizationId &&
          u.id !== selectedUser?.id,
      );
      if (duplicate) {
        setFormErrors((p) => ({
          ...p,
          email: 'This email already exists in the selected organization',
        }));
        return;
      }
      setFormErrors((p) => ({ ...p, email: undefined }));
    },
    [users, form.organizationId, selectedUser],
  );

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleAdd = useCallback(() => {
    setModalType('add');
    setSelectedUser(null);
    setForm({
      name: '',
      email: '',
      password: '',
      role: 'OPERATOR',
      organizationId: selectedOrgId || organizations[0]?.id || '',
    });
    setFormErrors({});
    setModalOpen(true);
  }, [selectedOrgId, organizations]);

  const handleEdit = useCallback((user: SuperAdminUser) => {
    setModalType('edit');
    setSelectedUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role as 'ADMIN' | 'OPERATOR',
      organizationId: user.organizationId,
    });
    setFormErrors({});
    setModalOpen(true);
  }, []);

  const handleDeleteClick = useCallback((user: SuperAdminUser) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setIsMutating(true);
    try {
      if (modalType === 'add') {
        await createUser(form);
      } else if (selectedUser) {
        const payload: Partial<UserForm> = {
          name: form.name,
          email: form.email,
          role: form.role,
          organizationId: form.organizationId,
        };
        if (form.password) payload.password = form.password;
        await updateUser(selectedUser.id, payload);
      }
      setModalOpen(false);
      refetchUsers();
    } catch {
      // Error handled by the hook
    } finally {
      setIsMutating(false);
    }
  }, [form, modalType, selectedUser, validateForm, createUser, updateUser, refetchUsers]);

  const confirmDelete = useCallback(async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await deleteUser(userToDelete.id);
      setDeleteModalOpen(false);
      setUserToDelete(null);
      refetchUsers();
    } catch {
      // handled
    } finally {
      setIsDeleting(false);
    }
  }, [userToDelete, deleteUser, refetchUsers]);

  // ── Loading ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-28" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
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
            Manage users across all organizations
          </p>
        </div>
        <Button onClick={handleAdd}>
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

      {/* Organization Filter */}
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">
          Filter by Organization
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={!selectedOrgId ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedOrgId(undefined)}
          >
            All Organizations
          </Button>
          {organizations.map((org) => (
            <Button
              key={org.id}
              variant={selectedOrgId === org.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedOrgId(org.id)}
            >
              {org.name}
            </Button>
          ))}
        </div>
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
                <TableHead>Organization</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.length === 0 ? (
                <TableEmpty
                  colSpan={5}
                  message={
                    selectedOrgId
                      ? 'No users found in this organization.'
                      : 'No users found. Tap Add User to create one.'
                  }
                />
              ) : (
                sortedUsers.map((user) => {
                  const isCurrentSuperAdmin =
                    user.id === currentUserId &&
                    authState.user?.role === 'SUPER_ADMIN';
                  const isSuperAdminUser = user.role === 'SUPER_ADMIN';

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.role === 'SUPER_ADMIN'
                              ? 'destructive'
                              : user.role === 'ADMIN'
                                ? 'default'
                                : 'secondary'
                          }
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.organizationName ||
                          organizations.find((o) => o.id === user.organizationId)
                            ?.name ||
                          '--'}
                      </TableCell>
                      <TableCell className="text-right">
                        {!isCurrentSuperAdmin && !isSuperAdminUser ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(user)}
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
                              onClick={() => handleDeleteClick(user)}
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
                        ) : (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Add/Edit User Modal ──────────────────────────────────── */}
      <Modal open={modalOpen} onOpenChange={(open) => !open && setModalOpen(false)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>
              {modalType === 'add' ? 'Add User' : 'Edit User'}
            </ModalTitle>
            <ModalDescription>
              {modalType === 'add'
                ? 'Create a new user in an organization.'
                : 'Update user details.'}
            </ModalDescription>
          </ModalHeader>

          <div className="mt-4 space-y-4">
            {/* Name */}
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }));
                if (formErrors.name) setFormErrors((p) => ({ ...p, name: undefined }));
              }}
              error={formErrors.name}
              placeholder="Enter name"
            />

            {/* Email */}
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => handleEmailChange(e.target.value)}
              error={formErrors.email}
              placeholder="Enter email"
              autoCapitalize="none"
            />

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Password{' '}
                {modalType === 'edit' && (
                  <span className="font-normal text-muted-foreground">(optional)</span>
                )}
              </label>
              <PasswordInput
                value={form.password || ''}
                onChange={(e) => {
                  setForm((f) => ({ ...f, password: e.target.value }));
                  if (formErrors.password)
                    setFormErrors((p) => ({ ...p, password: undefined }));
                }}
                placeholder={modalType === 'add' ? 'Enter password' : 'Leave blank to keep current'}
                error={formErrors.password}
              />
              {formErrors.password && (
                <p className="text-xs text-destructive">{formErrors.password}</p>
              )}
            </div>

            {/* Role */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Role</label>
              <div className="flex gap-2">
                {(['ADMIN', 'OPERATOR'] as const).map((role) => (
                  <Button
                    key={role}
                    variant={form.role === role ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setForm((f) => ({ ...f, role }));
                      if (formErrors.role)
                        setFormErrors((p) => ({ ...p, role: undefined }));
                    }}
                  >
                    {role}
                  </Button>
                ))}
              </div>
              {formErrors.role && (
                <p className="text-xs text-destructive">{formErrors.role}</p>
              )}
            </div>

            {/* Organization */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Organization
              </label>
              <Select
                value={form.organizationId}
                onValueChange={(value) => {
                  setForm((f) => ({ ...f, organizationId: value }));
                  if (formErrors.organizationId)
                    setFormErrors((p) => ({ ...p, organizationId: undefined }));
                  // Re-validate email for new org
                  if (form.email) handleEmailChange(form.email);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.organizationId && (
                <p className="text-xs text-destructive">
                  {formErrors.organizationId}
                </p>
              )}
            </div>
          </div>

          <ModalFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={isMutating}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isMutating}>
              {isMutating ? <Spinner className="mr-1.5 h-3.5 w-3.5" /> : null}
              {modalType === 'add' ? 'Add' : 'Save'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── Delete Confirmation Modal ──────────────────────────── */}
      <Modal open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <ModalContent className="max-w-sm">
          <ModalHeader>
            <ModalTitle>Confirm Delete</ModalTitle>
            <ModalDescription>
              Are you sure you want to delete user{' '}
              <span className="font-semibold text-destructive">
                {userToDelete?.email}
              </span>
              ? This action cannot be undone.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Spinner className="mr-1.5 h-3.5 w-3.5" /> : null}
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
