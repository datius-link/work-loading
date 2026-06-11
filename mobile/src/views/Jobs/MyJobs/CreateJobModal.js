
import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAppTheme } from "../../../theme";
import { useLanguage } from "../../../LanguageContext";
import AppIcon from "../../../icons/AppIcon";
import HiringNoticeModal from "../HiringNoticeModal";

// ─── Strings ─────────────────────────────────────────────────────────────────
const T = {
  en: {
    hireTitle: (name) => `Hire ${name}`,
    postTitle: "Post a Job",
    hireSub: "Send a direct job request to this provider.",
    postSub: "Post a job for people who can do the work.",
    titlePlaceholder: "Job title e.g. Fridge Repair",
    directTitlePlaceholder: "What do you need done?",
    descPlaceholder: "Describe the work in detail",
    directDescPlaceholder: "Tell the provider what you need and when you need it.",
    catPlaceholder: "Category e.g. Fridge Repair",
    locationPlaceholder: "Location e.g. Mbezi Beach, Dar es Salaam",
    datePlaceholder: "Closing date  YYYY-MM-DD",
    addPics: "Add Pictures",
    takePhoto: "Take Photo",
    submit: "Send Hire Request",
    postSubmit: "Post Job",
    longDateWarning: "You selected more than 3 weeks ahead. Are you sure?",
    longDateConfirm: "Tap to confirm",
    longDateConfirmed: "Confirmed",
    errTitle: "Missing title",
    errDesc: "Missing description",
    errCat: "Missing category",
    errLoc: "Missing location",
    errDate: "Invalid date",
    errDateFmt: "Use format YYYY-MM-DD.",
    errDatePast: "Closing date must be a future date.",
    errDateLong: "Confirm the closing date first.",
  },
  sw: {
    hireTitle: (name) => `Mwajiri ${name}`,
    postTitle: "Chapisha Kazi",
    hireSub: "Tuma ombi la kazi moja kwa moja kwa mtoa huduma huyu.",
    postSub: "Chapisha kazi kwa watoa huduma wanaofaa.",
    titlePlaceholder: "Kichwa cha kazi mfano Kutengeneza Fridge",
    directTitlePlaceholder: "Unahitaji kazi gani?",
    descPlaceholder: "Elezea kazi kwa undani",
    directDescPlaceholder: "Mwambie mtoa huduma unachohitaji na muda unaofaa.",
    catPlaceholder: "Aina mfano Fridge repair",
    locationPlaceholder: "Mahali mfano Mbezi Beach, Dar es Salaam",
    datePlaceholder: "Tarehe ya kufunga  YYYY-MM-DD",
    addPics: "Ongeza Picha",
    takePhoto: "Piga Picha",
    submit: "Tuma Ombi la Kuajiri",
    postSubmit: "Chapisha Kazi",
    longDateWarning: "Umechagua zaidi ya wiki 3. Una uhakika?",
    longDateConfirm: "Bonyeza kuthibitisha",
    longDateConfirmed: "Imethibitishwa",
    errTitle: "Kichwa hakipo",
    errDesc: "Maelezo hayapo",
    errCat: "Aina ya kazi haipo",
    errLoc: "Mahali haijulikani",
    errDate: "Tarehe si sahihi",
    errDateFmt: "Tumia muundo YYYY-MM-DD.",
    errDatePast: "Tarehe ya kufunga lazima iwe siku zijazo.",
    errDateLong: "Thibitisha tarehe ya kufunga kwanza.",
  },
};

function getDefaultClosingDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().split("T")[0];
}

function dateToValue(date) {
  return date.toISOString().split("T")[0];
}

function formatDisplayDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "";
  return date.toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

function getDateOptions() {
  return [3, 7, 14, 21, 30].map((days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return {
      label: days === 3 ? "In 3 days" : days === 7 ? "In 1 week" : days === 14 ? "In 2 weeks" : days === 21 ? "In 3 weeks" : "In 1 month",
      value: dateToValue(date),
    };
  });
}

