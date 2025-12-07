# 🔌 Meter Data Simulation System

This document describes the comprehensive meter data simulation system implemented in the Avy-Notifier application. The system generates realistic electrical meter readings for demonstration and testing purposes.

## 📋 Overview

The meter simulation system provides:

- **Realistic Data Generation**: Electrical parameters that mimic real-world industrial meter readings
- **Periodic Updates**: Configurable intervals for continuous data generation
- **Threshold Monitoring**: Automatic violation detection and notifications
- **Historical Data**: 24+ hours of sample data for testing reports
- **Admin Controls**: Full simulation management through the UI

## 🚀 Quick Start

### 1. Initialize Sample Data
For immediate testing, initialize sample historical data:

1. Login as an Admin user
2. Navigate to Meter Readings screen
3. Click the **"Simulation"** button in the header
4. Click **"Initialize Sample Data"**
5. This adds 24 hours of realistic meter readings

### 2. Start Live Simulation
To begin generating live meter data:

1. In the Simulation Controls modal
2. Click **"Start"** button
3. The system will generate new readings every 30 seconds by default
4. Monitor real-time updates on the dashboard

### 3. Configure Simulation
Customize the simulation parameters:

- **Interval**: How often new readings are generated (10-300 seconds)
- **Realistic Variations**: Enable/disable natural data fluctuations
- **Notify on Limits**: Send alerts when readings exceed configured limits
- **Base Values**: Set starting electrical parameters
- **Variations**: Control the range of random fluctuations

## ⚙️ Technical Implementation

### Backend Components

#### **MeterSimulationService** (`backend/src/services/meterSimulationService.ts`)

**Key Features:**
- Generates realistic electrical meter readings with natural variations
- Maintains monotonic energy readings (always increasing)
- Checks threshold violations and triggers notifications
- Configurable simulation parameters per organization

**Core Methods:**
```typescript
// Start simulation for an organization
MeterSimulationService.startSimulation(organizationId, config)

// Stop simulation
MeterSimulationService.stopSimulation(organizationId)

// Update configuration
MeterSimulationService.updateConfig(organizationId, updates)

// Get simulation status
MeterSimulationService.getStatus(organizationId)
```

#### **API Endpoints** (`backend/src/routes/meterRoutes.ts`)

```
POST /api/meter/simulation/start     - Start simulation
POST /api/meter/simulation/stop      - Stop simulation
PUT  /api/meter/simulation/config    - Update configuration
GET  /api/meter/simulation/status    - Get simulation status
POST /api/meter/simulation/initialize - Initialize sample data
```

### Frontend Components

#### **MeterSimulationControls** (`app/components/MeterSimulationControls.tsx`)

A comprehensive control panel providing:
- Real-time simulation status monitoring
- Start/stop simulation controls
- Configuration management
- Sample data initialization
- Status indicators and error handling

#### **API Integration** (`app/api/meterApi.ts`)

Frontend API functions for simulation management:
```typescript
startMeterSimulation(config, organizationId)
stopMeterSimulation(organizationId)
updateMeterSimulationConfig(config, organizationId)
getMeterSimulationStatus(organizationId)
initializeMeterSampleData(organizationId)
```

## 🔧 Simulation Parameters

### Default Electrical Values

| Parameter  | Base Value | Unit | Variation Range |
|------------|------------|------|-----------------|
| Voltage    | 415.0      | V    | ±15V           |
| Current    | 45.2       | A    | ±8A            |
| Frequency  | 50.0       | Hz   | ±0.5Hz         |
| Power Factor| 0.92      | -    | ±0.08          |
| Energy     | 125000.5  | kWh  | +0.15 per reading |
| Power      | 32.5       | kW   | ±5kW           |

### Realistic Data Generation

The simulation creates natural variations by:

1. **Adding random noise** to base electrical values
2. **Calculating power** using 3-phase power formula: `P = V × I × PF × √3`
3. **Ensuring monotonic energy** readings (cumulative consumption)
4. **Maintaining realistic relationships** between parameters

### Threshold Monitoring

The system automatically:
- Monitors readings against configured limits
- Sends notifications when limits are exceeded
- Supports both high and low limit violations
- Integrates with the existing notification system

