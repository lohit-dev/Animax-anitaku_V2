import { useQuery } from '@tanstack/react-query';
import { TimeUpdateEventPayload, useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { ArrowLeft, Setting2 } from 'iconsax-react-native';
import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Modal, Pressable, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';
import { fetchAnimeStreamingLink } from '~/services/AnimeService';
import { useBackButton } from '~/hooks/useBackButton';

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

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(null);
  const [currentSubtitleLabel, setCurrentSubtitleLabel] = useState<string>('None');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [subtitleText, setSubtitleText] = useState<string>('');
  const [allCues, setAllCues] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const [subtitles, setSubtitles] = useState<Array<{
    startTime: number;
    endTime: number;
    text: string;
  }>>([]);

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

  const videoSource = streamingData?.data.sources[0]?.url;
  const player = useVideoPlayer(videoSource ? { uri: videoSource } : null);
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  const timeUpdate = useEvent(player, 'timeUpdate', {
    currentTime: 0,
    duration: 0
  });

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.back();
        return true;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => {
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
      };
    }, [router])
  );

  useEffect(() => {
    if (timeUpdate?.currentTime !== undefined) {
      const currentTimeInSeconds = timeUpdate.currentTime;
      setCurrentTime(currentTimeInSeconds);
      setDuration(timeUpdate?.duration || 0);
      
      if (selectedSubtitle && subtitles.length > 0) {
        const subtitle = getCurrentSubtitle(currentTimeInSeconds);
        console.log('Time update:', { 
          currentTime: currentTimeInSeconds, 
          hasSubtitle: !!subtitle,
          subtitlesCount: subtitles.length 
        });
        setSubtitleText(subtitle);
      }
    }
  }, [timeUpdate, subtitles, selectedSubtitle]);

  const parseVTT = async (url: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const text = await response.text();
      const lines = text.split('\n');
      const cues: Array<{ startTime: number; endTime: number; text: string }> = [];
      let currentCue: any = null;
      let textBuffer: string[] = [];

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine === 'WEBVTT' || trimmedLine === '') continue;

        if (trimmedLine.includes(' --> ')) {
          if (currentCue && textBuffer.length) {
            currentCue.text = textBuffer.join('\n').trim();
            cues.push(currentCue);
          }

          try {
            const [start, end] = trimmedLine.split(' --> ');
            
            const parseTimestamp = (timestamp: string) => {
              const parts = timestamp.trim().split(':');
              let hours = 0, minutes = 0, seconds = 0, milliseconds = 0;

              if (parts.length === 3) { // HH:MM:SS.mmm
                hours = parseInt(parts[0]);
                minutes = parseInt(parts[1]);
                const [secs, ms] = parts[2].split('.');
                seconds = parseInt(secs);
                milliseconds = parseInt(ms || '0');
              } else if (parts.length === 2) { // MM:SS.mmm
                minutes = parseInt(parts[0]);
                const [secs, ms] = parts[1].split('.');
                seconds = parseInt(secs);
                milliseconds = parseInt(ms || '0');
              }

              return (
                hours * 3600 + 
                minutes * 60 + 
                seconds + 
                milliseconds / 1000
              );
            };

            const startTime = parseTimestamp(start);
            const endTime = parseTimestamp(end);

            currentCue = { 
              startTime, 
              endTime, 
              text: '' 
            };
            textBuffer = [];
          } catch (parseError) {
            console.error('Error parsing timestamp:', trimmedLine, parseError);
            continue;
          }
        } else if (trimmedLine) {
          textBuffer.push(trimmedLine.replace(/<\/?[^>]+(>|$)/g, ''));
        }
      }

      if (currentCue && textBuffer.length) {
        currentCue.text = textBuffer.join('\n').trim();
        cues.push(currentCue);
      }

      if (cues.length === 0) {
        throw new Error('No valid subtitles parsed');
      }

      console.log('Successfully parsed cues:', cues.length);
      console.log('First cue:', cues[0]);
      setSubtitles(cues);
    } catch (error) {
      console.error('Error parsing subtitles:', error);
      setSubtitles([]);
    }
  };

  useEffect(() => {
    if (selectedSubtitle) {
      parseVTT(selectedSubtitle);
    }
  }, [selectedSubtitle]);

  const getCurrentSubtitle = (time: number) => {
    if (!time || !subtitles.length) {
      console.log('No time or subtitles available:', { time, subtitlesLength: subtitles.length });
      return '';
    }
    
    const subtitle = subtitles.find(sub => {
      const isInRange = time >= sub.startTime && time <= sub.endTime;
      if (isInRange) {
        console.log('Found subtitle:', { time, start: sub.startTime, end: sub.endTime, text: sub.text });
      }
      return isInRange;
    });
    
    return subtitle?.text || '';
  };

  useEffect(() => {
    if (player) {
      player.timeUpdateEventInterval = 0.5;
    }
  }, [player]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isLoading || !videoSource) {
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
        <VideoView
          player={player}
          style={{ width: '100%', height: '100%', position: 'absolute' }}
          contentFit="contain"
          allowsFullscreen
          allowsPictureInPicture
          onFullscreenEnter={() => setIsFullscreen(true)}
          onFullscreenExit={() => setIsFullscreen(false)}
        />

        <View className="absolute inset-0">
          {isBuffering && (
            <View className="flex-1 items-center justify-center bg-black/50">
              <ActivityIndicator size="large" color="#84cc16" />
            </View>
          )}

          {selectedSubtitle && subtitleText && (
            <View className="flex-1 justify-end pb-3">
              <View className="mx-4 items-center">
                <View className="rounded-lg bg-black/40 px-4 py-1">
                  <Text 
                    className="text-center text-xl text-white"
                    style={{
                      textShadowColor: 'rgba(0, 0, 0, 0.75)',
                      textShadowOffset: { width: 2, height: 2 },
                      textShadowRadius: 3,
                      opacity:1
                    }}>
                    {subtitleText.replace(/<\/?i>/g, '')}
                  </Text>
                </View>
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
              player.pause();
            } else {
              player.play();
            }
          }}>
          <Text className="font-bold text-white">{isPlaying ? 'Pause' : 'Play'}</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center justify-between bg-neutral-800 p-2.5">
        <Text className="text-sm text-white">Subtitle: {currentSubtitleLabel}</Text>
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
            <Pressable
              className={`p-3 ${!selectedSubtitle ? 'border border-lime-600 bg-lime-800' : 'bg-neutral-700'} mb-2 rounded`}
              onPress={() => {
                setSelectedSubtitle(null);
                setCurrentSubtitleLabel('None');
                setSubtitleText('');
                setIsModalVisible(false);
              }}>
              <Text className="text-white">None</Text>
            </Pressable>
            {streamingData?.data.tracks.map((track, index) => (
              <Pressable
                key={index}
                className={`p-3 ${selectedSubtitle === track.file ? 'border border-lime-600 bg-lime-800' : 'bg-neutral-700'} mb-2 rounded`}
                onPress={() => {
                  console.log('Selected subtitle:', track.file);
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

      {isFullscreen && selectedSubtitle && subtitleText && (
        <View style={{ position: 'absolute', bottom: 100, left: 0, right: 0, alignItems: 'center' }}>
          <View className="rounded-lg bg-black/75 px-4 py-2">
            <Text 
              className="text-center text-xl text-white"
              style={{
                textShadowColor: 'rgba(0, 0, 0, 0.75)',
                textShadowOffset: { width: 2, height: 2 },
                textShadowRadius: 3,
              }}>
              {subtitleText.replace(/<\/?i>/g, '')}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default WatchScreen;