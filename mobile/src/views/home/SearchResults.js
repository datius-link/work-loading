import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../api/api";
import { useAppTheme } from "../../theme";
import AppIcon from "../../icons/AppIcon";
import PostCard from "../postCard/PostCard";
import PostGridItem from "../postCard/PostGridItem";

const TABS = [
  { key: "top", label: "Top" },
  { key: "posts", label: "Posts" },
  { key: "people", label: "People" },
  { key: "hashtags", label: "Hashtags" },
];
const PAGE_SIZE = 20;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const GRID_SIZE = Dimensions.get("window").width / 3;

function avatarFor(user) {
  if (user?.profile_pic) return user.profile_pic;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    user?.full_name || user?.username || "U"
  )}&background=1683C7&color=fff`;
}

function resultItems(tab, data) {
  if (tab === "people") return data.users.map((item) => ({ kind: "user", item }));
  if (tab === "hashtags") return data.hashtags.map((item) => ({ kind: "hashtag", item }));
  if (tab === "posts") return data.posts.map((item) => ({ kind: "post", item }));

  return [
    ...data.users.map((item) => ({ kind: "user", item })),
    ...data.hashtags.map((item) => ({ kind: "hashtag", item })),
    ...data.posts.map((item) => ({ kind: "post", item })),
  ];
}

export default function SearchResults({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const initialQuery = String(route.params?.query || "");
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [tab, setTab] = useState(initialQuery.startsWith("@") ? "people" : initialQuery.startsWith("#") ? "posts" : "top");
  const [data, setData] = useState({ users: [], hashtags: [], posts: [] });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [activePostId, setActivePostId] = useState(null);
  const requestRef = useRef(null);
  const dataRef = useRef(data);
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const visiblePost = viewableItems.find((entry) => entry.item?.kind === "post")?.item?.item;
    setActivePostId(visiblePost?.id || null);
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const fetchResults = useCallback(async ({ append = false } = {}) => {
    const clean = submittedQuery.trim();
    if (!clean.replace(/^[@#]+/, "").trim()) return;

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    append ? setLoadingMore(true) : setLoading(true);

    try {
      const current = dataRef.current;
      const currentCount = append
        ? tab === "people" ? current.users.length : tab === "hashtags" ? current.hashtags.length : current.posts.length
        : 0;
      const response = await api.get("/search", {
        params: { q: clean, type: tab, limit: PAGE_SIZE, offset: currentCount },
        signal: controller.signal,
      });
      const next = {
        users: response?.data?.users || [],
        hashtags: response?.data?.hashtags || [],
        posts: response?.data?.posts || [],
      };
      setData((previous) => append
        ? {
            users: [...previous.users, ...next.users],
            hashtags: [...previous.hashtags, ...next.hashtags],
            posts: [...previous.posts, ...next.posts],
          }
        : next
      );
      setHasMore(!!response?.data?.pagination?.hasMore);
    } catch (error) {
      if (error?.code !== "ERR_CANCELED" && !append) {
        setData({ users: [], hashtags: [], posts: [] });
      }
    } finally {
      if (requestRef.current === controller) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [submittedQuery, tab]);

  useEffect(() => {
    fetchResults();
    return () => requestRef.current?.abort();
  }, [submittedQuery, tab]);

  const submit = () => {
    const clean = query.trim();
    if (!clean.replace(/^[@#]+/, "").trim()) return;
    if (clean.startsWith("@")) setTab("people");
    else if (clean.startsWith("#")) setTab("posts");
    setSubmittedQuery(clean);
  };

  const items = resultItems(tab, data);
  const postHeight = Math.max(520, SCREEN_HEIGHT - insets.top - 154);

  const renderItem = ({ item: row }) => {
    if (row.kind === "user") {
      const user = row.item;
      return (
        <TouchableOpacity
          style={styles.personRow}
          onPress={() => navigation.navigate("UserProfile", {
            providerUuid: user.uuid,
            providerId: user.uuid,
            username: user.username,
          })}
        >
          <Image source={{ uri: avatarFor(user) }} style={styles.avatar} />
          <View style={styles.meta}>
            <Text style={styles.primaryText}>@{user.username || "user"}</Text>
            <Text style={styles.secondaryText}>{user.full_name || "e-kazi user"}</Text>
          </View>
        </TouchableOpacity>
      );
    }

    if (row.kind === "hashtag") {
      const hashtag = row.item;
      return (
        <TouchableOpacity
          style={styles.personRow}
          onPress={() => {
            setQuery(`#${hashtag.name}`);
            setSubmittedQuery(`#${hashtag.name}`);
            setTab("posts");
          }}
        >
          <View style={styles.hashtagIcon}><Text style={styles.hashtagMark}>#</Text></View>
          <View style={styles.meta}>
            <Text style={styles.primaryText}>#{hashtag.name}</Text>
            <Text style={styles.secondaryText}>{Number(hashtag.posts_count) || 0} posts</Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <PostCard
        post={row.item}
        height={postHeight}
        active={activePostId === row.item.id}
        navigation={navigation}
        preferredAuthActor="viewer"
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <AppIcon name="arrowLeft" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.searchBox}>
          <AppIcon name="search" size={17} color={theme.colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submit}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            placeholder="Search e-kazi"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.input}
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery("")}>
              <AppIcon name="close" size={17} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.tabs}>
        {TABS.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.tab, tab === item.key && styles.activeTab]}
            onPress={() => setTab(item.key)}
          >
            <Text style={[styles.tabText, tab === item.key && styles.activeTabText]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <AppIcon name="search" size={30} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>No results for “{submittedQuery}”</Text>
          <Text style={styles.secondaryText}>Try a username, skill, service, or hashtag.</Text>
        </View>
      ) : tab === "posts" ? (
        <FlatList
          key="post-grid"
          data={data.posts}
          numColumns={3}
          renderItem={({ item }) => (
            <PostGridItem
              post={item}
              size={GRID_SIZE}
              onPress={() =>
                navigation.navigate("PostFeedView", {
                  posts: data.posts,
                  initialPostId: item.id,
                  preferredAuthActor: "viewer",
                })
              }
            />
          )}
          keyExtractor={(item, index) => `post-${item.id}-${index}`}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (hasMore && !loadingMore) fetchResults({ append: true });
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footer} color={theme.colors.primary} /> : null}
        />
      ) : (
        <FlatList
          key="mixed-results"
          data={items}
          renderItem={renderItem}
          keyExtractor={(row, index) => `${row.kind}-${row.item.uuid || row.item.name || row.item.id}-${index}`}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (hasMore && !loadingMore) fetchResults({ append: true });
          }}
          onEndReachedThreshold={0.4}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footer} color={theme.colors.primary} /> : null}
        />
      )}
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingBottom: 10,
      backgroundColor: theme.colors.surface,
    },
    back: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
    searchBox: {
      flex: 1,
      minHeight: 42,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    input: { flex: 1, color: theme.colors.text, fontSize: 14, fontWeight: "700" },
    tabs: {
      flexDirection: "row",
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    tab: { flex: 1, alignItems: "center", paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
    activeTab: { borderBottomColor: theme.colors.primary },
    tabText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: "800" },
    activeTabText: { color: theme.colors.primary },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 8 },
    emptyTitle: { color: theme.colors.text, fontSize: 16, fontWeight: "900", textAlign: "center" },
    personRow: {
      minHeight: 70,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.primarySoft },
    hashtagIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    hashtagMark: { color: theme.colors.text, fontSize: 23, fontWeight: "900" },
    meta: { flex: 1, minWidth: 0 },
    primaryText: { color: theme.colors.text, fontSize: 15, fontWeight: "900" },
    secondaryText: { color: theme.colors.textMuted, fontSize: 13, marginTop: 2 },
    footer: { paddingVertical: 20 },
  });
