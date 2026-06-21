import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import AppIcon from "../icons/AppIcon";
import { api } from "../api/api";

function avatarFor(user) {
  if (user?.profile_pic) return user.profile_pic;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    user?.full_name || user?.username || "U"
  )}&background=0B6B63&color=fff`;
}

export default function Home() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const inputRef = useRef(null);
  const requestRef = useRef(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ users: [], hashtags: [] });
  const [searching, setSearching] = useState(false);

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
        {!searchOpen ? (
          <View style={styles.brandRow}>
            <AppIcon name="logo" size={34} color={theme.colors.primary} />
            <Text style={styles.logo}>e-kazi</Text>
          </View>
        ) : null}

        <View style={[styles.searchWrap, searchOpen && styles.searchWrapOpen]}>
          <TouchableOpacity
            style={styles.searchIconBtn}
            onPress={() => {
              if (searchOpen) closeSearch();
              else {
                setSearchOpen(true);
                setTimeout(() => inputRef.current?.focus(), 80);
              }
            }}
          >
            <AppIcon name={searchOpen ? "close" : "search"} size={18} color={theme.colors.primary} />
          </TouchableOpacity>
          {searchOpen ? (
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => submitSearch()}
              placeholder="Search people, skills, #hashtags"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
          ) : null}
        </View>
      </View>

      {showDropdown ? (
        <View style={[styles.dropdown, { top: insets.top + 59 }]}>
          {searching ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.muted}>Searching...</Text>
            </View>
          ) : noResults ? (
            <TouchableOpacity style={styles.emptyRow} onPress={() => submitSearch()}>
              <AppIcon name="search" size={18} color={theme.colors.textMuted} />
              <Text style={styles.muted}>Search all results for “{query.trim()}”</Text>
            </TouchableOpacity>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {results.users.map((user) => (
                <TouchableOpacity key={user.uuid} style={styles.resultRow} onPress={() => openUser(user)}>
                  <Image source={{ uri: avatarFor(user) }} style={styles.avatar} />
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
                <Text style={styles.allResultsText}>See all results for “{query.trim()}”</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      ) : null}

      <ExploreTab navigation={navigation} />
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 10,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderColor: theme.colors.border,
      zIndex: 20,
    },
    brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    logo: { fontSize: 22, fontWeight: "900", color: theme.colors.primary },
    searchWrap: {
      marginLeft: "auto",
      minHeight: 40,
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primarySoft,
    },
    searchWrapOpen: { flex: 1, marginLeft: 0 },
    searchIconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
    searchInput: { flex: 1, paddingRight: 12, color: theme.colors.text, fontSize: 14, fontWeight: "700" },
    dropdown: {
      position: "absolute",
      left: 0,
      right: 0,
      zIndex: 15,
      maxHeight: 430,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 14,
      elevation: 12,
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
