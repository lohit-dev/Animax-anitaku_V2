import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { hp, wp } from '~/helpers/common';
import { Anime } from '~/types';

type HomeBannerProps = {
  index: number;
  item: Anime;
  x: SharedValue<number>;
};

const HomeBanner = ({ index, item, x }: HomeBannerProps) => {
  const { width } = useWindowDimensions();

  const animatedStyle = useAnimatedStyle(() => {
    const currentOffset = index * width;

    const opacityAnim =
      Math.abs(x.value - currentOffset) < width / 2
        ? 1
        : interpolate(
            x.value,
            [currentOffset - width, currentOffset + width],
            [0, 1, 0],
            Extrapolation.CLAMP
          );

    return {
      opacity: opacityAnim,
    };
  });

  return <Animated.Image source={{ uri: item.poster }} style={[styles.Image, animatedStyle]} />;
};

export default HomeBanner;

const styles = StyleSheet.create({
  Image: {
    ...StyleSheet.absoluteFillObject,
    width: wp(100),
    height: hp(56),
  },
});
