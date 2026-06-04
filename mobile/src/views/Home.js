import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
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

function avatarFor(username, profilePic) {
  if (profilePic) return profilePic;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    username || "U"
  )}&background=0B6B63&color=fff`;
}

function normalizeSearchResults(data) {
  const providers = data?.providers || data?.users || [];
  return providers.map((item) => ({
    ...item,
    resultType: "profile",
  }));
}

export default function Home() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef(null);

  // Animated width for search bar expand/collapse
  const searchAnim = useRef(new Animated.Value(0)).current; // 0 = closed, 1 = open

  const openSearch = () => {
    setSearchOpen(true);
    Animated.spring(searchAnim, {
      toValue: 1,
      useNativeDriver: false,
      tension: 80,
      friction: 10,
    }).start(() => {
      searchRef.current?.focus();
    });
  };

  const closeSearch = () => {
    Animated.spring(searchAnim, {
      toValue: 0,
      useNativeDriver: false,
      tension: 80,
      friction: 10,
    }).start(() => {
      setSearchOpen(false);
    });
    setSearchQuery("");
    setUserResults([]);
  };

  const fetchUsers = useCallback(async (q) => {
    if (!q || q.trim().length < 1) {
      setUserResults([]);
      return;
    }
    try {
      setSearching(true);
      const res = await api.get("/service-provider/search", {
        params: { q: q.trim(), limit: 10 },
      });
      setUserResults(normalizeSearchResults(res?.data));
    } catch {
      setUserResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => fetchUsers(searchQuery), 400);
    return () => clearTimeout(timeout);
  }, [searchQuery, fetchUsers]);

  const openProfile = (provider) => {
    closeSearch();
    navigation.navigate("ProviderProfile", {
      providerId: provider.provider_uuid || provider.uuid,
      username: provider.username,
    });
  };

  const showDropdown = searchOpen && searchQuery.trim().length > 0;

  // Animated styles
  const searchBarWidth = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const logoOpacity = searchAnim.interpolate({
    inputRange: [0, 0.3],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={styles.resultItem}
      activeOpacity={0.85}
      onPress={() => openProfile(item)}
    >
      <Image
        source={{ uri: avatarFor(item.username, item.profile_pic || item.profilePic) }}
        style={styles.resultAvatar}
      />
      <View style={styles.resultMeta}>
        <Text style={styles.resultUsername}>@{item.username}</Text>
        {!!item.full_name && (
          <Text style={styles.resultFullName}>{item.full_name}</Text>
        )}
      </View>
      <AppIcon name="arrowRight" size={16} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        {/* Brand — fades out as search expands */}
        <Animated.View style={[styles.brandRow, { opacity: logoOpacity }]}>
          <AppIcon name="logo" size={28} color={theme.colors.primary} />
          <Text style={styles.brandName}>e-kazi</Text>
        </Animated.View>

        {/* Search bar — expands to fill remaining space */}
        <Animated.View
          style={[
            styles.searchWrap,
            searchOpen && { width: searchBarWidth, flex: 1 },
          ]}
        >
          <TouchableOpacity
            style={styles.searchIconBtn}
            onPress={searchOpen ? closeSearch : openSearch}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AppIcon
              name={searchOpen ? "close" : "search"}
              size={17}
              color={theme.colors.primary}
            />
          </TouchableOpacity>

          {searchOpen && (
            <TextInput
              ref={searchRef}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search @users, #services"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.searchInput}
              autoCapitalize="none"
              returnKeyType="search"
            />
          )}
        </Animated.View>
      </View>

      {/* Search Dropdown */}
      {showDropdown && (
        <View style={[styles.searchDropdown, { top: insets.top + 56 }]}>
          {searching ? (
            <View style={styles.searchLoading}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.searchLoadingText}>Searching...</Text>
            </View>
          ) : userResults.length === 0 ? (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No results for "{searchQuery}"</Text>
            </View>
          ) : (
            <FlatList
              data={userResults}
              renderItem={renderUserItem}
              keyExtractor={(item) =>
                String(item.provider_uuid || item.uuid || item.username)
              }
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.resultList}
            />
          )}
        </View>
      )}

      <ExploreTab navigation={navigation} searchQuery={searchQuery} />
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingBottom: 8,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderColor: theme.colors.border,
      zIndex: 10,
      gap: 10,
    },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    brandName: {
      color: theme.colors.primary,
      fontSize: 18,
      fontWeight: "900",
      letterSpacing: -0.3,
    },

    // Search bar — collapsed it's just a small pill, open it fills the row
    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primarySoft,
      height: 38,
      width: 38,
      marginLeft: "auto",
      overflow: "hidden",
    },
    searchIconBtn: {
      width: 36,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    searchInput: {
      flex: 1,
      paddingRight: 12,
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.text,
      height: 38,
    },

    // Dropdown
    searchDropdown: {
      position: "absolute",
      left: 0,
      right: 0,
      zIndex: 999,
      backgroundColor: theme.colors.surface,
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: theme.colors.border,
      maxHeight: 320,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    searchLoading: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 16,
    },
    searchLoadingText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: "600",
    },
    noResults: {
      padding: 20,
      alignItems: "center",
    },
    noResultsText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: "600",
    },
    resultList: {
      maxHeight: 320,
    },
    resultItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: 12,
    },
    resultAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.colors.primarySoft,
    },
    resultMeta: {
      flex: 1,
    },
    resultUsername: {
      fontSize: 14,
      fontWeight: "800",
      color: theme.colors.primary,
    },
    resultFullName: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontWeight: "500",
      marginTop: 2,
    },
  });
