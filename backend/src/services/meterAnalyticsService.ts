// Meter Analytics Service
// Sends sample IoT data to the analytics API endpoint at regular intervals

const DEBUG = process.env.NODE_ENV === 'development';

interface SampleData {
  temperature: {
    CH1: number;
    CH2: number;
    CH3: number;
  };
  energy_meter: {
    energy_kWh: number;
    frequency_Hz: number;
    voltage_V: number;
    current_A: number;
  };
  vibrator_meter: {
    s4_voltage: number;
  };
  timestamp: string;
}

/**
 * Service for sending simulated IoT meter analytics data
 */
export class MeterAnalyticsService {
  private static isRunning = false;
  private static intervalId: NodeJS.Timeout | null = null;

  // Configuration from environment variables
  private static readonly BASE_URL = process.env.METER_ANALYTICS_BASE_URL || 'https://avy-meter-analytics.vercel.app';
  private static readonly INTERVAL_MS = parseInt(process.env.METER_ANALYTICS_INTERVAL || '5000'); // 5 seconds default
  private static readonly API_ENDPOINT = '/api/ingest';

  /**
   * Generate sample IoT sensor data with realistic variations
   */
  private static generateSampleData(): SampleData {
    const now = new Date();
    // Format timestamp in IST (YYYY-MM-DD HH:mm:ss format)
    const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const timestamp = istTime.toISOString().slice(0, 19).replace('T', ' ');

    return {
      temperature: {
        CH1: 25 + Math.random() * 15, // 25-40°C
        CH2: 24 + Math.random() * 16, // 24-40°C
        CH3: 23 + Math.random() * 17, // 23-40°C
      },
      energy_meter: {
        energy_kWh: 15 + Math.random() * 10, // 15-25 kWh
        frequency_Hz: 50 + Math.random() * 2, // 50-52 Hz
        voltage_V: 220 + Math.random() * 20, // 220-240V
        current_A: 10 + Math.random() * 20, // 10-30A
      },
      vibrator_meter: {
        s4_voltage: 2 + Math.random() * 2, // 2-4V
      },
      timestamp: timestamp
    };
  }

  /**
   * Send data to the analytics API
   */
  private static async sendData(): Promise<void> {
    try {
      const data = this.generateSampleData();

      if (DEBUG) {
        console.log('📊 Sending analytics data:', JSON.stringify(data, null, 2));
      }

      const response = await fetch(`${this.BASE_URL}${this.API_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Analytics data sent successfully:', result);
      } else {
        console.error('❌ Analytics API error:', response.status, await response.text());
      }
    } catch (error) {
        if (error instanceof Error) {
          console.error('❌ Network error sending analytics data:', error.message);
        } else {
          console.error('❌ Network error sending analytics data:', error);
        }
    }
  }

  /**
   * Start the meter analytics service
   */
  static async start(): Promise<void> {
    if (this.isRunning) {
      console.log('🔄 Meter analytics service is already running');
      return;
    }

    console.log('🚀 Starting meter analytics service...');
    console.log(`📡 API Endpoint: ${this.BASE_URL}${this.API_ENDPOINT}`);
    console.log(`⏱️  Interval: ${this.INTERVAL_MS}ms`);

    this.isRunning = true;

    // Send data immediately
    await this.sendData();

    // Set up continuous data sending
    this.intervalId = setInterval(async () => {
      try {
        await this.sendData();
      } catch (error) {
        console.error('🔴 Error in analytics data cycle:', error);
      }
    }, this.INTERVAL_MS);

    console.log('✅ Meter analytics service started');
  }

  /**
   * Stop the meter analytics service
   */
  static stop(): void {
    if (!this.isRunning) {
      console.log('🔄 Meter analytics service is not running');
      return;
    }

    console.log('🛑 Stopping meter analytics service...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('✅ Meter analytics service stopped');
  }

  /**
   * Get the current status of the analytics service
   */
  static getStatus(): {
    isRunning: boolean;
    baseUrl: string;
    interval: number;
    endpoint: string;
  } {
    return {
      isRunning: this.isRunning,
      baseUrl: this.BASE_URL,
      interval: this.INTERVAL_MS,
      endpoint: this.API_ENDPOINT
    };
  }

  /**
   * Force a single data transmission cycle
   */
  static async forceDataTransmission(): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Meter analytics service is not running');
    }

    console.log('🔄 Forcing analytics data transmission...');
    await this.sendData();
    console.log('✅ Forced analytics data transmission completed');
  }
}

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down meter analytics service...');
  MeterAnalyticsService.stop();
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down meter analytics service...');
  MeterAnalyticsService.stop();
});

export default MeterAnalyticsService;
