import React, { useCallback, useRef, useState } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import * as Notifications from "expo-notifications"
import { useTheme } from "./context/ThemeContext"
import * as SecureStore from "expo-secure-store"
import * as Updates from "expo-updates"
import { UpdateModal } from "./components/UpdateModal"
import { apiConfig, PROJECT_ID } from "./api/config"
import { LinearGradient } from "expo-linear-gradient"
import Constants from "expo-constants"

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

console.log("=== ONBOARDING SCREEN DEBUG ===")
console.log("Environment Variables:", {
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION,
  EXPO_PUBLIC_PROJECT_ID: process.env.EXPO_PUBLIC_PROJECT_ID,
  NODE_ENV: process.env.NODE_ENV,
})
console.log("API Config:", apiConfig)
console.log("==================================")

interface FeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  description: string
  isDarkMode: boolean
}

export default function OnboardingScreen() {
  const { isDarkMode } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [isLoading, setLoading] = useState(false)
  const [updateModalVisible, setUpdateModalVisible] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const requestNotificationPermission = useCallback(async () => {
    try {
      setLoading(true)

      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }

      if (finalStatus === "granted") {
        try {
          const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: PROJECT_ID as string,
          })

          console.log("Expo push token:", tokenData.data)
          await SecureStore.setItemAsync("tempPushToken", tokenData.data)
        } catch (tokenError) {
          console.error("Error getting push token:", tokenError)
        }
      } else {
        Alert.alert(
          "Notification Permission",
          "You won't receive push notifications. You can enable them later in app settings.",
          [{ text: "OK" }],
        )
        console.log("Notification permission not granted")
      }

      await SecureStore.setItemAsync("hasSeenOnboarding", "true")
      router.replace("/(auth)/login")
    } catch (error) {
      console.error("Error requesting notification permission:", error)
      await SecureStore.setItemAsync("hasSeenOnboarding", "true")
      router.replace("/(auth)/login")
    } finally {
      setLoading(false)
    }
  }, [router])

  const checkForUpdates = useCallback(async () => {
    try {
      if (!__DEV__ && Updates.isEnabled) {
        const update = await Updates.checkForUpdateAsync()
        if (update.isAvailable) {
          setUpdateModalVisible(true)
        } else {
          Alert.alert("No Updates", "You are running the latest version.")
        }
      } else {
        Alert.alert("Development Mode", "Updates are only available in production builds.")
      }
    } catch (error) {
      Alert.alert("Error", "Failed to check for updates. Please try again later.")
      console.log("Error checking for updates:", error)
    }
  }, [])

  const handleUpdate = async () => {
    try {
      setIsDownloading(true)
      await Updates.fetchUpdateAsync()
      await Updates.reloadAsync()
    } catch (error) {
      console.log("Error fetching or reloading update:", error)
      setIsDownloading(false)
      setUpdateModalVisible(false)
      Alert.alert("Error", "Failed to download the update. Please try again later.")
    }
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? "#0F172A" : "#F8FAFC" },
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      <LinearGradient
        colors={
          isDarkMode ? ["#0F172A", "#1E293B", "#312E81", "#1E293B"] : ["#F8FAFC", "#EFF6FF", "#E0E7FF", "#F8FAFC"]
        }
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating Orbs */}
      <View style={styles.orb1}>
        <LinearGradient
          colors={["#6366F1", "#8B5CF6"]}
          style={styles.orbGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </View>
      <View style={styles.orb2}>
        <LinearGradient
          colors={["#D946EF", "#F0ABFC"]}
          style={styles.orbGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </View>

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={["#6366F1", "#8B5CF6", "#D946EF"]}
            style={styles.iconWrapper}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Image source={require("../assets/images/Eagle-Logo.png")} style={{ width: 110, height: 110 }} />
          </LinearGradient>

          <Animated.View
            style={[
              { flexDirection: 'row', alignItems: 'center' },
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text
              style={[
                styles.appName,
                { color: isDarkMode ? '#F8FAFC' : '#0F172A' },
              ]}
            >
              Avy&nbsp;
            </Text>
            <Ionicons
              name="information-circle-outline"
              size={38}
              color={isDarkMode ? '#F8FAFC' : '#6366F1'}
              style={{ marginLeft: -2, marginTop: 2 }}
            />
          </Animated.View>

          <Animated.Text
            style={[
              styles.tagline,
              { color: isDarkMode ? "#CBD5E1" : "#64748B" },
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            Industrial Alarm Monitoring Made Simple
          </Animated.Text>
        </Animated.View>

        <Animated.View style={[styles.featureContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <FeatureItem
            icon="checkmark-circle-outline"
            title="Real-time Alerts"
            description="Get instant notifications for critical alarms"
            isDarkMode={isDarkMode}
          />
          <FeatureItem
            icon="stats-chart-outline"
            title="Comprehensive Insights"
            description="Track and analyze alarm history and patterns"
            isDarkMode={isDarkMode}
          />
          <FeatureItem
            icon="shield-checkmark-outline"
            title="Reliable & Secure"
            description="Enterprise-grade security for your industrial data"
            isDarkMode={isDarkMode}
          />
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.button}
          onPress={requestNotificationPermission}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          <LinearGradient
            colors={["#6366F1", "#8B5CF6", "#D946EF"]}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.buttonText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.updateButton,
            {
              backgroundColor: isDarkMode ? "rgba(51, 65, 85, 0.8)" : "rgba(241, 245, 249, 0.9)",
              borderColor: isDarkMode ? "#475569" : "#E2E8F0",
            },
          ]}
          onPress={checkForUpdates}
          activeOpacity={0.8}
        >
          <Ionicons
            name="cloud-download-outline"
            size={18}
            color={isDarkMode ? "#94A3B8" : "#64748B"}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.updateButtonText, { color: isDarkMode ? "#E2E8F0" : "#1F2937" }]}>
            Check for Updates
          </Text>
        </TouchableOpacity>

        <Text style={[styles.poweredBy, { color: isDarkMode ? "#64748B" : "#94A3B8" }]}>Powered by Avyren Technologies</Text>
      </View>

      <UpdateModal
        visible={updateModalVisible}
        isDownloading={isDownloading}
        onUpdate={handleUpdate}
        onCancel={() => setUpdateModalVisible(false)}
      />
    </View>
  )
}

function FeatureItem({ icon, title, description, isDarkMode }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <LinearGradient
        colors={isDarkMode ? ["#334155", "#475569"] : ["#F1F5F9", "#E2E8F0"]}
        style={styles.featureIcon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={icon} size={24} color={isDarkMode ? "#60A5FA" : "#6366F1"} />
      </LinearGradient>
      <View style={styles.featureText}>
        <Text style={[styles.featureTitle, { color: isDarkMode ? "#FFFFFF" : "#0F172A" }]}>{title}</Text>
        <Text style={[styles.featureDescription, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>{description}</Text>
      </View>
    </View>
  )
}

const { width } = Dimensions.get("window")

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 48,
  },
  iconWrapper: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    elevation: 12,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 16,
    textAlign: "center",
    maxWidth: width * 0.8,
    lineHeight: 24,
  },
  featureContainer: {
    width: "100%",
    marginTop: 24,
    gap: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    width: "100%",
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: "center",
    gap: 12,
  },
  button: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  poweredBy: {
    fontSize: 13,
    marginTop: 8,
    fontWeight: "500",
  },
  updateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  orb1: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.15,
  },
  orb2: {
    position: "absolute",
    bottom: -150,
    left: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
    opacity: 0.12,
  },
  orbGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 9999,
  },
})
