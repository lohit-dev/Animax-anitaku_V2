import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft } from 'iconsax-react-native';
import { useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Video from 'react-native-video';

import { useHistoryStore } from '~/app/_store/useHistoryStore';
import { usePlayerStore } from '~/app/_store/usePlayerStore';
import PlayerOverlay from '~/components/watch/PlayerOverlay';
import SettingsSheet from '~/components/watch/SettingsSheet';
import { PLAYER_COLORS as COLORS } from '~/constants/Colors';
import { usePlayerControls } from '~/hooks/usePlayerControls';
import { useVideoPlayer } from '~/hooks/useVideoPlayer';

const WatchScreen = () => {
  const router = useRouter();
  const { episodeId, animeId, type, animeTitle, animeImage } = useLocalSearchParams<{
    episodeId: string;
    animeId: string;
    type: 'sub' | 'dub';
    animeTitle: string;
    animeImage: string;
  }>();

  // Reset store on mount, clean up on unmount
  useEffect(() => {
    usePlayerStore.getState().reset();
    return () => usePlayerStore.getState().reset();
  }, []);

  // -----------------------------------------------------------------------
  // Hooks
  // -----------------------------------------------------------------------

  const {
    videoRef,
    isLoading,
    queryError,
    videoSource,
    videoSourceObj,
    selectedVideoTrack,
    resizeMode,
    servers,
    activeServerIndex,
    validSubtitleTracks,
    isSubtitleReady,
    handleProgress,
    handleLoad,
    handleError,
    handleBuffer,
    handleVideoTracks,
    handleEnd,
    seekTo,
  } = useVideoPlayer(animeId, episodeId, type);

  const {
    controlsAnim,
    sheetAnim,
    playerWidthRef,
    seekPanResponder,
    triggerFlash,
    handleCycleResizeMode,
    handleVideoTap,
  } = usePlayerControls(seekTo);

  // -----------------------------------------------------------------------
  // Zustand selectors (only what the screen itself needs)
  // -----------------------------------------------------------------------

  const isFullscreen = usePlayerStore((s) => s.isFullscreen);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const subtitleCues = usePlayerStore((s) => s.subtitleCues);
  const selectedSubtitleIndex = usePlayerStore((s) => s.selectedSubtitleIndex);
  const setShowControls = usePlayerStore((s) => s.setShowControls);
  const setIsModalVisible = usePlayerStore((s) => s.setIsModalVisible);
  const selectServer = usePlayerStore((s) => s.selectServer);

  // -----------------------------------------------------------------------
  // Active subtitle cues (filtered by current time)
  // -----------------------------------------------------------------------

  const activeSubtitleCues = useMemo(
    () => subtitleCues.filter((cue) => currentTime >= cue.startTime && currentTime <= cue.endTime),
    [currentTime, subtitleCues]
  );

  // -----------------------------------------------------------------------
  // Progress Tracking (History)
  // -----------------------------------------------------------------------

  const saveProgress = useHistoryStore((s) => s.saveProgress);

  // Throttle saving progress to every 5 seconds to avoid spamming AsyncStorage
  useEffect(() => {
    if (currentTime > 0 && Math.floor(currentTime) % 5 === 0) {
      saveProgress({
        animeId,
        animeTitle:
          animeTitle || animeId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        animeImage: animeImage || '',
        episodeId,
        episodeNumber: episodeId,
        progress: currentTime,
        duration: usePlayerStore.getState().duration || 0,
      });
    }
  }, [Math.floor(currentTime)]);

  // -----------------------------------------------------------------------
  // Server selection handler
  // -----------------------------------------------------------------------

  const handleSelectServer = useCallback(
    (index: number) => {
      selectServer(index);
    },
    [selectServer]
  );

  // -----------------------------------------------------------------------
  // Loading / error state
  // -----------------------------------------------------------------------

  if (isLoading || !videoSource) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: COLORS.bg }}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={{ color: COLORS.textMuted, marginTop: 16 }}>
          {isLoading ? 'Loading video source…' : 'No video source available'}
        </Text>
        {queryError && (
          <Text style={{ color: COLORS.danger, marginTop: 8 }}>Error: {String(queryError)}</Text>
        )}
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <View className="flex-1" style={{ backgroundColor: COLORS.bg }}>
      <StatusBar hidden={isFullscreen} style="light" />
      <Stack.Screen
        options={{
          headerShown: !isFullscreen,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="p-2">
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),
          headerStyle: { backgroundColor: COLORS.surface },
          headerTitleStyle: { color: COLORS.text },
          headerTitle: `Episode ${episodeId}`,
        }}
      />

      {/* Player container — resizes between inline and fullscreen without
          remounting the <Video>, so toggling never reloads the stream. */}
      <View
        style={[
          { backgroundColor: COLORS.bg, overflow: 'hidden' },
          isFullscreen
            ? [StyleSheet.absoluteFill, { zIndex: 1000 }]
            : { height: 256, width: '100%' },
        ]}
        onLayout={(e) => {
          playerWidthRef.current = e.nativeEvent.layout.width;
        }}>
        <Video
          key={videoSource}
          ref={videoRef}
          controls={false}
          source={videoSourceObj}
          style={{ width: '100%', height: '100%' }}
          paused={!isPlaying}
          muted={isMuted}
          rate={1.0}
          onProgress={handleProgress}
          onEnd={handleEnd}
          onError={handleError}
          onBuffer={handleBuffer}
          onLoad={handleLoad}
          onVideoTracks={handleVideoTracks}
          selectedVideoTrack={selectedVideoTrack}
          resizeMode={resizeMode.key}
          ignoreSilentSwitch="ignore"
        />

        {/* Tap target for single/double tap */}
        <Pressable className="absolute inset-0" onPress={handleVideoTap} />

        {/* Controls overlay */}
        <PlayerOverlay
          episodeId={episodeId}
          animeTitle={animeId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          controlsAnim={controlsAnim}
          seekPanResponder={seekPanResponder}
          activeSubtitleCues={activeSubtitleCues}
          validSubtitleTracks={validSubtitleTracks}
          isSubtitleReady={isSubtitleReady}
          onTap={handleVideoTap}
          onCycleResizeMode={handleCycleResizeMode}
          onSeekBackward={() => {
            seekTo(currentTime - 10);
            triggerFlash({ kind: 'seek-left', label: '10s' });
          }}
          onSeekForward={() => {
            seekTo(currentTime + 10);
            triggerFlash({ kind: 'seek-right', label: '10s' });
          }}
          onShowSettings={() => {
            setIsModalVisible(true);
            setShowControls(true);
          }}
        />
      </View>

      {/* Settings sheet (servers / subtitles / quality) */}
      <SettingsSheet
        sheetAnim={sheetAnim}
        servers={servers}
        activeServerIndex={activeServerIndex}
        validSubtitleTracks={validSubtitleTracks}
        onSelectServer={handleSelectServer}
      />
    </View>
  );
};

export default WatchScreen;
