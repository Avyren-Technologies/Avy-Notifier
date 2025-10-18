import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoginCredentials } from '../types/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LoginScreen() {
  const { login, authState } = useAuth();
  const { isDarkMode } = useTheme();
  const router = useRouter();
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Error state
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  // Validate email
  const validateEmail = (text: string) => {
    setEmail(text);
    if (text.trim() === '') {
      setEmailError('Email is required');
    } else if (!/\S+@\S+\.\S+/.test(text)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };
  
  // Validate password
  const validatePassword = (text: string) => {
    setPassword(text);
    if (text.trim() === '') {
      setPasswordError('Password is required');
    } else if (text.length < 6) {
      setPasswordError('Password must be at least 6 characters');
    } else {
      setPasswordError('');
    }
  };
  
  // Handle login
  const handleLogin = async () => {
    // Validate inputs before submitting
    validateEmail(email);
    validatePassword(password);
    
    if (emailError || passwordError || !email || !password) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      await login({ email, password } as LoginCredentials);
    } catch (error) {
      console.error('Login error in component:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get error message styling based on error type
  const getErrorStyles = () => {
    if (!authState.error) return {};

    switch (authState.errorType) {
      case 'warning':
        return {
          container: {
            backgroundColor: isDarkMode ? 'rgba(251, 146, 60, 0.15)' : '#FFEDD5',
            borderColor: isDarkMode ? '#FB923C' : '#F97316',
          },
          text: {
            color: isDarkMode ? '#FED7AA' : '#9A3412',
          },
          icon: isDarkMode ? '#FED7AA' : '#F97316',
        };
      case 'info':
        return {
          container: {
            backgroundColor: isDarkMode ? 'rgba(96, 165, 250, 0.15)' : '#DBEAFE',
            borderColor: isDarkMode ? '#60A5FA' : '#3B82F6',
          },
          text: {
            color: isDarkMode ? '#BFDBFE' : '#1E40AF',
          },
          icon: isDarkMode ? '#BFDBFE' : '#3B82F6',
        };
      case 'error':
      default:
        return {
          container: {
            backgroundColor: isDarkMode ? 'rgba(248, 113, 113, 0.15)' : '#FEE2E2',
            borderColor: isDarkMode ? '#F87171' : '#EF4444',
          },
          text: {
            color: isDarkMode ? '#FCA5A5' : '#991B1B',
          },
          icon: isDarkMode ? '#FCA5A5' : '#EF4444',
        };
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC' }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={
          isDarkMode 
            ? ['#0F172A', '#1E293B', '#312E81', '#1E293B']
            : ['#F8FAFC', '#EFF6FF', '#E0E7FF', '#F8FAFC']
        }
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Floating Orbs for Visual Interest */}
      <View style={styles.orb1}>
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          style={styles.orbGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </View>
      <View style={styles.orb2}>
        <LinearGradient
          colors={['#D946EF', '#F0ABFC']}
          style={styles.orbGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </View>
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            style={[
              styles.formContainer, 
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Logo Section */}
            <View style={styles.headerContainer}>
              <View style={styles.logoWrapper}>
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6', '#D946EF']}
                  style={styles.logoGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="shield-checkmark" size={40} color="#FFFFFF" />
                </LinearGradient>
              </View>
              
              <Text style={[styles.title, { color: isDarkMode ? '#FFFFFF' : '#0F172A' }]}>
                Welcome Back
              </Text>
              
              <LinearGradient
                colors={['#6366F1', '#8B5CF6', '#D946EF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.subtitleContainer}
              >
                <Text style={styles.subtitle}>
                  Sign in to continue
                </Text>
              </LinearGradient>
            </View>
            
            {/* Input Fields */}
            <View style={styles.inputsContainer}>
              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: isDarkMode ? '#CBD5E1' : '#475569' }]}>
                  Email Address
                </Text>
                <View style={[
                  styles.inputWrapper,
                  { 
                    backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                    borderColor: emailError 
                      ? '#EF4444' 
                      : isDarkMode ? '#334155' : '#E2E8F0'
                  },
                  emailError && styles.inputError,
                ]}>
                  <View style={[
                    styles.inputIconContainer,
                    { backgroundColor: isDarkMode ? '#334155' : '#F1F5F9' }
                  ]}>
                    <Ionicons
                      name="mail"
                      size={20}
                      color={isDarkMode ? '#94A3B8' : '#64748B'}
                    />
                  </View>
                  <TextInput
                    style={[
                      styles.input,
                      { color: isDarkMode ? '#FFFFFF' : '#0F172A' },
                    ]}
                    placeholder="your.email@example.com"
                    placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
                    value={email}
                    onChangeText={validateEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>
                {emailError ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={14} color="#EF4444" />
                    <Text style={styles.errorText}>{emailError}</Text>
                  </View>
                ) : null}
              </View>
              
              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: isDarkMode ? '#CBD5E1' : '#475569' }]}>
                  Password
                </Text>
                <View style={[
                  styles.inputWrapper,
                  { 
                    backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                    borderColor: passwordError 
                      ? '#EF4444' 
                      : isDarkMode ? '#334155' : '#E2E8F0'
                  },
                  passwordError && styles.inputError,
                ]}>
                  <View style={[
                    styles.inputIconContainer,
                    { backgroundColor: isDarkMode ? '#334155' : '#F1F5F9' }
                  ]}>
                    <Ionicons
                      name="lock-closed"
                      size={20}
                      color={isDarkMode ? '#94A3B8' : '#64748B'}
                    />
                  </View>
                  <TextInput
                    style={[
                      styles.input,
                      { color: isDarkMode ? '#FFFFFF' : '#0F172A' },
                    ]}
                    placeholder="Enter your password"
                    placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={validatePassword}
                    autoCapitalize="none"
                    autoComplete="password"
                  />
                  <TouchableOpacity
                    style={styles.passwordToggle}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color={isDarkMode ? '#94A3B8' : '#64748B'}
                    />
                  </TouchableOpacity>
                </View>
                {passwordError ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={14} color="#EF4444" />
                    <Text style={styles.errorText}>{passwordError}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            
            {/* Authentication Error Message */}
            {authState.error && (
              <View style={[
                styles.authErrorContainer, 
                getErrorStyles().container
              ]}>
                <Ionicons 
                  name={authState.errorType === 'warning' ? 'warning' : 
                         authState.errorType === 'info' ? 'information-circle' : 
                         'alert-circle'} 
                  size={20} 
                  color={getErrorStyles().icon} 
                  style={styles.authErrorIcon}
                />
                <Text style={[styles.authErrorText, getErrorStyles().text]}>
                  {authState.error}
                </Text>
              </View>
            )}
            
            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                { opacity: isLoading ? 0.7 : 1 }
              ]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#6366F1', '#8B5CF6', '#D946EF']}
                style={styles.loginButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Sign In</Text>
                    <Ionicons name="arrow-forward-circle" size={24} color="#FFFFFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Additional Info */}
            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <Ionicons 
                  name="shield-checkmark-outline" 
                  size={16} 
                  color={isDarkMode ? '#64748B' : '#94A3B8'} 
                />
                <Text style={[
                  styles.infoText,
                  { color: isDarkMode ? '#64748B' : '#94A3B8' }
                ]}>
                  Secure encrypted connection
                </Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  formContainer: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoWrapper: {
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitleContainer: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  inputsContainer: {
    marginBottom: 24,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    height: 60,
    paddingHorizontal: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  inputError: {
    borderColor: '#EF4444',
  },
  inputIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    paddingHorizontal: 12,
  },
  passwordToggle: {
    padding: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
  },
  authErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  authErrorIcon: {
    marginTop: 2,
  },
  authErrorText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    lineHeight: 20,
  },
  loginButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  loginButtonGradient: {
    flexDirection: 'row',
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  infoContainer: {
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
  },
  orb1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.15,
  },
  orb2: {
    position: 'absolute',
    bottom: -150,
    left: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
    opacity: 0.12,
  },
  orbGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 9999,
  },
});
