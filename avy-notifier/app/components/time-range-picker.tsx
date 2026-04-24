'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Clock, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
} from './ui/modal';

/* ------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------*/

function formatHour(hour: number): string {
  if (hour === 0) return '12:00 AM';
  if (hour === 12) return '12:00 PM';
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}

/* ------------------------------------------------------------------
 * Props
 * ----------------------------------------------------------------*/

interface TimeRangePickerProps {
  open: boolean;
  onClose: () => void;
  onTimeSelected: (fromHour: number, toHour: number) => void;
  initialFrom?: number;
  initialTo?: number;
}

/* ------------------------------------------------------------------
 * Component
 * ----------------------------------------------------------------*/

export function TimeRangePicker({
  open,
  onClose,
  onTimeSelected,
  initialFrom = 22,
  initialTo = 7,
}: TimeRangePickerProps) {
  const [fromHour, setFromHour] = useState(initialFrom);
  const [toHour, setToHour] = useState(initialTo);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  const handleSave = useCallback(() => {
    onTimeSelected(fromHour, toHour);
  }, [fromHour, toHour, onTimeSelected]);

  const summaryText = useMemo(
    () => `Notifications will be muted from ${formatHour(fromHour)} to ${formatHour(toHour)}`,
    [fromHour, toHour]
  );

  return (
    <Modal open={open} onOpenChange={(v) => !v && onClose()}>
      <ModalContent className="max-w-sm">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <ModalTitle>Set Mute Hours</ModalTitle>
          </div>
          <ModalDescription className="mt-1">
            Notifications will be silenced between these hours
          </ModalDescription>
        </ModalHeader>

        <div className="mt-5 flex items-center gap-3">
          {/* From */}
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-semibold text-foreground text-center block">
              From
            </label>
            <Select
              value={fromHour.toString()}
              onValueChange={(v) => setFromHour(parseInt(v, 10))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select hour" />
              </SelectTrigger>
              <SelectContent>
                {hours.map((h) => (
                  <SelectItem key={`from-${h}`} value={h.toString()}>
                    {formatHour(h)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Arrow */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center pt-5">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* To */}
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-semibold text-foreground text-center block">
              To
            </label>
            <Select
              value={toHour.toString()}
              onValueChange={(v) => setToHour(parseInt(v, 10))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select hour" />
              </SelectTrigger>
              <SelectContent>
                {hours.map((h) => (
                  <SelectItem key={`to-${h}`} value={h.toString()}>
                    {formatHour(h)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 rounded-lg bg-muted/30 border border-border/50 p-3">
          <p className="text-xs text-center text-muted-foreground">{summaryText}</p>
        </div>

        <ModalFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default TimeRangePicker;
