import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

export default function VideoPlayer({ index, uri, isActive, onRegisterPlayer, contentFit = "cover" }) {
  const videoRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const isMountedRef = useRef(true);

  // Cleanup function
  const cleanup = useCallback(async () => {
    isMountedRef.current = false;
    if (videoRef.current) {
      try {
        // Stop first, then unload
        await videoRef.current.stopAsync();
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
        await videoRef.current.unloadAsync();
        videoRef.current = null;
      } catch (error) {
        console.log('Video cleanup error (non-critical):', error.message);
      }
    }
  }, []);

  // Register/unregister player
  useEffect(() => {
    const player = {
      pause: async () => {
        if (videoRef.current && isMountedRef.current) {
          try {
            await videoRef.current.pauseAsync();
          } catch (error) {
            console.log('Pause error:', error.message);
          }
        }
      },
      play: async () => {
        if (videoRef.current && isMountedRef.current) {
          try {
            await videoRef.current.playAsync();
          } catch (error) {
            console.log('Play error:', error.message);
          }
        }
      },
      cleanup: cleanup
    };

    onRegisterPlayer(index, player);

    return () => {
      cleanup();
    };
  }, [index, onRegisterPlayer, cleanup]);

  // Handle active state changes
  useEffect(() => {
    if (!videoRef.current || !isLoaded || !isMountedRef.current) return;

    const handlePlayback = async () => {
      try {
        if (isActive) {
          await videoRef.current.playAsync();
        } else {
          await videoRef.current.pauseAsync();
        }
      } catch (error) {
        console.log('Playback state change error:', error.message);
      }
    };

    handlePlayback();
  }, [isActive, isLoaded]);

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={{ uri }}
        style={styles.video}
        resizeMode={contentFit === "contain" ? ResizeMode.CONTAIN : ResizeMode.COVER}
        shouldPlay={false}
        isLooping
        isMuted={false}
        onLoad={() => {
          if (isMountedRef.current) {
            setIsLoaded(true);
          }
        }}
        onError={(e) => console.error('Video load error:', e)}
        onPlaybackStatusUpdate={(status) => {
          if (!status.isLoaded) {
            // Video failed to load
            if (isMountedRef.current) {
              setIsLoaded(false);
            }
          }
        }}
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
