import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Keyboard,
} from "react-native";

import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../../api/api";
import { useAppTheme } from "../../theme";

import PostCard from "../../views/postCard/PostCard";

import SearchIcon from "../../icons/svg-repo/search.svg";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function Discover({ navigation }) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");

  const [activePostId, setActivePostId] = useState(null);

  const flatListRef = useRef(null);

  const POST_HEIGHT = useMemo(() => {
    return SCREEN_HEIGHT - tabBarHeight - insets.top - 71;
  }, [tabBarHeight, insets.top]);

const fetchPosts = async (pageNumber = 1, append = false) => {
  try {
    if (append && loadingMore) return;
    if (!append && loading) return;
    if (append && !hasMore) return;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setHasMore(true);
    }

    console.log(`[Discover] Fetching posts - Page: ${pageNumber}, Search: "${search}"`);

    const res = await api.get("/posts/public", {
      params: {
        page: pageNumber,
        q: search?.trim() || undefined,
      },
    });

    const fetchedPosts = res?.data?.posts || [];
    const paginationHasMore = res?.data?.pagination?.hasMore;

    console.log(`[Discover] Received ${fetchedPosts.length} posts (hasMore: ${paginationHasMore})`);

    if (append) {
      setPosts((prev) => {
        const merged = [...prev, ...fetchedPosts];
        const unique = merged.filter(
          (item, index, self) =>
            index === self.findIndex((p) => p.id === item.id)
        );
        return unique;
      });
    } else {
      setPosts(fetchedPosts);

      if (fetchedPosts.length > 0 && !activePostId) {
        setActivePostId(fetchedPosts[0].id);
      }
    }

    setHasMore(paginationHasMore !== false);

    if (!append) {
      setPage(1);
    }

  } catch (error) {
    console.error("Discover fetch error:", error?.response?.data || error?.message);

    if (!append) {
      // Keep previous posts on error to avoid blank flashes
    }
  } finally {
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  }
};

  useEffect(() => {
    fetchPosts(1, false);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchPosts(1, false);
    }, 500);

    return () => clearTimeout(timeout);
  }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts(1, false);
  };

  const handleLoadMore = () => {
    if (loadingMore || loading || !hasMore) return;

    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, true);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems?.length > 0) {
      const firstVisible = viewableItems[0]?.item;

      if (firstVisible?.id) {
        setActivePostId(firstVisible.id);
      }
    }
  }).current;

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 80,
  };

  const renderItem = ({ item }) => {
    if (!item) return null;

    return (
      <PostCard
        post={item}
        height={POST_HEIGHT}
        active={activePostId === item.id}
        navigation={navigation}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <SearchIcon width={18} height={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search posts, people..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
            onBlur={() => Keyboard.dismiss()}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <SearchIcon width={18} height={18} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* FEED */}
      {loading && posts.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#00695C" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={posts}
          renderItem={renderItem}
          keyExtractor={(item, index) =>
            String(item.id)
          }
          pagingEnabled
          snapToAlignment="start"
          decelerationRate="fast"
          snapToInterval={POST_HEIGHT}
          showsVerticalScrollIndicator={false}
          onRefresh={onRefresh}
          refreshing={refreshing}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          removeClippedSubviews
          windowSize={5}
          maxToRenderPerBatch={5}
          initialNumToRender={3}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator color="#00695C" />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
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

