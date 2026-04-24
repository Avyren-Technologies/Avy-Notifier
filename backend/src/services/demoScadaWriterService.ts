import cron, { ScheduledTask } from 'node-cron';
import { Pool } from 'pg';

type SupportedInterval = '1s' | '30s' | '1m';

const INTERVAL_TO_CRON: Record<SupportedInterval, string> = {
  '1s': '* * * * * *',
  '30s': '*/30 * * * * *',
  '1m': '0 * * * * *',
};

let task: ScheduledTask | null = null;
let pool: Pool | null = null;
let rowsInserted = 0;
let demoScadaTable = 'ht_furnace_process_log';

const randomIntInRange = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const randomBoolean = (probabilityTrue: number): boolean => {
  return Math.random() < probabilityTrue;
};

const buildDemoRow = () => {
  const hardeningZone1Sv = 870;
  const hardeningZone2Sv = 875;
  const hardeningZone3Sv = 880;
  const carburizingCpSv = 1;
  const sootFactorSv = 0;
  const temperingZone1Sv = 450;
  const temperingZone2Sv = 455;
  const quenchOilTempSv = 65;
  const quenchOilLevelSv = 78;
  const atmosphereDewpointSv = -22;

  return {
    hardening_zone1_temp_sv: hardeningZone1Sv,
    hardening_zone1_temp_pv: hardeningZone1Sv + randomIntInRange(-18, 16),
    hardening_zone2_temp_sv: hardeningZone2Sv,
    hardening_zone2_temp_pv: hardeningZone2Sv + randomIntInRange(-20, 14),
    hardening_zone3_temp_sv: hardeningZone3Sv,
    hardening_zone3_temp_pv: hardeningZone3Sv + randomIntInRange(-15, 20),
    carburizing_cp_sv: carburizingCpSv,
    carburizing_cp_pv: randomIntInRange(0, 2),
    soot_factor_sv: sootFactorSv,
    soot_factor_pv: randomIntInRange(0, 2),
    tempering_zone1_temp_sv: temperingZone1Sv,
    tempering_zone1_temp_pv: temperingZone1Sv + randomIntInRange(-12, 12),
    tempering_zone2_temp_sv: temperingZone2Sv,
    tempering_zone2_temp_pv: temperingZone2Sv + randomIntInRange(-13, 14),
    quench_oil_temp_sv: quenchOilTempSv,
    quench_oil_temp_pv: quenchOilTempSv + randomIntInRange(-8, 15),
    quench_oil_level_sv: quenchOilLevelSv,
    quench_oil_level_pv: quenchOilLevelSv + randomIntInRange(-6, 6),
    atmosphere_dewpoint_sv: atmosphereDewpointSv,
    atmosphere_dewpoint_pv: atmosphereDewpointSv + randomIntInRange(-4, 5),
    hardening_zone1_heater_trip: randomBoolean(0.03),
    hardening_zone2_heater_trip: randomBoolean(0.03),
    hardening_zone3_heater_trip: randomBoolean(0.03),
    hardening_circulation_fan_trip: randomBoolean(0.025),
    tempering_zone1_heater_trip: randomBoolean(0.02),
    tempering_zone2_heater_trip: randomBoolean(0.02),
    tempering_circulation_fan_trip: randomBoolean(0.02),
    quench_oil_pump_trip: randomBoolean(0.015),
    quench_oil_high_temp_alarm: randomBoolean(0.02),
    protective_atmosphere_low_pressure_alarm: randomBoolean(0.025),
  };
};

