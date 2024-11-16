import { Add, Play } from 'iconsax-react-native';
import React from 'react';
import { Pressable, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

const HomeButtons = () => {
  return (
    <Animated.View
      entering={FadeInUp.delay(400).duration(500)}
      className="-mt-2 flex-row justify-evenly gap-5 px-16">
      {/* Play Trailer Button */}
      <Pressable
        className="flex-1 flex-row items-center justify-center gap-2 space-x-2 rounded-3xl bg-lime-300 p-3"
        onPress={() => {
          // openYouTubeVideo or navigate to a trailer
        }}>
        <Play size={24} color="#000" variant="Bold" />
        <Text className="text-lg font-semibold text-black">Play Trailer</Text>
      </Pressable>

      {/* Add to My List Button */}
      <TouchableOpacity
        className="flex-1 flex-row items-center justify-center gap-2 space-x-2 rounded-3xl border border-solid border-gray-500 bg-transparent p-3"
        onPress={() => {
          // Add it to the List.
        }}>
        <Add size={24} variant="Broken" color="#FFF" />
        <Text className="text-lg font-semibold text-white">My List</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default HomeButtons;
