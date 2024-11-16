import { FlatList, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { getFormattedTitle } from '~/helpers/TextFormat';
import { hp, wp } from '~/helpers/common';
import { Anime } from '~/types';

type RowItemProps = {
  name: string;
  seeAll: boolean;
  data: Anime[];
};

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const TrendingRowItem = ({ name, seeAll = true, data }: RowItemProps) => {
  const renderItem = ({ item, index }: { item: Anime; index: number }) => {
    return (
      <AnimatedTouchableOpacity
        entering={FadeInRight.delay(index * 200).duration(500)}
        className="flex px-2">
        <View className="overflow-hidden rounded-full">
          <ImageBackground
            source={{ uri: item.poster }}
            className="flex items-center justify-center"
            style={styles.Image}>
            <View className="absolute bottom-0 left-0 right-0 top-0 z-auto bg-black opacity-60" />
            <Text className="text-5xl text-lime-400">{item.rank}</Text>
          </ImageBackground>
        </View>
      </AnimatedTouchableOpacity>
    );
  };

  return (
    <>
      <View className="flex flex-row items-center justify-between p-4 pt-8">
        <Text className="text-3xl font-semibold text-white">{getFormattedTitle(name)}</Text>
        {seeAll && <Text className="text-base text-lime-300">view all</Text>}
      </View>
      <FlatList
        nestedScrollEnabled
        scrollEventThrottle={0.5}
        horizontal
        data={data}
        contentContainerClassName="px-2"
        showsHorizontalScrollIndicator={false}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
      />
    </>
  );
};

export default TrendingRowItem;

const styles = StyleSheet.create({
  Image: {
    width: wp(18),
    height: hp(9),
  },
});
