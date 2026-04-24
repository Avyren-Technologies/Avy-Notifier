'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../../../context/auth-context';
import { useOrganizations } from '../../../hooks/use-organizations';
import type { Organization, ScadaDbConfig } from '../../../types/organization';
import { Button, Spinner } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
} from '../../../components/ui/modal';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ScadaDbConfigForm {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
  sslmode: string;
  table: string;
}

interface SchemaConfigForm {
  columns: string;
  columnConfigs: string;
}

interface OrgForm {
  name: string;
  scadaDbConfig: ScadaDbConfigForm;
  schemaConfig: SchemaConfigForm;
}

const defaultScadaDbConfig: ScadaDbConfigForm = {
  host: '',
  port: '',
  user: '',
  password: '',
  database: '',
  sslmode: '',
  table: '',
};

const defaultSchemaConfig: SchemaConfigForm = {
  columns: '',
  columnConfigs: '',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function orgToForm(org: Organization): OrgForm {
  let scadaDbConfig = { ...defaultScadaDbConfig };
  let schemaConfig = { ...defaultSchemaConfig };

  try {
    const scada =
      typeof org.scadaDbConfig === 'string'
        ? JSON.parse(org.scadaDbConfig)
        : org.scadaDbConfig;
    scadaDbConfig = {
      host: scada.host || '',
      port: scada.port ? String(scada.port) : '',
      user: scada.user || '',
      password: scada.password || '',
      database: scada.database || '',
      sslmode: scada.sslMode || scada.sslmode || '',
      table: scada.table || '',
    };
  } catch {
    // keep defaults
  }

  try {
    const schema =
      typeof org.schemaConfig === 'string'
        ? JSON.parse(org.schemaConfig)
        : org.schemaConfig;
    schemaConfig = {
      columns: Array.isArray(schema.columns) ? schema.columns.join(', ') : '',
      columnConfigs: schema.columnConfigs
        ? JSON.stringify(schema.columnConfigs, null, 2)
        : '',
    };
  } catch {
    // keep defaults
  }

  return { name: org.name, scadaDbConfig, schemaConfig };
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function OrganizationsPage() {
  const { authState } = useAuth();
  const isSuperAdmin = authState.user?.role === 'SUPER_ADMIN';

  const {
    organizations,
    isLoading,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    toggleOrganizationStatus,
    refetchOrganizations,
  } = useOrganizations();

  // ── Search ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const filteredOrgs = useMemo(() => {
    if (!search) return organizations;
    return organizations.filter((o) =>
      o.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [organizations, search]);

  // ── Add/Edit modal ────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit'>('add');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [form, setForm] = useState<OrgForm>({
    name: '',
    scadaDbConfig: { ...defaultScadaDbConfig },
    schemaConfig: { ...defaultSchemaConfig },
  });
  const [isSaving, setIsSaving] = useState(false);
  const [jsonError, setJsonError] = useState('');

  // ── Delete modal ──────────────────────────────────────────────────────
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Toggle status modal ───────────────────────────────────────────────
  const [toggleModalOpen, setToggleModalOpen] = useState(false);
  const [orgToToggle, setOrgToToggle] = useState<Organization | null>(null);
  const [isToggling, setIsToggling] = useState(false);

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

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleAdd = () => {
    setModalType('add');
    setSelectedOrg(null);
    setForm({
      name: '',
      scadaDbConfig: { ...defaultScadaDbConfig },
      schemaConfig: { ...defaultSchemaConfig },
    });
    setJsonError('');
    setModalOpen(true);
  };

  const handleEdit = (org: Organization) => {
    setModalType('edit');
    setSelectedOrg(org);
    setForm(orgToForm(org));
    setJsonError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    // Validate
    if (
      !form.name ||
      !form.scadaDbConfig.host ||
      !form.scadaDbConfig.port ||
      !form.scadaDbConfig.user ||
      !form.scadaDbConfig.password ||
      !form.scadaDbConfig.database
    ) {
      return;
    }

    // Validate JSON if provided
    if (form.schemaConfig.columnConfigs.trim()) {
      try {
        JSON.parse(form.schemaConfig.columnConfigs);
        setJsonError('');
      } catch {
        setJsonError('Invalid JSON in column configurations');
        return;
      }
    }

    const scadaDbConfig = {
      ...form.scadaDbConfig,
      port: Number(form.scadaDbConfig.port),
    };

    const schemaConfig = {
      columns: form.schemaConfig.columns
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      columnConfigs: form.schemaConfig.columnConfigs.trim()
        ? JSON.parse(form.schemaConfig.columnConfigs)
        : undefined,
    };

    setIsSaving(true);
    try {
      if (modalType === 'add') {
        await createOrganization({ name: form.name, scadaDbConfig, schemaConfig });
      } else if (selectedOrg) {
        await updateOrganization(selectedOrg.id, {
          name: form.name,
          scadaDbConfig,
          schemaConfig,
        });
      }
      setModalOpen(false);
      refetchOrganizations();
    } catch {
      // Error handled by react-query
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (org: Organization) => {
    setOrgToDelete(org);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!orgToDelete) return;
    setIsDeleting(true);
    try {
      await deleteOrganization(orgToDelete.id);
      setDeleteModalOpen(false);
      setOrgToDelete(null);
      refetchOrganizations();
    } catch {
      // handled
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = (org: Organization) => {
    setOrgToToggle(org);
    setToggleModalOpen(true);
  };

  const confirmToggle = async () => {
    if (!orgToToggle) return;
    setIsToggling(true);
    try {
      await toggleOrganizationStatus(orgToToggle.id, !orgToToggle.isEnabled);
      setToggleModalOpen(false);
      setOrgToToggle(null);
    } catch {
      // handled
    } finally {
      setIsToggling(false);
    }
  };

  const updateScada = (field: keyof ScadaDbConfigForm, value: string) => {
    setForm((f) => ({
      ...f,
      scadaDbConfig: { ...f.scadaDbConfig, [field]: value },
    }));
  };

  const updateSchema = (field: keyof SchemaConfigForm, value: string) => {
    setForm((f) => ({
      ...f,
      schemaConfig: { ...f.schemaConfig, [field]: value },
    }));
    if (field === 'columnConfigs') setJsonError('');
  };

  // ── Loading ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-10" />
        </div>
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  // ── SCADA fields list ─────────────────────────────────────────────────
  const scadaFields: { key: keyof ScadaDbConfigForm; label: string }[] = [
    { key: 'host', label: 'Host' },
    { key: 'port', label: 'Port' },
    { key: 'user', label: 'User' },
    { key: 'password', label: 'Password' },
    { key: 'database', label: 'Database' },
    { key: 'sslmode', label: 'SSL Mode' },
    { key: 'table', label: 'Table' },
  ];

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Organizations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage organizations and SCADA configurations
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
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Organization
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Search organizations by name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {search && (
        <p className="text-xs text-muted-foreground">
          Found {filteredOrgs.length} of {organizations.length} organizations
        </p>
      )}

      {/* Organization Cards */}
      {filteredOrgs.length === 0 ? (
        <Card>
          <CardContent className="flex h-48 flex-col items-center justify-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
              <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
              <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
              <path d="M10 6h4" />
              <path d="M10 10h4" />
              <path d="M10 14h4" />
              <path d="M10 18h4" />
            </svg>
            <p className="text-sm font-medium text-muted-foreground">
              {search ? 'No organizations match your search.' : 'No organizations found.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredOrgs.map((org) => {
            let scada: Partial<ScadaDbConfig> = {};
            try {
              scada =
                typeof org.scadaDbConfig === 'string'
                  ? JSON.parse(org.scadaDbConfig)
                  : org.scadaDbConfig;
            } catch {
              // ignore
            }

            return (
              <Card
                key={org.id}
                className={`relative transition-opacity ${!org.isEnabled ? 'opacity-60' : ''}`}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <CardTitle className="text-base">{org.name}</CardTitle>
                  <Badge variant={org.isEnabled ? 'success' : 'destructive'}>
                    <span
                      className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                        org.isEnabled ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                    {org.isEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>
                      Host: {scada.host || '--'} | Port: {scada.port || '--'}
                    </p>
                    <p>
                      Database: {scada.database || '--'} | User: {scada.user || '--'}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(org)}>
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(org)}
                    >
                      Delete
                    </Button>
                    <Button
                      variant={org.isEnabled ? 'destructive' : 'default'}
                      size="sm"
                      className="ml-auto"
                      onClick={() => handleToggleStatus(org)}
                    >
                      {org.isEnabled ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Add/Edit Organization Modal ──────────────────────────── */}
      <Modal open={modalOpen} onOpenChange={(open) => !open && setModalOpen(false)}>
        <ModalContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <ModalHeader>
            <ModalTitle>
              {modalType === 'add' ? 'Add Organization' : 'Edit Organization'}
            </ModalTitle>
            <ModalDescription>
              {modalType === 'add'
                ? 'Create a new organization with SCADA configuration.'
                : 'Update the organization details and SCADA configuration.'}
            </ModalDescription>
          </ModalHeader>

          <div className="mt-4 space-y-6">
            {/* Name */}
            <Input
              label="Organization Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Organization Name"
            />

            {/* SCADA DB Config */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-foreground">
                SCADA DB Config
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {scadaFields.map(({ key, label }) => (
                  <Input
                    key={key}
                    label={label}
                    type={key === 'password' ? 'password' : 'text'}
                    value={form.scadaDbConfig[key]}
                    onChange={(e) => updateScada(key, e.target.value)}
                    placeholder={label}
                  />
                ))}
              </div>
            </div>

            {/* Schema Config */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-foreground">
                Schema Config
              </h4>
              <div className="space-y-3">
                <Input
                  label="Columns (comma-separated)"
                  value={form.schemaConfig.columns}
                  onChange={(e) => updateSchema('columns', e.target.value)}
                  placeholder="hz1sv, hz1pv, oilpv, ..."
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Column Configurations (JSON)
                  </label>
                  <textarea
                    className="flex min-h-[160px] w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                    value={form.schemaConfig.columnConfigs}
                    onChange={(e) => updateSchema('columnConfigs', e.target.value)}
                    placeholder='{"hz1sv": {"name": "HARDENING ZONE 1", "type": "temperature", ...}}'
                  />
                  {jsonError && (
                    <p className="text-xs text-destructive">{jsonError}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <ModalFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Spinner className="mr-1.5 h-3.5 w-3.5" /> : null}
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── Delete Confirmation Modal ──────────────────────────── */}
      <Modal open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <ModalContent className="max-w-sm">
          <ModalHeader>
            <ModalTitle>Delete Organization</ModalTitle>
            <ModalDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-destructive">
                {orgToDelete?.name}
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

      {/* ── Toggle Status Confirmation Modal ───────────────────── */}
      <Modal open={toggleModalOpen} onOpenChange={setToggleModalOpen}>
        <ModalContent className="max-w-sm">
          <ModalHeader>
            <ModalTitle>
              {orgToToggle?.isEnabled
                ? 'Disable Organization'
                : 'Enable Organization'}
            </ModalTitle>
            <ModalDescription>
              Are you sure you want to{' '}
              {orgToToggle?.isEnabled ? 'disable' : 'enable'}{' '}
              <span className="font-semibold">
                &quot;{orgToToggle?.name}&quot;
              </span>
              ?{' '}
              {orgToToggle?.isEnabled
                ? 'This will prevent all users from logging in and stop all data processing.'
                : 'This will allow users to log in and resume data processing.'}
            </ModalDescription>
          </ModalHeader>
          <ModalFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setToggleModalOpen(false)}
              disabled={isToggling}
            >
              Cancel
            </Button>
            <Button
              variant={orgToToggle?.isEnabled ? 'destructive' : 'default'}
              onClick={confirmToggle}
              disabled={isToggling}
            >
              {isToggling ? <Spinner className="mr-1.5 h-3.5 w-3.5" /> : null}
              {orgToToggle?.isEnabled ? 'Disable' : 'Enable'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
