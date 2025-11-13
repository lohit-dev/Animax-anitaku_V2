import { useQuery } from '@tanstack/react-query';
import { createSubParser, formats } from '@wxhccc/subtitle-parser';
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
import Video, { VideoRef, TextTrackType } from 'react-native-video';
import type { ISO639_1 } from 'react-native-video/lib/types/language';

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

// Helper function to map language names to ISO639_1 codes
const getLanguageCode = (lang: string): ISO639_1 => {
  const langLower = lang.toLowerCase();
  const languageMap: Record<string, ISO639_1> = {
    english: 'en',
    spanish: 'es',
    portuguese: 'pt',
    arabic: 'ar',
    german: 'de',
    turkish: 'tr',
    french: 'fr',
    italian: 'it',
    japanese: 'ja',
    korean: 'ko',
    chinese: 'zh',
  };
  return languageMap[langLower] || 'en';
};

interface SubtitleTrack {
  uri: string;
  language: ISO639_1;
  title: string;
  type: TextTrackType;
}

interface SubtitleCue {
  start: number; // in seconds
  end: number; // in seconds
  text: string;
}

const WatchScreen = () => {
  const router = useRouter();
  const { episodeId, type } = useLocalSearchParams<{
    episodeId: string;
    type: 'sub' | 'dub';
  }>();

  const videoRef = useRef<VideoRef>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number | null>(null);
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const [currentSubtitleText, setCurrentSubtitleText] = useState<string>('');
  const [isLoadingSubtitles, setIsLoadingSubtitles] = useState(false);

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

  // Filter out thumbnail tracks and prepare subtitle tracks for react-native-video
  const validSubtitleTracks: SubtitleTrack[] = subtitleTracks
    .filter((track) => track.lang?.toLowerCase() !== 'thumbnails' && (track.url || track.file))
    .map((track) => {
      const url = track.url || track.file || '';
      const langName = track.lang || track.label || 'english';
      // Determine type based on file extension
      const type = url.endsWith('.vtt')
        ? TextTrackType.VTT
        : url.endsWith('.srt')
          ? TextTrackType.SUBRIP
          : TextTrackType.VTT; // Default to VTT
      return {
        uri: url,
        language: getLanguageCode(langName),
        title: track.label || track.lang || 'Unknown',
        type,
      };
    });

  const parseSubtitles = (subtitleText: string): SubtitleCue[] => {
    try {
      const parser = createSubParser(formats);
      const subtitleInfo = parser.parse(subtitleText);

      // Convert from library format (milliseconds) to our format (seconds)
      return subtitleInfo.contents.map((caption) => ({
        start: caption.start / 1000, // Convert milliseconds to seconds
        end: caption.end / 1000, // Convert milliseconds to seconds
        text: caption.content.trim(),
      }));
    } catch (error) {
      console.error('Error parsing subtitles with library:', error);
      return [];
    }
  };

  // Set English as default subtitle if available
  useEffect(() => {
    if (validSubtitleTracks.length > 0 && selectedSubtitleIndex === null) {
      const englishIndex = validSubtitleTracks.findIndex(
        (track) =>
          track.language?.toLowerCase() === 'en' ||
          track.language?.toLowerCase().includes('english') ||
          track.title?.toLowerCase().includes('english')
      );
      if (englishIndex !== -1) {
        setSelectedSubtitleIndex(englishIndex);
      } else {
        setSelectedSubtitleIndex(0);
      }
    }
  }, [validSubtitleTracks, selectedSubtitleIndex]);

  // Fetch and parse subtitle file when track is selected
  useEffect(() => {
    if (selectedSubtitleIndex !== null && validSubtitleTracks[selectedSubtitleIndex]) {
      const track = validSubtitleTracks[selectedSubtitleIndex];
      setIsLoadingSubtitles(true);
      setSubtitleCues([]);
      setCurrentSubtitleText('');

      fetch(track.uri, {
        headers: videoHeaders ? { Referer: videoHeaders.Referer || '' } : undefined,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to fetch subtitles: ${response.status}`);
          }
          return response.text();
        })
        .then((text) => {
          try {
            const cues = parseSubtitles(text);
            setSubtitleCues(cues);
            setIsLoadingSubtitles(false);
          } catch (error) {
            console.error('Error parsing subtitles:', error);
            setIsLoadingSubtitles(false);
            setSubtitleCues([]);
          }
        })
        .catch((error) => {
          console.error('Error loading subtitles:', error);
          setIsLoadingSubtitles(false);
          setSubtitleCues([]);
        });
    } else {
      setSubtitleCues([]);
      setCurrentSubtitleText('');
    }
  }, [selectedSubtitleIndex, validSubtitleTracks, videoHeaders]);

  // Update current subtitle text based on video time
  useEffect(() => {
    if (subtitleCues.length === 0 || selectedSubtitleIndex === null) {
      setCurrentSubtitleText('');
      return;
    }

    // Find the active cue (with small buffer for better UX)
    const buffer = 0.1; // 100ms buffer
    const activeCue = subtitleCues.find(
      (cue) => currentTime >= cue.start - buffer && currentTime <= cue.end + buffer
    );

    setCurrentSubtitleText(activeCue?.text || '');
  }, [currentTime, subtitleCues, selectedSubtitleIndex]);

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

  // Prepare video source (removed textTracks as they don't work reliably with HLS/m3u8)
  const videoSourceConfig = {
    uri: videoSource,
    headers: videoHeaders ? { Referer: videoHeaders.Referer || '' } : undefined,
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
        <Video
          ref={videoRef}
          source={videoSourceConfig}
          style={{ width: '100%', height: '100%', position: 'absolute' }}
          resizeMode="contain"
          controls
          paused={!isPlaying}
          onLoad={(data) => {
            setDuration(data.duration);
            setIsBuffering(false);
            setIsPlaying(true);
          }}
          onProgress={(data) => {
            setCurrentTime(data.currentTime);
          }}
          onBuffer={({ isBuffering: buffering }) => {
            setIsBuffering(buffering);
          }}
          onError={() => {
            setIsBuffering(false);
          }}
          onPlaybackStateChanged={(data) => {
            setIsPlaying(data.isPlaying);
          }}
          fullscreenAutorotate
          fullscreenOrientation="landscape"
        />

        <View className="pointer-events-none absolute inset-0">
          {isBuffering && (
            <View className="flex-1 items-center justify-center bg-black/50">
              <ActivityIndicator size="large" color="#84cc16" />
            </View>
          )}

          {/* Custom Subtitle Overlay */}
          {currentSubtitleText && selectedSubtitleIndex !== null && (
            <View className="absolute bottom-16 left-0 right-0 items-center px-4">
              <View className="rounded-lg bg-black/80 px-4 py-2 shadow-lg">
                <Text className="text-center text-base font-semibold leading-6 text-white">
                  {currentSubtitleText}
                </Text>
              </View>
            </View>
          )}

          {isLoadingSubtitles && selectedSubtitleIndex !== null && (
            <View className="absolute bottom-16 left-0 right-0 items-center">
              <View className="rounded-lg bg-black/60 px-3 py-1.5">
                <Text className="text-sm text-white/80">Loading subtitles...</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <View className="flex-row items-center justify-between bg-neutral-800 p-2.5">
        <Text className="text-sm text-white">
          {formatTime(currentTime)} / {formatTime(duration)}
        </Text>
        <TouchableOpacity
          className="rounded bg-lime-600 px-3 py-1.5"
          onPress={() => {
            if (isPlaying) {
              videoRef.current?.pause();
            } else {
              videoRef.current?.resume();
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
                    <Text className="text-white">{track.title || track.language || 'Unknown'}</Text>
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
