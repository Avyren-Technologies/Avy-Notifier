export interface ColumnConfiguration {
  name: string;
  type: string;
  mapping?: string;
}

export interface ScadaDbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  sslMode: string;
  table: string;
  columns: string[];
  columnConfigurations: ColumnConfiguration[];
}

export interface Organization {
  id: string;
  name: string;
  scadaDbConfig: ScadaDbConfig;
  schemaConfig: Record<string, unknown>;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SuperAdminMetrics {
  totalOrganizations: number;
  totalUsers: number;
  activeOrganizations: number;
  newOrganizationsThisWeek: number;
  newUsersThisWeek: number;
  disabledOrganizations: number;
}

export interface SuperAdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string;
  organizationName: string;
  createdAt: string;
}
