'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '../../../context/auth-context';
import { useSetpoints, useUpdateSetpoint } from '../../../hooks/use-setpoints';
import type { Setpoint } from '../../../hooks/use-setpoints';
import { Button, Spinner } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
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
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
} from '../../../components/ui/modal';

// ─── Page ───────────────────────────────────────────────────────────────────

export default function SetpointsPage() {
  const { authState } = useAuth();
  const isAdmin = authState?.user?.role === 'ADMIN';

  // ── Fetch setpoints ───────────────────────────────────────────────────
  const { data: setpoints = [], isLoading, isError, error, refetch } = useSetpoints();
  const updateMutation = useUpdateSetpoint();

  // ── Edit state ──────────────────────────────────────────────────────────
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSetpoint, setEditingSetpoint] = useState<Setpoint | null>(null);
  const [editLowDev, setEditLowDev] = useState('');
  const [editHighDev, setEditHighDev] = useState('');
  const [editErrors, setEditErrors] = useState<{
    low?: string;
    high?: string;
  }>({});

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleEdit = useCallback((setpoint: Setpoint) => {
    setEditingSetpoint(setpoint);
    setEditLowDev(setpoint.lowDeviation.toString());
    setEditHighDev(setpoint.highDeviation.toString());
    setEditErrors({});
    setEditModalOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    const errors: { low?: string; high?: string } = {};
    const low = parseFloat(editLowDev);
    const high = parseFloat(editHighDev);

    if (isNaN(low)) {
      errors.low = 'Please enter a valid number';
    }
    if (isNaN(high)) {
      errors.high = 'Please enter a valid number';
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    if (editingSetpoint) {
      updateMutation.mutate(
        { id: editingSetpoint.id, lowDeviation: low, highDeviation: high },
        {
          onSuccess: () => {
            setEditModalOpen(false);
            setEditingSetpoint(null);
          },
        },
      );
    }
  }, [editLowDev, editHighDev, editingSetpoint, updateMutation]);

  // ── Loading ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────
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
        <h3 className="text-lg font-semibold text-foreground">
          Error Loading Setpoints
        </h3>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'Failed to load setpoints'}
        </p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  // ── Get badge variant by type ─────────────────────────────────────────
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'temperature':
        return 'destructive';
      case 'carbon':
        return 'warning';
      case 'oil':
        return 'info';
      default:
        return 'secondary';
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Alarm Setpoints
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure alarm thresholds and deviation ranges
        </p>
      </div>

      {/* Setpoints Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>SCADA Field</TableHead>
                <TableHead className="text-right">Low Deviation</TableHead>
                <TableHead className="text-right">High Deviation</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {setpoints.length === 0 ? (
                <TableEmpty colSpan={7} message="No setpoints configured." />
              ) : (
                setpoints.map((sp) => (
                  <TableRow key={sp.id}>
                    <TableCell className="font-medium">{sp.name}</TableCell>
                    <TableCell>
                      <Badge variant={getTypeBadge(sp.type) as 'default' | 'destructive' | 'secondary' | 'outline' | 'success' | 'warning' | 'info'}>
                        {sp.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sp.zone || '--'}
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {sp.scadaField}
                      </code>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {sp.lowDeviation}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {sp.highDeviation}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(sp)}
                        disabled={!isAdmin}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-1"
                        >
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          <path d="m15 5 4 4" />
                        </svg>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Edit Setpoint Modal ──────────────────────────────────── */}
      <Modal
        open={editModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditModalOpen(false);
            setEditingSetpoint(null);
          }
        }}
      >
        <ModalContent className="max-w-sm">
          <ModalHeader>
            <ModalTitle>Edit Setpoint</ModalTitle>
            <ModalDescription>
              {editingSetpoint
                ? `Configure deviations for "${editingSetpoint.name}"`
                : 'Update setpoint deviations'}
            </ModalDescription>
          </ModalHeader>

          {editingSetpoint && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant={getTypeBadge(editingSetpoint.type) as 'default' | 'destructive' | 'secondary' | 'outline' | 'success' | 'warning' | 'info'}>
                {editingSetpoint.type}
              </Badge>
              {editingSetpoint.zone && (
                <Badge variant="outline">{editingSetpoint.zone}</Badge>
              )}
              <Badge variant="outline">
                <code className="text-xs">{editingSetpoint.scadaField}</code>
              </Badge>
            </div>
          )}

          <div className="mt-4 space-y-4">
            <Input
              label="Low Deviation"
              type="number"
              step="any"
              value={editLowDev}
              onChange={(e) => {
                setEditLowDev(e.target.value);
                if (editErrors.low)
                  setEditErrors((p) => ({ ...p, low: undefined }));
              }}
              error={editErrors.low}
              placeholder="Enter low deviation"
            />
            <Input
              label="High Deviation"
              type="number"
              step="any"
              value={editHighDev}
              onChange={(e) => {
                setEditHighDev(e.target.value);
                if (editErrors.high)
                  setEditErrors((p) => ({ ...p, high: undefined }));
              }}
              error={editErrors.high}
              placeholder="Enter high deviation"
            />
          </div>

          <ModalFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setEditModalOpen(false);
                setEditingSetpoint(null);
              }}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Spinner className="mr-1.5 h-3.5 w-3.5" />
              ) : null}
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
