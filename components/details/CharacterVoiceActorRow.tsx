import { ArrowSwapVertical } from 'iconsax-react-native';
import React from 'react';
import { FlatList, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { getFormattedTitle } from '~/helpers/TextFormat';
import { hp, wp } from '~/helpers/common';
import { CharacterVoiceActor } from '~/types';

type CharacterVoiceActorRowProps = {
  data: CharacterVoiceActor[];
  className?: string;
  seeAll?: boolean;
  rounded: boolean;
};

export const CharacterVoiceActorRow = ({
  className,
  data = [],
  seeAll,
  rounded,
}: CharacterVoiceActorRowProps) => {
  if (!Array.isArray(data) || data.length === 0) {
    console.log('No character data available');
    return null;
  }

  const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

  type RoundedRowItemProps = {
    item: CharacterVoiceActor;
  };

  const RoundedRowItem = ({ item }: RoundedRowItemProps) => {
    if (!item?.character?.poster) {
      return null;
    }

    return (
      <View className="flex items-center justify-center">
        <AnimatedTouchableOpacity
          entering={FadeInRight.duration(500)}
          className="flex items-center justify-center pr-2 pt-2">
          <View className="overflow-hidden rounded-full">
            <ImageBackground
              source={{ uri: item.character.poster }}
              className="flex items-center justify-center"
              style={styles.roundedImage}
            />
          </View>
          <Text className="font-salsa p-1 text-base text-white">
            {getFormattedTitle(item.character.name)}
          </Text>
          <Text className="font-salsa p-1 text-base text-lime-400">{item.character.cast}</Text>
        </AnimatedTouchableOpacity>

        {/* A line to like map the character to the voice actor */}
        <ArrowSwapVertical size="28" color="#a3e635" />

        <AnimatedTouchableOpacity
          entering={FadeInRight.duration(500)}
          className="flex items-center justify-center pr-2 pt-2">
          <View className="overflow-hidden rounded-full">
            <ImageBackground
              source={{ uri: item.voiceActor.poster }}
              className="flex items-center justify-center"
              style={styles.roundedImage}
            />
          </View>
          <Text className="font-salsa p-1 text-base text-white">
            {getFormattedTitle(item.voiceActor.name)}
          </Text>
          <Text className="font-salsa p-1 text-base text-lime-400">{item.voiceActor.cast}</Text>
        </AnimatedTouchableOpacity>
      </View>
    );
  };

  return (
    <View className={className}>
      <View className="flex flex-row items-center justify-between pb-2 pt-8">
        <Text className="font-salsa text-3xl font-semibold text-white">
          {getFormattedTitle('Characters & Voice Actors')}
        </Text>
        {seeAll && (
          <TouchableOpacity onPress={() => {}}>
            <Text className="font-salsa text-base text-lime-300">View all</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        nestedScrollEnabled
        scrollEventThrottle={0.5}
        horizontal
        data={data}
        contentContainerClassName="px-2"
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => <RoundedRowItem item={item} />}
        keyExtractor={(_, index) => index.toString()}
        initialNumToRender={10}
        maxToRenderPerBatch={20}
      />
    </View>
  );
};

export default CharacterVoiceActorRow;

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
