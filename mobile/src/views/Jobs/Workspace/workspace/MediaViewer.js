/**
 * MediaViewer.js — full-screen photo/video viewer for chat media.
 * Opened by tapping any media tile inside a chat bubble. Supports:
 *  - swipe left/right between all media in the same message
 *  - pinch-to-zoom + drag-to-pan on photos (double-tap to reset/zoom)
 *  - video playback with native controls, no zoom (not meaningful for video)
 *
 * Always renders on a black backdrop regardless of app theme — this matches
 * how most apps (WhatsApp, Instagram, etc.) present a media lightbox, and
 * keeps photos/videos as the only source of color on screen.
 */
import React, { useMemo, useState } from "react";
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useVideoPlayer, VideoView } from "expo-video";
import AppIcon from "../../../../icons/AppIcon";

function mediaUrl(item) {
  return item?.url || item?.uri || item?.thumbnail || item?.poster || null;
}

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

function ZoomableImage({ uri, pageWidth, pageHeight, onZoomChange }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const [zoomed, setZoomed] = useState(false);

  // Keep the JS-side `zoomed` flag (used to enable/disable the pan gesture,
  // and to tell the parent FlatList whether to disable its own swipe) in
  // sync with the gesture-thread scale value. Called via runOnJS since
  // gesture callbacks run as worklets on the UI thread.
  const handleZoomChange = (isZoomed) => {
    setZoomed(isZoomed);
    onZoomChange(isZoomed);
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      const next = savedScale.value * e.scale;
      scale.value = next < 1 ? 1 : next > MAX_SCALE ? MAX_SCALE : next;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      const isZoomed = scale.value > 1.02;
      if (!isZoomed) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
      runOnJS(handleZoomChange)(isZoomed);
    });

  const panGesture = Gesture.Pan()
    .enabled(zoomed)
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const isZoomedNow = scale.value > 1.02;
      if (isZoomedNow) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(handleZoomChange)(false);
      } else {
        scale.value = withTiming(DOUBLE_TAP_SCALE);
        savedScale.value = DOUBLE_TAP_SCALE;
        runOnJS(handleZoomChange)(true);
      }
    });

  const composedGesture = Gesture.Exclusive(doubleTapGesture, Gesture.Simultaneous(pinchGesture, panGesture));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={{ width: pageWidth, height: pageHeight, alignItems: "center", justifyContent: "center" }}>
      <GestureDetector gesture={composedGesture}>
        <Animated.Image
          source={{ uri }}
          resizeMode="contain"
          style={[{ width: pageWidth, height: pageHeight }, animatedStyle]}
        />
      </GestureDetector>
    </View>
  );
}

function VideoPage({ uri, pageWidth, pageHeight }) {
  const player = useVideoPlayer(uri, (instance) => {
    if (instance) instance.muted = false;
  });
  return (
    <View style={{ width: pageWidth, height: pageHeight, alignItems: "center", justifyContent: "center" }}>
      <VideoView player={player} style={{ width: pageWidth, height: pageHeight * 0.6 }} contentFit="contain" nativeControls />
    </View>
  );
}

export default function MediaViewer({ visible, media, initialIndex = 0, onClose }) {
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);
  const [zoomLocked, setZoomLocked] = useState(false);
  const items = useMemo(() => (Array.isArray(media) ? media.filter((m) => mediaUrl(m)) : []), [media]);

  if (!visible || !items.length) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <AppIcon name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          {items.length > 1 ? (
            <Text style={styles.counter}>{index + 1} / {items.length}</Text>
          ) : null}
          <View style={styles.closeBtn} />
        </View>

        <FlatList
          data={items}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomLocked}
          initialScrollIndex={initialIndex}
          keyExtractor={(item, i) => String(mediaUrl(item) || i)}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const next = Math.round(e.nativeEvent.contentOffset.x / width);
            if (next !== index) setIndex(next);
          }}
          renderItem={({ item }) =>
            item.type === "video" ? (
              <VideoPage uri={mediaUrl(item)} pageWidth={width} pageHeight={height} />
            ) : (
              <ZoomableImage uri={mediaUrl(item)} pageWidth={width} pageHeight={height} onZoomChange={setZoomLocked} />
            )
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#000000" },
  topBar: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 5,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingTop: 50, paddingBottom: 10,
  },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  counter: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});
