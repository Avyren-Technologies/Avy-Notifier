import axios from 'axios';
import { apiConfig } from './config';
import { getOrgHeaders, getAuthHeader } from './auth';

// Types for meter readings
interface MeterReading {
  meter_id: string;
  voltage: number;
  current: number;
  frequency: number;
  pf: number;
  energy: number;
  power: number;
  created_at: string; 
}

// Pagination response interface
interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Paginated response interface
interface PaginatedMeterReadings {
  readings: MeterReading[];
  pagination: PaginationInfo;
}

interface MeterLimit {
  id: string;
  parameter: string;
  description: string;
  unit: string;
  highLimit: number;
  lowLimit: number | null;
  createdAt: string;
  updatedAt: string;
}

// Report types
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
  createdAt: string;
  parameters: string[];
  metadata?: any;
}

/**
 * Fetch latest meter reading
 */
export const fetchLatestReading = async (organizationId?: string): Promise<MeterReading | null> => {
  try {
    if (!organizationId) {
      throw new Error('Organization ID is required for meter readings');
    }
    
    const headers = await getOrgHeaders(organizationId);
    const { data } = await axios.get(`${apiConfig.apiUrl}/api/meter/latest`, { headers });
    return data.data; // This can now be null if no readings exist
  } catch (error) {
    console.error('Error fetching latest meter reading:', error);
    throw error;
  }
};

/**
 * Fetch historical meter readings with pagination
 */
export const fetchMeterHistory = async (
  hours: number = 1, 
  page: number = 1, 
  limit: number = 20, 
  startTime?: string,
  organizationId?: string
): Promise<PaginatedMeterReadings> => {
  try {
    if (!organizationId) {
      throw new Error('Organization ID is required for meter readings');
    }
    
    console.log('🔍 fetchMeterHistory called with:', { hours, page, limit, startTime, organizationId });
    
    const headers = await getOrgHeaders(organizationId);
    console.log('🔍 Headers prepared:', Object.keys(headers));
    
    // Build query parameters
    let queryParams = `hours=${hours}&page=${page}&limit=${limit}`;
    if (startTime) {
      queryParams += `&startTime=${encodeURIComponent(startTime)}`;
    }
    
    const url = `${apiConfig.apiUrl}/api/meter/history?${queryParams}`;
    console.log('🔍 Making request to:', url);
    
    const { data } = await axios.get(url, { headers });
    
    console.log('🔍 fetchMeterHistory successful, data received');
    return data.data;
  } catch (error) {
    console.error('❌ Error fetching meter history:', error);
    throw error;
  }
};

/**
 * Fetch meter parameter limits
 */
export const fetchMeterLimits = async (organizationId?: string): Promise<MeterLimit[]> => {
  try {
    if (!organizationId) {
      throw new Error('Organization ID is required for meter readings');
    }
    
    const headers = await getOrgHeaders(organizationId);
    const { data } = await axios.get(`${apiConfig.apiUrl}/api/meter/limits`, { headers });
    return data.data;
  } catch (error) {
    console.error('Error fetching meter limits:', error);
    throw error;
  }
};

/**
 * Update meter parameter limit
 */
export const updateMeterLimit = async (
  id: string, 
  values: { highLimit?: number; lowLimit?: number },
  organizationId?: string
): Promise<MeterLimit> => {
  try {
    if (!organizationId) {
      throw new Error('Organization ID is required for meter readings');
    }
    
    const headers = await getOrgHeaders(organizationId);
    const { data } = await axios.put(
      `${apiConfig.apiUrl}/api/meter/limits/${id}`,
      values,
      { headers }
    );
    return data.data;
  } catch (error) {
    console.error('Error updating meter limit:', error);
    throw error;
  }
};

/**
 * Generate a new meter readings report
 * @param params Report parameters
 */
export const generateMeterReport = async (params: MeterReportParams, organizationId?: string): Promise<MeterReport> => {
  try {
    if (!organizationId) {
      throw new Error('Organization ID is required for meter readings');
    }
    
    const headers = await getOrgHeaders(organizationId);
    const { data } = await axios.post(
      `${apiConfig.apiUrl}/api/meter/reports`, 
      params, 
      { headers }
    );
    return data.data;
  } catch (error) {
    console.error('Error generating meter report:', error);
    throw error;
  }
};

/**
 * Get all reports for current user
 */
export const getMeterReports = async (organizationId?: string): Promise<MeterReport[]> => {
  try {
    if (!organizationId) {
      throw new Error('Organization ID is required for meter readings');
    }
    
    const headers = await getOrgHeaders(organizationId);
    const { data } = await axios.get(
      `${apiConfig.apiUrl}/api/meter/reports`, 
      { headers }
    );
    return data.data;
  } catch (error) {
    console.error('Error fetching meter reports:', error);
    throw error;
  }
};

/**
 * Download a specific report by ID
 * @param id Report ID
 * @returns Blob of the report file
 */
