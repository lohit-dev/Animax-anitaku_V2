import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import LottieView from 'lottie-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import { hp, wp } from '~/helpers/common';
import { fetchAnimeById } from '~/services/AnimeService';

const AnimeDetails = () => {
  const { id } = useLocalSearchParams();
  const { data, error, isLoading } = useQuery({
    queryKey: ['details_page', id],
    queryFn: () => fetchAnimeById(id as string),
  });

  const animeData = data?.data?.anime;

  if (isLoading) {
    return (
      <View className="flex flex-1 items-center justify-center bg-neutral-950">
        <LottieView
          source={require('~/assets/lottie/loading.json')}
          autoPlay
          loop
          style={{ height: hp(40), width: wp(45) }}
        />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex flex-1 items-center justify-center bg-neutral-950">
        <LottieView
          source={require('~/assets/lottie/Error.json')}
          autoPlay
          loop
          style={{ height: hp(40), width: wp(70) }}
        />
        <Text className="mt-3 text-2xl text-white">{error.message}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-neutral-950">
      <Text className="text-center text-3xl text-white">Anime Details Screen</Text>
      <Text className="text-center text-2xl text-white">ID: {id}</Text>
      <Text className="text-center text-2xl text-white">
        description: {animeData?.info.description}
      </Text>
    </View>
  );
};

export default AnimeDetails;

// const styles = StyleSheet.create({
//   Image: {
//     ...StyleSheet.absoluteFillObject,
//     width: wp(100),
//     height: hp(56),
//   },
// });
