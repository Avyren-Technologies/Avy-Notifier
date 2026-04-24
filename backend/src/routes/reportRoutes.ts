import express, { Request, Response, Router, RequestHandler } from 'express';
import { getClientWithRetry } from '../config/scadaDb';
import { authenticate } from '../middleware/authMiddleware';
import { getRequestOrgId } from '../middleware/authMiddleware';
import prisma from '../config/db';
import { getFirstString } from '../utils/requestValue';
import { getOrganizationSchemaConfig } from '../services/scadaService';

const router: Router = express.Router();

type Severity = 'critical' | 'warning' | 'info';

type ColumnConfigEntry = {
  name?: string;
  type?: string;
  zone?: string;
  unit?: string;
  isAnalog?: boolean;
  isBinary?: boolean;
  lowDeviation?: number;
  highDeviation?: number;
};

const normalizeQueryList = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .flatMap(v => String(v).split(','))
      .map(v => v.trim().toLowerCase())
      .filter(Boolean);
  }
  return String(value)
    .split(',')
    .map(v => v.trim().toLowerCase())
    .filter(Boolean);
};

const calculateAnalogSeverity = (
  value: number,
  setpoint: number,
  lowDeviation: number,
  highDeviation: number
): Severity => {
  const lowLimit = setpoint + lowDeviation;
  const highLimit = setpoint + highDeviation;
  const warningOffset = 10;

  if (value < lowLimit - warningOffset || value > highLimit + warningOffset) {
    return 'critical';
  }
  if (value < lowLimit || value > highLimit) {
    return 'warning';
  }
  return 'info';
};

const getDefaultDeviation = (type: string, isHigh = false): number => {
  switch (type.toLowerCase()) {
    case 'carbon':
      return isHigh ? 1 : -1;
    case 'temperature':
      return isHigh ? 10 : -10;
    case 'level':
      return isHigh ? 8 : -8;
    case 'pressure':
      return isHigh ? 5 : -5;
    default:
      return isHigh ? 10 : -10;
  }
};

// Apply authentication to all report routes
router.use(authenticate);

/**
 * @route   GET /api/reports/alarm-data
 * @desc    Get alarm data from configured SCADA table with filters
 * @access  Private
 */
