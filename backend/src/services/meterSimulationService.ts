import prisma from "../config/db"
import { NotificationService } from './notificationService';


interface MeterReadingData {
  voltage: number;
  current: number;
  frequency: number;
  pf: number;
  energy: number;
  power: number;
}

interface MeterLimit {
  parameter: string;
  highLimit?: number;
  lowLimit?: number | null;
}

interface SimulationConfig {
  enabled: boolean;
  interval: number; // milliseconds
  organizationId: string;
  realisticVariations: boolean;
  notifyOnLimits: boolean;
  baseValues: MeterReadingData;
  variations: {
    voltage: number;
    current: number;
    frequency: number;
    pf: number;
    energyIncrement: number;
    powerVariation: number;
  };
}

class MeterSimulationService {
  private static simulations: Map<string, NodeJS.Timeout> = new Map();
  private static configs: Map<string, SimulationConfig> = new Map();

  // Base realistic electrical parameters for a typical industrial setup
  private static readonly DEFAULT_BASE_VALUES: MeterReadingData = {
    voltage: 415.0,     // 3-phase voltage (V)
    current: 45.2,      // Current (A)
    frequency: 50.0,    // Grid frequency (Hz)
    pf: 0.92,          // Power factor
    energy: 125000.5,   // Cumulative energy (kWh)
    power: 32.5         // Active power (kW)
  };

  // Realistic variation ranges
  private static readonly DEFAULT_VARIATIONS = {
    voltage: 15,        // ±15V variation
    current: 8,         // ±8A variation
    frequency: 0.5,     // ±0.5Hz variation
    pf: 0.08,          // ±0.08 variation
    energyIncrement: 0.15, // Energy increases by ~0.15 kWh per reading
    powerVariation: 5   // ±5kW variation
  };

  /**
   * Generate realistic meter reading with natural variations
   */
  private static generateRealisticReading(
    baseValues: MeterReadingData,
    variations: typeof MeterSimulationService.DEFAULT_VARIATIONS,
    lastEnergy: number
  ): MeterReadingData {
    // Add realistic noise to base values
    const voltage = baseValues.voltage + (Math.random() - 0.5) * 2 * variations.voltage;
    const current = Math.max(0, baseValues.current + (Math.random() - 0.5) * 2 * variations.current);
    const frequency = baseValues.frequency + (Math.random() - 0.5) * 2 * variations.frequency;

    // Power factor with realistic constraints (0.7 to 1.0)
    const pf = Math.max(0.7, Math.min(1.0, baseValues.pf + (Math.random() - 0.5) * 2 * variations.pf));

    // Calculate power using P = V * I * PF * √3 (for 3-phase)
    const calculatedPower = (voltage * current * pf * Math.sqrt(3)) / 1000; // Convert to kW
    const power = Math.max(0, calculatedPower + (Math.random() - 0.5) * 2 * variations.powerVariation);

    // Energy should always increase (or stay same, never decrease)
    const energyIncrement = Math.random() * variations.energyIncrement * 2; // 0 to 2x increment
    const energy = lastEnergy + energyIncrement;

    return {
      voltage: Math.round(voltage * 10) / 10, // Round to 1 decimal
      current: Math.round(current * 10) / 10,
      frequency: Math.round(frequency * 10) / 10,
      pf: Math.round(pf * 100) / 100, // Round to 2 decimals
      energy: Math.round(energy * 10) / 10,
      power: Math.round(power * 10) / 10
    };
  }