export const downloadMeterReport = async (id: string, organizationId?: string): Promise<Blob> => {
  try {
    if (!organizationId) {
      throw new Error('Organization ID is required for meter readings');
    }
    
    const headers = await getOrgHeaders(organizationId);
    const response = await axios.get(
      `${apiConfig.apiUrl}/api/meter/reports/${id}`, 
      { 
        headers,
        responseType: 'blob' 
      }
    );
    return new Blob([response.data], {
      type: response.headers['content-type']
    });
  } catch (error) {
    console.error('Error downloading meter report:', error);
    throw error;
  }
};

// Simulation API functions
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

/**
 * Start meter data simulation
 */
export const startMeterSimulation = async (config: SimulationConfig, organizationId?: string): Promise<{ message: string }> => {
  try {
    const headers = await getOrgHeaders(organizationId);
    const response = await axios.post(`${apiConfig.apiUrl}/api/meter/simulation/start`, config, { headers });
    return response.data;
  } catch (error) {
    console.error('Error starting meter simulation:', error);
    throw error;
  }
};

/**
 * Stop meter data simulation
 */
export const stopMeterSimulation = async (organizationId?: string): Promise<{ message: string }> => {
  try {
    const headers = await getOrgHeaders(organizationId);
    const response = await axios.post(`${apiConfig.apiUrl}/api/meter/simulation/stop`, {}, { headers });
    return response.data;
  } catch (error) {
    console.error('Error stopping meter simulation:', error);
    throw error;
  }
};

/**
 * Update simulation configuration
 */
export const updateMeterSimulationConfig = async (config: Partial<SimulationConfig>, organizationId?: string): Promise<{ message: string }> => {
  try {
    const headers = await getOrgHeaders(organizationId);
    const response = await axios.put(`${apiConfig.apiUrl}/api/meter/simulation/config`, config, { headers });
    return response.data;
  } catch (error) {
    console.error('Error updating meter simulation config:', error);
    throw error;
  }
};

/**
 * Get simulation status
 */
export const getMeterSimulationStatus = async (organizationId?: string): Promise<SimulationStatus> => {
  try {
    const headers = await getOrgHeaders(organizationId);
    const response = await axios.get(`${apiConfig.apiUrl}/api/meter/simulation/status`, { headers });
    return response.data.data;
  } catch (error) {
    console.error('Error getting meter simulation status:', error);
    throw error;
  }
};

/**
 * Get all running simulations (Super Admin only)
 */
export const getAllMeterSimulations = async (): Promise<Array<{
  organizationId: string;
  running: boolean;
  config: SimulationConfig & { enabled: boolean; organizationId: string };
}>> => {
  try {
    const headers = await getAuthHeader();
    const response = await axios.get(`${apiConfig.apiUrl}/api/meter/simulation/all`, { headers });
    return response.data.data;
  } catch (error) {
    console.error('Error getting all meter simulations:', error);
    throw error;
  }
};

/**
 * Initialize sample data for demonstration
 */
export const initializeMeterSampleData = async (organizationId?: string): Promise<{ message: string }> => {
  try {
    const headers = await getOrgHeaders(organizationId);
    const response = await axios.post(`${apiConfig.apiUrl}/api/meter/simulation/initialize`, {}, { headers });
    return response.data;
  } catch (error) {
    console.error('Error initializing meter sample data:', error);
    throw error;
  }
};

/**
 * Create meter readings table in SCADA database
 */
export const createMeterReadingsTable = async (organizationId?: string): Promise<{ message: string }> => {
  try {
    const headers = await getOrgHeaders(organizationId);
    const response = await axios.post(`${apiConfig.apiUrl}/api/meter/migrations/create-table`, {}, { headers });
    return response.data;
  } catch (error) {
    console.error('Error creating meter readings table:', error);
    throw error;
  }
};

/**
 * Get migration status (table existence and stats)
 */
export const getMeterMigrationStatus = async (organizationId?: string): Promise<{
  exists: boolean;
  recordCount: number;
  lastRecord?: any;
  size?: string;
}> => {
  try {
    const headers = await getOrgHeaders(organizationId);
    const response = await axios.get(`${apiConfig.apiUrl}/api/meter/migrations/status`, { headers });
    return response.data.data;
  } catch (error) {
    console.error('Error getting migration status:', error);
    throw error;
  }
};

/**
 * Drop meter readings table (for cleanup/testing)
 */
export const dropMeterReadingsTable = async (organizationId?: string): Promise<{ message: string }> => {
  try {
    const headers = await getOrgHeaders(organizationId);
    const response = await axios.delete(`${apiConfig.apiUrl}/api/meter/migrations/drop-table`, { headers });
    return response.data;
  } catch (error) {
    console.error('Error dropping meter readings table:', error);
    throw error;
  }
};

// Export types for use elsewhere
export type { MeterReading, MeterLimit, PaginatedMeterReadings, PaginationInfo }; 