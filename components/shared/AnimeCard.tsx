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
}

const AnimeCard: React.FC<AnimeCardProps> = React.memo(({ item, index }) => {
  const router = useRouter();
  const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

  const handleNavigation = () => {
    // Navigate to the details route
    router.push({ pathname: '/anime/[id]', params: { id: item.id } });
  };

  return (
    <AnimatedTouchableOpacity
      onPress={handleNavigation}
      entering={FadeInDown.delay(index * 400).duration(500)}
      className="flex-1 items-center justify-center p-2">
      <View className="overflow-hidden rounded-2xl">
        <ImageBackground source={{ uri: item.poster }} style={styles.Image}>
          <View className="flex-1 items-end justify-start p-2">
            <Pressable className="flex-row items-center justify-center space-x-1 rounded-full bg-lime-200 px-2 py-[2]">
              {item.rating ? (
                <View className="flex flex-row items-center justify-center gap-1">
                  <Star1 variant="Bold" size={12} color="#000" />
                  <Text className="font-salsa text-black">{item.rating}</Text>
                </View>
              ) : item.episodes?.sub || item.episodes?.dub ? (
                <Text className="font-salsa font-bold text-black">
                  {item.episodes?.sub && item.episodes?.dub
                    ? `Sub | Dub`
                    : item.episodes?.sub
                      ? `Sub`
                      : `Dub`}
                </Text>
              ) : (
                <Text>{item.type}</Text>
              )}
            </Pressable>
          </View>
        </ImageBackground>
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
