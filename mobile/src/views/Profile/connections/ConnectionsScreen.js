import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation } from "convex/react";
import { api as convexApi } from "../../../../convex/_generated/api";

import { socialRequest, viewerRequest } from "../../../api/api";
import AppIcon from "../../../icons/AppIcon";
import { useLanguage } from "../../../LanguageContext";
import { useAppTheme } from "../../../theme";

const Tab = createMaterialTopTabNavigator();
const T = {
  en: {
    title: "Connections",
    followers: "Followers",
    following: "Following",
    search: "Search users",
    noFollowers: "No followers yet",
    noFollowersBody: "People who follow this profile will appear here.",
    noFollowing: "Not following anyone yet",
    noFollowingBody: "Profiles followed from this account will appear here.",
    noMatches: "No matching users.",
    follow: "Follow",
    followBack: "Follow Back",
    followingUser: "Following",
    viewProfile: "View Profile",
  },
  sw: {
    title: "Miunganisho",
    followers: "Followers",
    following: "Following",
    search: "Tafuta watumiaji",
    noFollowers: "Hakuna followers bado",
    noFollowersBody: "Watu wanaofuata profaili hii wataonekana hapa.",
    noFollowing: "Hufuati mtu bado",
    noFollowingBody: "Profaili unazofuata zitaonekana hapa.",
    noMatches: "Hakuna watumiaji wanaolingana.",
    follow: "Follow",
    followBack: "Follow Back",
    followingUser: "Following",
    viewProfile: "Ona Profaili",
  },
};

