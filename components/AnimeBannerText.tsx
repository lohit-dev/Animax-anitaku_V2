import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { hp, wp } from '~/helpers/common';
import { Anime } from '~/types';

type AnimeBannerTextProps = {
  item: Anime;
  index: number;
  x: SharedValue<number>;
};

const getFormattedTitle = (title: string) => {
  const words = title.split(/(\s+|\W)/).filter(Boolean);
  return words.map((word, index) => {
    if (word.match(/[a-zA-Z]/)) {
      const firstLetter = word.charAt(0);
      const restOfWord = word.slice(1);

      return (
        <React.Fragment key={index}>
          <Text className="font-bold text-lime-300">{firstLetter}</Text>
          {restOfWord}
        </React.Fragment>
      );
    }

    return (
      <React.Fragment key={index}>
        <Text className="text-white">{word}</Text>
      </React.Fragment>
    );
  });
};

const AnimeBannerText = ({ item, index, x }: AnimeBannerTextProps) => {
  const { width } = useWindowDimensions();

  const animatedStyle = useAnimatedStyle(() => {
    const translateYAnim = interpolate(
      x.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [-100, 0, 100],
      Extrapolation.CLAMP
    );

    const opacityAnim = interpolate(
      x.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [-5, 1, -5],
      Extrapolation.CLAMP
    );

    return {
      opacity: opacityAnim,
      transform: [{ translateY: translateYAnim }],
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View
        className="absolute bottom-0 left-0 right-0 object-contain text-center text-5xl text-white"
        style={styles.title}>
        <Text className="text-center text-5xl font-bold text-white">
          {getFormattedTitle(item.title)}
        </Text>
        <View className="flex-row flex-wrap items-center justify-center px-14">
          <Text className="font-bold text-lime-300">{item.releaseDate}</Text>
          <Text className="text-xl text-lime-300"> • </Text>
          {item.genres.map((genre, i) => (
            <React.Fragment key={i}>
              <Text className="text-sm font-semibold text-gray-300">{genre}</Text>
              {i < item.genres.length - 1 && <Text className="text-2xl text-lime-300"> • </Text>}
            </React.Fragment>
          ))}
        </View>
      </View>
    </Animated.View>
  );
};

export default AnimeBannerText;

const styles = StyleSheet.create({
  container: {
    width: wp(100),
    height: hp(56),
  },
  title: {
    height: 100,
  },
});
