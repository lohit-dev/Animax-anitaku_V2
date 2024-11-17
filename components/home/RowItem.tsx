import { FlatList, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

import { getFormattedTitle } from '~/helpers/TextFormat';
import { hp, wp } from '~/helpers/common';
import { Anime } from '~/types';

type RowItemProps = {
  name: string;
  seeAll: boolean;
  data: Anime[] | undefined;
  className?: string;
  rounded?: boolean;
};

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const RowItem = ({ name, seeAll = true, data, className, rounded = false }: RowItemProps) => {
  const renderItem = ({ item, index }: { item: Anime; index: number }) => {
    return (
      <AnimatedTouchableOpacity
        entering={FadeInDown.delay(index * 400).duration(500)}
        className="flex px-2">
        <View className="overflow-hidden rounded-2xl">
          <ImageBackground source={{ uri: item.poster }} style={styles.Image} />
        </View>
      </AnimatedTouchableOpacity>
    );
  };

  const roundedRenderItem = ({ item, index }: { item: Anime; index: number }) => {
    return (
      <AnimatedTouchableOpacity
        entering={FadeInRight.delay(index * 200).duration(500)}
        className="flex px-2">
        <View className="overflow-hidden rounded-full">
          <ImageBackground
            source={{ uri: item.poster }}
            className="flex items-center justify-center"
            style={styles.roundedImage}>
            <View className="absolute bottom-0 left-0 right-0 top-0 z-auto bg-black opacity-50" />
            <Text className="font-salsa text-5xl text-lime-400">{item.rank}</Text>
          </ImageBackground>
        </View>
      </AnimatedTouchableOpacity>
    );
  };

  return (
    <View className={className}>
      <View className="flex flex-row items-center justify-between p-4 pt-8">
        <Text className="font-salsa text-2xl font-semibold text-white">
          {getFormattedTitle(name)}
        </Text>
        {seeAll && <Text className="font-salsa text-base text-lime-300">view all</Text>}
      </View>
      <FlatList
        nestedScrollEnabled
        scrollEventThrottle={0.5}
        horizontal
        data={data}
        contentContainerClassName="px-2"
        showsHorizontalScrollIndicator={false}
        renderItem={rounded ? roundedRenderItem : renderItem}
        keyExtractor={(_, index) => index.toString()}
      />
    </View>
  );
};

export default RowItem;

const styles = StyleSheet.create({
  Image: {
    width: wp(28),
    height: hp(19),
  },
  roundedImage: {
    width: wp(20),
    height: wp(20),
  },
});
