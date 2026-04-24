'use client';

import React, { useMemo } from 'react';
import {
  Thermometer,
  Gauge,
  Droplets,
  Fan,
  Flame,
  FlaskConical,
  Waves,
  Cog,
  ArrowRightLeft,
  AlertCircle,
  CheckCircle2,
  CheckCheck,
  Calendar,
  Activity,
  Target,
  ArrowDownUp,
  MapPin,
} from 'lucide-react';
import { Alarm } from '../types/alarm';
import { Badge, alarmSeverityToBadge } from './ui/badge';
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
import { formatFullDateTimeIST } from '../lib/timezone';

interface AlarmDetailsModalProps {
  alarm: Alarm | null;
  open: boolean;
  onClose: () => void;
  onAcknowledge?: () => void;
  onResolve?: () => void;
}

const ALARM_TYPE_ICONS: Record<string, React.ElementType> = {
  temperature: Thermometer,
  pressure: Gauge,
  oil: Droplets,
  fan: Fan,
  heater: Flame,
  carbon: FlaskConical,
  level: Waves,
  motor: Cog,
  conveyor: ArrowRightLeft,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
};

function DetailRow({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start gap-3 py-3 border-b border-border/50 last:border-0', className)}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-sm font-medium text-card-foreground">{value}</div>
      </div>
    </div>
  );
}

export function AlarmDetailsModal({
  alarm,
  open,
  onClose,
  onAcknowledge,
  onResolve,
}: AlarmDetailsModalProps) {
  const TypeIcon = alarm ? (ALARM_TYPE_ICONS[alarm.type] ?? AlertCircle) : AlertCircle;

  const formattedTime = useMemo(() => {
    if (!alarm) return '';
    try {
      return formatFullDateTimeIST(alarm.timestamp);
    } catch {
      return 'Unknown time';
    }
  }, [alarm?.timestamp]);

  const statusText = useMemo(() => {
    if (!alarm) return '';
    switch (alarm.status) {
      case 'active':
        return 'Active';
      case 'acknowledged':
        return 'Acknowledged';
      case 'resolved':
        return 'Resolved';
      default:
        return alarm.status;
    }
  }, [alarm?.status]);

  if (!alarm) return null;

  return (
    <Modal open={open} onOpenChange={(v) => !v && onClose()}>
      <ModalContent className="max-w-lg max-h-[90vh] overflow-hidden">
        <ModalHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                alarm.severity === 'critical' && 'bg-red-500/10 text-red-600 dark:text-red-400',
                alarm.severity === 'warning' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                alarm.severity === 'info' && 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
              )}
            >
              <TypeIcon className="h-5 w-5" />
            </div>
            <div>
              <ModalTitle className="text-base">{alarm.description}</ModalTitle>
              <ModalDescription className="mt-1 flex items-center gap-2">
                <span
                  className={cn(
                    'inline-block h-2 w-2 rounded-full',
                    SEVERITY_COLORS[alarm.severity] ?? 'bg-gray-400'
                  )}
                />
                {alarm.severity.charAt(0).toUpperCase() + alarm.severity.slice(1)} Severity
              </ModalDescription>
            </div>
          </div>
        </ModalHeader>

        <div className="max-h-[50vh] overflow-y-auto px-6 -mx-6 scrollbar-thin">
          <div className="px-6">
            <DetailRow icon={Calendar} label="Detected" value={formattedTime} />

            <DetailRow
              icon={Activity}
              label="Status"
              value={
                <Badge
                  variant={
                    alarm.status === 'active'
                      ? 'destructive'
                      : alarm.status === 'acknowledged'
                      ? 'warning'
                      : 'success'
                  }
                >
                  {statusText}
                </Badge>
              }
            />

            <DetailRow
              icon={Activity}
              label="Current Value"
              value={`${alarm.value}${alarm.unit ?? ''}`}
            />

            <DetailRow
              icon={Target}
              label="Set Point"
              value={`${alarm.setPoint}${alarm.unit ?? ''}`}
            />

            {(alarm.lowLimit !== undefined || alarm.highLimit !== undefined) && (
              <DetailRow
                icon={ArrowDownUp}
                label="Limits"
                value={
                  <div className="flex items-center gap-4">
                    {alarm.lowLimit !== undefined && (
                      <span>Low: <span className="font-semibold">{alarm.lowLimit}{alarm.unit ?? ''}</span></span>
                    )}
                    {alarm.highLimit !== undefined && (
                      <span>High: <span className="font-semibold">{alarm.highLimit}{alarm.unit ?? ''}</span></span>
                    )}
                  </div>
                }
              />
            )}

            {alarm.zone && (
              <DetailRow
                icon={MapPin}
                label="Zone"
                value={alarm.zone === 'zone1' ? 'Zone 1' : alarm.zone === 'zone2' ? 'Zone 2' : alarm.zone}
              />
            )}

            {alarm.acknowledgedBy && (
              <DetailRow
                icon={CheckCircle2}
                label="Acknowledged By"
                value={
                  <div>
                    <span>{alarm.acknowledgedBy.name}</span>
                    {alarm.acknowledgedAt && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {formatFullDateTimeIST(alarm.acknowledgedAt)}
                      </span>
                    )}
                  </div>
                }
              />
            )}

            {alarm.resolvedBy && (
              <DetailRow
                icon={CheckCheck}
                label="Resolved By"
                value={
                  <div>
                    <span>{alarm.resolvedBy.name}</span>
                    {alarm.resolvedAt && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {formatFullDateTimeIST(alarm.resolvedAt)}
                      </span>
                    )}
                  </div>
                }
              />
            )}

            {alarm.resolutionMessage && (
              <DetailRow
                icon={CheckCheck}
                label="Resolution"
                value={alarm.resolutionMessage}
              />
            )}
          </div>
        </div>

        {(alarm.status === 'active' || alarm.status === 'acknowledged') && (
          <ModalFooter className="mt-4 pt-4 border-t border-border/50">
            {onAcknowledge && alarm.status === 'active' && (
              <Button
                variant="outline"
                className="gap-2 border-blue-500/30 text-blue-600 hover:bg-blue-500/10 dark:text-blue-400"
                onClick={onAcknowledge}
              >
                <CheckCircle2 className="h-4 w-4" />
                Acknowledge
              </Button>
            )}
            {onResolve && (
              <Button
                className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={onResolve}
              >
                <CheckCheck className="h-4 w-4" />
                Resolve
              </Button>
            )}
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  );
}

export default AlarmDetailsModal;