router.get('/alarm-data', function(req: Request, res: Response) {
  (async () => {
    try {
      const { 
        startDate, 
        endDate, 
        alarmTypes,
        severityLevels,
        zones
      } = req.query;

      // Validate date inputs
      const parsedStartDate = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default to 7 days ago
      const parsedEndDate = endDate ? new Date(endDate as string) : new Date();
      
      if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }

      // Get a SCADA DB client
      const client = await getClientWithRetry(getRequestOrgId(req));

      try {
        const orgId = getRequestOrgId(req);
        const schemaConfig = await getOrganizationSchemaConfig(orgId);
        const normalizedAlarmTypes = normalizeQueryList(alarmTypes);
        const normalizedSeverityLevels = normalizeQueryList(severityLevels);
        const normalizedZones = normalizeQueryList(zones);

        // Build setpoint map for dynamic analog severity evaluation
        const setpoints = await prisma.setpoint.findMany({
          where: { organizationId: orgId }
        });
        const setpointMap = new Map<string, { lowDeviation: number; highDeviation: number }>();
        setpoints.forEach(sp => {
          setpointMap.set(sp.scadaField, {
            lowDeviation: sp.lowDeviation,
            highDeviation: sp.highDeviation
          });
        });

        const sanitizeIdentifier = (value: string): string => {
          if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
            throw new Error(`Invalid SQL identifier: ${value}`);
          }
          return `"${value}"`;
        };

        const configuredColumns = Array.isArray(schemaConfig.columns) ? schemaConfig.columns : [];
        const columns = [...new Set([...configuredColumns, 'id', 'created_timestamp'])];
        const safeColumnList = columns.map(sanitizeIdentifier).join(', ');
        const safeTable = sanitizeIdentifier(schemaConfig.table || 'jk2');

        let query = `
          SELECT ${safeColumnList}
          FROM ${safeTable}
          WHERE created_timestamp BETWEEN $1 AND $2
        `;

        const queryParams: any[] = [parsedStartDate, parsedEndDate];
        let paramIndex = 3;

        // Optional generic search on configured columns
        if (req.query.search && typeof req.query.search === 'string' && req.query.search.trim()) {
          const searchValue = req.query.search.trim().toLowerCase();
          const searchableColumns = columns.filter(
            col => col !== 'id' && col !== 'created_timestamp'
          );
          if (searchableColumns.length > 0) {
            const searchConditions = searchableColumns
              .map(col => `LOWER(CAST(${sanitizeIdentifier(col)} AS TEXT)) LIKE $${paramIndex}`)
              .join(' OR ');
            query += ` AND (${searchConditions})`;
            searchableColumns.forEach(() => queryParams.push(`%${searchValue}%`));
            paramIndex += searchableColumns.length;
          }
        }

        // Keep compatibility: if filter arrays are sent, do not fail. We ignore legacy fixed-column filters
        // because this route now supports dynamic SCADA schemas.
        void alarmTypes;
        void severityLevels;
        void zones;

        query += ' ORDER BY created_timestamp DESC';

        const limit = req.query.limit ? parseInt(getFirstString(req.query.limit) || '1000', 10) : 1000;
        if (!isNaN(limit) && limit > 0) {
          query += ` LIMIT $${paramIndex}`;
          queryParams.push(limit);
        }

        const result = await client.query(query, queryParams);

        const columnConfigs = (schemaConfig.columnConfigs || {}) as Record<string, ColumnConfigEntry>;

        const filteredRows = result.rows.filter(row => {
          const rowSignals: { type: string; zone?: string; severity: Severity; active: boolean }[] = [];

          for (const [columnName, cfg] of Object.entries(columnConfigs)) {
            const type = (cfg.type || '').toLowerCase();
            const zone = cfg.zone?.toLowerCase();

            if (cfg.isBinary) {
              const raw = row[columnName];
              const active = raw === true || raw === 1 || raw === '1' || raw === 'true';
              rowSignals.push({
                type,
                zone,
                severity: active ? 'critical' : 'info',
                active
              });
              continue;
            }

            if (cfg.isAnalog) {
              const pvValue = Number(row[columnName]);
              if (!Number.isFinite(pvValue)) continue;

              let svField = '';
              if (columnName.endsWith('_pv')) {
                svField = columnName.replace(/_pv$/, '_sv');
              } else if (columnName.endsWith('pv')) {
                svField = columnName.replace(/pv$/, 'sv');
              }

              const svRaw = svField ? row[svField] : undefined;
              const svValue = Number.isFinite(Number(svRaw)) ? Number(svRaw) : pvValue;

              const sp = setpointMap.get(columnName);
              const lowDeviation = sp?.lowDeviation ?? cfg.lowDeviation ?? getDefaultDeviation(type, false);
              const highDeviation = sp?.highDeviation ?? cfg.highDeviation ?? getDefaultDeviation(type, true);
              const severity = calculateAnalogSeverity(pvValue, svValue, lowDeviation, highDeviation);

              rowSignals.push({
                type,
                zone,
                severity,
                active: severity !== 'info'
              });
            }
          }

          // If no dynamic config present for this row, keep backward compatibility and include row.
          if (rowSignals.length === 0) {
            return true;
          }

          return rowSignals.some(signal => {
            if (normalizedAlarmTypes.length > 0 && !normalizedAlarmTypes.includes(signal.type)) {
              return false;
            }
            if (normalizedZones.length > 0 && (!signal.zone || !normalizedZones.includes(signal.zone))) {
              return false;
            }
            if (normalizedSeverityLevels.length > 0 && !normalizedSeverityLevels.includes(signal.severity)) {
              return false;
            }
            return true;
          });
        });

        return res.json({
          count: filteredRows.length,
          data: filteredRows
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error fetching alarm report data:', error);
      return res.status(500).json({ error: 'Failed to retrieve alarm data' });
    }
  })();
});

/**
 * @route   GET /api/reports/furnace
 * @desc    Get saved furnace reports for a user with pagination
 * @access  Private
 */
router.get('/furnace', function(req: Request, res: Response) {
  (async () => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Parse pagination parameters
      const page = parseInt(getFirstString(req.query.page) || '1', 10) || 1;
      const limit = parseInt(getFirstString(req.query.limit) || '10', 10) || 10;
      const skip = (page - 1) * limit;

      const organizationId = getRequestOrgId(req);
      // Get reports with pagination and exclude large fileContent for list view
      const reports = await prisma.furnaceReport.findMany({
        where: { userId, organizationId },
        select: {
          id: true,
          title: true,
          format: true,
          fileName: true,
          fileSize: true,
          startDate: true,
          endDate: true,
          grouping: true,
          includeThresholds: true,
          includeStatusFields: true,
          alarmTypes: true,
          severityLevels: true,
          zones: true,
          createdAt: true,
          metadata: true,
          user: {
            select: { id: true, name: true, email: true }
          }
          // Exclude fileContent to reduce memory usage
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      });

      // Get total count for pagination info
      const totalCount = await prisma.furnaceReport.count({
        where: { userId, organizationId }
      });

      const totalPages = Math.ceil(totalCount / limit);

      return res.json({
        reports,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching furnace reports:', error);
      return res.status(500).json({ error: 'Failed to retrieve furnace reports' });
    }
  })();
});

/**
 * @route   POST /api/reports/furnace
 * @desc    Save a new furnace report
 * @access  Private
 */
router.post('/furnace', function(req: Request, res: Response) {
  (async () => {
    try {
      console.log('POST /api/reports/furnace - Request received');
      const userId = (req as any).user?.id;
      console.log('User ID:', userId);
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const {
        title,
        format,
        fileContent,
        fileName,
        fileSize,
        startDate,
        endDate,
        grouping,
        includeThresholds,
        includeStatusFields,
        alarmTypes,
        severityLevels,
        zones,
        metadata
      } = req.body;
      
      console.log('Request body keys:', Object.keys(req.body));
      console.log('Title:', title);
      console.log('File size:', fileSize);
      console.log('File content length:', fileContent?.length);

      // Convert base64 to buffer
      const buffer = Buffer.from(fileContent, 'base64');
      console.log('Buffer size:', buffer.length);

      console.log('Creating furnace report in database...');
      const organizationId = getRequestOrgId(req);
      const report = await prisma.furnaceReport.create({
        data: {
          userId,
          organizationId,
          title,
          format,
          fileContent: buffer,
          fileName,
          fileSize,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          grouping,
          includeThresholds: includeThresholds ?? true,
          includeStatusFields: includeStatusFields ?? true,
          alarmTypes: alarmTypes || [],
          severityLevels: severityLevels || [],
          zones: zones || [],
          metadata
        }
      });

      console.log('Report saved successfully with ID:', report.id);
      return res.json({ id: report.id, message: 'Furnace report saved successfully' });
    } catch (error: any) {
      console.error('Error saving furnace report:', error);
      console.error('Error stack:', error.stack);
      console.error('Error message:', error.message);
      return res.status(500).json({ 
        error: 'Failed to save furnace report',
        details: error.message 
      });
    }
  })();
});

/**
 * @route   GET /api/reports/furnace/:id
 * @desc    Get a specific furnace report file
 * @access  Private
 */
router.get('/furnace/:id', function(req: Request, res: Response) {
  (async () => {
    try {
      const userId = (req as any).user?.id;
      const reportId = getFirstString(req.params.id);
      if (!reportId) {
        return res.status(400).json({ error: 'Report id is required' });
      }

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const organizationId = getRequestOrgId(req);
      const report = await prisma.furnaceReport.findFirst({
        where: { 
          id: reportId,
          userId,
          organizationId
        }
      });

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      // Set appropriate headers for file download
      res.setHeader('Content-Type', 
        report.format === 'pdf' 
          ? 'application/pdf' 
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
      res.setHeader('Content-Length', report.fileContent.length);

      return res.send(report.fileContent);
    } catch (error) {
      console.error('Error retrieving furnace report:', error);
      return res.status(500).json({ error: 'Failed to retrieve report' });
    }
  })();
});

/**
 * @route   GET /api/reports/setpoints
 * @desc    Get setpoint configurations for alarm processing
 * @access  Private
 */
router.get('/setpoints', function(req: Request, res: Response) {
  (async () => {
    try {
      const setpoints = await prisma.setpoint.findMany({
        orderBy: [
          { type: 'asc' },
          { zone: 'asc' },
          { name: 'asc' }
        ]
      });

      return res.json(setpoints);
    } catch (error) {
      console.error('Error fetching setpoints:', error);
      return res.status(500).json({ error: 'Failed to retrieve setpoints' });
    }
  })();
});

export default router; 