  /**
   * Check if reading violates any limits and send notifications
   */
  private static async checkLimitsAndNotify(
    reading: MeterReadingData,
    limits: MeterLimit[],
    organizationId: string
  ): Promise<void> {
    const violations = [];

    for (const limit of limits) {
      const value = reading[limit.parameter as keyof MeterReadingData];

      if (value === undefined) continue;

      if (limit.highLimit !== undefined && value > limit.highLimit) {
        violations.push({
          parameter: limit.parameter.toUpperCase(),
          value,
          limit: limit.highLimit,
          type: 'HIGH'
        });
      }

      if (limit.lowLimit !== null && limit.lowLimit !== undefined && value < limit.lowLimit) {
        violations.push({
          parameter: limit.parameter.toUpperCase(),
          value,
          limit: limit.lowLimit,
          type: 'LOW'
        });
      }
    }

    // Send notifications for violations
    for (const violation of violations) {
      try {
        await NotificationService.createNotification({
          title: `⚠️ Meter Alert: ${violation.parameter} ${violation.type}`,
          body: `${violation.parameter} reading of ${violation.value} exceeded ${violation.type} limit of ${violation.limit}`,
          severity: 'WARNING',
          type: 'ALARM',
          metadata: {
            parameter: violation.parameter.toLowerCase(),
            value: violation.value,
            limit: violation.limit,
            type: violation.type,
            timestamp: new Date().toISOString()
          },
          organizationId
        });
        console.log(`📢 Notification sent for ${violation.parameter} violation`);
      } catch (error) {
        console.error('❌ Failed to send violation notification:', error);
      }
    }
  }

  /**
   * Insert reading into database
   */
  private static async insertReading(
    reading: MeterReadingData,
    organizationId: string,
    client: any
  ): Promise<void> {
    try {
      const result = await client.query(
        `INSERT INTO meter_readings (voltage, current, frequency, pf, energy, power)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING meter_id`,
        [reading.voltage, reading.current, reading.frequency, reading.pf, reading.energy, reading.power]
      );

      console.log(`📊 Simulated meter reading inserted: ID ${result.rows[0].meter_id}, V:${reading.voltage}, A:${reading.current}, kW:${reading.power}`);

      // Also notify the backend about this reading for limit checking
      await this.notifyBackendOfReading(reading, organizationId);

    } catch (error) {
      console.error('❌ Failed to insert simulated reading:', error);
      throw error;
    }
  }

