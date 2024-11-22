import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View, Text } from 'react-native';

const AnimeDetails = () => {
  const { id } = useLocalSearchParams();

  return (
    <View className="flex-1 items-center justify-center bg-neutral-950">
      <Text className="text-center text-3xl text-white">Anime Details Screen</Text>
      <Text className="text-center text-2xl text-white">ID: {id}</Text>
    </View>
  );
};

export default AnimeDetails;
