
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
import DateField from "../../../components/DateField";
import { searchLocations } from "../../../data/tanzaniaLocations";

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
    chooseLibrary: "Choose from Library",
    scheduleDatePlaceholder: "Choose a date",
    availabilityNotesPlaceholder: "Time of day, e.g. morning/evening (optional)",
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
    budgetSectionTitle: "Budget (optional)",
    budgetMinPlaceholder: "Min (TZS)",
    budgetMaxPlaceholder: "Max (TZS)",
    budgetDirectPlaceholder: "How much will you pay? (TZS)",
    budgetHint: "Providers will see this range and can offer within it.",
    budgetDirectHint: "This is your offer — it becomes final once the provider accepts.",
    requirementsPlaceholder: "Requirements, one per line (optional)\ne.g. Bring your own tools\nArrive before 9 AM",
    skillsPlaceholder: "Required skills, comma separated (optional) e.g. Cleaning, Deep Cleaning",
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
    chooseLibrary: "Chagua kwenye Picha",
    scheduleDatePlaceholder: "Chagua tarehe",
    availabilityNotesPlaceholder: "Muda, mfano asubuhi/jioni (hiari)",
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
    budgetSectionTitle: "Bajeti (hiari)",
    budgetMinPlaceholder: "Kima cha chini (TZS)",
    budgetMaxPlaceholder: "Kima cha juu (TZS)",
    budgetDirectPlaceholder: "Utalipa kiasi gani? (TZS)",
    budgetHint: "Watoa huduma wataona kiwango hiki na wanaweza kutoa ofa ndani yake.",
    budgetDirectHint: "Hii ni ofa yako — inakuwa ya mwisho mara mtoa huduma akikubali.",
    requirementsPlaceholder: "Mahitaji, mstari mmoja kwa kila kimoja (hiari)\nmfano Leta vifaa vyako mwenyewe\nFika kabla ya saa 3 asubuhi",
    skillsPlaceholder: "Ujuzi unaohitajika, tenganisha kwa koma (hiari) mfano Usafi, Usafi wa Kina",
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
  const [budgetMin, setBudgetMin]                 = useState("");
  const [budgetMax, setBudgetMax]                 = useState("");
  const [directBudget, setDirectBudget]           = useState("");
  const [requirements, setRequirements]           = useState("");
  const [skills, setSkills]                       = useState("");
  const [notice, setNotice]                       = useState(null);
  const [showPhotoMenu, setShowPhotoMenu]         = useState(false);
  const [locationFocused, setLocationFocused]     = useState(false);
  const dragStartY = React.useRef(0);

  const locationSuggestions = useMemo(
    () => (locationFocused ? searchLocations(location) : []),
    [location, locationFocused]
  );

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
    setBudgetMin("");
    setBudgetMax("");
    setDirectBudget("");
    setRequirements("");
    setSkills("");
    setShowPhotoMenu(false);
    setLocationFocused(false);
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

    const requirementsList = requirements.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const skillsList = skills.split(",").map((s) => s.trim()).filter(Boolean);
    const cleanMin = budgetMin.trim().replace(/[^\d.]/g, "");
    const cleanMax = budgetMax.trim().replace(/[^\d.]/g, "");
    const cleanDirectBudget = directBudget.trim().replace(/[^\d.]/g, "");

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
      budget_min:            !isDirect && cleanMin ? cleanMin : null,
      budget_max:            !isDirect && cleanMax ? cleanMax : null,
      budget:                isDirect && cleanDirectBudget ? cleanDirectBudget : null,
      requirements:          requirementsList,
      skills:                skillsList,
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
              <View style={styles.iconInputRow}>
                <View style={styles.iconInputIconWrap}>
                  <AppIcon name="edit" size={17} color={theme.colors.textMuted} />
                </View>
                <TextInput
                  style={styles.iconInput}
                  placeholder={isDirect ? t.directTitlePlaceholder : t.titlePlaceholder}
                  placeholderTextColor={theme.colors.textVeryMuted}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={[styles.iconInputRow, styles.iconInputRowTextarea]}>
                <View style={styles.iconInputIconWrapTop}>
                  <AppIcon name="file-text" size={17} color={theme.colors.textMuted} />
                </View>
                <TextInput
                  style={[styles.iconInput, styles.textarea]}
                  placeholder={isDirect ? t.directDescPlaceholder : t.descPlaceholder}
                  placeholderTextColor={theme.colors.textVeryMuted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />
              </View>

              {/* Dynamic categories */}
              {!isDirect && categories.map((cat, i) => (
                  <View key={i} style={styles.iconInputRow}>
                    <View style={styles.iconInputIconWrap}>
                      <AppIcon name="tag" size={17} color={theme.colors.textMuted} />
                    </View>
                    <TextInput
                      style={styles.iconInput}
                      placeholder={t.catPlaceholder}
                      placeholderTextColor={theme.colors.textVeryMuted}
                      value={cat}
                      onChangeText={(txt) => updateCategory(txt, i)}
                    />
                    <TouchableOpacity
                      style={styles.catInlineBtn}
                      onPress={i === 0 ? addCategory : () => removeCategory(i)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.85}
                    >
                      <AppIcon
                        name={i === 0 ? "plus" : "minus"}
                        size={16}
                        color={theme.colors.primary}
                      />
                    </TouchableOpacity>
                  </View>
                ))}

              <View style={styles.locationWrap}>
                <View style={styles.iconInputRow}>
                  <View style={styles.iconInputIconWrap}>
                    <AppIcon name="map-pin" size={17} color={theme.colors.textMuted} />
                  </View>
                  <TextInput
                    style={styles.iconInput}
                    placeholder={t.locationPlaceholder}
                    placeholderTextColor={theme.colors.textVeryMuted}
                    value={location}
                    onChangeText={setLocation}
                    onFocus={() => setLocationFocused(true)}
                    onBlur={() => setTimeout(() => setLocationFocused(false), 150)}
                  />
                </View>
                {locationSuggestions.length > 0 ? (
                  <View style={styles.locationDropdown}>
                    {locationSuggestions.map((item) => (
                      <TouchableOpacity
                        key={`${item.name}-${item.region}`}
                        style={styles.locationOption}
                        onPress={() => {
                          setLocation(item.name);
                          setLocationFocused(false);
                        }}
                        activeOpacity={0.85}
                      >
                        <AppIcon name="map-pin" size={14} color={theme.colors.primary} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.locationOptionText}>{item.name}</Text>
                          <Text style={styles.locationOptionRegion}>{item.region}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>

              {/* Budget — a range for posted jobs, a single named offer for direct hire.
                  Feeds the job's agreed-budget logic on the backend, not a placeholder. */}
              <View style={styles.budgetBlock}>
                <Text style={styles.budgetLabel}>{t.budgetSectionTitle}</Text>
                {isDirect ? (
                  <View style={styles.iconInputRow}>
                    <View style={styles.iconInputIconWrap}>
                      <AppIcon name="wallet" size={17} color={theme.colors.textMuted} />
                    </View>
                    <TextInput
                      style={styles.iconInput}
                      placeholder={t.budgetDirectPlaceholder}
                      placeholderTextColor={theme.colors.textVeryMuted}
                      value={directBudget}
                      onChangeText={setDirectBudget}
                      keyboardType="numeric"
                    />
                  </View>
                ) : (
                  <View style={styles.budgetRangeRow}>
                    <View style={[styles.iconInputRow, styles.budgetRangeInput]}>
                      <View style={styles.iconInputIconWrap}>
                        <AppIcon name="wallet" size={17} color={theme.colors.textMuted} />
                      </View>
                      <TextInput
                        style={styles.iconInput}
                        placeholder={t.budgetMinPlaceholder}
                        placeholderTextColor={theme.colors.textVeryMuted}
                        value={budgetMin}
                        onChangeText={setBudgetMin}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={[styles.iconInputRow, styles.budgetRangeInput]}>
                      <View style={styles.iconInputIconWrap}>
                        <AppIcon name="wallet" size={17} color={theme.colors.textMuted} />
                      </View>
                      <TextInput
                        style={styles.iconInput}
                        placeholder={t.budgetMaxPlaceholder}
                        placeholderTextColor={theme.colors.textVeryMuted}
                        value={budgetMax}
                        onChangeText={setBudgetMax}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                )}
                <Text style={styles.budgetHint}>{isDirect ? t.budgetDirectHint : t.budgetHint}</Text>
              </View>

              {/* Requirements + skills — shown as a checklist / chips on the job details screen */}
              <View style={[styles.iconInputRow, styles.iconInputRowTextarea]}>
                <View style={styles.iconInputIconWrapTop}>
                  <AppIcon name="tasks" size={17} color={theme.colors.textMuted} />
                </View>
                <TextInput
                  style={[styles.iconInput, styles.textarea]}
                  placeholder={t.requirementsPlaceholder}
                  placeholderTextColor={theme.colors.textVeryMuted}
                  value={requirements}
                  onChangeText={setRequirements}
                  multiline
                />
              </View>
              <View style={styles.iconInputRow}>
                <View style={styles.iconInputIconWrap}>
                  <AppIcon name="award" size={17} color={theme.colors.textMuted} />
                </View>
                <TextInput
                  style={styles.iconInput}
                  placeholder={t.skillsPlaceholder}
                  placeholderTextColor={theme.colors.textVeryMuted}
                  value={skills}
                  onChangeText={setSkills}
                />
              </View>

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
                  <DateField
                    value={scheduledFor}
                    onChange={setScheduledFor}
                    theme={theme}
                    language={language}
                    placeholder={t.scheduleDatePlaceholder}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={t.availabilityNotesPlaceholder}
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
                    onPress={() => setShowPhotoMenu((v) => !v)}
                    activeOpacity={0.85}
                  >
                    <AppIcon name="image" size={16} color={theme.colors.primary} />
                    <Text style={styles.mediaBtnText}>{t.addPics}</Text>
                    <AppIcon name="chevron-right" size={13} color={theme.colors.textMuted} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
                {showPhotoMenu && (
                  <View style={styles.photoDropdown}>
                    <TouchableOpacity
                      style={styles.photoOption}
                      onPress={() => {
                        setShowPhotoMenu(false);
                        pickImages(true);
                      }}
                      activeOpacity={0.85}
                    >
                      <AppIcon name="camera" size={15} color={theme.colors.primary} />
                      <Text style={styles.photoOptionText}>{t.takePhoto}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.photoOption}
                      onPress={() => {
                        setShowPhotoMenu(false);
                        pickImages(false);
                      }}
                      activeOpacity={0.85}
                    >
                      <AppIcon name="image" size={15} color={theme.colors.primary} />
                      <Text style={styles.photoOptionText}>{t.chooseLibrary}</Text>
                    </TouchableOpacity>
                  </View>
                )}
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

    /* Icon-prefixed inputs (title / description) */
    iconInputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.xs,
      paddingHorizontal: 14,
      minHeight: 54,
      marginBottom: 12,
    },
    iconInputRowTextarea: {
      alignItems: "flex-start",
      minHeight: 96,
      paddingVertical: 14,
    },
    iconInputIconWrap: {
      width: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    iconInputIconWrapTop: {
      width: 20,
      alignItems: "center",
      justifyContent: "flex-start",
      paddingTop: 2,
    },
    iconInput: {
      flex: 1,
      fontSize: 15,
      color: theme.colors.text,
      paddingVertical: 14,
    },

    /* Location autocomplete */
    locationWrap: {
      marginBottom: 12,
      zIndex: 10,
    },
    locationDropdown: {
      marginTop: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.xs,
      backgroundColor: theme.colors.surface,
      overflow: "hidden",
    },
    locationOption: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    locationOptionText: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: "800",
    },
    locationOptionRegion: {
      marginTop: 1,
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: "600",
    },

    budgetBlock: {
      marginBottom: 12,
    },
    budgetLabel: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 8,
    },
    budgetRangeRow: {
      flexDirection: "row",
      gap: 10,
    },
    budgetRangeInput: {
      flex: 1,
      marginBottom: 0,
    },
    budgetHint: {
      marginTop: 6,
      fontSize: 12,
      color: theme.colors.textMuted,
      lineHeight: 17,
    },

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
    catInlineBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.colors.primarySoft,
      borderWidth: 1,
      borderColor: theme.colors.primary + "44",
      alignItems: "center",
      justifyContent: "center",
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
    photoDropdown: {
      marginTop: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.xs,
      backgroundColor: theme.colors.surface,
      overflow: "hidden",
    },
    photoOption: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    photoOptionText: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: "800",
    },
    previewRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    previewImg: { width: 72, height: 72, borderRadius: theme.radius.sm },

    /* Submit button */
    submitBtn: {
      backgroundColor: theme.colors.accent,
      padding: 17,
      borderRadius: theme.radius.xs,
      alignItems: "center",
      shadowColor: theme.colors.accent,
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
      elevation: 6,
    },
    submitText: { color: theme.colors.onAccent, fontSize: 17, fontWeight: "900" },
  });
