'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Settings2 } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
} from './ui/modal';

export interface SetpointData {
  id: string;
  name: string;
  lowDeviation: number;
  highDeviation: number;
  unit?: string;
}

interface SetpointConfigModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (lowDeviation: number, highDeviation: number) => void;
  setpoint: SetpointData | null;
  isSubmitting?: boolean;
}

export function SetpointConfigModal({
  open,
  onClose,
  onSubmit,
  setpoint,
  isSubmitting = false,
}: SetpointConfigModalProps) {
  const [lowDeviation, setLowDeviation] = useState('');
  const [highDeviation, setHighDeviation] = useState('');
  const [lowError, setLowError] = useState('');
  const [highError, setHighError] = useState('');

  // Populate form values when the setpoint changes
  useEffect(() => {
    if (setpoint) {
      setLowDeviation(setpoint.lowDeviation.toString());
      setHighDeviation(setpoint.highDeviation.toString());
      setLowError('');
      setHighError('');
    } else {
      setLowDeviation('');
      setHighDeviation('');
    }
  }, [setpoint]);

  const validate = useCallback((): boolean => {
    let valid = true;

    const lowDev = parseFloat(lowDeviation);
    const highDev = parseFloat(highDeviation);

    if (isNaN(lowDev)) {
      setLowError('Please enter a valid number');
      valid = false;
    } else {
      setLowError('');
    }

    if (isNaN(highDev)) {
      setHighError('Please enter a valid number');
      valid = false;
    } else {
      setHighError('');
    }

    return valid;
  }, [lowDeviation, highDeviation]);

  const handleSubmit = useCallback(() => {
    if (!setpoint) return;
    if (!validate()) return;

    onSubmit(parseFloat(lowDeviation), parseFloat(highDeviation));
  }, [setpoint, validate, lowDeviation, highDeviation, onSubmit]);

  // Do not render if there is no setpoint
  if (!setpoint && open) return null;

  return (
    <Modal open={open} onOpenChange={(v) => !v && onClose()}>
      <ModalContent className="max-w-sm">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Settings2 className="h-4 w-4 text-primary" />
            </div>
            <ModalTitle>Configure Setpoint</ModalTitle>
          </div>
          {setpoint && (
            <ModalDescription className="mt-2">
              {setpoint.name}
              {setpoint.unit ? ` (${setpoint.unit})` : ''}
            </ModalDescription>
          )}
        </ModalHeader>

        <div className="mt-4 space-y-4">
          <Input
            label="Low Deviation"
            type="number"
            step="any"
            value={lowDeviation}
            onChange={(e) => {
              setLowDeviation(e.target.value);
              setLowError('');
            }}
            error={lowError}
            placeholder="Enter low deviation"
            disabled={isSubmitting}
          />

          <Input
            label="High Deviation"
            type="number"
            step="any"
            value={highDeviation}
            onChange={(e) => {
              setHighDeviation(e.target.value);
              setHighError('');
            }}
            error={highError}
            placeholder="Enter high deviation"
            disabled={isSubmitting}
          />
        </div>

        <ModalFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={isSubmitting}>
            Save Changes
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default SetpointConfigModal;
