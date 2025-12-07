import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  startMeterSimulation,
  stopMeterSimulation,
  updateMeterSimulationConfig,
  getMeterSimulationStatus,
  initializeMeterSampleData,
  createMeterReadingsTable,
  getMeterMigrationStatus,
  dropMeterReadingsTable,
  SimulationConfig,
  SimulationStatus
} from '../api/meterApi';

interface MeterSimulationControlsProps {
  visible: boolean;
  onClose: () => void;
}

export function MeterSimulationControls({ visible, onClose }: MeterSimulationControlsProps) {
  const { isDarkMode } = useTheme();
  const { organizationId, authState } = useAuth();
  const { role } = authState;

  // Simulation state
  const [status, setStatus] = useState<SimulationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Migration state
  const [migrationStatus, setMigrationStatus] = useState<{
    exists: boolean;
    recordCount: number;
    lastRecord?: any;
    size?: string;
  } | null>(null);
  const [migrationLoading, setMigrationLoading] = useState(false);

  // Configuration state
  const [config, setConfig] = useState<SimulationConfig & { baseValues: NonNullable<SimulationConfig['baseValues']> }>({
    interval: 30000,
    realisticVariations: true,
    notifyOnLimits: true,
    baseValues: {
      voltage: 415.0,
      current: 45.2,
      frequency: 50.0,
      pf: 0.92,
      energy: 125000.5,
      power: 32.5
    },
    variations: {
      voltage: 15,
      current: 8,
      frequency: 0.5,
      pf: 0.08,
      energyIncrement: 0.15,
      powerVariation: 5
    }
  });

  // Load simulation status on mount and when visible
  useEffect(() => {
    if (visible) {
      loadSimulationStatus();
      loadMigrationStatus();
    }
  }, [visible]);

  const loadMigrationStatus = async () => {
    if (!organizationId) return;

    try {
      const status = await getMeterMigrationStatus(organizationId);
      setMigrationStatus(status);
    } catch (error) {
      console.error('Error loading migration status:', error);
    }
  };

  const loadSimulationStatus = async () => {
    if (!organizationId) return;

    setRefreshing(true);
    try {
      const simulationStatus = await getMeterSimulationStatus(organizationId);
      setStatus(simulationStatus);
    } catch (error) {
      console.error('Error loading simulation status:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleStartSimulation = async () => {
    if (!organizationId) {
      Alert.alert('Error', 'Organization ID not found');
      return;
    }

    setLoading(true);
    try {
      await startMeterSimulation(config, organizationId);
      Alert.alert('Success', 'Meter simulation started successfully!');
      await loadSimulationStatus();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start simulation');
    } finally {
      setLoading(false);
    }
  };

  const handleStopSimulation = async () => {
    if (!organizationId) {
      Alert.alert('Error', 'Organization ID not found');
      return;
    }

    setLoading(true);
    try {
      await stopMeterSimulation(organizationId);
      Alert.alert('Success', 'Meter simulation stopped successfully!');
      await loadSimulationStatus();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to stop simulation');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async () => {
    if (!organizationId) {
      Alert.alert('Error', 'Organization ID not found');
      return;
    }

    setLoading(true);
    try {
      await updateMeterSimulationConfig(config, organizationId);
      Alert.alert('Success', 'Simulation configuration updated!');
      await loadSimulationStatus();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeSampleData = async () => {
    if (!organizationId) {
      Alert.alert('Error', 'Organization ID not found');
      return;
    }

    Alert.alert(
      'Initialize Sample Data',
      'This will add 24 hours of sample meter readings. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Initialize',
          onPress: async () => {
            setLoading(true);
            try {
              await initializeMeterSampleData(organizationId);
              Alert.alert('Success', 'Sample data initialized successfully!');
              await loadMigrationStatus(); // Refresh migration status
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to initialize sample data');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleCreateTable = async () => {
    if (!organizationId) {
      Alert.alert('Error', 'Organization ID not found');
      return;
    }

    setMigrationLoading(true);
    try {
      await createMeterReadingsTable(organizationId);
      Alert.alert('Success', 'Meter readings table created successfully!');
      await loadMigrationStatus();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create table');
    } finally {
      setMigrationLoading(false);
    }
  };

  const handleDropTable = async () => {
    if (!organizationId) {
      Alert.alert('Error', 'Organization ID not found');
      return;
    }

    Alert.alert(
      'Drop Table',
      'This will permanently delete the meter_readings table and all data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Drop Table',
          style: 'destructive',
          onPress: async () => {
            setMigrationLoading(true);
            try {
              await dropMeterReadingsTable(organizationId);
              Alert.alert('Success', 'Table dropped successfully!');
              await loadMigrationStatus();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to drop table');
            } finally {
              setMigrationLoading(false);
            }
          }
        }
      ]
    );
  };

  if (!visible) return null;

  // Only allow access for ADMIN and SUPER_ADMIN
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return (
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.modal, { backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF' }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
              Access Denied
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
            </TouchableOpacity>
          </View>
          <View style={styles.content}>
            <Text style={[styles.message, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>
              Only administrators can access meter simulation controls.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.overlay}>
      <View style={[styles.modal, { backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF' }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
            Meter Simulation Controls
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContent}>
          {/* Status Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
              Simulation Status
            </Text>

            <TouchableOpacity
              style={[styles.refreshButton, { borderColor: isDarkMode ? '#4B5563' : '#D1D5DB' }]}
              onPress={loadSimulationStatus}
              disabled={refreshing}
            >
              <Ionicons
                name="refresh"
                size={16}
                color={isDarkMode ? '#9CA3AF' : '#6B7280'}
              />
              <Text style={[styles.refreshText, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>
                {refreshing ? 'Refreshing...' : 'Refresh Status'}
              </Text>
            </TouchableOpacity>

            {status && (
              <View style={[styles.statusCard, { backgroundColor: isDarkMode ? '#111827' : '#F9FAFB' }]}>
                <View style={styles.statusRow}>
                  <Text style={[styles.statusLabel, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>
                    Status:
                  </Text>
                  <View style={styles.statusIndicator}>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: status.running ? '#10B981' : '#EF4444' }
                    ]} />
                    <Text style={[styles.statusText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                      {status.running ? 'Running' : 'Stopped'}
                    </Text>
                  </View>
                </View>

                {status.nextRun && (
                  <View style={styles.statusRow}>
                    <Text style={[styles.statusLabel, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>
                      Next Run:
                    </Text>
                    <Text style={[styles.statusValue, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                      {new Date(status.nextRun).toLocaleTimeString()}
                    </Text>
                  </View>
                )}

                {status.config && (
                  <View style={styles.statusRow}>
                    <Text style={[styles.statusLabel, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>
                      Interval:
                    </Text>
                    <Text style={[styles.statusValue, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                      {(status.config?.interval || 30000)}ms ({Math.round((status.config?.interval || 30000) / 1000)}s)
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Control Buttons */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
              Controls
            </Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.controlButton,
                  styles.startButton,
                  loading && styles.disabledButton
                ]}
                onPress={handleStartSimulation}
                disabled={loading || status?.running}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="play" size={18} color="#FFFFFF" />
                    <Text style={styles.controlButtonText}>Start</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.controlButton,
                  styles.stopButton,
                  loading && styles.disabledButton
                ]}
                onPress={handleStopSimulation}
                disabled={loading || !status?.running}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="stop" size={18} color="#FFFFFF" />
                    <Text style={styles.controlButtonText}>Stop</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                { borderColor: isDarkMode ? '#4B5563' : '#D1D5DB' },
                loading && styles.disabledButton
              ]}
              onPress={handleInitializeSampleData}
              disabled={loading}
            >
              <Ionicons name="download" size={18} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.secondaryButtonText, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>
                Initialize Sample Data
              </Text>
            </TouchableOpacity>
          </View>

          {/* Database Migration Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
              Database Setup
            </Text>

            <TouchableOpacity
              style={[styles.refreshButton, { borderColor: isDarkMode ? '#4B5563' : '#D1D5DB' }]}
              onPress={loadMigrationStatus}
              disabled={migrationLoading}
            >
              <Ionicons
                name="refresh"
                size={16}
                color={isDarkMode ? '#9CA3AF' : '#6B7280'}
              />
              <Text style={[styles.refreshText, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>
                {migrationLoading ? 'Checking...' : 'Check DB Status'}
              </Text>
            </TouchableOpacity>

            {migrationStatus && (
              <View style={[styles.statusCard, { backgroundColor: isDarkMode ? '#111827' : '#F9FAFB' }]}>
                <View style={styles.statusRow}>
                  <Text style={[styles.statusLabel, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>
                    Table Status:
                  </Text>
                  <View style={styles.statusIndicator}>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: migrationStatus.exists ? '#10B981' : '#EF4444' }
                    ]} />
                    <Text style={[styles.statusText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                      {migrationStatus.exists ? 'Exists' : 'Missing'}
                    </Text>
                  </View>
                </View>

                {migrationStatus.exists && (
                  <>
                    <View style={styles.statusRow}>
                      <Text style={[styles.statusLabel, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>
                        Records:
                      </Text>
                      <Text style={[styles.statusValue, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                        {migrationStatus.recordCount}
                      </Text>
                    </View>

                    {migrationStatus.size && (
                      <View style={styles.statusRow}>
                        <Text style={[styles.statusLabel, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>
                          Size:
                        </Text>
                        <Text style={[styles.statusValue, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                          {migrationStatus.size}
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.controlButton,
                  styles.startButton,
                  { flex: 1 },
                  migrationLoading && styles.disabledButton
                ]}
                onPress={handleCreateTable}
                disabled={migrationLoading || migrationStatus?.exists}
              >
                {migrationLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.controlButtonText}>Create Table</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.controlButton,
                  styles.stopButton,
                  { flex: 1 },
                  migrationLoading && styles.disabledButton
                ]}
                onPress={handleDropTable}
                disabled={migrationLoading || !migrationStatus?.exists}
              >
                {migrationLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="trash" size={18} color="#FFFFFF" />
                    <Text style={styles.controlButtonText}>Drop Table</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Configuration Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
              Configuration
            </Text>

            {/* Basic Settings */}
            <View style={styles.configGroup}>
              <Text style={[styles.configGroupTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                Basic Settings
              </Text>

              <View style={styles.configRow}>
                <Text style={[styles.configLabel, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>
                  Interval (seconds):
                </Text>
                <TextInput
                  style={[
                    styles.numberInput,
                    {
                      borderColor: isDarkMode ? '#4B5563' : '#D1D5DB',
                      color: isDarkMode ? '#FFFFFF' : '#000000'
                    }
                  ]}
                  value={Math.round((config.interval || 30000) / 1000).toString()}
                  onChangeText={(text) => {
                    const seconds = parseInt(text);
                    if (!isNaN(seconds) && seconds >= 10 && seconds <= 300) {
                      setConfig(prev => ({ ...prev, interval: seconds * 1000 }));
                    }
                  }}
                  keyboardType="numeric"
                  placeholder="30"
                  placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>
                  Realistic Variations
                </Text>
                <Switch
                  value={config.realisticVariations}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, realisticVariations: value }))}
                  trackColor={{ false: '#767577', true: '#10B981' }}
                  thumbColor={config.realisticVariations ? '#FFFFFF' : '#f4f3f4'}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>
                  Notify on Limits
                </Text>
                <Switch
                  value={config.notifyOnLimits}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, notifyOnLimits: value }))}
                  trackColor={{ false: '#767577', true: '#10B981' }}
                  thumbColor={config.notifyOnLimits ? '#FFFFFF' : '#f4f3f4'}
                />
              </View>
            </View>

            {/* Base Values */}
            <View style={styles.configGroup}>
              <Text style={[styles.configGroupTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                Base Electrical Values
              </Text>

              {Object.entries(config.baseValues || {}).map(([key, value]) => (
                <View key={key} style={styles.configRow}>
                  <Text style={[styles.configLabel, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}:
                  </Text>
                  <TextInput
                    style={[
                      styles.numberInput,
                      {
                        borderColor: isDarkMode ? '#4B5563' : '#D1D5DB',
                        color: isDarkMode ? '#FFFFFF' : '#000000'
                      }
                    ]}
                    value={value.toString()}
                    onChangeText={(text) => {
                      const numValue = parseFloat(text);
                      if (!isNaN(numValue) || text === '') {
                        setConfig(prev => ({
                          ...prev,
                          baseValues: {
                            ...prev.baseValues,
                            [key]: text === '' ? 0 : numValue
                          }
                        }));
                      }
                    }}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                  />
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.updateButton,
                { backgroundColor: '#3B82F6' },
                loading && styles.disabledButton
              ]}
              onPress={handleUpdateConfig}
              disabled={loading}
            >
              <Ionicons name="settings" size={18} color="#FFFFFF" />
              <Text style={styles.updateButtonText}>Update Configuration</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollContent: {
    maxHeight: 600,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 12,
  },
  refreshText: {
    fontSize: 14,
    marginLeft: 6,
  },
  statusCard: {
    padding: 12,
    borderRadius: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  startButton: {
    backgroundColor: '#10B981',
  },
  stopButton: {
    backgroundColor: '#EF4444',
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    marginLeft: 6,
  },
  configGroup: {
    marginBottom: 16,
  },
  configGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  configLabel: {
    fontSize: 14,
    flex: 1,
  },
  numberInput: {
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    minWidth: 80,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  switchLabel: {
    fontSize: 14,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  disabledButton: {
    opacity: 0.5,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
  },
});
