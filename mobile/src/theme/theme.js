export const theme = {
  colors: {
    /* BACKGROUNDS */
    bg: "#F5F7FA",              // app background
    surface: "#FFFFFF",        // cards, sheets
    surfaceSoft: "#F0F4F8",    // subtle sections

    /* BRAND */
    primary: "#0B6B63",        // e-kazi teal (trust)
    primarySoft: "#E6F4F2",
    accent: "#4ECDC4",         // highlights, icons

    /* TEXT */
    text: "#0F172A",           // main text (slate)
    textSecondary: "#334155",
    textMuted: "#64748B",
    textVeryMuted: "#94A3B8",

    /* STATES */
    border: "#E2E8F0",
    danger: "#E63946",
    success: "#16A34A",
    warning: "#F59E0B",
  },

  radius: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 28,
    pill: 999,
  },

  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 22,
    xl: 28,
    xxl: 40,
  },

  shadow: {
    card: {
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    soft: {
      shadowColor: "#000",
      shadowOpacity: 0.03,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
  },
};
