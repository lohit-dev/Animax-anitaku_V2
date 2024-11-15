import { Add, Play } from 'iconsax-react-native';
import React from 'react';
import { Pressable, Text, TouchableOpacity, View } from 'react-native';

const HomeButtons = () => {
  return (
    <View className="-mt-3 flex-row justify-evenly gap-5 px-16">
      {/* Play Trailer Button */}
      <Pressable
        className="flex-1 flex-row items-center justify-center gap-2 space-x-2 rounded-3xl bg-lime-300 p-3"
        onPress={() => {
          // openYouTubeVideo or navigate to a trailer
          alert('Play Trailer');
        }}>
        <Play size={24} color="#000" variant="Bold" />
        <Text className="text-lg font-semibold text-black">Play Trailer</Text>
      </Pressable>

      {/* Add to My List Button */}
      <TouchableOpacity
        className="flex-1 flex-row items-center justify-center gap-2 space-x-2 rounded-3xl border border-solid border-gray-500 bg-transparent p-3"
        onPress={() => {
          // Add to the user's list (e.g., update state or call an API)
          alert('Added to My List');
        }}>
        <Add size={24} variant="Broken" color="#FFF" />
        <Text className="text-lg font-semibold text-white">My List</Text>
      </TouchableOpacity>
    </View>
  );
};

export default HomeButtons;
