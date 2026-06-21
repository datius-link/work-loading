import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAppTheme } from "../../../theme";
import AppIcon from "../../../icons/AppIcon";
import { api, getFriendlyApiError } from "../../../api/api";
import { UploadManager } from "../../../utils/UploadManager";
import { formatDeadline, formatRelativeDate } from "../jobDate";
import HiringNoticeModal from "../HiringNoticeModal";
import { useLanguage } from "../../../LanguageContext";
import { isNetworkError } from "../../../utils/network";

const AVAILABILITY = ["Today", "Tomorrow", "This Week", "Choose Date"];
const DURATION_UNITS = ["minute", "hour", "day"];
const EXPERIENCE_UNITS = ["month", "year"];

function splitNumberUnit(value, fallbackUnit) {
  const match = String(value || "").match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?/i);
  return {
    value: match?.[1] || "",
    unit: (match?.[2] || fallbackUnit).toLowerCase().replace(/s$/, ""),
  };
}

function pluralize(value, unit) {
  if (!value) return "";
  return `${value} ${unit}${Number(value) === 1 ? "" : "s"}`;
}

export default function JobApplication() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const job = route.params?.job || null;
  const existing = route.params?.application || job?.my_application || null;
  const initialDuration = existing?.duration_value
    ? {
        value: String(existing.duration_value),
        unit: String(existing.duration_unit || "hours").replace(/s$/, ""),
      }
    : splitNumberUnit(existing?.duration || existing?.estimated_time, "hour");
  const initialExperience = splitNumberUnit(existing?.experience, "year");
  const initialAvailability = existing?.available_from || existing?.availableFrom || "";

  const [plan, setPlan] = useState(existing?.message || existing?.explanation || "");
  const [budget, setBudget] = useState(String(existing?.budget || "").replace(/^TZS\s*/i, ""));
  const [durationValue, setDurationValue] = useState(initialDuration.value);
  const [durationUnit, setDurationUnit] = useState(initialDuration.unit);
  const [availability, setAvailability] = useState(AVAILABILITY.includes(initialAvailability) ? initialAvailability : initialAvailability || "Today");
  const [customAvailability, setCustomAvailability] = useState(AVAILABILITY.includes(initialAvailability) ? "" : initialAvailability);
  const [experienceValue, setExperienceValue] = useState(initialExperience.value);
  const [experienceUnit, setExperienceUnit] = useState(initialExperience.unit);
  const [notes, setNotes] = useState(existing?.notes || "");
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  if (!job) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Header title="Apply For Job" navigation={navigation} theme={theme} styles={styles} />
        <View style={styles.missingJob}>
          <Text style={styles.missingTitle}>Job not available</Text>
          <Text style={styles.hint}>Open an available job before applying.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const pickImages = async (fromCamera = false) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setNotice({ type: "error", title: "Permission needed", body: "Allow access to continue." });
      return;
    }

    const options = { mediaTypes: ["images"], quality: 0.8 };
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync({ ...options, allowsMultipleSelection: true });

    if (!result.canceled) setImages((prev) => [...prev, ...result.assets]);
  };

  const submitApplication = async () => {
    if (!plan.trim()) {
      setNotice({ type: "error", title: "Missing plan", body: "Explain how you will do this work." });
      return;
    }

    try {
      setSubmitting(true);
      const media = images.length
        ? await UploadManager.startUpload(
            images.map((item) => ({ ...item, type: "image", folder: "applications" })),
            "applications"
          )
        : [];

      const cleanBudget = budget.trim().replace(/[^\d.]/g, "");
      const cleanDuration = durationValue.trim().replace(/[^\d.]/g, "");
      const cleanExperience = experienceValue.trim().replace(/[^\d.]/g, "");
      const availableFrom = availability === "Choose Date" ? customAvailability.trim() : availability;

      await api.post(`/hiring/jobs/${job.id}/apply`, {
        message: plan.trim(),
        budget: cleanBudget ? `TZS ${Number(cleanBudget).toLocaleString("en-US")}` : "",
        duration: pluralize(cleanDuration, durationUnit),
        duration_value: cleanDuration ? Number(cleanDuration) : null,
        duration_unit: cleanDuration ? `${durationUnit}s` : null,
        availableFrom,
        experience: pluralize(cleanExperience, experienceUnit),
        notes: notes.trim(),
        media,
      });

      setNotice({
        type: "success",
        title: "Application sent",
        body: "Your application has been sent.",
        onPrimary: () => navigation.navigate("MainTabs", { screen: "Jobs", params: { initialTab: "requests" } }),
      });
    } catch (err) {
      const mediaNetworkFailure = images.length && isNetworkError(err);
      setNotice({
        type: "error",
        title: language==="sw"?"Ombi halikutumwa":"Application failed",
        body: mediaNetworkFailure
          ?(language==="sw"?"Media haijapakiwa kwa sababu ya tatizo la mtandao. Jaribu tena.":"Media upload failed because of connection problem. Try again.")
          :getFriendlyApiError(err,language),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header title={existing ? "Update Application" : "Apply For Job"} navigation={navigation} theme={theme} styles={styles} />

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 56 : 0}
      >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 106 + insets.bottom }]}
      >
        <View style={styles.jobMini}>
          <Text style={styles.jobCode}>[{job.job_code || job.code || "JOB"}]</Text>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.jobMeta}>
            {[job.location || "Location not set", `Posted ${formatRelativeDate(job.created_at) || "Today"}`, formatDeadline(job.tender_closes_at)].filter(Boolean).join(" • ")}
          </Text>
        </View>

        <Section title="Your Plan" styles={styles}>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="How will you do the work?"
            placeholderTextColor={theme.colors.textMuted}
            value={plan}
            onChangeText={setPlan}
            multiline
            textAlignVertical="top"
          />
        </Section>

        <Section title="Price & Time" styles={styles}>
          <View style={styles.moneyInput}>
            <Text style={styles.prefix}>TZS</Text>
            <TextInput
              style={styles.moneyTextInput}
              placeholder="45,000"
              placeholderTextColor={theme.colors.textMuted}
              value={budget}
              onChangeText={setBudget}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.inlineRow}>
            <TextInput
              style={[styles.input, styles.inlineInput]}
              placeholder="2"
              placeholderTextColor={theme.colors.textMuted}
              value={durationValue}
              onChangeText={setDurationValue}
              keyboardType="numeric"
            />
            <Segmented values={DURATION_UNITS} active={durationUnit} onChange={setDurationUnit} styles={styles} />
          </View>
        </Section>

        <Section title="Availability" styles={styles}>
          <View style={styles.chips}>
            {AVAILABILITY.map((item) => {
              const active = availability === item;
              return (
                <TouchableOpacity key={item} style={[styles.chip, active && styles.chipActive]} onPress={() => setAvailability(item)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {availability === "Choose Date" ? (
            <TextInput
              style={[styles.input, styles.topGap]}
              placeholder="22 Jun 2026"
              placeholderTextColor={theme.colors.textMuted}
              value={customAvailability}
              onChangeText={setCustomAvailability}
            />
          ) : null}
        </Section>

        <Section title="Experience" styles={styles}>
          <View style={styles.inlineRow}>
            <TextInput
              style={[styles.input, styles.inlineInput]}
              placeholder="7"
              placeholderTextColor={theme.colors.textMuted}
              value={experienceValue}
              onChangeText={setExperienceValue}
              keyboardType="numeric"
            />
            <Segmented values={EXPERIENCE_UNITS} active={experienceUnit} onChange={setExperienceUnit} styles={styles} />
          </View>
        </Section>

        <Section title="Proof of Work" styles={styles}>
          <View style={styles.mediaActions}>
            <TouchableOpacity style={styles.mediaBtn} onPress={() => pickImages(false)}>
              <AppIcon name="image" size={16} color={theme.colors.primary} />
              <Text style={styles.mediaText}>Add Pictures</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaBtn} onPress={() => pickImages(true)}>
              <AppIcon name="camera" size={16} color={theme.colors.primary} />
              <Text style={styles.mediaText}>Take Photo</Text>
            </TouchableOpacity>
          </View>
          {images.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewRow}>
              {images.map((img, index) => (
                <Image key={`${img.uri}-${index}`} source={{ uri: img.uri }} style={styles.previewImg} />
              ))}
            </ScrollView>
          ) : null}
        </Section>

        <Section title="Additional Notes" styles={styles}>
          <TextInput
            style={[styles.input, styles.notesArea]}
            placeholder="Anything else the job owner should know..."
            placeholderTextColor={theme.colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            textAlignVertical="top"
          />
        </Section>
      </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.bottomAction, { paddingBottom: insets.bottom + 14 }]}>
        <TouchableOpacity style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} disabled={submitting} onPress={submitApplication}>
          {submitting ? <ActivityIndicator color={theme.colors.onPrimary} /> : <Text style={styles.submitText}>{existing ? "Update Application" : "Submit Application"}</Text>}
        </TouchableOpacity>
      </View>
      <HiringNoticeModal
        visible={!!notice}
        type={notice?.type}
        title={notice?.title}
        body={notice?.body}
        onPrimary={() => {
          const next = notice;
          setNotice(null);
          next?.onPrimary?.();
        }}
        onClose={() => setNotice(null)}
      />
    </SafeAreaView>
  );
}