## 📊 Data Flow

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Simulation    │───▶│   SCADA Database │───▶│   API Response  │
│   Service       │    │   (meter_readings)│    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Limit Check   │───▶│   Notifications  │───▶│   Frontend UI   │
│   & Alerts      │    │   System         │    │   Updates       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🎯 Use Cases

### **1. Demonstration**
- Showcase real-time meter monitoring capabilities
- Demonstrate notification system functionality
- Test report generation with realistic data

### **2. Development Testing**
- Test frontend components with live data
- Validate API endpoints and error handling
- Test notification workflows

### **3. Training**
- Train operators on system usage
- Demonstrate threshold configuration
- Show historical data analysis

### **4. System Validation**
- Verify limit checking algorithms
- Test notification delivery
- Validate data persistence and retrieval

## 🔒 Security & Access Control

- **Admin Only**: Simulation controls are restricted to users with ADMIN role
- **Organization Isolation**: Each organization's simulation is isolated
- **Audit Trail**: All simulation actions are logged
- **Graceful Shutdown**: Automatic cleanup on application restart

## 📈 Monitoring & Maintenance

### **Status Monitoring**
Check simulation status via:
- Frontend UI (Simulation Controls modal)
- API endpoint: `GET /api/meter/simulation/status`
- Backend logs for detailed information

### **Performance Considerations**
- Configurable update intervals (10-300 seconds)
- Database connection pooling
- Automatic cleanup on shutdown
- Error handling and retry logic

### **Troubleshooting**

**Common Issues:**
1. **No data appearing**: Check if simulation is started and database connections are working
2. **Notifications not sent**: Verify notification settings and limits configuration
3. **Performance issues**: Adjust simulation interval or check database performance

**Debug Commands:**
```bash
# Check simulation status
GET /api/meter/simulation/status

# View all running simulations (Super Admin only)
GET /api/meter/simulation/all

# Check database connectivity
SELECT COUNT(*) FROM meter_readings;
```

## 🚀 Advanced Configuration

### **Custom Base Values**
Modify electrical parameters for different scenarios:

```typescript
const customConfig = {
  baseValues: {
    voltage: 220.0,    // Single-phase system
    current: 25.0,     // Lower current draw
    frequency: 60.0,   // 60Hz system
    pf: 0.95,         // Better power factor
    energy: 50000.0,   // Lower baseline energy
    power: 15.0        // Lower power consumption
  }
};
```

### **Custom Variations**
Adjust fluctuation ranges for different equipment types:

```typescript
const industrialConfig = {
  variations: {
    voltage: 5,        // Stable voltage
    current: 15,       // Higher current variation
    frequency: 0.2,    // Very stable frequency
    pf: 0.05,         // Good power factor stability
    energyIncrement: 0.5, // Higher consumption rate
    powerVariation: 10   // More power fluctuation
  }
};
```

## 📝 API Reference

### **Simulation Control Endpoints**

#### **Start Simulation**
```http
POST /api/meter/simulation/start
Content-Type: application/json

{
  "interval": 30000,
  "realisticVariations": true,
  "notifyOnLimits": true,
  "baseValues": { /* custom values */ },
  "variations": { /* custom ranges */ }
}
```

#### **Stop Simulation**
```http
POST /api/meter/simulation/stop
```

#### **Update Configuration**
```http
PUT /api/meter/simulation/config
Content-Type: application/json

{
  "interval": 60000,
  "notifyOnLimits": false
}
```

#### **Get Status**
```http
GET /api/meter/simulation/status
```

Response:
```json
{
  "success": true,
  "data": {
    "running": true,
    "config": { /* current config */ },
    "nextRun": "2025-01-07T10:30:00.000Z"
  }
}
```

## 🎉 Conclusion

The meter simulation system provides a complete, production-ready solution for demonstrating and testing the Avy-Notifier meter monitoring capabilities. It generates realistic data, integrates seamlessly with existing systems, and provides comprehensive controls for customization and monitoring.

For questions or issues, refer to the backend logs or check the simulation status endpoints for detailed diagnostic information.
