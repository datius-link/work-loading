import React, { useRef, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, StatusBar, Platform, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BackButton from "../../icons/svg-repo/back-button.svg";
import PostCard from "../../views/postCard/PostCard";
import { useAppTheme } from "../../theme";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function PostFeedView({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { posts = [], initialPostId } = route.params || {};
  const flatListRef = useRef(null);
  const [activePostId, setActivePostId] = useState(initialPostId || posts[0]?.id);
  const POST_HEIGHT = useMemo(() => {
    const headerHeight = Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 54 : 90;
    return SCREEN_HEIGHT - headerHeight;
  }, []);

  const initialIndex = posts.findIndex((p) => p?.id === initialPostId);
  useEffect(() => {
    if (flatListRef.current && initialIndex >= 0) {
      setTimeout(() => flatListRef.current.scrollToIndex({ index: initialIndex, animated: false }), 150);
    }
  }, [initialIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const firstVisible = viewableItems?.[0]?.item;
    if (firstVisible?.id) setActivePostId(firstVisible.id);
  }).current;

  const renderItem = ({ item }) => item ? <PostCard post={item} height={POST_HEIGHT} active={activePostId === item.id} navigation={navigation} /> : null;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={[styles.header, { paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <BackButton width={22} height={22} />
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
    backButton: { width: 40, height: 40, justifyContent: "center" },
    headerTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "700", marginLeft: 6 },
  });