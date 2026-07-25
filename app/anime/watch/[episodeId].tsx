import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { File, Paths } from 'expo-file-system';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { ArrowLeft } from 'iconsax-react-native';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
  BackHandler,
  ScrollView,
} from 'react-native';
import Video from 'react-native-video';

import { fetchAnimeStreamingLink } from '~/services/AnimeService';
import { AnikotoStreamResponse } from '~/types';

interface SubtitleTrack {
  uri: string;
  title: string;
  isDefault: boolean;
}

interface SubtitleCue {
  startTime: number;
  endTime: number;
  text: string;
  placement: 'top' | 'bottom';
}

const parseVttTimestamp = (timestamp: string) => {
  const values = timestamp.trim().replace(',', '.').split(':').map(Number);
  if (values.some(Number.isNaN)) return null;

  if (values.length === 3) {
    return values[0] * 60 * 60 + values[1] * 60 + values[2];
  }

  return values.length === 2 ? values[0] * 60 + values[1] : null;
};

const getCuePlacement = (settings: string, text: string): SubtitleCue['placement'] => {
  const alignment = text.match(/\{\\an([1-9])\}/)?.[1];
  if (alignment && ['7', '8', '9'].includes(alignment)) return 'top';

  const line = settings.match(/line:([\d.]+)%?/i)?.[1];
  if (line && Number(line) <= 35) return 'top';

  return 'bottom';
};

const parseVttCues = (content: string): SubtitleCue[] =>
  content
    .replace(/^\uFEFF?WEBVTT[^\n]*\n?/i, '')
    .split(/\r?\n\s*\r?\n/)
    .flatMap((block) => {
      const lines = block.split(/\r?\n/).filter(Boolean);
      const timingLineIndex = lines.findIndex((line) => line.includes('-->'));
      if (timingLineIndex === -1) return [];

      const [start, endWithSettings] = lines[timingLineIndex].split('-->');
      const startTime = parseVttTimestamp(start);
      // The value after `-->` starts with a space in standard VTT files.
      // Trim it before taking the timestamp, otherwise every end time is empty.
      const [endTimestamp, ...settings] = endWithSettings.trim().split(/\s+/);
      const endTime = parseVttTimestamp(endTimestamp);
      const rawText = lines.slice(timingLineIndex + 1).join('\n');
      const text = rawText.replace(/<[^>]*>|\{\\an[1-9]\}/g, '').trim();

      return startTime !== null && endTime !== null && text
        ? [{ startTime, endTime, text, placement: getCuePlacement(settings.join(' '), rawText) }]
        : [];
    });

const subtitleDownloadCache = new Map<string, Promise<string>>();

const hashSubtitleUrl = (url: string) => {
  let hash = 0;
  for (let index = 0; index < url.length; index += 1) {
    hash = (hash * 31 + url.charCodeAt(index)) | 0;
  }
  return (hash >>> 0).toString(36);
};

const loadSubtitleVtt = (url: string, referer: string) => {
  const cacheKey = `${url}|${referer}`;
  const existingRequest = subtitleDownloadCache.get(cacheKey);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    const subtitleFile = new File(Paths.cache, `subtitle-${hashSubtitleUrl(url)}.vtt`);

    if (subtitleFile.exists) {
      const cachedContent = await subtitleFile.text();
      if (cachedContent.includes('-->')) {
        return cachedContent;
      }
    }

    const downloadedFile = await File.downloadFileAsync(url, subtitleFile, {
      headers: { Referer: referer },
      idempotent: true,
    });
    return downloadedFile.text();
  })();

  subtitleDownloadCache.set(cacheKey, request);
  request.catch(() => subtitleDownloadCache.delete(cacheKey));
  return request;
};

const getPreferredSubtitleIndex = (tracks: SubtitleTrack[]) => {
  const englishIndex = tracks.findIndex((track) => track.title.toLowerCase().includes('english'));
  if (englishIndex !== -1) return englishIndex;

  const defaultIndex = tracks.findIndex((track) => track.isDefault);
  return defaultIndex !== -1 ? defaultIndex : tracks.length > 0 ? 0 : null;
};

