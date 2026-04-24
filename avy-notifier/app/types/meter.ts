export interface MeterReading {
  meter_id: string;
  voltage: number;
  current: number;
  frequency: number;
  pf: number;
  energy: number;
  power: number;
  created_at: string;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PaginatedMeterReadings {
  readings: MeterReading[];
  pagination: PaginationInfo;
}

export interface MeterLimit {
  id: string;
  parameter: string;
  description: string;
  unit: string;
  highLimit: number;
  lowLimit: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeterReportParams {
  startDate: Date;
  endDate: Date;
  parameters?: string[];
  title?: string;
  sortOrder?: string;
}

export interface MeterReport {
  id: string;
  title: string;
  format: string;
  fileName: string;
  fileSize: number;
  startDate: string;
  endDate: string;
  parameters: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface SimulationConfig {
  interval?: number;
  realisticVariations?: boolean;
  notifyOnLimits?: boolean;
  baseValues?: {
    voltage: number;
    current: number;
    frequency: number;
    pf: number;
    energy: number;
    power: number;
  };
  variations?: {
    voltage: number;
    current: number;
    frequency: number;
    pf: number;
    energyIncrement: number;
    powerVariation: number;
  };
}

export interface SimulationStatus {
  running: boolean;
  config?: SimulationConfig & { enabled: boolean; organizationId: string };
  nextRun?: string;
}

export interface ReportTimeRange {
  startDate: Date;
  endDate: Date;
}

export type ReportFormat = 'excel' | 'pdf';

export type SortOrder = 'newest_first' | 'oldest_first';
