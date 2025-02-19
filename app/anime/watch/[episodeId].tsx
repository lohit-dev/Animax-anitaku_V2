import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ArrowLeft } from 'iconsax-react-native';
import { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Modal, Pressable } from 'react-native';
import Video, { VideoRef } from 'react-native-video';

import { fetchAnimeStreamingLink } from '~/services/AnimeService';

interface StreamingResponse {
  success: boolean;
  data: {
    tracks: {
      file: string;
      label: string;
      kind: string;
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

const WatchScreen = () => {
  const router = useRouter();
  const { episodeId, animeId, type } = useLocalSearchParams<{
    episodeId: string;
    animeId: string;
    type: 'sub' | 'dub';
  }>();

  const videoRef = useRef<VideoRef>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(null);
  const [currentSubtitleLabel, setCurrentSubtitleLabel] = useState<string>('None');
  const [isModalVisible, setIsModalVisible] = useState(false);

  const {
    data: streamingData,
    isLoading,
    error,
  } = useQuery<StreamingResponse>({
    queryKey: ['streaming', episodeId, type],
    queryFn: () => fetchAnimeStreamingLink(episodeId, type),
    enabled: !!episodeId && !!type,
    staleTime: 0,
  });

  const videoUrl = streamingData?.data.sources[0]?.url;

  const textTracks = streamingData?.data.tracks.map((track) => ({
    title: track.label,
    language: track.label,
    type: track.kind,
    uri: track.file,
  }));

  const selectedTextTrack = textTracks?.findIndex((track) => track.uri === selectedSubtitle);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isLoading || !videoUrl) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-950">
        <ActivityIndicator size="large" color="#84cc16" />
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
          ref={videoRef}
          source={{
            uri: videoUrl,
            type: 'm3u8',
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Referer: 'https://megacloud.tv/',
              Origin: 'https://megacloud.tv',
            },
          }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
          controls
          paused={isPaused}
          onError={(error) => console.log('Video Error:', error)}
          ignoreSilentSwitch="ignore"
          playInBackground={false}
          playWhenInactive={false}
          onLoad={(data) => {
            setDuration(data.duration);
            setIsBuffering(false);
          }}
          onProgress={(data) => {
            setCurrentTime(data.currentTime);
            setIsBuffering(false);
          }}
          onBuffer={({ isBuffering }) => setIsBuffering(isBuffering)}
          selectedTextTrack={
            selectedTextTrack !== -1 ? { type: 'index', value: selectedTextTrack } : undefined
          }
          textTracks={textTracks}
        />

        {isBuffering && (
          <View className="absolute inset-0 flex items-center justify-center bg-black/50">
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
          onPress={() => setIsPaused(!isPaused)}>
          <Text className="font-bold text-white">{isPaused ? 'Play' : 'Pause'}</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center justify-between bg-neutral-800 p-2.5">
        <Text className="text-sm text-white">Subtitle: {currentSubtitleLabel}</Text>
        <TouchableOpacity
          className="rounded bg-lime-600 p-2"
          onPress={() => setIsModalVisible(true)}>
          <Text className="font-bold text-white">Settings</Text>
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
            <Pressable
              className={`p-3 ${!selectedSubtitle ? 'border border-lime-600 bg-lime-800' : 'bg-neutral-700'} mb-2 rounded`}
              onPress={() => {
                setSelectedSubtitle(null);
                setCurrentSubtitleLabel('None');
                setIsModalVisible(false);
              }}>
              <Text className="text-white">None</Text>
            </Pressable>
            {streamingData?.data.tracks.map((track, index) => (
              <Pressable
                key={index}
                className={`p-3 ${selectedSubtitle === track.file ? 'border border-lime-600 bg-lime-800' : 'bg-neutral-700'} mb-2 rounded`}
                onPress={() => {
                  setSelectedSubtitle(track.file);
                  setCurrentSubtitleLabel(track.label);
                  setIsModalVisible(false);
                }}>
                <Text className="text-white">{track.label}</Text>
              </Pressable>
            ))}

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
