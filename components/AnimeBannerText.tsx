import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { getFormattedTitle } from '~/helpers/TextFormat';
import { hp, wp } from '~/helpers/common';
import { Anime } from '~/types';

type AnimeBannerTextProps = {
  item: Anime;
  index: number;
  x: SharedValue<number>;
};

const AnimeBannerText = ({ item, index, x }: AnimeBannerTextProps) => {
  const { width } = useWindowDimensions();

  const titleHeight = item.jname.length > 22 ? hp(12) : hp(9);

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
        className="absolute bottom-1 left-0 right-0 object-contain px-3 text-center text-5xl text-white"
        style={[styles.title, { height: titleHeight }]}>
        <Text
          className="text-center text-4xl font-bold tracking-tight text-white"
          numberOfLines={2}
          ellipsizeMode="tail">
          {getFormattedTitle(item.jname)}
        </Text>
        <View className="flex-row flex-wrap items-center justify-center px-14">
          {/* <Text className="font-bold text-lime-300">{item.duration}</Text>
          <Text className="text-xl text-lime-300"> • </Text> */}
          {item?.otherInfo?.map((info, i) => (
            <React.Fragment key={i}>
              <Text className="text-sm font-semibold text-gray-300">{info}</Text>
              {i < info.length - 1 && <Text className="text-2xl text-lime-300"> • </Text>}
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
    height: hp(52),
  },
  title: {
    height: 100,
  },
});