function Header({ title, navigation, theme, styles }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <AppIcon name="arrowLeft" size={18} color={theme.colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

function Section({ title, children, styles }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Segmented({ values, active, onChange, styles }) {
  return (
    <View style={styles.segmented}>
      {values.map((value) => (
        <TouchableOpacity key={value} style={[styles.segment, active === value && styles.segmentActive]} onPress={() => onChange(value)}>
          <Text style={[styles.segmentText, active === value && styles.segmentTextActive]}>{value}s</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    keyboard: { flex: 1 },
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.xs,
      backgroundColor: theme.colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "900", flex: 1 },
    scrollContent: { padding: theme.spacing.md },
    jobMini: {
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.radius.xs,
      padding: 14,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: theme.colors.primary + "33",
    },
    jobCode: { color: theme.colors.primary, fontWeight: "900", fontSize: 13, marginBottom: 4 },
    jobTitle: { color: theme.colors.text, fontWeight: "900", fontSize: 20, marginBottom: 5 },
    jobMeta: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18, fontWeight: "700" },
    section: {
      paddingVertical: 15,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    sectionTitle: { color: theme.colors.text, fontSize: 17, fontWeight: "900", marginBottom: 10 },
    input: {
      minHeight: 50,
      borderRadius: theme.radius.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
    },
    textarea: { minHeight: 128, lineHeight: 22 },
    notesArea: { minHeight: 96, lineHeight: 22 },
    moneyInput: {
      minHeight: 52,
      borderRadius: theme.radius.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    prefix: { color: theme.colors.primary, fontWeight: "900", paddingHorizontal: 14 },
    moneyTextInput: { flex: 1, color: theme.colors.text, fontSize: 15, paddingRight: 14 },
    inlineRow: { flexDirection: "row", gap: 10, alignItems: "center" },
    inlineInput: { width: 86 },
    segmented: {
      flex: 1,
      flexDirection: "row",
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.xs,
      overflow: "hidden",
      backgroundColor: theme.colors.surface,
    },
    segment: { flex: 1, minHeight: 50, alignItems: "center", justifyContent: "center" },
    segmentActive: { backgroundColor: theme.colors.primary },
    segmentText: { color: theme.colors.textMuted, fontWeight: "900", fontSize: 12 },
    segmentTextActive: { color: theme.colors.onPrimary },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      borderRadius: theme.radius.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    chipActive: { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary },
    chipText: { color: theme.colors.textMuted, fontWeight: "900", fontSize: 13 },
    chipTextActive: { color: theme.colors.primary },
    topGap: { marginTop: 10 },
    mediaActions: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
    mediaBtn: {
      flex: 1,
      minWidth: 132,
      minHeight: 48,
      borderRadius: theme.radius.xs,
      backgroundColor: theme.colors.primarySoft,
      borderWidth: 1,
      borderColor: theme.colors.primary + "44",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
    },
    mediaText: { color: theme.colors.primary, fontWeight: "900" },
    previewRow: { gap: 10, paddingTop: 12, paddingRight: 10 },
    previewImg: { width: 86, height: 74, borderRadius: theme.radius.xs, backgroundColor: theme.colors.surfaceSoft },
    missingJob: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    missingTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "900", marginBottom: 8 },
    hint: { color: theme.colors.textMuted, textAlign: "center" },
    bottomAction: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingTop: 14,
    },
    submitBtn: {
      minHeight: 56,
      borderRadius: theme.radius.xs,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    submitBtnDisabled: { opacity: 0.65 },
    submitText: { color: theme.colors.onPrimary, fontSize: 17, fontWeight: "900" },
  });
