import { useRouter } from 'expo-router';
import { Star1 } from 'iconsax-react-native';
import React from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { hp, wp } from '~/helpers/common';
import { Anime } from '~/types';

interface AnimeCardProps {
  item: Anime;
  index: number;
  detailsEnabled?: boolean;
}

const AnimeCard: React.FC<AnimeCardProps> = React.memo(({ item, index, detailsEnabled = true }) => {
  const router = useRouter();

  const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
  const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);

  const handleNavigation = () => {
    router.push({ pathname: '/anime/[id]', params: { id: item.slug, poster: item.image } });
  };

  return (
    <AnimatedTouchableOpacity
      onPress={handleNavigation}
      entering={FadeInDown.delay(index * 400).duration(500)}
      className="flex-1 items-center justify-center p-2">
      <View className="overflow-hidden rounded-2xl">
        <AnimatedImageBackground
          source={{ uri: item.image }}
          style={styles.Image}
          sharedTransitionTag="image">
          {detailsEnabled && (
            <View className="flex-1 items-end justify-start p-2">
              <Pressable className="flex-row items-center justify-center space-x-1 rounded-full bg-lime-200 px-2 py-[2]">
                {item.rating ? (
                  <View className="flex flex-row items-center justify-center gap-1">
                    <Star1 variant="Bold" size={12} color="#000" />
                    <Text className="font-salsa text-black">{item.rating}</Text>
                  </View>
                ) : item.sub || item.dub ? (
                  <Text className="font-salsa font-bold text-black">
                    {item.sub && item.dub ? `Sub | Dub` : item.sub ? `Sub` : `Dub`}
                  </Text>
                ) : (
                  <Text>{item.type}</Text>
                )}
              </Pressable>
            </View>
          )}
        </AnimatedImageBackground>
      </View>
    </AnimatedTouchableOpacity>
  );
});

export default AnimeCard;

const styles = StyleSheet.create({
  Image: {
    width: wp(28),
    height: hp(19),
  },
});
