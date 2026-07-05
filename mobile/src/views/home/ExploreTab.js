import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from "react-native";

import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, getViewerAuthHeaders } from "../../api/api";
import { useAppTheme } from "../../theme";

import PostCard from "../postCard/PostCard";
import { cachedGet } from "../../utils/offlineCache";
import CachedDataNotice from "../../components/CachedDataNotice";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

function shufflePosts(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function ExploreTab({ navigation, searchQuery = "" }) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [showingCached, setShowingCached] = useState(false);

  const search = searchQuery;

  const [activePostId, setActivePostId] = useState(null);
  const [layoutHeight, setLayoutHeight] = useState(0);

  const flatListRef = useRef(null);
  const didRunInitialSearch = useRef(false);

  const POST_HEIGHT = useMemo(() => {
    if (layoutHeight > 0) return layoutHeight;
    return SCREEN_HEIGHT - tabBarHeight - insets.top - 71;
  }, [layoutHeight, tabBarHeight, insets.top]);

  const fetchPosts = async (pageNumber = 1, append = false, options = {}) => {
    try {
      if (append && loadingMore) return;
      if (!append && loading) return;
      if (append && !hasMore && !options.cycle) return;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setHasMore(true);
      }

      console.log(`[Explore] Fetching posts - Page: ${pageNumber}, Search: "${search}"`);

      const viewerHeaders = await getViewerAuthHeaders();
      const fetcher = () => api.get("/posts/public", {
        params: { page: pageNumber, q: search?.trim() || undefined },
        headers: viewerHeaders || undefined,
      }).then((response) => response.data);
      const result = !append && pageNumber === 1
        ? await cachedGet(`posts:explore:${search?.trim().toLowerCase() || "all"}`, fetcher)
        : { data: await fetcher(), fromCache: false };
      const res = { data: result.data };
      if (!append) setShowingCached(result.fromCache);

      const fetchedPosts = search?.trim()
        ? res?.data?.posts || []
        : shufflePosts(res?.data?.posts || []);
      const paginationHasMore = res?.data?.pagination?.hasMore;

      console.log(`[Explore] Received ${fetchedPosts.length} posts (hasMore: ${paginationHasMore})`);

      if (append) {
        setPosts((prev) => {
          const merged = [...prev, ...fetchedPosts];
          if (options.cycle) return merged;
          const unique = merged.filter(
            (item, index, self) =>
              index === self.findIndex((p) => p.id === item.id)
          );
          return unique;
        });
      } else {
        setPosts(fetchedPosts);

        if (fetchedPosts.length > 0) {
          setActivePostId(fetchedPosts[0].id);
        }
      }

      setHasMore(options.cycle ? true : paginationHasMore !== false);

      if (!append) {
        setPage(1);
      }
    } catch (error) {
      console.error("Explore fetch error:", error?.response?.data || error?.message);

      if (!append) {
        // Keep previous posts on error to avoid blank flashes
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchPosts(1, false);
  }, []);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!didRunInitialSearch.current) {
        didRunInitialSearch.current = true;
        return;
      }
      fetchPosts(1, false);
    }, 500);

    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (!isFocused) setActivePostId(null);
  }, [isFocused]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts(1, false);
  };

  const handleLoadMore = () => {
    if (loadingMore || loading) return;

    if (!hasMore && !search?.trim()) {
      setPage(1);
      fetchPosts(1, true, { cycle: true });
      return;
    }

    if (!hasMore) return;

    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, true);
  };

  const updatePostState = useCallback((postId, patch) => {
    setPosts((prev) =>
      prev.map((item) => (item.id === postId ? { ...item, ...patch } : item))
    );
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems?.length > 0) {
      const firstVisible = viewableItems[0]?.item;

      if (firstVisible?.id) {
        setActivePostId((prev) => (prev === firstVisible.id ? prev : firstVisible.id));
      }
    }
  }).current;

  const viewabilityConfig = useMemo(() => ({
    itemVisiblePercentThreshold: 80,
  }), []);

  const keyExtractor = useCallback((item) => String(item.id), []);

  const renderItem = useCallback(({ item }) => {
    return (
      <PostCard
        post={item}
        height={POST_HEIGHT}
        active={isFocused && activePostId === item.id}
        navigation={navigation}
        preferredAuthActor="viewer"
        onPostStateChange={updatePostState}
      />
    );
  }, [POST_HEIGHT, activePostId, isFocused, navigation, updatePostState]);

  const listFooter = useMemo(() => (
    loadingMore ? (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    ) : null
  ), [loadingMore, theme.colors.primary]);

  const handleLayout = useCallback((event) => {
    const nextHeight = event.nativeEvent.layout.height;
    setLayoutHeight((prev) => (Math.abs(prev - nextHeight) < 1 ? prev : nextHeight));
  }, []);

  return (
    <View
      style={styles.container}
      onLayout={handleLayout}
    >
      <CachedDataNotice visible={showingCached} />
      {/* FEED */}
      {loading && posts.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={posts}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          pagingEnabled
          snapToAlignment="start"
          decelerationRate="fast"
          snapToInterval={POST_HEIGHT}
          getItemLayout={(_, index) => ({
            length: POST_HEIGHT,
            offset: POST_HEIGHT * index,
            index,
          })}
          showsVerticalScrollIndicator={false}
          onRefresh={onRefresh}
          refreshing={refreshing}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          removeClippedSubviews
          windowSize={3}
          maxToRenderPerBatch={2}
          initialNumToRender={2}
          updateCellsBatchingPeriod={80}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          ListFooterComponent={listFooter}
        />
      )}
    </View>
  );
}


const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },

    searchWrapper: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },

    searchBar: {
      height: 50,
      backgroundColor: theme.colors.surfaceSoft,
      borderRadius: 18,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    searchInput: {
      flex: 1,
      fontSize: 15,
      color: theme.colors.text,
      fontWeight: "500",
    },

    loader: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
  });
