'use client';

import React, { useState, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
} from './ui/modal';
import { cn } from '../lib/utils';

interface ResolutionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
  alarmDescription: string;
  loading?: boolean;
}

export function ResolutionModal({
  open,
  onClose,
  onSubmit,
  alarmDescription,
  loading = false,
}: ResolutionModalProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = useCallback(() => {
    if (message.trim()) {
      onSubmit(message.trim());
      setMessage('');
    }
  }, [message, onSubmit]);

  const handleClose = useCallback(() => {
    setMessage('');
    onClose();
  }, [onClose]);

  const canSubmit = message.trim().length > 0 && !loading;

  return (
    <Modal open={open} onOpenChange={(v) => !v && handleClose()}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <AlertCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <ModalTitle>Resolve Alarm</ModalTitle>
          </div>
          <ModalDescription className="mt-2">
            {alarmDescription}
          </ModalDescription>
        </ModalHeader>

        <div className="mt-4 space-y-2">
          <label
            htmlFor="resolution-message"
            className="text-sm font-medium text-foreground"
          >
            Resolution Message
          </label>
          <textarea
            id="resolution-message"
            className={cn(
              'flex min-h-[120px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm',
              'text-foreground placeholder:text-muted-foreground',
              'transition-colors duration-200 resize-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            placeholder="Describe the resolution steps taken..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={loading}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            {message.trim().length === 0
              ? 'Please provide a resolution message before submitting.'
              : `${message.trim().length} characters`}
          </p>
        </div>

        <ModalFooter className="mt-6">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            loading={loading}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Submit Resolution
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default ResolutionModal;
