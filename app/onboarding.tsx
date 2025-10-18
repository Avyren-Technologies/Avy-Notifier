import React, { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions, Alert, ScrollView, Animated } from "react-native"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import * as SecureStore from "expo-secure-store"
import { useTheme } from "./context/ThemeContext"
import { useAuth } from "./context/AuthContext"
import { LinearGradient } from "expo-linear-gradient"

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window")
const CARD_WIDTH = SCREEN_WIDTH * 0.85

const SELECTED_APP_KEY = "selected_app_type"

export default function Onboarding() {
  const { isDarkMode } = useTheme()
  const { authState, selectedAppType } = useAuth()
  const [selectedOption, setSelectedOption] = useState<string | null>(selectedAppType)

  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current
  const slideAnim = React.useRef(new Animated.Value(50)).current

  // Animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  useEffect(() => {
    if (selectedAppType) {
      setSelectedOption(selectedAppType)
    }
  }, [selectedAppType])

  if (!authState.isAuthenticated) {
    router.replace("/")
    return null
  }

  const handleSelection = (option: string) => {
    setSelectedOption(option)
  }

  const handleContinue = async () => {
    if (!selectedOption) return

    try {
      await SecureStore.setItemAsync(SELECTED_APP_KEY, selectedOption)

      if (selectedOption === "furnace") {
        router.replace({
          pathname: "/(dashboard)/operator",
        })
      } else {
        router.replace({
          pathname: "/(dashboard)/meter-readings" as any,
        })
      }
    } catch (error) {
      console.error("Error saving app selection:", error)
      Alert.alert("Error", "Failed to save your selection. Please try again.", [{ text: "OK" }])
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? "#0F172A" : "#F8FAFC" }]}>
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={["#6366F1", "#8B5CF6", "#D946EF"]}
            style={styles.logoGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Image source={require("../assets/images/Eagle-Logo.png")} style={styles.logo} resizeMode="contain" />
          </LinearGradient>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text
              style={[
                styles.headerTitle,
                { color: isDarkMode ? "#FFFFFF" : "#0F172A" },
              ]}
            >
              Avy&nbsp;
            </Text>
            <Ionicons
              name="information-circle-outline"
              size={32}
              color={isDarkMode ? "#FFFFFF" : "#6366F1"}
              style={{ marginLeft: -4, marginTop: -4 }}
            />
          </View>

          <LinearGradient
            colors={["#6366F1", "#8B5CF6", "#D946EF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.subtitleGradient}
          >
            <Text style={styles.headerSubtitle}>Select your monitoring application</Text>
          </LinearGradient>
        </Animated.View>

        <Animated.View
          style={[
            styles.optionsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedOption === "furnace" && styles.selectedCard,
              {
                backgroundColor: isDarkMode ? "rgba(30, 41, 59, 0.9)" : "rgba(255, 255, 255, 0.95)",
                borderColor: selectedOption === "furnace" ? "#6366F1" : isDarkMode ? "#334155" : "#E2E8F0",
                borderWidth: selectedOption === "furnace" ? 2 : 1,
              },
            ]}
            onPress={() => handleSelection("furnace")}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={
                  selectedOption === "furnace"
                    ? ["#FEF2F2", "#FEE2E2", "#FECACA"]
                    : isDarkMode
                    ? ["#1F2937", "#374151", "#4B5563"]
                    : ["#FEF2F2", "#FEE2E2", "#FECACA"]
                }
                style={styles.iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={[
                  styles.iconInner,
                  {
                    backgroundColor: selectedOption === "furnace"
                      ? "rgba(239, 68, 68, 0.1)"
                      : isDarkMode
                      ? "rgba(239, 68, 68, 0.15)"
                      : "rgba(239, 68, 68, 0.08)"
                  }
                ]}>
                  <Ionicons
                    name="flame"
                    size={SCREEN_HEIGHT < 700 ? 40 : 48}
                    color={selectedOption === "furnace" ? "#EF4444" : isDarkMode ? "#F87171" : "#EF4444"}
                  />
                </View>
              </LinearGradient>
            </View>

            <Text style={[styles.optionTitle, { color: isDarkMode ? "#FFFFFF" : "#0F172A" }]}>Furnace Notifier</Text>
            <Text style={[styles.optionDescription, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>
              Monitor temperature, pressure, and alarms for furnace systems
            </Text>

            {selectedOption === "furnace" && (
              <View style={styles.checkmark}>
                <Ionicons name="checkmark-circle" size={24} color="#6366F1" />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedOption === "meter" && styles.selectedCard,
              {
                backgroundColor: isDarkMode ? "rgba(30, 41, 59, 0.9)" : "rgba(255, 255, 255, 0.95)",
                borderColor: selectedOption === "meter" ? "#6366F1" : isDarkMode ? "#334155" : "#E2E8F0",
                borderWidth: selectedOption === "meter" ? 2 : 1,
              },
            ]}
            onPress={() => handleSelection("meter")}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={
                  selectedOption === "meter"
                    ? ["#ECFDF5", "#D1FAE5", "#A7F3D0"]
                    : isDarkMode
                    ? ["#1F2937", "#374151", "#4B5563"]
                    : ["#ECFDF5", "#D1FAE5", "#A7F3D0"]
                }
                style={styles.iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={[
                  styles.iconInner,
                  {
                    backgroundColor: selectedOption === "meter"
                      ? "rgba(16, 185, 129, 0.1)"
                      : isDarkMode
                      ? "rgba(16, 185, 129, 0.15)"
                      : "rgba(16, 185, 129, 0.08)"
                  }
                ]}>
                  <Ionicons
                    name="speedometer"
                    size={SCREEN_HEIGHT < 700 ? 40 : 48}
                    color={selectedOption === "meter" ? "#10B981" : isDarkMode ? "#6EE7B7" : "#10B981"}
                  />
                </View>
              </LinearGradient>
            </View>

            <Text style={[styles.optionTitle, { color: isDarkMode ? "#FFFFFF" : "#0F172A" }]}>Meter Notifier</Text>
            <Text style={[styles.optionDescription, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>
              Monitor electrical parameters like voltage, current, and power consumption
            </Text>

            {selectedOption === "meter" && (
              <View style={styles.checkmark}>
                <Ionicons name="checkmark-circle" size={24} color="#6366F1" />
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={[
            styles.buttonContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.continueButton,
              {
                opacity: selectedOption ? 1 : 0.5,
              },
            ]}
            onPress={handleContinue}
            disabled={!selectedOption}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={selectedOption ? ["#6366F1", "#8B5CF6", "#D946EF"] : ["#9CA3AF", "#9CA3AF", "#9CA3AF"]}
              style={styles.continueButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={22} color="#FFFFFF" style={styles.continueButtonIcon} />
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Ionicons name="information-circle-outline" size={16} color={isDarkMode ? "#64748B" : "#94A3B8"} />
            <Text style={[styles.footerText, { color: isDarkMode ? "#64748B" : "#94A3B8" }]}>
              You can change this selection later in settings
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    minHeight: SCREEN_HEIGHT - 100,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: "center",
    paddingTop: SCREEN_HEIGHT < 700 ? 20 : 40,
    paddingBottom: SCREEN_HEIGHT < 700 ? 20 : 40,
    paddingHorizontal: 20,
  },
  logoGradient: {
    width: SCREEN_HEIGHT < 700 ? 70 : 90,
    height: SCREEN_HEIGHT < 700 ? 70 : 90,
    borderRadius: SCREEN_HEIGHT < 700 ? 35 : 45,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SCREEN_HEIGHT < 700 ? 12 : 16,
    elevation: 12,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  logo: {
    width: SCREEN_HEIGHT < 700 ? 50 : 70,
    height: SCREEN_HEIGHT < 700 ? 50 : 70,
  },
  headerTitle: {
    fontSize: SCREEN_HEIGHT < 700 ? 22 : 28,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  subtitleGradient: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  headerSubtitle: {
    fontSize: SCREEN_HEIGHT < 700 ? 14 : 16,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },
  optionsContainer: {
    paddingHorizontal: 0,
    gap: SCREEN_HEIGHT < 700 ? 14 : 18,
    flex: 1,
    justifyContent: "center",
    marginVertical: SCREEN_HEIGHT < 700 ? 16 : 24,
  },
  optionCard: {
    width: CARD_WIDTH,
    alignSelf: "center",
    borderRadius: 20,
    padding: SCREEN_HEIGHT < 700 ? 18 : 24,
    borderWidth: 1,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  selectedCard: {
    elevation: 8,
    shadowOpacity: 0.2,
  },
  iconContainer: {
    width: SCREEN_HEIGHT < 700 ? 72 : 88,
    height: SCREEN_HEIGHT < 700 ? 72 : 88,
    borderRadius: SCREEN_HEIGHT < 700 ? 36 : 44,
    marginBottom: SCREEN_HEIGHT < 700 ? 14 : 18,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    overflow: "hidden",
  },
  iconGradient: {
    width: "100%",
    height: "100%",
    borderRadius: SCREEN_HEIGHT < 700 ? 36 : 44,
    justifyContent: "center",
    alignItems: "center",
    padding: 2,
  },
  iconInner: {
    width: "100%",
    height: "100%",
    borderRadius: SCREEN_HEIGHT < 700 ? 34 : 42,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  optionTitle: {
    fontSize: SCREEN_HEIGHT < 700 ? 17 : 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  optionDescription: {
    fontSize: SCREEN_HEIGHT < 700 ? 13 : 15,
    textAlign: "center",
    paddingHorizontal: 10,
    lineHeight: SCREEN_HEIGHT < 700 ? 18 : 22,
  },
  checkmark: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: SCREEN_HEIGHT < 700 ? 16 : 24,
  },
  continueButton: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  continueButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SCREEN_HEIGHT < 700 ? 12 : 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: SCREEN_HEIGHT < 700 ? 17 : 18,
    fontWeight: "700",
  },
  continueButtonIcon: {
    marginLeft: 4,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: SCREEN_HEIGHT < 700 ? 12 : 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  footerText: {
    fontSize: SCREEN_HEIGHT < 700 ? 12 : 13,
    textAlign: "center",
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
