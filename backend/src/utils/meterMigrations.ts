import fs from 'fs';
import path from 'path';
import { getClientWithRetry } from '../config/scadaDb';

/**
 * Utility to run meter readings table migrations on SCADA database
 */
export class MeterMigrations {
  /**
   * Create the meter_readings table in the SCADA database
   */
  static async createMeterReadingsTable(organizationId: string): Promise<void> {
    console.log('🔧 Creating meter_readings table in SCADA database...');

    const client = await getClientWithRetry(organizationId);

    try {
      // Read the SQL migration file
      const migrationPath = path.join(__dirname, '../migrations/create_meter_readings_table.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      // Execute the migration
      await client.query(migrationSQL);

      console.log('✅ Successfully created meter_readings table in SCADA database');

      // Verify the table was created by checking if it exists
      const checkResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'meter_readings'
        ) as table_exists
      `);

      if (checkResult.rows[0].table_exists) {
        console.log('✅ Verified: meter_readings table exists');

        // Check table structure
        const structureResult = await client.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = 'meter_readings'
          AND table_schema = 'public'
          ORDER BY ordinal_position
        `);

        console.log('📊 Table structure:');
        structureResult.rows.forEach(row => {
          console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${row.column_default || ''}`);
        });

        // Count existing records
        const countResult = await client.query('SELECT COUNT(*) as count FROM meter_readings');
        console.log(`📈 Existing records: ${countResult.rows[0].count}`);

      } else {
        throw new Error('Table creation verification failed');
      }

    } catch (error) {
      console.error('❌ Failed to create meter_readings table:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if meter_readings table exists
   */
  static async tableExists(organizationId: string): Promise<boolean> {
    const client = await getClientWithRetry(organizationId);

    try {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'meter_readings'
        ) as table_exists
      `);

      return result.rows[0].table_exists;
    } catch (error) {
      console.error('❌ Error checking table existence:', error);
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Drop the meter_readings table (for testing/cleanup)
   */
  static async dropMeterReadingsTable(organizationId: string): Promise<void> {
    console.log('🗑️ Dropping meter_readings table...');

    const client = await getClientWithRetry(organizationId);

    try {
      // Drop table and sequence
      await client.query('DROP TABLE IF EXISTS meter_readings CASCADE');
      await client.query('DROP SEQUENCE IF EXISTS meter_seq CASCADE');

      console.log('✅ Successfully dropped meter_readings table and sequence');
    } catch (error) {
      console.error('❌ Failed to drop meter_readings table:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get table statistics
   */
  static async getTableStats(organizationId: string): Promise<{
    exists: boolean;
    recordCount: number;
    lastRecord?: any;
    size?: string;
  }> {
    const client = await getClientWithRetry(organizationId);

    try {
      const exists = await this.tableExists(organizationId);

      if (!exists) {
        return { exists: false, recordCount: 0 };
      }

      // Get record count
      const countResult = await client.query('SELECT COUNT(*) as count FROM meter_readings');
      const recordCount = parseInt(countResult.rows[0].count);

      // Get last record
      const lastRecordResult = await client.query(`
        SELECT meter_id, voltage, current, frequency, pf, energy, power,
               created_at AT TIME ZONE 'UTC' as created_at
        FROM meter_readings
        ORDER BY created_at DESC
        LIMIT 1
      `);

      const lastRecord = lastRecordResult.rows.length > 0 ? lastRecordResult.rows[0] : undefined;

      // Get table size (approximate)
      const sizeResult = await client.query(`
        SELECT pg_size_pretty(pg_total_relation_size('meter_readings')) as size
      `);

      return {
        exists: true,
        recordCount,
        lastRecord,
        size: sizeResult.rows[0].size
      };

    } catch (error) {
      console.error('❌ Error getting table stats:', error);
      return { exists: false, recordCount: 0 };
    } finally {
      client.release();
    }
  }
}
