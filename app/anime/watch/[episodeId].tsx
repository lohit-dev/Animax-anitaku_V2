import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { ArrowLeft, Setting2 } from 'iconsax-react-native';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { File, Paths } from 'expo-file-system';
import { fetchAnimeStreamingLink } from '~/services/AnimeService';
import { AnikotoStreamResponse } from '~/types';

interface SubtitleTrack {
  uri: string;
  title: string;
  isDefault: boolean;
}

const WatchScreen = () => {
  const router = useRouter();
  const { episodeId, animeId, type } = useLocalSearchParams<{
    episodeId: string;
    animeId: string;
    type: 'sub' | 'dub';
  }>();

  const vlcPlayerRef = useRef<any>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'servers' | 'subtitles'>('servers');
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number | null>(null);
  const [localSubtitleUri, setLocalSubtitleUri] = useState<string | undefined>();
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
  console.log('data', JSON.stringify(streamingData));
  const primaryServer =
    selectedServerIndex !== null && servers[selectedServerIndex]
      ? servers[selectedServerIndex]
      : servers.find((s) => s.type === type && s.m3u8Url) ||
        servers.find((s) => s.type === type) ||
        servers[0];

  const activeServerIndex =
    selectedServerIndex !== null
      ? selectedServerIndex
      : servers.findIndex((s) => s.serverName === primaryServer?.serverName);

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

  // Pick English first, fallback to API default, then first available
  useEffect(() => {
    if (validSubtitleTracks.length > 0 && selectedSubtitleIndex === null) {
      let index = validSubtitleTracks.findIndex((track) =>
        track.title.toLowerCase().includes('english')
      );
      if (index === -1) {
        index = validSubtitleTracks.findIndex((track) => track.isDefault);
      }
      setSelectedSubtitleIndex(index !== -1 ? index : 0);
    }
  }, [validSubtitleTracks, selectedSubtitleIndex]);

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

  // Stable source reference — only changes when the actual video URL or
  // referer changes, NOT on every progress-driven re-render.
  const videoSourceObj = useMemo(
    () => ({
      uri: videoSource ?? undefined,
      headers: referer ? { Referer: referer } : undefined,
    }),
    [videoSource, referer]
  );

  const selectedSubtitleUri =
    selectedSubtitleIndex !== null ? validSubtitleTracks[selectedSubtitleIndex]?.uri : undefined;
  console.log('selectedSubtitleUri', selectedSubtitleUri);

  useEffect(() => {
    if (!selectedSubtitleUri || !referer) {
      setLocalSubtitleUri(undefined);
      return;
    }

    let isMounted = true;
    const downloadSubtitle = async () => {
      try {
        const file = await File.downloadFileAsync(selectedSubtitleUri, Paths.cache, {
          headers: { Referer: referer },
        });
        if (isMounted) {
          setLocalSubtitleUri(file.uri);
          console.log('Subtitle downloaded to:', file.uri);
        }
      } catch (error) {
        console.error('Failed to download subtitle', error);
        if (isMounted) {
          setLocalSubtitleUri(undefined);
        }
      }
    };

    downloadSubtitle();
    return () => {
      isMounted = false;
    };
  }, [selectedSubtitleUri, referer]);

  const textTracks = useMemo(() => {
    if (!localSubtitleUri || selectedSubtitleIndex === null) return [];
    const track = validSubtitleTracks[selectedSubtitleIndex];
    return [
      {
        title: track?.title || 'Selected',
        language: 'en' as any,
        type: TextTrackType.VTT,
        uri: localSubtitleUri,
      },
    ];
  }, [localSubtitleUri, selectedSubtitleIndex, validSubtitleTracks]);
  console.log('textTracks', textTracks);

  const selectedTextTrack = useMemo(() => {
    if (textTracks && textTracks.length > 0) {
      return {
        type: 'title',
        value: textTracks[0].title,
      };
    }
    return undefined;
  }, [textTracks]);
  console.log('selectedTextTrack', selectedTextTrack);

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
        <Video
          controls
          source={videoSourceObj}
          style={{ width: '100%', height: '100%' }}
          paused={!isPlaying}
          textTracks={textTracks}
          selectedTextTrack={selectedTextTrack as any}
          rate={1.0}
          onProgress={handleProgress}
          onEnd={() => setIsPlaying(false)}
          onError={handleError}
          onBuffer={handleBuffer}
          onLoad={handleLoad}
          resizeMode="contain"
          ignoreSilentSwitch="ignore"
        />

        {isBuffering && (
          <View className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50">
            <ActivityIndicator size="large" color="#84cc16" />
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
                      <Text className="text-white">{server.serverName}</Text>
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
