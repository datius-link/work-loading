import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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

export default function Home() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Search results state
  const [userResults, setUserResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef(null);

  // Fetch users matching query
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
      setUserResults(res?.data?.providers || res?.data?.users || []);
    } catch {
      setUserResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounce user search
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchUsers(searchQuery);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchQuery, fetchUsers]);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
    setUserResults([]);
  };

  const openProfile = (provider) => {
    closeSearch();
    navigation.navigate("UserProfile", {
      providerUuid: provider.provider_uuid || provider.uuid,
      username: provider.username,
    });
  };

  const showDropdown = searchOpen && searchQuery.trim().length > 0;

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
      <AppIcon name="chevron-right" size={16} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={[styles.brandRow, searchOpen && styles.brandCompact]}>
          <AppIcon name="logo" size={34} color={theme.colors.primary} />
          {!searchOpen && <Text style={styles.logo}>e-kazi</Text>}
        </View>

        <View style={[styles.searchWrap, searchOpen && styles.searchWrapOpen]}>
          <TouchableOpacity
            style={styles.searchIconBtn}
            onPress={() => {
              if (searchOpen) {
                closeSearch();
              } else {
                setSearchOpen(true);
                setTimeout(() => searchRef.current?.focus(), 100);
              }
            }}
          >
            <AppIcon
              name={searchOpen ? "close" : "search"}
              size={18}
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
              autoFocus
              returnKeyType="search"
            />
          )}
        </View>
      </View>

      {/* Search Dropdown */}
      {showDropdown && (
        <View style={styles.searchDropdown}>
          {searching ? (
            <View style={styles.searchLoading}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.searchLoadingText}>Searching...</Text>
            </View>
          ) : userResults.length === 0 ? (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No users found for "{searchQuery}"</Text>
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
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 10,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderColor: theme.colors.border,
      zIndex: 10,
    },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    brandCompact: {
      width: 38,
    },
    logo: {
      fontSize: 22,
      fontWeight: "800",
      color: theme.colors.primary,
    },
    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primarySoft,
      minHeight: 38,
      marginLeft: "auto",
    },
    searchWrapOpen: {
      flex: 1,
      marginHorizontal: 10,
      maxWidth: undefined,
    },
    searchIconBtn: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
    },
    searchInput: {
      flex: 1,
      paddingRight: 12,
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.primary,
    },

    // Search dropdown
    searchDropdown: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      marginTop: 70,
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
      width: 44,
      height: 44,
      borderRadius: 22,
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