const WatchScreen = () => {
  const router = useRouter();
  const { episodeId, animeId, type } = useLocalSearchParams<{
    episodeId: string;
    animeId: string;
    type: 'sub' | 'dub';
  }>();

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'servers' | 'subtitles'>('servers');
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number | null>(null);
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const [subtitleStatus, setSubtitleStatus] = useState('Preparing subtitles…');
  const [readySubtitleKey, setReadySubtitleKey] = useState<string | null>(null);
  const [selectedServerIndex, setSelectedServerIndex] = useState<number | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pendingSeek, setPendingSeek] = useState<number | null>(null);
  const [resumeAfterTransition, setResumeAfterTransition] = useState(false);
  const [seekBarWidth, setSeekBarWidth] = useState(0);
  const videoRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    data: streamingData,
    isLoading,
    error: queryError,
  } = useQuery<AnikotoStreamResponse>({
    queryKey: ['streaming', animeId, episodeId, type],
    queryFn: () => fetchAnimeStreamingLink(animeId, episodeId),
    enabled: !!animeId && !!episodeId,
    staleTime: 0,
  });

  const servers = streamingData?.data?.servers || [];
  const primaryServer =
    selectedServerIndex !== null && servers[selectedServerIndex]
      ? servers[selectedServerIndex]
      : servers.find((s) => s.type === type && s.m3u8Url) ||
        servers.find((s) => s.type === type) ||
        servers[0];

  const activeServerIndex =
    selectedServerIndex !== null ? selectedServerIndex : servers.indexOf(primaryServer);

  const videoSource = primaryServer?.m3u8Url;
  const referer = primaryServer?.referer;

  // Filter out thumbnail tracks, keep only real captions, and map to a
  // shape that matches the actual API response (file/label/kind/default).
  const validSubtitleTracks: SubtitleTrack[] = useMemo(() => {
    const raw = primaryServer?.subtitles || [];
    return raw
      .filter((track: any) => track.kind !== 'thumbnails' && (track.file || track.url))
      .map((track: any) => ({
        uri: track.file || track.url,
        title: track.label || 'Unknown',
        isDefault: !!track.default,
      }));
  }, [primaryServer]);

  // Pick English first, fallback to API default, then the first available track.
  // A subtitle selection belongs to its server, so reset it whenever the server changes.
  useEffect(() => {
    const index = getPreferredSubtitleIndex(validSubtitleTracks);
    setSelectedSubtitleIndex(index);
    setSubtitleCues([]);
    setReadySubtitleKey(null);
    setCurrentTime(0);
    setDuration(0);
    setIsBuffering(true);
    setSubtitleStatus(index === null ? 'No subtitles available' : 'Preparing subtitles…');
  }, [activeServerIndex, validSubtitleTracks]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.back();
        return true;
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => {
        backHandler.remove();
      };
    }, [router])
  );

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const selectedSubtitleUri =
    selectedSubtitleIndex !== null ? validSubtitleTracks[selectedSubtitleIndex]?.uri : undefined;
  const subtitleKey = `${activeServerIndex}:${selectedSubtitleIndex ?? 'none'}:${selectedSubtitleUri ?? ''}`;
  const isSubtitleReady = readySubtitleKey === subtitleKey;

  const videoSourceObj = useMemo(
    () => ({
      uri: videoSource ?? undefined,
      headers: referer ? { Referer: referer } : undefined,
    }),
    [referer, videoSource]
  );

  useEffect(() => {
    if (!selectedSubtitleUri || !referer) {
      setSubtitleCues([]);
      setSubtitleStatus(
        selectedSubtitleUri ? 'Subtitle source is unavailable' : 'Subtitles disabled'
      );
      setReadySubtitleKey(subtitleKey);
      return;
    }

    let isMounted = true;
    const downloadSubtitle = async () => {
      try {
        setSubtitleStatus('Downloading subtitles…');
        // Sidecar tracks do not have a headers option in react-native-video.
        // Download the VTT with the required Referer, then parse the local copy.
        const content = await loadSubtitleVtt(selectedSubtitleUri, referer);
        const cues = parseVttCues(content);
        if (isMounted) {
          setSubtitleCues(cues);
          setSubtitleStatus(
            cues.length > 0 ? 'Subtitles ready' : 'Subtitle file has no usable cues'
          );
          setReadySubtitleKey(subtitleKey);
          console.log('[subtitles] loaded', {
            bytes: content.length,
            cueCount: cues.length,
          });
        }
      } catch (error) {
        console.error('[subtitles] download failed', error);
        if (isMounted) {
          setSubtitleCues([]);
          setSubtitleStatus(
            `Could not download subtitles: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    };

    downloadSubtitle();
    return () => {
      isMounted = false;
    };
  }, [referer, selectedSubtitleUri, subtitleKey]);

  const activeSubtitleCues = useMemo(
    () => subtitleCues.filter((cue) => currentTime >= cue.startTime && currentTime <= cue.endTime),
    [currentTime, subtitleCues]
  );

  const showPlayerControls = useCallback(() => {
    setShowControls(true);
  }, []);

  useEffect(() => {
    if (!showControls || !isPlaying) return;

    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3200);
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, showControls]);

  const seekTo = useCallback(
    (time: number) => {
      const target = Math.max(0, Math.min(duration || 0, time));
      videoRef.current?.seek(target);
      setCurrentTime(target);
      showPlayerControls();
    },
    [duration, showPlayerControls]
  );

  const changeFullscreen = useCallback(
    (nextFullscreen: boolean) => {
      setResumeAfterTransition(isPlaying);
      setPendingSeek(currentTime);
      setIsPlaying(false);
      setIsBuffering(true);
      setShowControls(true);
      setIsFullscreen(nextFullscreen);
    },
    [currentTime, isPlaying]
  );

  const handleProgress = useCallback((data: any) => {
    setCurrentTime(data.currentTime);
  }, []);

  const handleLoad = useCallback(
    (data: any) => {
      setDuration(data.duration);

      if (pendingSeek !== null) {
        const target = pendingSeek;
        requestAnimationFrame(() => {
          videoRef.current?.seek(target);
          setCurrentTime(target);
          setPendingSeek(null);
          setIsPlaying(resumeAfterTransition);
          setIsBuffering(false);
        });
        return;
      }

      setIsBuffering(false);
    },
    [pendingSeek, resumeAfterTransition]
  );

  const handleError = useCallback((error: any) => {
    console.log('Video Player onError:', error);
    setIsBuffering(false);
  }, []);

  const handleBuffer = useCallback((data: any) => {
    setIsBuffering(data.isBuffering);
  }, []);

  const seekFromBar = useCallback(
    (event: any) => {
      if (!duration || !seekBarWidth) return;
      seekTo((event.nativeEvent.locationX / seekBarWidth) * duration);
    },
    [duration, seekBarWidth, seekTo]
  );

  const renderPlayerSurface = (fullscreen: boolean) => {
    const topCues = activeSubtitleCues.filter((cue) => cue.placement === 'top');
    const bottomCues = activeSubtitleCues.filter((cue) => cue.placement === 'bottom');
    const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
    const bottomCaptionOffset = showControls ? (fullscreen ? 108 : 78) : 22;
    const topCaptionOffset = showControls ? (fullscreen ? 64 : 44) : 14;

    return (
      <View
        className="relative w-full overflow-hidden bg-black"
        style={fullscreen ? { flex: 1 } : { height: 256 }}>
        <Video
          key={`server-${activeServerIndex}-${fullscreen ? 'fullscreen' : 'inline'}`}
          ref={videoRef}
          controls={false}
          source={videoSourceObj}
          style={{ width: '100%', height: '100%' }}
          paused={!isPlaying}
          muted={isMuted}
          rate={1.0}
          onProgress={handleProgress}
          onEnd={() => {
            setIsPlaying(false);
            setShowControls(true);
          }}
          onError={handleError}
          onBuffer={handleBuffer}
          onLoad={handleLoad}
          resizeMode="contain"
          ignoreSilentSwitch="ignore"
        />

        <Pressable
          className="absolute inset-0"
          onPress={() => setShowControls((visible) => !visible)}
        />

        {topCues.map((cue, index) => (
          <View
            key={`top-${cue.startTime}-${index}`}
            pointerEvents="none"
            className="absolute left-3 right-3 items-center"
            style={{ top: topCaptionOffset + index * 64 }}>
            <Text className="rounded bg-black/80 px-3 py-1.5 text-center text-lg font-bold text-white">
              {cue.text}
            </Text>
          </View>
        ))}

        {bottomCues.map((cue, index) => (
          <View
            key={`bottom-${cue.startTime}-${index}`}
            pointerEvents="none"
            className="absolute left-3 right-3 items-center"
            style={{ bottom: bottomCaptionOffset + index * 64 }}>
            <Text className="rounded bg-black/80 px-3 py-1.5 text-center text-lg font-bold text-white">
              {cue.text}
            </Text>
          </View>
        ))}

        {showControls && (
          <View pointerEvents="box-none" className="absolute inset-0">
            <View className="absolute left-0 right-0 top-0 flex-row items-center justify-between bg-black/65 px-4 pb-7 pt-4">
              <View>
                <Text className="text-sm font-semibold text-white">Episode {episodeId}</Text>
                <Text className="mt-0.5 text-xs text-neutral-300">
                  {selectedSubtitleIndex === null
                    ? 'Subtitles off'
                    : validSubtitleTracks[selectedSubtitleIndex]?.title || 'Subtitles'}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
                  onPress={() => setIsMuted((muted) => !muted)}>
                  <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={21} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
                  onPress={() => {
                    setIsModalVisible(true);
                    showPlayerControls();
                  }}>
                  <Ionicons name="settings-outline" size={21} color="#fff" />
                </TouchableOpacity>
                {fullscreen && (
                  <TouchableOpacity
                    className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
                    onPress={() => changeFullscreen(false)}>
                    <Ionicons name="contract" size={21} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex-row items-center justify-center gap-7">
              <TouchableOpacity
                className="h-12 w-12 items-center justify-center rounded-full bg-black/55"
                onPress={() => seekTo(currentTime - 10)}>
                <Ionicons name="play-back" size={23} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                className="h-16 w-16 items-center justify-center rounded-full bg-lime-500"
                onPress={() => setIsPlaying((playing) => !playing)}>
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={31} color="#101010" />
              </TouchableOpacity>
              <TouchableOpacity
                className="h-12 w-12 items-center justify-center rounded-full bg-black/55"
                onPress={() => seekTo(currentTime + 10)}>
                <Ionicons name="play-forward" size={23} color="#fff" />
              </TouchableOpacity>
            </View>

            <View className="absolute bottom-0 left-0 right-0 bg-black/75 px-4 pb-4 pt-5">
              <Pressable
                className="h-5 justify-center"
                onLayout={(event) => setSeekBarWidth(event.nativeEvent.layout.width)}
                onPress={seekFromBar}>
                <View className="h-1.5 overflow-hidden rounded-full bg-white/25">
                  <View
                    className="h-full rounded-full bg-lime-400"
                    style={{ width: `${progress}%` }}
                  />
                </View>
              </Pressable>
              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-xs font-medium text-white">{formatTime(currentTime)}</Text>
                <View className="flex-row items-center gap-4">
                  <Text className="text-xs text-neutral-300">{formatTime(duration)}</Text>
                  <TouchableOpacity onPress={() => changeFullscreen(!fullscreen)}>
                    <Ionicons name={fullscreen ? 'contract' : 'expand'} size={21} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

        {isBuffering && (
          <View
            pointerEvents="none"
            className="absolute inset-0 items-center justify-center bg-black/35">
            <ActivityIndicator size="large" color="#a3e635" />
          </View>
        )}
      </View>
    );
  };

  if (isLoading || !videoSource) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-950">
        <ActivityIndicator size="large" color="#84cc16" />
        <Text className="mt-4 text-white">
          {isLoading ? 'Loading video source...' : 'No video source available'}
        </Text>
        {queryError && <Text className="mt-2 text-red-500">Error: {String(queryError)}</Text>}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-900">
      <Stack.Screen
        options={{
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="p-2">
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
          ),
          headerStyle: { backgroundColor: '#171717' },
          headerTitleStyle: { color: '#fff' },
          headerTitle: `Episode ${episodeId}`,
        }}
      />

      {isSubtitleReady ? (
        !isFullscreen && renderPlayerSurface(false)
      ) : (
        <View className="h-64 items-center justify-center bg-black">
          <ActivityIndicator size="large" color="#a3e635" />
          <Text className="mt-3 text-sm text-white">{subtitleStatus}</Text>
        </View>
      )}

      <Modal
        visible={isFullscreen}
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => changeFullscreen(false)}>
        <View className="flex-1 bg-black">{renderPlayerSurface(true)}</View>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}>
        <View className="flex-1 items-center justify-center bg-black/75">
          <View className="max-h-[70%] w-4/5 rounded-lg bg-neutral-900 p-5">
            <View className="mb-4 mt-4 flex-row justify-around border-b border-neutral-700 pb-3">
              <TouchableOpacity onPress={() => setActiveTab('servers')}>
                <Text
                  className={`text-lg font-bold ${activeTab === 'servers' ? 'text-lime-500' : 'text-white'}`}>
                  Servers
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveTab('subtitles')}>
                <Text
                  className={`text-lg font-bold ${activeTab === 'subtitles' ? 'text-lime-500' : 'text-white'}`}>
                  Subtitles
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView className="w-full">
              {activeTab === 'servers' ? (
                servers.length === 0 ? (
                  <View className="mb-2 rounded bg-neutral-700 p-3">
                    <Text className="text-center text-white">No servers available</Text>
                  </View>
                ) : (
                  servers.map((server, index) => (
                    <Pressable
                      key={index}
                      className={`mb-2 rounded p-3 ${activeServerIndex === index ? 'border border-lime-600 bg-lime-800' : 'bg-neutral-700'}`}
                      onPress={() => {
                        setSelectedServerIndex(index);
                        setIsModalVisible(false);
                      }}>
                      <Text className="text-white">
                        {server.serverName} ({server.type.toUpperCase()})
                      </Text>
                    </Pressable>
                  ))
                )
              ) : validSubtitleTracks.length === 0 ? (
                <View className="mb-2 rounded bg-neutral-700 p-3">
                  <Text className="text-center text-white">No subtitles available</Text>
                </View>
              ) : (
                <>
                  <Pressable
                    className={`mb-2 rounded p-3 ${selectedSubtitleIndex === null ? 'border border-lime-600 bg-lime-800' : 'bg-neutral-700'}`}
                    onPress={() => {
                      setSelectedSubtitleIndex(null);
                      setIsModalVisible(false);
                    }}>
                    <Text className="text-white">None</Text>
                  </Pressable>

                  {validSubtitleTracks.map((track, index) => (
                    <Pressable
                      key={index}
                      className={`mb-2 rounded p-3 ${selectedSubtitleIndex === index ? 'border border-lime-600 bg-lime-800' : 'bg-neutral-700'}`}
                      onPress={() => {
                        setSelectedSubtitleIndex(index);
                        setIsModalVisible(false);
                      }}>
                      <Text className="text-white">{track.title}</Text>
                    </Pressable>
                  ))}
                </>
              )}
            </ScrollView>

            <Pressable
              className="mt-5 items-center rounded bg-lime-600 p-3"
              onPress={() => setIsModalVisible(false)}>
              <Text className="font-bold text-white">Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default WatchScreen;
