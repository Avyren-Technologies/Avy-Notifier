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
  Clock,
  CheckCircle2,
  CheckCheck,
  ShieldAlert,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Alarm } from '../types/alarm';
import { Card } from './ui/card';
import { Badge, alarmSeverityToBadge } from './ui/badge';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface AlarmCardProps {
  alarm: Alarm;
  onAcknowledge?: () => void;
  onResolve?: () => void;
  onPress?: () => void;
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

const SEVERITY_STYLES = {
  critical: {
    border: 'border-red-500/40 dark:border-red-500/30',
    glow: 'shadow-red-500/8 dark:shadow-red-500/15',
    iconBg: 'bg-red-500/10 dark:bg-red-500/15',
    iconColor: 'text-red-600 dark:text-red-400',
    pulse: 'animate-pulse',
  },
  warning: {
    border: 'border-amber-500/40 dark:border-amber-500/30',
    glow: 'shadow-amber-500/8 dark:shadow-amber-500/10',
    iconBg: 'bg-amber-500/10 dark:bg-amber-500/15',
    iconColor: 'text-amber-600 dark:text-amber-400',
    pulse: '',
  },
  info: {
    border: 'border-blue-500/40 dark:border-blue-500/30',
    glow: 'shadow-blue-500/8 dark:shadow-blue-500/10',
    iconBg: 'bg-blue-500/10 dark:bg-blue-500/15',
    iconColor: 'text-blue-600 dark:text-blue-400',
    pulse: '',
  },
} as const;

const STATUS_CONFIG = {
  active: { icon: ShieldAlert, label: 'Active', className: 'text-red-500' },
  acknowledged: { icon: CheckCircle2, label: 'Acknowledged', className: 'text-amber-500' },
  resolved: { icon: CheckCheck, label: 'Resolved', className: 'text-emerald-500' },
} as const;

export function AlarmCard({ alarm, onAcknowledge, onResolve, onPress }: AlarmCardProps) {
  const Icon = ALARM_TYPE_ICONS[alarm.type] ?? AlertCircle;
  const severity = SEVERITY_STYLES[alarm.severity] ?? SEVERITY_STYLES.info;
  const status = STATUS_CONFIG[alarm.status] ?? STATUS_CONFIG.active;
  const StatusIcon = status.icon;

  const relativeTime = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(alarm.timestamp), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  }, [alarm.timestamp]);

  const formattedValue = useMemo(() => {
    const val = alarm.value;
    const unit = alarm.unit ?? '';
    return `${val}${unit}`;
  }, [alarm.value, alarm.unit]);

  return (
    <Card
      className={cn(
        'group relative cursor-pointer overflow-hidden transition-all duration-300',
        'hover:shadow-lg hover:-translate-y-0.5',
        severity.border,
        severity.glow,
        alarm.status === 'resolved' && 'opacity-75'
      )}
      onClick={onPress}
    >
      {/* Severity accent stripe */}
      <div
        className={cn(
          'absolute inset-y-0 left-0 w-1 rounded-l-lg transition-all duration-300',
          alarm.severity === 'critical' && 'bg-red-500',
          alarm.severity === 'warning' && 'bg-amber-500',
          alarm.severity === 'info' && 'bg-blue-500'
        )}
      />

      <div className="p-4 pl-5">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110',
              severity.iconBg
            )}
          >
            <Icon className={cn('h-5 w-5', severity.iconColor)} />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-sm font-semibold text-card-foreground">
                  {alarm.description}
                </h4>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge variant={alarmSeverityToBadge(alarm.severity)} className="text-[10px] px-1.5 py-0">
                    {alarm.severity.charAt(0).toUpperCase() + alarm.severity.slice(1)}
                  </Badge>

                  {alarm.zone && (
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {alarm.zone === 'zone1' ? 'Zone 1' : alarm.zone === 'zone2' ? 'Zone 2' : alarm.zone}
                    </span>
                  )}

                  {alarm.alarmType && (
                    <span className="text-[11px] text-muted-foreground/70 capitalize">
                      {alarm.alarmType}
                    </span>
                  )}
                </div>
              </div>

              {/* Status indicator */}
              <div className="flex shrink-0 flex-col items-end gap-1">
                <StatusIcon className={cn('h-4 w-4', status.className, alarm.severity === 'critical' && alarm.status === 'active' && severity.pulse)} />
                <span className={cn('text-[10px] font-medium', status.className)}>
                  {status.label}
                </span>
              </div>
            </div>

            {/* Values row */}
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                Value: <span className="font-medium text-card-foreground">{formattedValue}</span>
              </span>
              {alarm.setPoint && (
                <span>
                  Set: <span className="font-medium text-card-foreground">{alarm.setPoint}{alarm.unit ?? ''}</span>
                </span>
              )}
            </div>

            {/* Time + actions */}
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{relativeTime}</span>
              </div>

              {alarm.status === 'active' && (
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {onAcknowledge && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-[11px] border-blue-500/30 text-blue-600 hover:bg-blue-500/10 dark:text-blue-400"
                      onClick={onAcknowledge}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Ack
                    </Button>
                  )}
                  {onResolve && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-[11px] border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                      onClick={onResolve}
                    >
                      <CheckCheck className="h-3 w-3" />
                      Resolve
                    </Button>
                  )}
                </div>
              )}

              {alarm.status === 'acknowledged' && onResolve && (
                <div onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-[11px] border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                    onClick={onResolve}
                  >
                    <CheckCheck className="h-3 w-3" />
                    Resolve
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default AlarmCard;
