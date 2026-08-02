import { ArrowSwapVertical } from 'iconsax-react-native';
import React from 'react';
import { FlatList, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { getFormattedTitle } from '~/helpers/TextFormat';
import { wp } from '~/helpers/common';
import { CharacterVoiceActor } from '~/types';

// Created once outside the component so it's not re-created on every render
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

type CharacterVoiceActorRowProps = {
  data: CharacterVoiceActor[];
  className?: string;
  seeAll?: boolean;
  rounded?: boolean;
};

type RoundedRowItemProps = {
  item: CharacterVoiceActor;
};

const RoundedRowItem = ({ item }: RoundedRowItemProps) => {
  // item.image is the character image — skip if missing
  if (!item?.image) {
    return null;
  }

  return (
    <View className="flex items-center justify-center">
      {/* Character */}
      <AnimatedTouchableOpacity
        entering={FadeInRight.duration(500)}
        className="flex items-center justify-center pr-2 pt-2">
        <View className="overflow-hidden rounded-full">
          <ImageBackground
            source={{ uri: item.image }}
            className="flex items-center justify-center"
            style={styles.roundedImage}
          />
        </View>
        <Text className="font-salsa p-1 text-base text-white" numberOfLines={2}>
          {getFormattedTitle(item.name)}
        </Text>
        <Text className="font-salsa p-1 text-base text-lime-400" numberOfLines={1}>
          {item.role}
        </Text>
      </AnimatedTouchableOpacity>

      {/* Connector */}
      {item.voiceActor ? <ArrowSwapVertical size="28" color="#a3e635" /> : null}

      {/* Voice Actor */}
      {item.voiceActor ? (
        <AnimatedTouchableOpacity
          entering={FadeInRight.duration(500)}
          className="flex items-center justify-center pr-2 pt-2">
          <View className="overflow-hidden rounded-full">
            <ImageBackground
              source={{ uri: item.voiceActor.image }}
              className="flex items-center justify-center"
              style={styles.roundedImage}
            />
          </View>
          <Text className="font-salsa p-1 text-base text-white" numberOfLines={2}>
            {getFormattedTitle(item.voiceActor.name)}
          </Text>
          <Text className="font-salsa p-1 text-base text-lime-400" numberOfLines={1}>
            {item.voiceActor.language || 'Voice Actor'}
          </Text>
        </AnimatedTouchableOpacity>
      ) : null}
    </View>
  );
};

export const CharacterVoiceActorRow = ({
  className,
  data = [],
  seeAll,
}: CharacterVoiceActorRowProps) => {
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

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
        keyExtractor={(item) => item.id}
        initialNumToRender={10}
        maxToRenderPerBatch={20}
      />
    </View>
  );
};

export default CharacterVoiceActorRow;

const styles = StyleSheet.create({
  roundedImage: {
    width: wp(20),
    height: wp(20),
  },
});
