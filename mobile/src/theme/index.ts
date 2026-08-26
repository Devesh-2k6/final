export const Colors = {
  // Ultra-Clean Pearl & Light Minimalist Canvas
  background: "#F8F9FA",
  backgroundSecondary: "#F0F2F5",
  card: "#FFFFFF",
  cardElevated: "#FFFFFF",
  cardSurface: "#F3F4F6",
  cardBorder: "#ECEFF2",
  cardBorderSubtle: "#F2F4F7",
  cardBorderHighlight: "rgba(255, 91, 38, 0.3)",
  cardBorderGlow: "rgba(255, 91, 38, 0.15)",

  // Signature Accent (Vibrant Coral / Tangerine Orange from Mockup)
  primary: "#FF5B26",
  primaryHover: "#E54B18",
  primaryBright: "#FF6E3D",
  primaryLight: "#FFF0EB",
  primaryGlow: "rgba(255, 91, 38, 0.25)",
  primaryGradientStart: "#FF6E3D",
  primaryGradientEnd: "#FF5B26",

  // Modern Accent Palette
  amber: "#F59E0B",
  amberBright: "#FBBF24",
  amberLight: "#FEF3C7",
  amberGlow: "rgba(245, 158, 11, 0.2)",

  rose: "#EF4444",
  roseBright: "#F87171",
  roseLight: "#FEE2E2",
  roseGlow: "rgba(239, 68, 68, 0.2)",

  blue: "#3B82F6",
  blueBright: "#60A5FA",
  blueLight: "#EFF6FF",

  purple: "#8B5CF6",
  purpleBright: "#A78BFA",
  purpleLight: "#F5F3FF",
  purpleGlow: "rgba(139, 92, 246, 0.2)",

  cyan: "#06B6D4",
  cyanLight: "#ECFEFF",

  // High-Contrast Clean Typography
  textPrimary: "#121826",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  textSubtle: "#CBD5E1",
  textInverse: "#FFFFFF",

  // Status & Feedback
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",

  // Overlays & Special Effects
  modalOverlay: "rgba(18, 24, 38, 0.6)",
  glassOverlay: "rgba(255, 255, 255, 0.85)",
  shimmer: "rgba(0, 0, 0, 0.03)",
};

export const Shadows = {
  soft: {
    shadowColor: "#121826",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  card: {
    shadowColor: "#121826",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  hover: {
    shadowColor: "#FF5B26",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 40,
};

export const Radius = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  full: 9999,
};

export const Typography = {
  hero: {
    fontSize: 26,
    fontWeight: "800" as const,
    lineHeight: 32,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  title1: {
    fontSize: 22,
    fontWeight: "800" as const,
    lineHeight: 28,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  title2: {
    fontSize: 18,
    fontWeight: "700" as const,
    lineHeight: 24,
    color: Colors.textPrimary,
  },
  body: {
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  bodyBold: {
    fontSize: 14,
    fontWeight: "600" as const,
    lineHeight: 20,
    color: Colors.textPrimary,
  },
  caption: {
    fontSize: 12,
    fontWeight: "500" as const,
    lineHeight: 16,
    color: Colors.textMuted,
  },
  tag: {
    fontSize: 10,
    fontWeight: "800" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.6,
  },
};