  /**
   * Notify backend of new reading (for limit checking)
   */
  private static async notifyBackendOfReading(reading: MeterReadingData, organizationId: string): Promise<void> {
    try {
      // This simulates what the Arduino would send
      const response = await fetch(`${process.env.BASE_URL || 'http://localhost:8080'}/api/meter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voltage: reading.voltage,
          current: reading.current,
          frequency: reading.frequency,
          pf: reading.pf,
          energy: reading.energy,
          power: reading.power,
          organizationId
        })
      });

      if (!response.ok) {
        console.error('❌ Failed to notify backend of reading');
      }
    } catch (error) {
      console.error('❌ Error notifying backend:', error);
    }
  }

  /**
   * Get the last energy reading to ensure monotonic increase
   */
  private static async getLastEnergyReading(client: any): Promise<number> {
    try {
      const result = await client.query(
        `SELECT energy FROM meter_readings ORDER BY created_at DESC LIMIT 1`
      );

      if (result.rows.length > 0) {
        return result.rows[0].energy;
      }

      // Return default if no readings exist
      return this.DEFAULT_BASE_VALUES.energy;
    } catch (error) {
      console.error('Error getting last energy reading:', error);
      return this.DEFAULT_BASE_VALUES.energy;
    }
  }

  /**
   * Start simulation for an organization
   */
  static async startSimulation(
    organizationId: string,
    config: Partial<SimulationConfig> = {}
  ): Promise<void> {
    // Stop existing simulation if running
    this.stopSimulation(organizationId);

    const simulationConfig: SimulationConfig = {
      enabled: true,
      interval: config.interval || 30000, // 30 seconds default
      organizationId,
      realisticVariations: config.realisticVariations ?? true,
      notifyOnLimits: config.notifyOnLimits ?? true,
      baseValues: config.baseValues || { ...this.DEFAULT_BASE_VALUES },
      variations: config.variations || { ...this.DEFAULT_VARIATIONS }
    };

    this.configs.set(organizationId, simulationConfig);

    console.log(`🚀 Starting meter simulation for organization ${organizationId}`);
    console.log(`⏱️  Interval: ${simulationConfig.interval}ms`);
    console.log(`📊 Base values:`, simulationConfig.baseValues);

    // Get database client for the organization
    const { getClientWithRetry } = await import('../config/scadaDb');
    const client = await getClientWithRetry(organizationId);

    // Get limits for threshold checking
    const limits = await prisma.meterLimit.findMany({
      where: { organizationId }
    });

    const runSimulation = async () => {
      try {
        const config = this.configs.get(organizationId);
        if (!config || !config.enabled) return;

        // Get last energy reading to ensure monotonic increase
        const lastEnergy = await this.getLastEnergyReading(client);

        // Generate realistic reading
        const reading = this.generateRealisticReading(
          config.baseValues,
          config.variations,
          lastEnergy
        );

        // Insert reading
        await this.insertReading(reading, organizationId, client);

        // Check limits and notify if enabled
        if (config.notifyOnLimits) {
          await this.checkLimitsAndNotify(reading, limits, organizationId);
        }

      } catch (error) {
        console.error(`❌ Simulation error for ${organizationId}:`, error);
      }
    };

    // Run immediately, then set interval
    await runSimulation();

    const intervalId = setInterval(runSimulation, simulationConfig.interval);
    this.simulations.set(organizationId, intervalId);

    console.log(`✅ Meter simulation started for ${organizationId}`);
  }

  /**
   * Stop simulation for an organization
   */
  static stopSimulation(organizationId: string): void {
    const intervalId = this.simulations.get(organizationId);
    if (intervalId) {
      clearInterval(intervalId);
      this.simulations.delete(organizationId);
      this.configs.delete(organizationId);
      console.log(`🛑 Meter simulation stopped for organization ${organizationId}`);
    }
  }

  /**
   * Update simulation configuration
   */
  static updateConfig(organizationId: string, updates: Partial<SimulationConfig>): void {
    const existing = this.configs.get(organizationId);
    if (existing) {
      const updated = { ...existing, ...updates };
      this.configs.set(organizationId, updated);

      // If interval changed, restart simulation
      if (updates.interval && updates.interval !== existing.interval) {
        this.stopSimulation(organizationId);
        this.startSimulation(organizationId, updated);
      }

      console.log(`⚙️ Updated simulation config for ${organizationId}`);
    }
  }

  /**
   * Get simulation status
   */
  static getStatus(organizationId: string): {
    running: boolean;
    config?: SimulationConfig;
    nextRun?: Date;
  } {
    const config = this.configs.get(organizationId);
    const running = this.simulations.has(organizationId);

    return {
      running,
      config,
      nextRun: running && config ? new Date(Date.now() + config.interval) : undefined
    };
  }

  /**
   * Get all running simulations
   */
  static getAllSimulations(): Array<{
    organizationId: string;
    running: boolean;
    config: SimulationConfig;
  }> {
    const result = [];

    for (const [orgId, config] of this.configs) {
      result.push({
        organizationId: orgId,
        running: this.simulations.has(orgId),
        config
      });
    }

    return result;
  }

  /**
   * Stop all simulations
   */
  static stopAllSimulations(): void {
    console.log('🛑 Stopping all meter simulations...');

    for (const orgId of this.simulations.keys()) {
      this.stopSimulation(orgId);
    }

    console.log('✅ All simulations stopped');
  }

  /**
   * Initialize sample data for demonstration
   */
  static async initializeSampleData(organizationId: string): Promise<void> {
    console.log(`📊 Initializing sample meter data for organization ${organizationId}`);

    const { getClientWithRetry } = await import('../config/scadaDb');
    const client = await getClientWithRetry(organizationId);

    try {
      // Insert some historical readings (last 24 hours)
      const now = new Date();
      const readings = [];

      for (let i = 23; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000); // Every hour
        const baseEnergy = this.DEFAULT_BASE_VALUES.energy - (24 - i) * 10; // Decreasing energy for history

        const reading = this.generateRealisticReading(
          this.DEFAULT_BASE_VALUES,
          this.DEFAULT_VARIATIONS,
          baseEnergy
        );

        readings.push({
          ...reading,
          timestamp
        });
      }

      // Insert readings with timestamps
      for (const reading of readings) {
        await client.query(
          `INSERT INTO meter_readings (voltage, current, frequency, pf, energy, power, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            reading.voltage,
            reading.current,
            reading.frequency,
            reading.pf,
            reading.energy,
            reading.power,
            reading.timestamp
          ]
        );
      }

      console.log(`✅ Initialized ${readings.length} sample meter readings`);

    } catch (error) {
      console.error('❌ Failed to initialize sample data:', error);
    } finally {
      client.release();
    }
  }
}

export default MeterSimulationService;
