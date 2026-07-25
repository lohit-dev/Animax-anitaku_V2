import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { File, Paths } from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
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
  Animated,
  PanResponder,
  StyleSheet,
} from 'react-native';
import Video from 'react-native-video';

import { fetchAnimeStreamingLink } from '~/services/AnimeService';
import { AnikotoStreamResponse } from '~/types';

// Optional — only needed for landscape auto-rotate on fullscreen.
// npx expo install expo-screen-orientation
// If you'd rather not add it, delete the two ScreenOrientation calls below
// (search "ScreenOrientation") and fullscreen will just stay in whatever
// orientation the phone is already in.

// ---------------------------------------------------------------------------
// Design tokens — matches the app's existing black + lime system (Home /
// Discover screens), not a separate look for just this one.
// ---------------------------------------------------------------------------
const COLORS = {
  bg: '#000000',
  surface: '#171717', // neutral-900
  surfaceRaised: '#262626', // neutral-800
  divider: '#333333',
  accent: '#A3E635', // lime-400 — matches "Play Trailer", tab bar, badges
  accentPressed: '#84CC16', // lime-500
  text: '#FFFFFF',
  textMuted: '#A3A3A3', // neutral-400
  textFaint: '#737373', // neutral-500
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

type ResizeModeKey = 'contain' | 'cover' | 'stretch';
const RESIZE_MODES: { key: ResizeModeKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] =
  [
    { key: 'contain', label: 'Fit', icon: 'scan-outline' },
    { key: 'cover', label: 'Fill', icon: 'crop-outline' },
    { key: 'stretch', label: 'Stretch', icon: 'move-outline' },
  ];

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

const formatTimecode = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
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
  const [isLocked, setIsLocked] = useState(false);
  const [pendingSeek, setPendingSeek] = useState<number | null>(null);
  const [resumeAfterTransition, setResumeAfterTransition] = useState(false);
  const [seekBarWidth, setSeekBarWidth] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPreviewTime, setScrubPreviewTime] = useState(0);
  const [resizeModeIndex, setResizeModeIndex] = useState(0);
  const [flash, setFlash] = useState<
    { kind: 'seek-left' | 'seek-right'; label: string } | { kind: 'mode'; label: string } | null
  >(null);

  const videoRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ time: number; side: 'left' | 'right' | 'center' } | null>(null);
  const controlsAnim = useRef(new Animated.Value(1)).current;
  const playerWidthRef = useRef(0);

  const durationRef = useRef(0);
  const seekBarWidthRef = useRef(0);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);
  useEffect(() => {
    seekBarWidthRef.current = seekBarWidth;
  }, [seekBarWidth]);

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

  // Hardware back: exit fullscreen first, only navigate back if not fullscreen.
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (isFullscreen) {
          setIsFullscreen(false);
          return true;
        }
        router.back();
        return true;
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => {
        backHandler.remove();
      };
    }, [isFullscreen, router])
  );

  // Landscape lock while fullscreen. Safe no-op if expo-screen-orientation
  // isn't installed and you stripped the import — just remove this block too.
  useEffect(() => {
    (async () => {
      try {
        if (isFullscreen) {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        } else {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        }
      } catch {
        // Package not installed or platform doesn't support it — ignore.
      }
    })();
  }, [isFullscreen]);

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
    if (isLocked) return;
    setShowControls(true);
  }, [isLocked]);

  useEffect(() => {
    Animated.timing(controlsAnim, {
      toValue: showControls ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [controlsAnim, showControls]);

  useEffect(() => {
    if (!showControls || !isPlaying || isScrubbing || isLocked) return;

    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3200);
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isLocked, isPlaying, isScrubbing, showControls]);

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

  const triggerFlash = useCallback(
    (
      next: { kind: 'seek-left' | 'seek-right'; label: string } | { kind: 'mode'; label: string }
    ) => {
      setFlash(next);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => setFlash(null), 500);
    },
    []
  );

  const cycleResizeMode = useCallback(() => {
    setResizeModeIndex((prev) => {
      const next = (prev + 1) % RESIZE_MODES.length;
      triggerFlash({ kind: 'mode', label: RESIZE_MODES[next].label });
      return next;
    });
  }, [triggerFlash]);

  // Single tap toggles controls. Double tap on the left/right third of the
  // video seeks +/-10s. Disabled entirely while locked.
  const handleVideoTap = useCallback(
    (event: any) => {
      if (isLocked) return;
      const x = event.nativeEvent.locationX;
      const now = Date.now();
      const zoneWidth = playerWidthRef.current || 1;
      const side: 'left' | 'right' | 'center' =
        x < zoneWidth * 0.35 ? 'left' : x > zoneWidth * 0.65 ? 'right' : 'center';

      if (
        lastTapRef.current &&
        side !== 'center' &&
        lastTapRef.current.side === side &&
        now - lastTapRef.current.time < 300
      ) {
        if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
        lastTapRef.current = null;
        if (side === 'left') {
          seekTo(currentTime - 10);
        } else {
          seekTo(currentTime + 10);
        }
        triggerFlash({ kind: side === 'left' ? 'seek-left' : 'seek-right', label: '10s' });
        return;
      }

      lastTapRef.current = { time: now, side };
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = setTimeout(() => {
        setShowControls((visible) => !visible);
        lastTapRef.current = null;
      }, 260);
    },
    [currentTime, isLocked, seekTo, triggerFlash]
  );

  const seekPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isLocked,
      onMoveShouldSetPanResponder: () => !isLocked,
      onPanResponderGrant: (evt) => {
        const w = seekBarWidthRef.current;
        const d = durationRef.current;
        if (!w || !d) return;
        setIsScrubbing(true);
        setShowControls(true);
        setScrubPreviewTime(clamp(evt.nativeEvent.locationX / w, 0, 1) * d);
      },
      onPanResponderMove: (evt) => {
        const w = seekBarWidthRef.current;
        const d = durationRef.current;
        if (!w || !d) return;
        setScrubPreviewTime(clamp(evt.nativeEvent.locationX / w, 0, 1) * d);
      },
      onPanResponderRelease: (evt) => {
        const w = seekBarWidthRef.current;
        const d = durationRef.current;
        setIsScrubbing(false);
        if (!w || !d) return;
        const target = clamp(evt.nativeEvent.locationX / w, 0, 1) * d;
        videoRef.current?.seek(target);
        setCurrentTime(target);
      },
      onPanResponderTerminate: () => setIsScrubbing(false),
    })
  ).current;

  const renderPlayerSurface = (fullscreen: boolean) => {
    const topCues = activeSubtitleCues.filter((cue) => cue.placement === 'top');
    const bottomCues = activeSubtitleCues.filter((cue) => cue.placement === 'bottom');
    const displayTime = isScrubbing ? scrubPreviewTime : currentTime;
    const progressRatio = duration > 0 ? clamp(displayTime / duration, 0, 1) : 0;
    const fillWidth = progressRatio * seekBarWidth;
    const bottomCaptionOffset = showControls && !isLocked ? (fullscreen ? 108 : 78) : 22;
    const topCaptionOffset = showControls && !isLocked ? (fullscreen ? 64 : 44) : 14;
    const activeTrackLabel =
      selectedSubtitleIndex !== null ? validSubtitleTracks[selectedSubtitleIndex]?.title : null;
    const resizeMode = RESIZE_MODES[resizeModeIndex];

    return (
      <View
        className="relative w-full overflow-hidden"
        style={[{ backgroundColor: COLORS.bg }, fullscreen ? { flex: 1 } : { height: 256 }]}
        onLayout={(e) => {
          playerWidthRef.current = e.nativeEvent.layout.width;
        }}>
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
          resizeMode={resizeMode.key}
          ignoreSilentSwitch="ignore"
        />

        <Pressable className="absolute inset-0" onPress={handleVideoTap} />

        {/* Double-tap seek flash */}
        {flash && flash.kind !== 'mode' && (
          <View
            pointerEvents="none"
            className="absolute bottom-0 top-0 items-center justify-center"
            style={[{ width: '38%' }, flash.kind === 'seek-left' ? { left: 0 } : { right: 0 }]}>
            <View
              className="items-center justify-center rounded-full px-4 py-3"
              style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
              <Ionicons
                name={flash.kind === 'seek-left' ? 'play-back' : 'play-forward'}
                size={22}
                color={COLORS.accent}
              />
              <Text style={{ color: COLORS.accent, fontSize: 11, marginTop: 3, fontWeight: '600' }}>
                {flash.label}
              </Text>
            </View>
          </View>
        )}

        {/* Resize mode flash */}
        {flash && flash.kind === 'mode' && (
          <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
            <View
              className="rounded-full px-4 py-2"
              style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}>
              <Text style={{ color: COLORS.accent, fontSize: 13, fontWeight: '700' }}>
                {flash.label}
              </Text>
            </View>
          </View>
        )}

        {topCues.map((cue, index) => (
          <View
            key={`top-${cue.startTime}-${index}`}
            pointerEvents="none"
            className="absolute left-3 right-3 items-center"
            style={{ top: topCaptionOffset + index * 58 }}>
            <Text style={styles.subtitleText}>{cue.text}</Text>
          </View>
        ))}

        {bottomCues.map((cue, index) => (
          <View
            key={`bottom-${cue.startTime}-${index}`}
            pointerEvents="none"
            className="absolute left-3 right-3 items-center"
            style={{ bottom: bottomCaptionOffset + index * 58 }}>
            <Text style={styles.subtitleText}>{cue.text}</Text>
          </View>
        ))}

        {/* Locked state: minimal, just an unlock pill */}
        {isLocked && (
          <TouchableOpacity
            className="absolute bottom-6 left-1/2 flex-row items-center rounded-full px-4 py-2.5"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', marginLeft: -46 }}
            onPress={() => setIsLocked(false)}>
            <Ionicons name="lock-closed" size={15} color={COLORS.text} />
            <Text style={{ color: COLORS.text, marginLeft: 6, fontSize: 12, fontWeight: '600' }}>
              Unlock
            </Text>
          </TouchableOpacity>
        )}

        {!isLocked && (
          <Animated.View
            pointerEvents={showControls ? 'box-none' : 'none'}
            className="absolute inset-0"
            style={{ opacity: controlsAnim }}>
            {/* Top scrim + bar — gradient, not a flat block */}
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(0,0,0,0.75)', 'rgba(0,0,0,0)']}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: fullscreen ? 120 : 90,
              }}
            />
            <View className="absolute left-0 right-0 top-0 flex-row items-start justify-between px-4 pb-6 pt-4">
              <View className="flex-1 pr-3">
                <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700' }}>
                  Episode {episodeId}
                </Text>
                <View className="mt-1 flex-row items-center">
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: activeTrackLabel ? COLORS.accent : COLORS.textFaint,
                      marginRight: 5,
                    }}
                  />
                  <Text style={{ color: COLORS.textMuted, fontSize: 11 }} numberOfLines={1}>
                    {activeTrackLabel ?? 'Subtitles off'}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <TouchableOpacity
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: 'rgba(38,38,38,0.75)' }}
                  onPress={cycleResizeMode}>
                  <Ionicons name={resizeMode.icon} size={17} color={COLORS.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: 'rgba(38,38,38,0.75)' }}
                  onPress={() => setIsLocked(true)}>
                  <Ionicons name="lock-open-outline" size={17} color={COLORS.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: 'rgba(38,38,38,0.75)' }}
                  onPress={() => setIsMuted((muted) => !muted)}>
                  <Ionicons
                    name={isMuted ? 'volume-mute' : 'volume-high'}
                    size={17}
                    color={COLORS.text}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: 'rgba(38,38,38,0.75)' }}
                  onPress={() => {
                    setIsModalVisible(true);
                    showPlayerControls();
                  }}>
                  <Ionicons name="options-outline" size={17} color={COLORS.text} />
                </TouchableOpacity>
                {fullscreen && (
                  <TouchableOpacity
                    className="h-9 w-9 items-center justify-center rounded-full"
                    style={{ backgroundColor: 'rgba(38,38,38,0.75)' }}
                    onPress={() => changeFullscreen(false)}>
                    <Ionicons name="contract" size={17} color={COLORS.text} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Center transport controls */}
            <View
              className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex-row items-center justify-center"
              style={{ gap: 30 }}>
              <TouchableOpacity
                className="h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                onPress={() => {
                  seekTo(currentTime - 10);
                  triggerFlash({ kind: 'seek-left', label: '10s' });
                }}>
                <Ionicons name="play-back" size={22} color={COLORS.text} />
              </TouchableOpacity>
              <TouchableOpacity
                className="h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundColor: COLORS.accent }}
                onPress={() => setIsPlaying((playing) => !playing)}>
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={30}
                  color={COLORS.bg}
                  style={isPlaying ? undefined : { marginLeft: 3 }}
                />
              </TouchableOpacity>
              <TouchableOpacity
                className="h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                onPress={() => {
                  seekTo(currentTime + 10);
                  triggerFlash({ kind: 'seek-right', label: '10s' });
                }}>
                <Ionicons name="play-forward" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Bottom scrim + scrub bar — gradient, not a flat block */}
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)']}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: fullscreen ? 130 : 100,
              }}
            />
            <View className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-6">
              <View
                {...seekPanResponder.panHandlers}
                onLayout={(event) => setSeekBarWidth(event.nativeEvent.layout.width)}
                style={{ height: 20, justifyContent: 'center' }}>
                <View
                  style={{
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: 'rgba(255,255,255,0.25)',
                  }}>
                  <View
                    style={{
                      height: 3,
                      borderRadius: 2,
                      width: fillWidth,
                      backgroundColor: COLORS.accent,
                    }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      left: Math.max(0, fillWidth - 6),
                      top: -4.5,
                      width: isScrubbing ? 14 : 11,
                      height: isScrubbing ? 14 : 11,
                      borderRadius: 7,
                      backgroundColor: COLORS.accent,
                      borderWidth: 2,
                      borderColor: COLORS.bg,
                    }}
                  />
                </View>
                {isScrubbing && (
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: clamp(fillWidth - 22, 0, Math.max(0, seekBarWidth - 44)),
                      top: -26,
                      backgroundColor: COLORS.surfaceRaised,
                      borderRadius: 6,
                      paddingHorizontal: 6,
                      paddingVertical: 3,
                    }}>
                    <Text style={{ color: COLORS.accent, fontSize: 11, fontWeight: '600' }}>
                      {formatTimecode(scrubPreviewTime)}
                    </Text>
                  </View>
                )}
              </View>

              <View className="mt-2 flex-row items-center justify-between">
                <Text style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: '500' }}>
                  {formatTimecode(currentTime)}
                  <Text style={{ color: COLORS.textFaint }}> / {formatTimecode(duration)}</Text>
                </Text>
                <TouchableOpacity onPress={() => changeFullscreen(!fullscreen)}>
                  <Ionicons
                    name={fullscreen ? 'contract' : 'expand'}
                    size={18}
                    color={COLORS.text}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}

        {isBuffering && (
          <View
            pointerEvents="none"
            className="absolute inset-0 items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>
        )}
      </View>
    );
  };

  if (isLoading || !videoSource) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: COLORS.bg }}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={{ color: COLORS.textMuted, marginTop: 16 }}>
          {isLoading ? 'Loading video source…' : 'No video source available'}
        </Text>
        {queryError && (
          <Text style={{ color: '#F87171', marginTop: 8 }}>Error: {String(queryError)}</Text>
        )}
      </View>
    );
  }

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

      {isSubtitleReady
        ? !isFullscreen && renderPlayerSurface(false)
        : !isFullscreen && (
            <View
              className="h-64 items-center justify-center"
              style={{ backgroundColor: COLORS.bg }}>
              <ActivityIndicator size="large" color={COLORS.accent} />
              <Text style={{ color: COLORS.textMuted, marginTop: 12, fontSize: 13 }}>
                {subtitleStatus}
              </Text>
            </View>
          )}

      {/* Fullscreen: a plain absolutely-positioned view, NOT a <Modal>.
          This is the actual fix for "can't open servers/subtitles in
          fullscreen" — nesting a second RN Modal inside a fullscreen Modal
          is unreliable on iOS. With only one real Modal in the tree (the
          settings sheet below), it always renders above this correctly. */}
      {isFullscreen && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 1000, backgroundColor: COLORS.bg }]}>
          {renderPlayerSurface(true)}
        </View>
      )}

      {/* Servers / subtitles bottom sheet — the one real Modal in the tree */}
      <Modal
        animationType="slide"
        transparent
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}>
        <Pressable
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onPress={() => setIsModalVisible(false)}>
          <Pressable
            className="max-h-[70%] w-full rounded-t-3xl px-5 pb-8 pt-3"
            style={{ backgroundColor: COLORS.surface }}
            onPress={(e) => e.stopPropagation()}>
            <View
              style={{
                alignSelf: 'center',
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: COLORS.divider,
                marginBottom: 16,
              }}
            />

            <View
              className="mb-4 flex-row rounded-full p-1"
              style={{ backgroundColor: COLORS.surfaceRaised }}>
              {(['servers', 'subtitles'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  className="flex-1 items-center rounded-full py-2.5"
                  style={{ backgroundColor: activeTab === tab ? COLORS.accent : 'transparent' }}
                  onPress={() => setActiveTab(tab)}>
                  <Text
                    style={{
                      color: activeTab === tab ? COLORS.bg : COLORS.textMuted,
                      fontWeight: '700',
                      fontSize: 13,
                      textTransform: 'capitalize',
                    }}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView className="w-full" showsVerticalScrollIndicator={false}>
              {activeTab === 'servers' ? (
                servers.length === 0 ? (
                  <View
                    className="items-center rounded-xl p-4"
                    style={{ backgroundColor: COLORS.surfaceRaised }}>
                    <Text style={{ color: COLORS.textMuted }}>No servers available</Text>
                  </View>
                ) : (
                  servers.map((server, index) => {
                    const active = activeServerIndex === index;
                    return (
                      <Pressable
                        key={index}
                        className="mb-2 flex-row items-center justify-between rounded-xl p-3.5"
                        style={{
                          backgroundColor: COLORS.surfaceRaised,
                          borderWidth: active ? 1.5 : 0,
                          borderColor: COLORS.accent,
                        }}
                        onPress={() => {
                          setSelectedServerIndex(index);
                          setIsModalVisible(false);
                        }}>
                        <Text style={{ color: COLORS.text, fontSize: 14 }}>
                          {server.serverName}
                        </Text>
                        <View
                          className="rounded-full px-2 py-0.5"
                          style={{ backgroundColor: active ? COLORS.accent : COLORS.divider }}>
                          <Text
                            style={{
                              color: active ? COLORS.bg : COLORS.textMuted,
                              fontSize: 10,
                              fontWeight: '700',
                            }}>
                            {server.type.toUpperCase()}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })
                )
              ) : validSubtitleTracks.length === 0 ? (
                <View
                  className="items-center rounded-xl p-4"
                  style={{ backgroundColor: COLORS.surfaceRaised }}>
                  <Text style={{ color: COLORS.textMuted }}>No subtitles available</Text>
                </View>
              ) : (
                <>
                  <Pressable
                    className="mb-2 flex-row items-center justify-between rounded-xl p-3.5"
                    style={{
                      backgroundColor: COLORS.surfaceRaised,
                      borderWidth: selectedSubtitleIndex === null ? 1.5 : 0,
                      borderColor: COLORS.accent,
                    }}
                    onPress={() => {
                      setSelectedSubtitleIndex(null);
                      setIsModalVisible(false);
                    }}>
                    <Text style={{ color: COLORS.text, fontSize: 14 }}>None</Text>
                  </Pressable>

                  {validSubtitleTracks.map((track, index) => {
                    const active = selectedSubtitleIndex === index;
                    return (
                      <Pressable
                        key={index}
                        className="mb-2 flex-row items-center justify-between rounded-xl p-3.5"
                        style={{
                          backgroundColor: COLORS.surfaceRaised,
                          borderWidth: active ? 1.5 : 0,
                          borderColor: COLORS.accent,
                        }}
                        onPress={() => {
                          setSelectedSubtitleIndex(index);
                          setIsModalVisible(false);
                        }}>
                        <Text style={{ color: COLORS.text, fontSize: 14 }}>{track.title}</Text>
                        {active && (
                          <Ionicons name="checkmark-circle" size={16} color={COLORS.accent} />
                        )}
                      </Pressable>
                    );
                  })}
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  subtitleText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    paddingHorizontal: 4,
  },
});

export default WatchScreen;
