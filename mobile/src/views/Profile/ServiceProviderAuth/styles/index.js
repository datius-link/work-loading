import { StyleSheet } from "react-native";
import { theme } from "../../../../theme"; // adjust path if needed

export const styles = StyleSheet.create({
  /* =====================
     LAYOUT / CONTAINER
  ====================== */
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.bg,
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    ...theme.shadow.elevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginVertical: theme.spacing.xxl,
  },

  /* =====================
     TEXT
  ====================== */
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.md,
    letterSpacing: -0.3,
  },

  subtitle: {
    fontSize: 15,
    color: theme.colors.textMuted,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },

  linkText: {
    fontSize: 15,
    color: theme.colors.accent,
    fontWeight: "600",
    textAlign: "center",
  },

  /* =====================
     INPUTS
  ====================== */
  input: {
    backgroundColor: theme.colors.surfaceHover,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },

  inputFocused: {
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
  },

  /* =====================
     BUTTONS
  ====================== */
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.md,
    ...theme.shadow.card,
  },

  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  /* =====================
     LINKS
  ====================== */
  link: {
    marginTop: theme.spacing.lg,
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
  },

  /* =====================
     OTP / VERIFY SPECIFIC
  ====================== */
  otpInput: {
    backgroundColor: theme.colors.surfaceHover,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.lg,
    fontSize: 20,
    textAlign: "center",
    letterSpacing: 8,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },

  /* =====================
     STATES / UTILITIES
  ====================== */
  disabled: {
    opacity: 0.55,
  },

  errorText: {
    color: theme.colors.danger,
    textAlign: "center",
    marginBottom: theme.spacing.md,
    fontSize: 14,
    fontWeight: "500",
  },

  successText: {
    color: theme.colors.success,
    textAlign: "center",
    marginBottom: theme.spacing.md,
    fontSize: 14,
    fontWeight: "500",
  },
});