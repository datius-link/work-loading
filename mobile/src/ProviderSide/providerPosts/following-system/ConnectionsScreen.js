import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, viewerRequest } from "../../../api/api";
import AppIcon from "../../../icons/AppIcon";
import { useAppTheme } from "../../../theme";

const Tab = createMaterialTopTabNavigator();

function avatarFor(user) {
  if (user?.profile_pic || user?.profilePic) return user.profile_pic || user.profilePic;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    user?.full_name || user?.username || user?.email || "User"
  )}&background=0B6B63&color=fff`;
}

export default function ConnectionsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const providerUuid = route?.params?.providerUuid || route?.params?.providerId || "me";

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("ProviderTabs"))}
        >
          <AppIcon name="arrowLeft" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Connections</Text>
        <View style={styles.iconBtn} />
      </View>

      <Tab.Navigator
        screenOptions={{
          tabBarStyle: styles.tabBar,
          tabBarIndicatorStyle: styles.indicator,
          tabBarLabelStyle: styles.tabLabel,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textMuted,
        }}
      >
        <Tab.Screen name="Followers">
          {() => (
            <ConnectionsList
              type="followers"
              providerUuid={providerUuid}
              navigation={navigation}
              styles={styles}
              theme={theme}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Following">
          {() => (
            <ConnectionsList
              type="following"
              providerUuid={providerUuid}
              navigation={navigation}
              styles={styles}
              theme={theme}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </View>
  );
}

function ConnectionsList({ type, providerUuid, navigation, styles, theme }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const endpoint =
        providerUuid === "me"
          ? `/service-provider/me/connections?type=${type}`
          : `/service-provider/${providerUuid}/connections?type=${type}`;
      const res = await api.get(endpoint);
      setData(res?.data?.users || []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [providerUuid, type]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFollow = async (item) => {
    if (!item?.provider_uuid) return;
    try {
      const res = await viewerRequest("post", `/posts/follow/${item.provider_uuid}`);
      const following = !!res?.data?.following;
      setData((prev) =>
        prev.map((user) =>
          user.provider_uuid === item.provider_uuid ? { ...user, is_following: following } : user
        )
      );
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

  if (!data.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>
          {type === "followers" ? "No followers yet" : "Not following anyone yet"}
        </Text>
        <Text style={styles.emptyText}>
          {type === "followers"
            ? "People who follow this profile will appear here."
            : "Profiles followed from this account will appear here."}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => String(item.provider_uuid || item.uuid || item.email)}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.userRow}
          activeOpacity={0.85}
          onPress={() => {
            if (item.provider_uuid) {
              navigation.navigate("ProviderProfile", { providerId: item.provider_uuid });
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
          {!!item.provider_uuid && (
            <TouchableOpacity
              style={[styles.followBtn, item.is_following && styles.followingBtn]}
              onPress={() => toggleFollow(item)}
            >
              <Text style={[styles.followText, item.is_following && styles.followingText]}>
                {item.is_following ? "Following" : "Follow back"}
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