const insertDemoScadaRow = async () => {
  if (!pool) {
    return;
  }

  const row = buildDemoRow();
  const query = `
    INSERT INTO ${demoScadaTable} (
      created_timestamp,
      hardening_zone1_temp_sv, hardening_zone1_temp_pv,
      hardening_zone2_temp_sv, hardening_zone2_temp_pv,
      hardening_zone3_temp_sv, hardening_zone3_temp_pv,
      carburizing_cp_sv, carburizing_cp_pv,
      soot_factor_sv, soot_factor_pv,
      tempering_zone1_temp_sv, tempering_zone1_temp_pv,
      tempering_zone2_temp_sv, tempering_zone2_temp_pv,
      quench_oil_temp_sv, quench_oil_temp_pv,
      quench_oil_level_sv, quench_oil_level_pv,
      atmosphere_dewpoint_sv, atmosphere_dewpoint_pv,
      hardening_zone1_heater_trip,
      hardening_zone2_heater_trip,
      hardening_zone3_heater_trip,
      hardening_circulation_fan_trip,
      tempering_zone1_heater_trip,
      tempering_zone2_heater_trip,
      tempering_circulation_fan_trip,
      quench_oil_pump_trip,
      quench_oil_high_temp_alarm,
      protective_atmosphere_low_pressure_alarm
    )
    VALUES (
      NOW(),
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
    )
  `;

  const values = [
    row.hardening_zone1_temp_sv,
    row.hardening_zone1_temp_pv,
    row.hardening_zone2_temp_sv,
    row.hardening_zone2_temp_pv,
    row.hardening_zone3_temp_sv,
    row.hardening_zone3_temp_pv,
    row.carburizing_cp_sv,
    row.carburizing_cp_pv,
    row.soot_factor_sv,
    row.soot_factor_pv,
    row.tempering_zone1_temp_sv,
    row.tempering_zone1_temp_pv,
    row.tempering_zone2_temp_sv,
    row.tempering_zone2_temp_pv,
    row.quench_oil_temp_sv,
    row.quench_oil_temp_pv,
    row.quench_oil_level_sv,
    row.quench_oil_level_pv,
    row.atmosphere_dewpoint_sv,
    row.atmosphere_dewpoint_pv,
    row.hardening_zone1_heater_trip,
    row.hardening_zone2_heater_trip,
    row.hardening_zone3_heater_trip,
    row.hardening_circulation_fan_trip,
    row.tempering_zone1_heater_trip,
    row.tempering_zone2_heater_trip,
    row.tempering_circulation_fan_trip,
    row.quench_oil_pump_trip,
    row.quench_oil_high_temp_alarm,
    row.protective_atmosphere_low_pressure_alarm,
  ];

  await pool.query(query, values);
  rowsInserted += 1;
  console.log(`🧪 Demo SCADA row inserted (${rowsInserted}) into ${demoScadaTable}`);
};

export class DemoScadaWriterService {
  static start() {
    const demoInsertEnabled = process.env.DEMO_SCADA_INSERT_ENABLED === 'true';
    const demoScadaDbUrl = process.env.DEMO_SCADA_DB_URL;
    const demoScadaInsertInterval = process.env.DEMO_SCADA_INSERT_INTERVAL || '30s';
    demoScadaTable = process.env.DEMO_SCADA_TABLE || 'ht_furnace_process_log';

    if (!demoInsertEnabled) {
      console.log('⏭️ Demo SCADA writer disabled (DEMO_SCADA_INSERT_ENABLED != true)');
      return;
    }

    if (!demoScadaDbUrl) {
      console.warn('⚠️ DEMO_SCADA_DB_URL is missing, skipping demo SCADA writer startup');
      return;
    }

    if (task) {
      console.log('🔄 Demo SCADA writer already running');
      return;
    }

    if (!pool) {
      pool = new Pool({
        connectionString: demoScadaDbUrl,
        ssl: process.env.DEMO_SCADA_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      });
    }

    const normalized = demoScadaInsertInterval as SupportedInterval;
    const schedule = INTERVAL_TO_CRON[normalized] || INTERVAL_TO_CRON['30s'];
    const effectiveInterval = INTERVAL_TO_CRON[normalized] ? normalized : '30s';

    task = cron.schedule(schedule, async () => {
      try {
        await insertDemoScadaRow();
      } catch (error) {
        console.error('🔴 Demo SCADA writer insert failed:', error);
      }
    });

    console.log(
      `✅ Demo SCADA writer started (table=${demoScadaTable}, interval=${effectiveInterval})`
    );
  }

  static async stop() {
    if (task) {
      task.stop();
      task.destroy();
      task = null;
      console.log('🛑 Demo SCADA writer cron stopped');
    }

    if (pool) {
      await pool.end();
      console.log('🛑 Demo SCADA writer DB pool closed');
    }
  }
}

export default DemoScadaWriterService;
