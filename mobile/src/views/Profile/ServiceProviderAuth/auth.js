import { StyleSheet } from "react-native";

export const createAuthStyles = (theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
    },

    // ScrollView contentContainer
    container: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xxl,
      backgroundColor: theme.colors.bg,
    },

    // Inner card — stays narrow on tablets
    card: {
      width: "100%",
      maxWidth: 580,
      alignSelf: "center",
      paddingTop: theme.spacing.sm,
    },

    // ── Hero brand block ────────────────────────────────────────────────────
    brandBlock: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: theme.spacing.xl,
    },
    brandLogo: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
    },
    brandTextCol: {
      gap: 1,
    },
    brandName: {
      fontSize: 20,
      fontWeight: "900",
      color: theme.colors.primary,
      letterSpacing: -0.4,
    },
    brandSub: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textMuted,
      letterSpacing: 0.2,
    },

    // ── Titles ──────────────────────────────────────────────────────────────
    title: {
      fontSize: 28,
      fontWeight: "900",
      color: theme.colors.text,
      letterSpacing: -0.5,
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.textMuted,
      fontWeight: "500",
      marginBottom: theme.spacing.lg,
    },

    // ── Inputs ──────────────────────────────────────────────────────────────
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 12,
      minHeight: 56,
    },
    inputError: {
      borderColor: theme.colors.danger,
      borderWidth: 1.5,
    },
    inputIcon: {
      width: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    input: {
      flex: 1,
      minHeight: 56,
      paddingVertical: 0,
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.text,
    },

    // ── Button ──────────────────────────────────────────────────────────────
    button: {
      backgroundColor: theme.colors.primary,
      minHeight: 56,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
      marginTop: theme.spacing.sm,
      ...theme.shadow.card,
    },
    buttonText: {
      color: theme.colors.onPrimary,
      fontWeight: "900",
      fontSize: 16,
      letterSpacing: 0.1,
    },
    disabled: {
      opacity: 0.55,
    },

    // ── Links ───────────────────────────────────────────────────────────────
    link: {
      marginTop: 18,
      alignItems: "center",
    },
    linkText: {
      fontWeight: "700",
      fontSize: 14,
      color: theme.colors.primary,
      textAlign: "center",
    },
    linkRow: {
      marginTop: 14,
      flexDirection: "row",
      justifyContent: "center",
      flexWrap: "wrap",
      gap: 6,
    },

    // ── Feedback text ────────────────────────────────────────────────────────
    dangerText: {
      color: theme.colors.danger,
      textAlign: "center",
      marginBottom: theme.spacing.sm,
      fontSize: 13,
      fontWeight: "600",
    },
    successText: {
      color: theme.colors.success,
      textAlign: "center",
      marginBottom: theme.spacing.sm,
      fontSize: 13,
      fontWeight: "600",
    },
    errorMessage: {
      backgroundColor: theme.colors.surfaceSoft,
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.md,
      fontSize: 15,
      textAlign: "center",
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.md,
    },

    // Legacy (kept for compatibility)
    heroIcon: {
      width: 50,
      height: 50,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primarySoft,
      marginBottom: theme.spacing.md,
    },
    footerLink: {
      marginTop: theme.spacing.lg,
      alignItems: "center",
      paddingVertical: theme.spacing.sm,
    },
    footerText: {
      color: theme.colors.textMuted,
    },
  });
