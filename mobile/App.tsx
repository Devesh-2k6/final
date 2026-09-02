import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { enableScreens } from "react-native-screens";
import { AuthProvider } from "./src/contexts/AuthContext";
import { LanguageProvider } from "./src/contexts/LanguageContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { Colors, Radius, Spacing, Typography } from "./src/theme";

// Initialize optimized native screens
enableScreens(true);

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>App Notice</Text>
          <ScrollView style={errorStyles.scroll} contentContainerStyle={errorStyles.scrollContent}>
            <Text style={errorStyles.message}>
              {this.state.error?.message || "An unexpected issue occurred."}
            </Text>
            {this.state.error?.stack ? (
              <Text style={errorStyles.stackText}>{this.state.error.stack}</Text>
            ) : null}
          </ScrollView>
          <TouchableOpacity style={errorStyles.button} onPress={this.handleReset} activeOpacity={0.8}>
            <Text style={errorStyles.buttonText}>Reload Screen</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
    paddingTop: Spacing.xxl,
  },
  scroll: {
    maxHeight: 300,
    width: "100%",
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  scrollContent: {
    alignItems: "flex-start",
  },
  title: {
    ...Typography.title1,
    color: Colors.danger,
    marginBottom: Spacing.md,
  },
  message: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: "left",
    marginBottom: Spacing.sm,
  },
  stackText: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: Colors.textMuted,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  buttonText: {
    ...Typography.bodyBold,
    color: Colors.textInverse,
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <LanguageProvider>
          <AuthProvider>
            <StatusBar style="light" backgroundColor="#0B0F19" />
            <RootNavigator />
          </AuthProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
