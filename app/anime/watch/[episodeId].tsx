import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { ArrowLeft, Setting2 } from 'iconsax-react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
  BackHandler,
} from 'react-native';
import { VLCPlayer } from 'react-native-vlc-media-player';

import { fetchAnimeStreamingLink, Type } from '~/services/AnimeService';

interface StreamingResponse {
  success: boolean;
  data: {
    headers?: {
      Referer?: string;
    };
    tracks: {
      url?: string;
      file?: string;
      lang?: string;
      label?: string;
      kind?: string;
      default?: boolean;
    }[];
    sources: {
      url: string;
      type: string;
    }[];
    intro?: {
      start: number;
      end: number;
    };
    outro?: {
      start: number;
      end: number;
    };
  };
}

interface SubtitleTrack {
  uri: string;
  title: string;
}

const WatchScreen = () => {
  const router = useRouter();
  const { episodeId, type } = useLocalSearchParams<{
    episodeId: string;
    type: 'sub' | 'dub';
  }>();

  const vlcPlayerRef = useRef<any>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number | null>(null);

  const {
    data: streamingData,
    isLoading,
    error: queryError,
  } = useQuery<StreamingResponse>({
    queryKey: ['streaming', episodeId, type],
    queryFn: () => fetchAnimeStreamingLink(episodeId, type as Type),
    enabled: !!episodeId && !!type,
    staleTime: 0,
  });

  const videoSource = streamingData?.data?.sources?.[0]?.url;
  const videoHeaders = streamingData?.data?.headers;
  const subtitleTracks = streamingData?.data?.tracks || [];

  // Filter out thumbnail tracks and prepare subtitle tracks for VLC
  const validSubtitleTracks: SubtitleTrack[] = subtitleTracks
    .filter((track) => track.lang?.toLowerCase() !== 'thumbnails' && (track.url || track.file))
    .map((track) => {
      const url = track.url || track.file || '';
      return {
        uri: url,
        title: track.label || track.lang || 'Unknown',
      };
    });

  // Set English as default subtitle if available
  useEffect(() => {
    if (validSubtitleTracks.length > 0 && selectedSubtitleIndex === null) {
      const englishIndex = validSubtitleTracks.findIndex((track) =>
        track.title?.toLowerCase().includes('english')
      );
      if (englishIndex !== -1) {
        setSelectedSubtitleIndex(englishIndex);
      } else {
        setSelectedSubtitleIndex(0);
      }
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

  // Get selected subtitle URI for VLC
  const selectedSubtitleUri =
    selectedSubtitleIndex !== null && validSubtitleTracks[selectedSubtitleIndex]
      ? validSubtitleTracks[selectedSubtitleIndex].uri
      : undefined;

  // Prepare VLC source with headers via initOptions
  const vlcSource = {
    uri: videoSource,
    initOptions: videoHeaders?.Referer ? [`--http-referrer=${videoHeaders.Referer}`] : [],
  };

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
        <VLCPlayer
          ref={vlcPlayerRef}
          source={vlcSource}
          style={{ width: '100%', height: '100%' }}
          subtitleUri={selectedSubtitleUri}
          autoplay
          textTrack={selectedSubtitleIndex !== null ? selectedSubtitleIndex : 0}
          rate={1.0}
          onProgress={(data: any) => {
            setCurrentTime(data.currentTime / 1000); // Convert ms to seconds
          }}
          onEnd={() => {
            setIsPlaying(false);
          }}
          onError={(error: any) => {
            console.error('VLC Player Error:', error);
            setIsBuffering(false);
          }}
          onBuffering={(data: any) => {
            setIsBuffering(data.isBuffering);
          }}
          // onStateChange={(data: any) => {
          //   if (data.state === 'Playing') {
          //     setIsPlaying(true);
          //   } else if (data.state === 'Paused' || data.state === 'Stopped') {
          //     setIsPlaying(false);
          //   }
          // }}
          onPlaying={() => {
            setIsPlaying(true);
          }}
          onPaused={() => {
            setIsPlaying(false);
          }}
          onStopped={() => {
            setIsPlaying(false);
          }}
          onLoad={(data: any) => {
            setDuration(data.duration / 1000); // Convert ms to seconds
            setIsBuffering(false);
          }}
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
          onPress={() => {
            if (isPlaying) {
              vlcPlayerRef.current?.pause();
            } else {
              vlcPlayerRef.current?.play();
            }
          }}>
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
            <Text className="mb-2.5 mt-4 text-lg font-bold text-white">Subtitles</Text>

            {validSubtitleTracks.length === 0 ? (
              <View className="mb-2 rounded bg-neutral-700 p-3">
                <Text className="center text-white">No subtitles available</Text>
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
                    <Text className="text-white">{track.title || 'Unknown'}</Text>
                  </Pressable>
                ))}
              </>
            )}

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
