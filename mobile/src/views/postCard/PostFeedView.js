import React, { useRef, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, StatusBar, Platform, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppIcon from "../../icons/AppIcon";
import PostCard from "../../views/postCard/PostCard";
import { useAppTheme } from "../../theme";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function PostFeedView({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { theme, mode } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { posts = [], initialPostId, preferredAuthActor = "viewer" } = route.params || {};
  const flatListRef = useRef(null);
  const [activePostId, setActivePostId] = useState(initialPostId || posts[0]?.id);
  const POST_HEIGHT = useMemo(() => {
    const headerHeight = Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 54 : 90;
    return SCREEN_HEIGHT - headerHeight;
  }, []);

  const initialIndex = posts.findIndex((p) => p?.id === initialPostId);
  useEffect(() => {
    if (flatListRef.current && initialIndex >= 0) {
      const timer = setTimeout(() => flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false }), 150);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [initialIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const firstVisible = viewableItems?.[0]?.item;
    if (firstVisible?.id) setActivePostId(firstVisible.id);
  }).current;

  const renderItem = ({ item }) => item ? (
    <PostCard
      post={item}
      height={POST_HEIGHT}
      active={activePostId === item.id}
      navigation={navigation}
      showHireButton={false}
      showFollowButton={false}
      preferredAuthActor={preferredAuthActor}
    />
  ) : null;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle={mode === "dark" ? "light-content" : "dark-content"} />
      <View style={[styles.header, { paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <AppIcon name="arrowLeft" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Media</Text>
      </View>
      <FlatList
        ref={flatListRef}
        data={posts}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={3}
        maxToRenderPerBatch={5}
        windowSize={7}
        pagingEnabled
        snapToAlignment="start"
        decelerationRate="fast"
        snapToInterval={POST_HEIGHT}
        viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
        onViewableItemsChanged={onViewableItemsChanged}
        getItemLayout={(_, index) => ({ length: POST_HEIGHT, offset: POST_HEIGHT * index, index })}
      />
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.bg },
    header: {
      height: Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 54 : 90,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surface,
    },
    backButton: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
    headerTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "700", marginLeft: 6 },
  });
