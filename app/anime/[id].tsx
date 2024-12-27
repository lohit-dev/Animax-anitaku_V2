import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft2, DocumentDownload, Heart, Share } from 'iconsax-react-native';
import LottieView from 'lottie-react-native';
import { useState } from 'react';
import {
  ImageBackground,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';

import CharacterVoiceActorRow from '~/components/details/CharacterVoiceActorRow';
import { getFormattedTitle } from '~/helpers/TextFormat';
import { hp, wp } from '~/helpers/common';
import { fetchAnimeById } from '~/services/AnimeService';
import { AnimeInfoResponse } from '~/types';

export const AnimeDetails = () => {
  const nav = useRouter();
  const [isFav, setIsFav] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    data: anime,
    error,
    isLoading,
  } = useQuery<AnimeInfoResponse>({
    queryKey: ['details_page', id],
    queryFn: () => fetchAnimeById(id),
  });

  const animeData = anime?.data?.anime;
  const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);

  const titleLength = animeData?.info?.name?.length;
  const titleStyle = titleLength && titleLength > 12 ? 'text-3xl' : 'text-4xl';
  const titleStyleFirstLetter = titleLength && titleLength > 12 ? 'text-4xl' : 'text-5xl';

  console.log(animeData?.info.charactersVoiceActors);

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
        <Text className="mt-3 text-2xl text-white">
          {error instanceof Error ? error.message : 'An error occurred'}
        </Text>
      </View>
    );
  }

  if (!animeData) {
    return (
      <View className="flex flex-1 items-center justify-center bg-neutral-950">
        <Text className="text-2xl text-white">No data available</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-neutral-950">
      <AnimatedImageBackground
        sharedTransitionTag="image"
        source={{ uri: animeData.info.poster }}
        resizeMode="cover"
        style={styles.image}>
        <LinearGradient
          className="flex-1"
          colors={[
            'rgba(0,0,0,0.17)',
            'rgba(0,0,0,0.09)',
            'rgba(11, 11, 11,0.95)',
            'rgba(11, 11, 11,1.4)',
          ]}
          locations={[0.1, 0.5, 0.9, 1]}>
          <View className="flex-1 justify-between px-4 py-8 pb-12">
            <SafeAreaView>
              <View className="mt-1 flex-row items-center justify-between p-3">
                <TouchableOpacity className="rounded-xl bg-lime-500 p-1" onPress={() => nav.back()}>
                  <ArrowLeft2 size={26} strokeWidth={2.5} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsFav(!isFav)}>
                  <Heart
                    size={35}
                    strokeWidth={2.5}
                    color={isFav ? 'red' : 'white'}
                    variant="Bold"
                  />
                </TouchableOpacity>
              </View>
            </SafeAreaView>

            <View className="flex-1 items-center justify-end">
              <Text
                ellipsizeMode="tail"
                numberOfLines={2}
                className={`pt-2 text-center font-salsa tracking-wider text-white ${titleStyle}`}>
                {getFormattedTitle(animeData.info.name, titleStyleFirstLetter)}
              </Text>
            </View>

            <View className="flex-row items-center justify-center">
              <Text className="text-center font-salsa text-base font-semibold text-neutral-400">
                {animeData.moreInfo.status} •
              </Text>
              <Text className="text-center font-salsa text-base font-semibold text-neutral-400">
                {' '}
                {animeData.moreInfo.aired} •
              </Text>
              <Text className="text-center font-salsa text-base font-semibold text-neutral-400">
                {' '}
                {animeData.moreInfo.duration}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </AnimatedImageBackground>

      <View className="-mt-4 px-6">
        <View className="flex flex-row items-center justify-between rounded-xl">
          <Text className="font-salsa text-3xl tracking-wider text-white">
            {getFormattedTitle('Description', 'text-4xl font-semibold')}
          </Text>
          <View className="flex flex-row items-center gap-5">
            <TouchableOpacity onPress={() => {}}>
              <Share size="28" color="#a3e635" variant="Bulk" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {}}>
              <DocumentDownload size="28" color="#a3e635" variant="TwoTone" />
            </TouchableOpacity>
          </View>
        </View>

        <Text className="pt-3 font-salsa text-base text-neutral-300/85">
          {showFullDescription
            ? animeData.info.description
            : `${animeData.info.description.substring(0, 155)}...`}
          {animeData.info.description.length > 155 && (
            <Text
              className="text-lg text-lime-300"
              onPress={() => setShowFullDescription(!showFullDescription)}>
              {showFullDescription ? ' Read Less' : ' Read More'}
            </Text>
          )}
        </Text>

        {animeData.info.charactersVoiceActors.length > 0 && (
          <CharacterVoiceActorRow
            rounded
            data={animeData?.info.charactersVoiceActors}
            className="mt-4"
          />
        )}
      </View>
    </ScrollView>
  );
};

export default AnimeDetails;

const styles = StyleSheet.create({
  image: {
    resizeMode: 'stretch',
    width: wp(100),
    height: hp(63),
  },
});
