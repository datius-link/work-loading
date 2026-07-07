import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ExploreTab from "./home/ExploreTab";
import { useAppTheme } from "../theme";
import { useLanguage } from "../LanguageContext";
import AppIcon from "../icons/AppIcon";
import { api } from "../api/api";

const T = {
  en: { tagline: "Find work nearby", searchPlaceholder: "Search e-kazi" },
  sw: { tagline: "Pata kazi karibu nawe", searchPlaceholder: "Tafuta e-kazi" },
};

function colorParam(color) {
  return String(color || "").replace("#", "");
}

function avatarFor(user, theme) {
  if (user?.profile_pic) return user.profile_pic;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    user?.full_name || user?.username || "U"
  )}&background=${colorParam(theme.colors.primary)}&color=${colorParam(theme.colors.onPrimary)}`;
}

export default function Home() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const t = T[language] || T.en;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const inputRef = useRef(null);
  const requestRef = useRef(null);
  const exploreRef = useRef(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ users: [], hashtags: [] });
  const [searching, setSearching] = useState(false);

  // Keep the logo anchored while the brand text and search controls swap.
  const searchAnim = useRef(new Animated.Value(0)).current;
  const brandTextOpacity = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const brandTextShift = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const toggleOpacity = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const toggleScale = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] });
  const barScaleX = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 1] });

  useEffect(() => {
    const plain = query.replace(/^[@#]+/, "").trim();
    if (!plain) {
      requestRef.current?.abort();
      setResults({ users: [], hashtags: [] });
      setSearching(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      setSearching(true);
      try {
        const response = await api.get("/search", {
          params: { q: query.trim(), type: "suggestions", limit: 6 },
          signal: controller.signal,
        });
        setResults({
          users: response?.data?.users || [],
          hashtags: response?.data?.hashtags || [],
        });
      } catch (error) {
        if (error?.code !== "ERR_CANCELED") {
          setResults({ users: [], hashtags: [] });
        }
      } finally {
        if (requestRef.current === controller) setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => () => requestRef.current?.abort(), []);

  const closeSearch = () => {
    requestRef.current?.abort();
    setSearchOpen(false);
    setQuery("");
    setResults({ users: [], hashtags: [] });
  };

  const openSearch = () => {
    setSearchOpen(true);
    Animated.timing(searchAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    setTimeout(() => inputRef.current?.focus(), 220);
  };

  const closeSearchAnimated = () => {
    Animated.timing(searchAnim, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => closeSearch());
  };

  const submitSearch = (value = query) => {
    const clean = String(value || "").trim();
    if (!clean.replace(/^[@#]+/, "").trim()) return;
    requestRef.current?.abort();
    setSearchOpen(false);
    navigation.navigate("SearchResults", { query: clean });
  };

  const openUser = (user) => {
    closeSearch();
    navigation.navigate("UserProfile", {
      providerUuid: user.uuid,
      providerId: user.uuid,
      username: user.username,
    });
  };

  const showDropdown = searchOpen && query.replace(/^[@#]+/, "").trim().length > 0;
  const noResults = !searching && results.users.length === 0 && results.hashtags.length === 0;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.topSide}>
          <View style={styles.brandRow} pointerEvents="box-none">
            <View style={styles.logoBadge}>
              <Image source={require("../../assets/icon.png")} style={styles.logoImage} />
              <View style={styles.logoDot} />
            </View>
            <Animated.View
              style={[
                styles.brandText,
                { opacity: brandTextOpacity, transform: [{ translateX: brandTextShift }] },
              ]}
              pointerEvents={searchOpen ? "none" : "auto"}
            >
              <Text style={styles.brandName}>
                e-<Text style={styles.brandNameAccent}>kazi</Text>
              </Text>
              <Text style={styles.brandTag} numberOfLines={1}>
                {t.tagline}
              </Text>
            </Animated.View>
          </View>

          <Animated.View
            style={[
              styles.searchToggle,
              { opacity: toggleOpacity, transform: [{ translateY: -3 }, { scale: toggleScale }] },
            ]}
            pointerEvents={searchOpen ? "none" : "auto"}
          >
            <TouchableOpacity style={styles.searchToggleBtn} onPress={openSearch} activeOpacity={0.85}>
              <AppIcon name="search" size={18} color={theme.colors.onPrimary} />
            </TouchableOpacity>
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.searchBarAbs,
            { top: insets.top + 7 },
            { opacity: searchAnim, transform: [{ scaleX: barScaleX }] },
          ]}
          pointerEvents={searchOpen ? "auto" : "none"}
        >
          <View style={styles.searchBarPill}>
            <View style={styles.searchBarIconWrap}>
              <AppIcon name="search" size={16} color={theme.colors.onPrimary} />
            </View>
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => submitSearch()}
              placeholder={t.searchPlaceholder}
              placeholderTextColor={theme.colors.onPrimaryMuted}
              style={styles.searchBarInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.searchCloseBtn} onPress={closeSearchAnimated} hitSlop={8}>
              <AppIcon name="close" size={14} color={theme.colors.onPrimary} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      {showDropdown ? (
        <View style={[styles.dropdown, { top: insets.top + 76 }]}>
          {searching ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.muted}>Searching...</Text>
            </View>
          ) : noResults ? (
            <TouchableOpacity style={styles.emptyRow} onPress={() => submitSearch()}>
              <AppIcon name="search" size={18} color={theme.colors.textMuted} />
              <Text style={styles.muted}>Search all results for "{query.trim()}"</Text>
            </TouchableOpacity>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {results.users.map((user) => (
                <TouchableOpacity key={user.uuid} style={styles.resultRow} onPress={() => openUser(user)}>
                  <Image source={{ uri: avatarFor(user, theme) }} style={styles.avatar} />
                  <View style={styles.resultText}>
                    <Text style={styles.username}>@{user.username || "user"}</Text>
                    <Text style={styles.fullName} numberOfLines={1}>{user.full_name || "e-kazi user"}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {results.hashtags.map((tag) => (
                <TouchableOpacity key={tag.name} style={styles.resultRow} onPress={() => submitSearch(`#${tag.name}`)}>
                  <View style={styles.hashtagIcon}><Text style={styles.hashtagMark}>#</Text></View>
                  <View style={styles.resultText}>
                    <Text style={styles.username}>#{tag.name}</Text>
                    <Text style={styles.fullName}>{Number(tag.posts_count) || 0} posts</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.allResults} onPress={() => submitSearch()}>
                <AppIcon name="search" size={17} color={theme.colors.primary} />
                <Text style={styles.allResultsText}>See all results for "{query.trim()}"</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      ) : null}

      <ExploreTab ref={exploreRef} navigation={navigation} />
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.bg },
    header: {
      paddingHorizontal: 16,
      paddingBottom: 14,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderColor: theme.colors.border,
      zIndex: 20,
    },
    topSide: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    logoBadge: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primarySoft,
      overflow: "visible",
    },
    logoImage: {
      width: 48,
      height: 48,
      borderRadius: 16,
    },
    logoDot: {
      position: "absolute",
      top: -3,
      right: -3,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.warning,
      borderWidth: 2,
      borderColor: theme.colors.surface,
    },
    brandRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minWidth: 0,
    },
    brandText: {
      flexShrink: 1,
      justifyContent: "center",
      minWidth: 0,
    },
    brandName: {
      fontSize: 20,
      fontWeight: "900",
      color: theme.colors.text,
      letterSpacing: 0,
    },
    brandNameAccent: {
      color: theme.colors.primaryStrong,
    },
    brandTag: {
      marginTop: 3,
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.textMuted,
      letterSpacing: 0,
      textTransform: "uppercase",
    },
    searchToggle: {
      width: 48,
      height: 48,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
    },
    searchToggleBtn: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    searchBarAbs: {
      position: "absolute",
      left: 76,
      right: 16,
      height: 52,
      zIndex: 5,
      justifyContent: "center",
      transformOrigin: "right center",
    },
    searchBarPill: {
      height: 48,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: 16,
      paddingLeft: 15,
      paddingRight: 7,
      backgroundColor: theme.colors.primary,
    },
    searchBarIconWrap: { opacity: 0.85 },
    searchBarInput: {
      flex: 1,
      color: theme.colors.onPrimary,
      fontSize: 14,
      fontWeight: "700",
      paddingVertical: 0,
    },
    searchCloseBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primaryDark,
    },
    dropdown: {
      position: "absolute",
      left: 0,
      right: 0,
      zIndex: 15,
      maxHeight: 430,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.card,
    },
    loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 18 },
    emptyRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 18 },
    muted: { color: theme.colors.textMuted, fontSize: 14, fontWeight: "700" },
    resultRow: {
      minHeight: 66,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primarySoft },
    hashtagIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    hashtagMark: { color: theme.colors.text, fontSize: 22, fontWeight: "900" },
    resultText: { flex: 1, minWidth: 0 },
    username: { color: theme.colors.text, fontSize: 14, fontWeight: "900" },
    fullName: { color: theme.colors.textMuted, fontSize: 13, marginTop: 2 },
    allResults: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
    allResultsText: { color: theme.colors.primary, fontWeight: "900" },
  });