function avatarFor(user) {
  if (user?.profile_pic || user?.profilePic) return user.profile_pic || user.profilePic;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    user?.full_name || user?.username || user?.email || "User"
  )}&background=0B6B63&color=fff`;
}

export default function ConnectionsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const t = T[language] || T.en;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const viewedProfileUuid =
    route?.params?.profileUuid || route?.params?.providerUuid || route?.params?.providerId;
  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("MainTabs", { screen: "Profile" }))}
        >
          <AppIcon name="arrowLeft" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>{t.title}</Text>
        <View style={styles.iconBtn} />
      </View>

      <Tab.Navigator
        initialRouteName={route?.params?.initialTab === "following" ? t.following : t.followers}
        screenOptions={{
          tabBarStyle: styles.tabBar,
          tabBarIndicatorStyle: styles.indicator,
          tabBarLabelStyle: styles.tabLabel,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textMuted,
          sceneContainerStyle: styles.scene,
        }}
      >
        <Tab.Screen name={t.followers}>
          {() => (
            <ConnectionsList
              type="followers"
              navigation={navigation}
              styles={styles}
              theme={theme}
              t={t}
              profileUuid={viewedProfileUuid}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name={t.following}>
          {() => (
            <ConnectionsList
              type="following"
              navigation={navigation}
              styles={styles}
              theme={theme}
              t={t}
              profileUuid={viewedProfileUuid}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </View>
  );
}

function ConnectionsList({ type, navigation, styles, theme, t, profileUuid }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const publishRealtimeEvent = useMutation(convexApi.realtimeEvents.publish);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const endpoint = profileUuid
        ? `/profiles/${encodeURIComponent(profileUuid)}/connections?type=${type}`
        : `/profiles/me/connections?type=${type}`;
      const res = profileUuid
        ? await socialRequest("get", endpoint, undefined, { preferredAuthActor: "viewer" })
        : await viewerRequest("get", endpoint);
      setData(res?.data?.users || []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [profileUuid, type]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFollow = async (item) => {
    if (!item?.uuid && !item?.provider_uuid) return;
    try {
      const targetUuid = item.provider_uuid || item.uuid;
      const res = await socialRequest("post", `/posts/follow/${targetUuid}`, undefined, {
        preferredAuthActor: "viewer",
      });
      const following = !!res?.data?.following;
      setData((prev) =>
        prev.map((user) =>
          (user.provider_uuid || user.uuid) === targetUuid
            ? { ...user, is_following: following, is_followed_by_me: following }
            : user
        )
      );
      await publishRealtimeEvent({
        channel: `profile:${targetUuid}`,
        event: following ? "followed" : "unfollowed",
      });
      if (res?.data?.actor_uuid) {
        await publishRealtimeEvent({
          channel: `profile:${res.data.actor_uuid}`,
          event: following ? "following_added" : "following_removed",
          count: Number(res?.data?.following_count) || 0,
        });
      }
    } catch {
      // Login flow is handled elsewhere in the app.
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const filteredData = data.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return String(item.username || "").toLowerCase().includes(q) ||
      String(item.full_name || "").toLowerCase().includes(q);
  });

  if (!data.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>
          {type === "followers" ? t.noFollowers : t.noFollowing}
        </Text>
        <Text style={styles.emptyText}>
          {type === "followers"
            ? t.noFollowersBody
            : t.noFollowingBody}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={filteredData}
      keyExtractor={(item) => String(item.provider_uuid || item.uuid || item.email)}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <View style={styles.searchWrap}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t.search}
            placeholderTextColor={theme.colors.textMuted}
            style={styles.searchInput}
          />
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptySmall}>
          <Text style={styles.emptyText}>{t.noMatches}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.userRow}
          activeOpacity={0.85}
          onPress={() => {
            const targetUuid = item.provider_uuid || item.uuid;
            if (targetUuid) {
              navigation.navigate("UserProfile", { uuid: targetUuid });
            }
          }}
        >
          <Image source={{ uri: avatarFor(item) }} style={styles.avatar} />
          <View style={styles.userMeta}>
            <Text style={styles.name}>{item.full_name || item.email || "User"}</Text>
            <Text style={styles.username}>
              {item.username ? `@${item.username}` : item.email || "viewer"}
            </Text>
          </View>
          {!!(item.provider_uuid || item.uuid) && !item.is_me && (
            <TouchableOpacity
              style={[styles.followBtn, (item.is_following || item.is_followed_by_me) && styles.followingBtn]}
              onPress={() => toggleFollow(item)}
            >
              <Text style={[styles.followText, (item.is_following || item.is_followed_by_me) && styles.followingText]}>
                {item.is_following || item.is_followed_by_me
                  ? t.followingUser
                  : type === "followers"
                    ? t.followBack
                    : t.follow}
              </Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      )}
    />
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    iconBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    topTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: theme.colors.text,
    },
    tabBar: {
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    indicator: {
      backgroundColor: theme.colors.primary,
      height: 3,
    },
    tabLabel: {
      fontWeight: "800",
      textTransform: "none",
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    listContent: {
      paddingVertical: 8,
      backgroundColor: theme.colors.bg,
    },
    scene: {
      backgroundColor: theme.colors.bg,
    },
    searchWrap: {
      paddingHorizontal: 16,
      paddingBottom: 8,
      backgroundColor: theme.colors.bg,
    },
    searchInput: {
      minHeight: 46,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
      paddingHorizontal: 12,
      fontWeight: "700",
    },
    emptySmall: {
      padding: 24,
      alignItems: "center",
    },
    userRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.surfaceSoft,
    },
    userMeta: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      color: theme.colors.text,
      fontWeight: "800",
      fontSize: 15,
    },
    username: {
      color: theme.colors.textMuted,
      fontSize: 13,
      marginTop: 2,
    },
    followBtn: {
      borderWidth: 1,
      borderColor: theme.colors.primary,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: theme.colors.primary,
    },
    followingBtn: {
      backgroundColor: theme.colors.surface,
    },
    followText: {
      color: theme.colors.onPrimary,
      fontWeight: "800",
      fontSize: 12,
    },
    followingText: {
      color: theme.colors.primary,
    },
    empty: {
      flex: 1,
      padding: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyTitle: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: "800",
    },
    emptyText: {
      color: theme.colors.textMuted,
      marginTop: 8,
      textAlign: "center",
      lineHeight: 20,
    },
  });
