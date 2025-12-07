-- Create meter readings table in SCADA database
-- This script sets up the meter_readings table as described in meter_readings.md

-- Create sequence for meter IDs
CREATE SEQUENCE IF NOT EXISTS meter_seq
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  NO CYCLE;

-- Create meter_readings table
CREATE TABLE IF NOT EXISTS meter_readings (
  meter_id character varying(20) NOT NULL DEFAULT ('Ennar'::text || lpad(nextval('meter_seq'::regclass)::text, 3, '0'::text)),
  voltage real NOT NULL,
  current real NOT NULL,
  frequency real NOT NULL,
  pf real NOT NULL,
  energy real NOT NULL,
  power real NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create primary key constraint
ALTER TABLE meter_readings
  ADD CONSTRAINT meter_readings_pkey PRIMARY KEY (meter_id);

-- Create check constraints
ALTER TABLE meter_readings
  ADD CONSTRAINT meter_readings_voltage_check CHECK (voltage >= 0),
  ADD CONSTRAINT meter_readings_current_check CHECK (current >= 0),
  ADD CONSTRAINT meter_readings_frequency_check CHECK (frequency > 0),
  ADD CONSTRAINT meter_readings_pf_check CHECK (pf BETWEEN -1 AND 1),
  ADD CONSTRAINT meter_readings_energy_check CHECK (energy >= 0),
  ADD CONSTRAINT meter_readings_power_check CHECK (power >= 0);

-- Create index on created_at for efficient time-based queries
CREATE INDEX IF NOT EXISTS idx_meter_readings_created_at ON meter_readings(created_at);

-- Create index on meter_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_meter_readings_meter_id ON meter_readings(meter_id);
