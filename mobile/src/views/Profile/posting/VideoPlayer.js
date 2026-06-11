import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

export default function VideoPlayer({ index, uri, isActive, onRegisterPlayer, contentFit = "cover" }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    instance.muted = false;
  });

  const pause = useCallback(() => {
    try {
      player.pause();
    } catch (error) {
      console.log('Pause error:', error.message);
    }
  }, [player]);

  const play = useCallback(() => {
    try {
      player.play();
    } catch (error) {
      console.log('Play error:', error.message);
    }
  }, [player]);

  // Register/unregister player
  useEffect(() => {
    onRegisterPlayer(index, { pause, play, cleanup: pause });
    return pause;
  }, [index, onRegisterPlayer, pause, play]);

  // Handle active state changes
  useEffect(() => {
    if (isActive) play();
    else pause();
  }, [isActive, pause, play]);

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit={contentFit === "contain" ? "contain" : "cover"}
        nativeControls={false}
        fullscreenOptions={{ enable: false }}
        onFirstFrameRender={() => setIsLoaded(true)}
      />

      {!isLoaded && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
