import { useQuery } from '@tanstack/react-query';
import { File, Paths } from 'expo-file-system';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { ArrowLeft, Setting2 } from 'iconsax-react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
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
import Video, { TextTrackType } from 'react-native-video';

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
}

interface DownloadedSubtitleVtt {
  content: string;
  fileUri: string;
}

// Test the platform renderer first. Change this to 'custom' to return to the
// React overlay renderer without changing the download or parsing pipeline.
const subtitleRenderer = 'native' as const;

const parseVttTimestamp = (timestamp: string) => {
  const values = timestamp.trim().replace(',', '.').split(':').map(Number);
  if (values.some(Number.isNaN)) return null;

  if (values.length === 3) {
    return values[0] * 60 * 60 + values[1] * 60 + values[2];
  }

  return values.length === 2 ? values[0] * 60 + values[1] : null;
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
      const endTime = parseVttTimestamp(endWithSettings.trim().split(/\s+/)[0]);
      const text = lines
        .slice(timingLineIndex + 1)
        .join('\n')
        .replace(/<[^>]*>/g, '')
        .trim();

      return startTime !== null && endTime !== null && text ? [{ startTime, endTime, text }] : [];
    });

const subtitleDownloadCache = new Map<string, Promise<DownloadedSubtitleVtt>>();

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
        return { content: cachedContent, fileUri: subtitleFile.uri };
      }
    }

    const downloadedFile = await File.downloadFileAsync(url, subtitleFile, {
      headers: { Referer: referer },
      idempotent: true,
    });
    return { content: await downloadedFile.text(), fileUri: downloadedFile.uri };
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
  const [localSubtitleUri, setLocalSubtitleUri] = useState<string | null>(null);
  const [subtitleStatus, setSubtitleStatus] = useState('Preparing subtitles…');
  const [readySubtitleKey, setReadySubtitleKey] = useState<string | null>(null);
  const [selectedServerIndex, setSelectedServerIndex] = useState<number | null>(null);

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
    setLocalSubtitleUri(null);
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

  const nativeSubtitleTracks = useMemo(() => {
    if (!localSubtitleUri || selectedSubtitleIndex === null) return [];

    return [
      {
        title: validSubtitleTracks[selectedSubtitleIndex]?.title || 'English',
        language: 'en' as const,
        type: TextTrackType.VTT,
        uri: localSubtitleUri,
      },
    ];
  }, [localSubtitleUri, selectedSubtitleIndex, validSubtitleTracks]);

  const videoSourceObj = useMemo(
    () => ({
      uri: videoSource ?? undefined,
      headers: referer ? { Referer: referer } : undefined,
      textTracks: subtitleRenderer === 'native' ? nativeSubtitleTracks : undefined,
    }),
    [nativeSubtitleTracks, referer, videoSource]
  );

  useEffect(() => {
    if (!selectedSubtitleUri || !referer) {
      setSubtitleCues([]);
      setLocalSubtitleUri(null);
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
        const { content, fileUri } = await loadSubtitleVtt(selectedSubtitleUri, referer);
        const cues = parseVttCues(content);
        if (isMounted) {
          setSubtitleCues(cues);
          setLocalSubtitleUri(fileUri);
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
          setLocalSubtitleUri(null);
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

  const activeSubtitleText = useMemo(
    () =>
      subtitleCues
        .filter((cue) => currentTime >= cue.startTime && currentTime <= cue.endTime)
        .map((cue) => cue.text)
        .join('\n'),
    [currentTime, subtitleCues]
  );

  const handleProgress = useCallback((data: any) => {
    setCurrentTime(data.currentTime);
  }, []);

  const handleLoad = useCallback((data: any) => {
    setDuration(data.duration);
    setIsBuffering(false);
  }, []);

  const handleError = useCallback((error: any) => {
    console.log('Video Player onError:', error);
    setIsBuffering(false);
  }, []);

  const handleBuffer = useCallback((data: any) => {
    setIsBuffering(data.isBuffering);
  }, []);

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

      <View className="relative h-64 w-full">
        {isSubtitleReady ? (
          <>
            <Video
              /* Server entries can have the same name and even the same HLS URL.
                 The selected index intentionally creates a fresh native player when
                 the user selects a different server entry. */
              key={`server-${activeServerIndex}`}
              controls
              source={videoSourceObj}
              style={{ width: '100%', height: '100%' }}
              paused={!isPlaying}
              rate={1.0}
              onProgress={handleProgress}
              onEnd={() => setIsPlaying(false)}
              onError={handleError}
              onBuffer={handleBuffer}
              onLoad={handleLoad}
              resizeMode="contain"
              ignoreSilentSwitch="ignore"
            />

            {!!activeSubtitleText && (
              <View className="pointer-events-none absolute bottom-3 left-3 right-3 items-center">
                <Text
                  className="overflow-hidden rounded bg-black/75 px-3 py-1.5 text-center text-lg font-semibold text-white"
                  style={{ textShadowColor: '#000', textShadowRadius: 3 }}>
                  {activeSubtitleText}
                </Text>
              </View>
            )}

            {isBuffering && (
              <View className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50">
                <ActivityIndicator size="large" color="#84cc16" />
              </View>
            )}
          </>
        ) : (
          <View className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50">
            <ActivityIndicator size="large" color="#84cc16" />
            <Text className="mt-3 text-sm text-white">{subtitleStatus}</Text>
          </View>
        )}
      </View>

      <View className="flex-row items-center justify-between bg-neutral-800 p-2.5">
        <Text className="text-sm text-white">
          {formatTime(currentTime)} / {formatTime(duration)}
        </Text>
        <TouchableOpacity
          className="rounded bg-lime-600 px-3 py-1.5"
          onPress={() => setIsPlaying(!isPlaying)}>
          <Text className="font-bold text-white">{isPlaying ? 'Pause' : 'Play'}</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center justify-between bg-neutral-800 p-2.5">
        <Text className="text-sm text-white">
          Subtitle:{' '}
          {selectedSubtitleIndex !== null
            ? validSubtitleTracks[selectedSubtitleIndex]?.title || 'None'
            : 'No subtitles'}
        </Text>
        <TouchableOpacity
          className="rounded bg-lime-600 p-2"
          onPress={() => setIsModalVisible(true)}>
          <Setting2 size={24} color="#fff" />
        </TouchableOpacity>
      </View>

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
