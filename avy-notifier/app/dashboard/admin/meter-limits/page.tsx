'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/auth-context';
import { useMeterLimits, useUpdateMeterLimit } from '../../../hooks/use-meter-readings';
import type { MeterLimit } from '../../../types/meter';
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

export default function MeterLimitsPage() {
  const { authState } = useAuth();
  const router = useRouter();
  const isAdmin = authState?.user?.role === 'ADMIN';

  // ── Fetch limits ────────────────────────────────────────────────────────
  const { data: limits, isLoading, isError, refetch } = useMeterLimits();
  const updateMutation = useUpdateMeterLimit();

  // ── Edit state ──────────────────────────────────────────────────────────
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingLimit, setEditingLimit] = useState<MeterLimit | null>(null);
  const [editHighLimit, setEditHighLimit] = useState('');
  const [editLowLimit, setEditLowLimit] = useState('');
  const [editErrors, setEditErrors] = useState<{ high?: string; low?: string }>({});

  // ── Guard: admin-only ──────────────────────────────────────────────────
  useEffect(() => {
    if (!authState.isLoading && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [authState.isLoading, isAdmin, router]);

  // ── Group limits ──────────────────────────────────────────────────────
  const electricalParams =
    limits?.filter((l) =>
      ['voltage', 'current', 'frequency'].includes(l.parameter),
    ) || [];

  const powerParams =
    limits?.filter((l) => ['power', 'energy', 'pf'].includes(l.parameter)) || [];

  const otherParams =
    limits?.filter(
      (l) =>
        !['voltage', 'current', 'frequency', 'power', 'energy', 'pf'].includes(
          l.parameter,
        ),
    ) || [];

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleEdit = useCallback((limit: MeterLimit) => {
    setEditingLimit(limit);
    setEditHighLimit(limit.highLimit.toString());
    setEditLowLimit(limit.lowLimit?.toString() || '');
    setEditErrors({});
    setEditModalOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    const errors: { high?: string; low?: string } = {};
    const high = parseFloat(editHighLimit);
    const low = editLowLimit.trim() ? parseFloat(editLowLimit) : null;

    if (isNaN(high)) {
      errors.high = 'Please enter a valid number';
    }
    if (editLowLimit.trim() && low !== null && isNaN(low)) {
      errors.low = 'Please enter a valid number';
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    if (editingLimit) {
      const values: { highLimit?: number; lowLimit?: number } = { highLimit: high };
      if (low !== null) values.lowLimit = low;

      updateMutation.mutate(
        { id: editingLimit.id, values },
        {
          onSuccess: () => {
            setEditModalOpen(false);
            setEditingLimit(null);
          },
        },
      );
    }
  }, [editHighLimit, editLowLimit, editingLimit, updateMutation]);

  // ── Loading ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
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
          Error Loading Limits
        </h3>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  // ── Render table section ──────────────────────────────────────────────
  const renderSection = (
    title: string,
    icon: React.ReactNode,
    items: MeterLimit[],
  ) => {
    if (items.length === 0) return null;
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parameter</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Low Limit</TableHead>
                <TableHead className="text-right">High Limit</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((limit) => (
                <TableRow key={limit.id}>
                  <TableCell className="font-medium capitalize">
                    {limit.parameter}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {limit.description}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{limit.unit}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {limit.lowLimit !== null ? limit.lowLimit : '--'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {limit.highLimit}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(limit)}
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Parameter Limits
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure thresholds for meter readings
        </p>
      </div>

      {/* Electrical Parameters */}
      {renderSection(
        'Electrical Parameters',
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-warning"
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>,
        electricalParams,
      )}

      {/* Power Parameters */}
      {renderSection(
        'Power Parameters',
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-success"
        >
          <rect x="1" y="6" width="18" height="12" rx="2" ry="2" />
          <line x1="23" y1="13" x2="23" y2="11" />
        </svg>,
        powerParams,
      )}

      {/* Other Parameters */}
      {renderSection(
        'Other Parameters',
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-info"
        >
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>,
        otherParams,
      )}

      {/* Help info */}
      <Card className="border-success/30 bg-success/5">
        <CardContent className="flex gap-3 p-4">
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
            className="mt-0.5 shrink-0 text-success"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <p className="text-sm text-muted-foreground">
            Configure thresholds to trigger notifications when meter readings exceed
            their limits. Click &quot;Edit&quot; on any parameter to modify its high
            and low limits.
          </p>
        </CardContent>
      </Card>

      {/* ── Edit Limit Modal ─────────────────────────────────────── */}
      <Modal
        open={editModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditModalOpen(false);
            setEditingLimit(null);
          }
        }}
      >
        <ModalContent className="max-w-sm">
          <ModalHeader>
            <ModalTitle>Edit Limit</ModalTitle>
            <ModalDescription>
              {editingLimit
                ? `Configure limits for ${editingLimit.description}`
                : 'Update parameter limits'}
            </ModalDescription>
          </ModalHeader>

          <div className="mt-4 space-y-4">
            <Input
              label={`High Limit (${editingLimit?.unit || ''})`}
              type="number"
              value={editHighLimit}
              onChange={(e) => {
                setEditHighLimit(e.target.value);
                if (editErrors.high)
                  setEditErrors((p) => ({ ...p, high: undefined }));
              }}
              error={editErrors.high}
              placeholder="Enter high limit"
            />
            <Input
              label={`Low Limit (${editingLimit?.unit || ''})`}
              type="number"
              value={editLowLimit}
              onChange={(e) => {
                setEditLowLimit(e.target.value);
                if (editErrors.low)
                  setEditErrors((p) => ({ ...p, low: undefined }));
              }}
              error={editErrors.low}
              placeholder="Enter low limit (optional)"
            />
          </div>

          <ModalFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setEditModalOpen(false);
                setEditingLimit(null);
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
