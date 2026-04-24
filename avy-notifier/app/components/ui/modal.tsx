'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/utils';

/* ------------------------------------------------------------------
 * Root
 * ----------------------------------------------------------------*/

const Modal = DialogPrimitive.Root;
const ModalTrigger = DialogPrimitive.Trigger;
const ModalPortal = DialogPrimitive.Portal;

/* ------------------------------------------------------------------
 * Close
 * ----------------------------------------------------------------*/

const ModalClose = DialogPrimitive.Close;

/* ------------------------------------------------------------------
 * Overlay
 * ----------------------------------------------------------------*/

const ModalOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay ref={ref} asChild {...props}>
    <motion.div
      className={cn(
        'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm',
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    />
  </DialogPrimitive.Overlay>
));
ModalOverlay.displayName = 'ModalOverlay';

/* ------------------------------------------------------------------
 * Content
 * ----------------------------------------------------------------*/

const ModalContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    /** If true the close "X" button is hidden */
    hideClose?: boolean;
  }
>(({ className, children, hideClose, ...props }, ref) => (
  <AnimatePresence>
    <ModalPortal>
      <ModalOverlay />
      {/* Flexbox wrapper for centering — avoids transform conflicts with framer-motion */}
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <DialogPrimitive.Content ref={ref} asChild {...props}>
          <motion.div
            className={cn(
              'relative w-full max-w-lg',
              'max-h-[85vh] overflow-y-auto',
              'rounded-lg border border-border bg-card p-6 shadow-lg',
              'focus:outline-none',
              className
            )}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {children}
            {!hideClose && (
              <DialogPrimitive.Close
                className={cn(
                  'absolute right-4 top-4 rounded-sm text-muted-foreground opacity-70',
                  'transition-opacity duration-200 hover:opacity-100',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
                  'disabled:pointer-events-none'
                )}
                aria-label="Close"
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
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </DialogPrimitive.Close>
            )}
          </motion.div>
        </DialogPrimitive.Content>
      </div>
    </ModalPortal>
  </AnimatePresence>
));
ModalContent.displayName = 'ModalContent';

/* ------------------------------------------------------------------
 * Header / Footer
 * ----------------------------------------------------------------*/

function ModalHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col gap-1.5 text-center sm:text-left', className)}
      {...props}
    />
  );
}

function ModalFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------
 * Title / Description
 * ----------------------------------------------------------------*/

const ModalTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight text-card-foreground',
      className
    )}
    {...props}
  />
));
ModalTitle.displayName = 'ModalTitle';

const ModalDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
ModalDescription.displayName = 'ModalDescription';

export {
  Modal,
  ModalTrigger,
  ModalPortal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
  ModalClose,
};
