import { Play } from 'iconsax-react-native';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { PLAYER_COLORS as COLORS } from '~/constants/Colors';

export type UpNextEpisode = {
  id: string;
  number: string;
  title: string;
  image?: string;
};

type UpNextCardProps = {
  episode: UpNextEpisode | null;
  onPlay: () => void;
  autoplaySeconds?: number | null;
};

const UpNextCard = ({ episode, onPlay, autoplaySeconds = null }: UpNextCardProps) => {
  const [secondsLeft, setSecondsLeft] = useState(autoplaySeconds ?? 0);
  const [cancelled, setCancelled] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!episode || cancelled || !autoplaySeconds || autoplaySeconds <= 0) {
      return;
    }

    setSecondsLeft(autoplaySeconds);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onPlay();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode?.id, cancelled, autoplaySeconds]);

  if (!episode) return null;

  if (cancelled) {
    return null;
  }

  return (
    <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
      <Text
        style={{
          color: COLORS.accent,
          fontSize: 12,
          fontWeight: '800',
          letterSpacing: 0.5,
          marginBottom: 12,
        }}>
        UP NEXT
      </Text>

      <View
        style={{
          flexDirection: 'row',
          gap: 12,
          backgroundColor: COLORS.surface,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: COLORS.stroke ?? 'rgba(255,255,255,0.08)',
          padding: 12,
        }}>
        <Image
          source={{ uri: episode.image }}
          style={{ width: 120, height: 78, borderRadius: 12, backgroundColor: COLORS.bg }}
        />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text
            style={{
              color: COLORS.textMuted,
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 0.5,
            }}>
            EPISODE {episode.number}
          </Text>
          <Text
            numberOfLines={1}
            style={{ color: COLORS.text, fontSize: 14, fontWeight: '700', marginTop: 4 }}>
            {episode.title}
          </Text>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <Pressable
              onPress={onPlay}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: COLORS.accent,
                paddingVertical: 7,
                paddingHorizontal: 14,
                borderRadius: 999,
              }}>
              <Play size={12} color={COLORS.bg} variant="Bold" />
              <Text style={{ color: COLORS.bg, fontSize: 12, fontWeight: '700' }}>
                {autoplaySeconds && autoplaySeconds > 0 && !cancelled
                  ? `Play · ${secondsLeft}s`
                  : 'Play'}
              </Text>
            </Pressable>

            {!cancelled && (
              <Pressable
                onPress={() => setCancelled(true)}
                style={{
                  paddingVertical: 7,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: COLORS.stroke ?? 'rgba(255,255,255,0.15)',
                }}>
                <Text style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: '700' }}>
                  Cancel
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

export default UpNextCard;