export default function CreateJobModal({
  visible,
  onClose,
  mode = "indirect",
  provider = null,
  onSubmit,
  submitting = false,
}) {
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const t = T[language] || T.en;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isDirect = mode === "direct";
  const providerName = provider?.username || provider?.fullName || "provider";

  const [title, setTitle]                         = useState("");
  const [description, setDescription]             = useState("");
  const [categories, setCategories]               = useState([""]);
  const [location, setLocation]                   = useState("");
  const [closingDate, setClosingDate]             = useState(getDefaultClosingDate());
  const [confirmedLongDate, setConfirmedLong]     = useState(false);
  const [showDateOptions, setShowDateOptions]     = useState(false);
  const [images, setImages]                       = useState([]);
  const [needsAvailability, setNeedsAvailability] = useState(false);
  const [scheduledFor, setScheduledFor]           = useState("");
  const [availabilityNotes, setAvailabilityNotes] = useState("");
  const [notice, setNotice]                       = useState(null);
  const dragStartY = React.useRef(0);

  const daysAhead = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const sel   = new Date(closingDate); sel.setHours(0, 0, 0, 0);
    return Math.ceil((sel - today) / 86400000);
  }, [closingDate]);

  const showLongWarning = daysAhead > 21;

  function addCategory()           { setCategories((p) => [...p, ""]); }
  function removeCategory(i)       { setCategories((p) => p.filter((_, j) => j !== i)); }
  function updateCategory(text, i) { setCategories((p) => p.map((c, j) => (j === i ? text : c))); }

  function resetForm() {
    setTitle("");
    setDescription("");
    setCategories([""]);
    setLocation("");
    setClosingDate(getDefaultClosingDate());
    setConfirmedLong(false);
    setShowDateOptions(false);
    setImages([]);
    setNeedsAvailability(false);
    setScheduledFor("");
    setAvailabilityNotes("");
  }

  function handleClose() {
    resetForm();
    onClose?.();
  }

  const dragHandleProps = {
    onStartShouldSetResponder: () => true,
    onResponderGrant: (event) => { dragStartY.current = event.nativeEvent.pageY; },
    onResponderRelease: (event) => {
      if (event.nativeEvent.pageY - dragStartY.current > 80) handleClose();
    },
  };

  async function pickImages(fromCamera = false) {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setNotice({ type: "error", title: "Permission needed", body: "Allow access to continue." }); return; }
    const mediaOptions = { mediaTypes: ["images"], quality: 0.8 };
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync(mediaOptions)
      : await ImagePicker.launchImageLibraryAsync({ ...mediaOptions, allowsMultipleSelection: true });
    if (!res.canceled) setImages((p) => [...p, ...res.assets]);
  }

  function submitJob() {
    const cats = categories.map((c) => c.trim()).filter(Boolean);
    if (!title.trim())       { setNotice({ type: "error", title: t.errTitle }); return; }
    if (!description.trim()) { setNotice({ type: "error", title: t.errDesc }); return; }
    if (!isDirect && !cats.length)        { setNotice({ type: "error", title: t.errCat }); return; }
    if (!location.trim())                 { setNotice({ type: "error", title: t.errLoc }); return; }
    if (!isDirect) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(closingDate)) { setNotice({ type: "error", title: t.errDate, body: t.errDateFmt }); return; }
      if (daysAhead < 1)                             { setNotice({ type: "error", title: t.errDate, body: t.errDatePast }); return; }
      if (showLongWarning && !confirmedLongDate)     { setNotice({ type: "error", title: t.errDate, body: t.errDateLong }); return; }
    }

    // Parent's async onSubmit owns the modal lifecycle — do not close here.
    onSubmit?.({
      hiringType:            isDirect ? "direct" : "indirect",
      providerUuid:          isDirect ? provider?.uuid : null,
      providerUsername:      isDirect ? provider?.username : null,
      title:                 title.trim(),
      description:           description.trim(),
      categories:            cats.length ? cats : ["Direct Hire"],
      service_type:          cats[0] || provider?.service_type || "Direct Hire",
      location:              location.trim(),
      closingDate:           isDirect ? null : closingDate,
      tender_closes_at:      isDirect ? null : closingDate,
      availability_required: needsAvailability,
      scheduled_for:         needsAvailability ? scheduledFor.trim() : null,
      availability_notes:    availabilityNotes.trim() || null,
      images,
    });
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      {/*
        KeyboardAvoidingView wraps the overlay so that when the keyboard appears
        the sheet lifts above it instead of inputs being obscured.
      */}
      <KeyboardAvoidingView
        style={styles.kavWrapper}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.overlay}>
          {/* Tap outside to dismiss */}
          <TouchableOpacity
            style={styles.backdropHitArea}
            activeOpacity={1}
            onPress={handleClose}
          />

          {/*
            sheet: explicit height:"86%" — this is the critical fix.
            Without a definite height, flex:1 on ScrollView collapses to 0
            and only the header (outside the ScrollView) renders.
          */}
          <View style={styles.sheet}>

            {/* Drag handle */}
            <View style={styles.handle} {...dragHandleProps} />

            {/* Header — lives outside ScrollView so it's always visible */}
            <View style={styles.header} {...dragHandleProps}>
              <View style={styles.headerLeft}>
                <Text style={styles.sheetTitle}>
                  {isDirect ? t.hireTitle(providerName) : t.postTitle}
                </Text>
                <Text style={styles.sheetSub}>
                  {isDirect ? t.hireSub : t.postSub}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <AppIcon name="close" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Form — fills remaining height, scrollable */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                style={styles.input}
                placeholder={isDirect ? t.directTitlePlaceholder : t.titlePlaceholder}
                placeholderTextColor={theme.colors.textVeryMuted}
                value={title}
                onChangeText={setTitle}
              />

              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder={isDirect ? t.directDescPlaceholder : t.descPlaceholder}
                placeholderTextColor={theme.colors.textVeryMuted}
                value={description}
                onChangeText={setDescription}
                multiline
              />

              {/* Dynamic categories */}
              {!isDirect && categories.map((cat, i) => (
                  <View key={i} style={styles.catRow}>
                    <TextInput
                      style={[styles.input, styles.catInput]}
                      placeholder={t.catPlaceholder}
                      placeholderTextColor={theme.colors.textVeryMuted}
                      value={cat}
                      onChangeText={(txt) => updateCategory(txt, i)}
                    />
                    <TouchableOpacity
                      style={styles.catBtn}
                      onPress={i === 0 ? addCategory : () => removeCategory(i)}
                    >
                      <AppIcon
                        name={i === 0 ? "plus" : "minus"}
                        size={18}
                        color={theme.colors.text}
                      />
                    </TouchableOpacity>
                  </View>
                ))}

              <TextInput
                style={styles.input}
                placeholder={t.locationPlaceholder}
                placeholderTextColor={theme.colors.textVeryMuted}
                value={location}
                onChangeText={setLocation}
              />

              {!isDirect && (
                <View style={styles.dateBlock}>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDateOptions((value) => !value)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.dateCopy}>
                      <Text style={styles.dateLabel}>{t.datePlaceholder}</Text>
                      <Text style={styles.dateValue}>{formatDisplayDate(closingDate)}</Text>
                    </View>
                    <AppIcon name="calendar" size={18} color={theme.colors.primary} />
                  </TouchableOpacity>
                  {showDateOptions && (
                    <View style={styles.dateDropdown}>
                      {getDateOptions().map((option) => {
                        const active = closingDate === option.value;
                        return (
                          <TouchableOpacity
                            key={option.value}
                            style={[styles.dateOption, active && styles.dateOptionActive]}
                            onPress={() => {
                              setClosingDate(option.value);
                              setConfirmedLong(false);
                              setShowDateOptions(false);
                            }}
                            activeOpacity={0.85}
                          >
                            <Text style={[styles.dateOptionText, active && styles.dateOptionTextActive]}>{option.label}</Text>
                            <Text style={styles.dateOptionDate}>{formatDisplayDate(option.value)}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {!isDirect && showLongWarning && (
                <TouchableOpacity
                  style={styles.warning}
                  onPress={() => setConfirmedLong((v) => !v)}
                >
                  <Text style={styles.warningText}>{t.longDateWarning}</Text>
                  <Text style={styles.warnConfirm}>
                    {confirmedLongDate ? t.longDateConfirmed : t.longDateConfirm}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.availabilityToggle,
                  needsAvailability && styles.availabilityToggleActive,
                ]}
                onPress={() => setNeedsAvailability((v) => !v)}
                activeOpacity={0.8}
              >
                <AppIcon
                  name={needsAvailability ? "check" : "calendar"}
                  size={16}
                  color={needsAvailability ? theme.colors.onPrimary : theme.colors.primary}
                />
                <Text
                  style={[
                    styles.availabilityToggleText,
                    needsAvailability && styles.availabilityToggleTextActive,
                  ]}
                >
                  {needsAvailability
                    ? "Needs date/time availability"
                    : "No specific date/time needed"}
                </Text>
              </TouchableOpacity>

              {needsAvailability && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Date/time or availability window"
                    placeholderTextColor={theme.colors.textVeryMuted}
                    value={scheduledFor}
                    onChangeText={setScheduledFor}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Availability notes (optional)"
                    placeholderTextColor={theme.colors.textVeryMuted}
                    value={availabilityNotes}
                    onChangeText={setAvailabilityNotes}
                  />
                </>
              )}

              {/* Media */}
              <View style={styles.mediaBox}>
                <View style={styles.mediaActions}>
                  <TouchableOpacity
                    style={styles.mediaBtn}
                    onPress={() => pickImages(false)}
                  >
                    <AppIcon name="image" size={16} color={theme.colors.primary} />
                    <Text style={styles.mediaBtnText}>{t.addPics}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.mediaBtn}
                    onPress={() => pickImages(true)}
                  >
                    <AppIcon name="camera" size={16} color={theme.colors.primary} />
                    <Text style={styles.mediaBtnText}>{t.takePhoto}</Text>
                  </TouchableOpacity>
                </View>
                {images.length > 0 && (
                  <View style={styles.previewRow}>
                    {images.map((img, i) => (
                      <Image
                        key={`${img.uri}-${i}`}
                        source={{ uri: img.uri }}
                        style={styles.previewImg}
                      />
                    ))}
                  </View>
                )}
              </View>

              <TouchableOpacity
                disabled={submitting}
                style={[styles.submitBtn, submitting && { opacity: 0.65 }]}
                onPress={submitJob}
                activeOpacity={0.85}
              >
                <Text style={styles.submitText}>
                  {submitting
                    ? isDirect ? "Sending..." : "Posting..."
                    : isDirect ? t.submit : t.postSubmit}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
      <HiringNoticeModal
        visible={!!notice}
        type={notice?.type}
        title={notice?.title}
        body={notice?.body}
        onPrimary={() => setNotice(null)}
        onClose={() => setNotice(null)}
      />
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const createStyles = (theme) =>
  StyleSheet.create({
    // KeyboardAvoidingView must fill the whole screen
    kavWrapper: {
      flex: 1,
    },

    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: "flex-end",
    },

    // Tap-outside dismissal area (fills space above the sheet)
    backdropHitArea: {
      flex: 1,
    },

    /*
      THE FIX: height:"86%" gives the sheet a definite size.
      ScrollView's flex:1 can now resolve against it and will fill
      the remaining space below the header.
      maxHeight alone is NOT enough — flex children need a concrete parent size.
    */
    sheet: {
      height: "88%",
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.radius.md,
      borderTopRightRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingTop: 12,
      borderTopWidth: 1,
      borderColor: theme.colors.border,
      // No paddingBottom here — handled by scrollContent instead so the
      // iOS home indicator is still cleared.
    },

    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.border,
      alignSelf: "center",
      marginBottom: 12,
    },

    /* Header */
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 14,
      marginBottom: 14,
    },
    headerLeft: { flex: 1 },
    sheetTitle: {
      fontSize: 22,
      fontWeight: "900",
      color: theme.colors.text,
      flexShrink: 1,
    },
    sheetSub: {
      marginTop: 4,
      fontSize: 13,
      color: theme.colors.textMuted,
      lineHeight: 18,
    },
    closeBtn: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },

    /* ScrollView */
    scroll: {
      flex: 1,           // fills remaining height inside sheet
    },
    scrollContent: {
      paddingBottom: Platform.OS === "ios" ? 40 : 24,
    },

    /* Inputs */
    input: {
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.xs,
      padding: 14,
      fontSize: 15,
      color: theme.colors.text,
      marginBottom: 12,
    },
    textarea: { minHeight: 96, textAlignVertical: "top" },

    dateBlock: {
      marginBottom: 12,
    },
    dateButton: {
      minHeight: 54,
      borderRadius: theme.radius.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceSoft,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    dateCopy: { flex: 1, minWidth: 0 },
    dateLabel: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 3,
    },
    dateValue: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: "800",
    },
    dateDropdown: {
      marginTop: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.xs,
      backgroundColor: theme.colors.surface,
      overflow: "hidden",
    },
    dateOption: {
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    dateOptionActive: {
      backgroundColor: theme.colors.primarySoft,
    },
    dateOptionText: {
      color: theme.colors.text,
      fontSize: 13,
      fontWeight: "900",
    },
    dateOptionTextActive: {
      color: theme.colors.primary,
    },
    dateOptionDate: {
      marginTop: 2,
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
    },

    /* Category row */
    catRow: { flexDirection: "row", gap: 10, alignItems: "center" },
    catInput: { flex: 1 },
    catBtn: {
      width: 48,
      height: 48,
      borderRadius: theme.radius.xs,
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },

    /* Long-date warning */
    warning: {
      backgroundColor: theme.colors.accentSoft,
      borderRadius: theme.radius.xs,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.accent + "40",
    },
    warningText: { color: theme.colors.warning, fontSize: 14, lineHeight: 20 },
    warnConfirm: { marginTop: 6, color: theme.colors.primary, fontWeight: "800" },

    /* Availability toggle */
    availabilityToggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: theme.colors.primary + "44",
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.radius.xs,
      padding: 13,
      marginBottom: 12,
    },
    availabilityToggleActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    availabilityToggleText: {
      color: theme.colors.primary,
      fontWeight: "800",
      fontSize: 13,
      flexShrink: 1,
    },
    availabilityToggleTextActive: { color: theme.colors.onPrimary },

    /* Media */
    mediaBox: {
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: theme.colors.border,
      borderRadius: theme.radius.xs,
      padding: 14,
      backgroundColor: theme.colors.surfaceSoft,
      marginBottom: 16,
      gap: 12,
    },
    mediaActions: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
    mediaBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: theme.colors.primarySoft,
      borderWidth: 1,
      borderColor: theme.colors.primary + "44",
      padding: 13,
      borderRadius: theme.radius.xs,
      minWidth: 132,
    },
    mediaBtnText: { color: theme.colors.primary, fontWeight: "800", fontSize: 13, flexShrink: 1 },
    previewRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    previewImg: { width: 72, height: 72, borderRadius: theme.radius.sm },

    /* Submit button */
    submitBtn: {
      backgroundColor: theme.colors.primary,
      padding: 17,
      borderRadius: theme.radius.xs,
      alignItems: "center",
      shadowColor: theme.colors.primary,
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
      elevation: 6,
    },
    submitText: { color: theme.colors.onPrimary, fontSize: 17, fontWeight: "900" },
  });
