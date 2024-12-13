import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft2, Heart } from 'iconsax-react-native';
import LottieView from 'lottie-react-native';
import React, { useState } from 'react';
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

import { getFormattedTitle } from '~/helpers/TextFormat';
import { hp, wp } from '~/helpers/common';
import { fetchAnimeById } from '~/services/AnimeService';

const AnimeDetails = () => {
  const nav = useRouter();
  const [isFav, setIsFav] = useState(false);
  // const [showFullDescription, setShowFullDescription] = useState(false);
  const { id, poster } = useLocalSearchParams() as { id: string; poster: string };
  const { data, error, isLoading } = useQuery({
    queryKey: ['details_page', id],
    queryFn: () => fetchAnimeById(id as string),
  });

  const animeData = data?.data?.anime;
  const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);

  const titleLength = animeData?.info.name.length;
  const titleStyle = titleLength && titleLength > 12 ? 'text-3xl' : 'text-4xl';
  const titleStyleFirstLetter = titleLength && titleLength > 12 ? 'text-4xl' : 'text-5xl';

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
    <ScrollView className="flex-1 bg-neutral-950">
      <AnimatedImageBackground
        sharedTransitionTag="image"
        source={{ uri: animeData?.info.poster }}
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
                <TouchableOpacity className="rounded-xl bg-lime-300 p-1" onPress={() => nav.back()}>
                  <ArrowLeft2 size={26} strokeWidth={2.5} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity>
                  <Heart
                    size={35}
                    strokeWidth={2.5}
                    color={isFav ? 'red' : 'white'}
                    onPress={() => setIsFav(!isFav)}
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
                {getFormattedTitle(animeData?.info.name!, titleStyleFirstLetter)}
              </Text>
            </View>
            <View className="flex-row items-center justify-center">
              <Text className="text-center font-salsa text-base font-semibold text-neutral-400">
                {animeData?.moreInfo.status} •
              </Text>
              <Text className="text-center font-salsa text-base font-semibold text-neutral-400">
                {' '}
                {animeData?.moreInfo.aired} •
              </Text>
              <Text className="text-center font-salsa text-base font-semibold text-neutral-400">
                {' '}
                {animeData?.moreInfo.duration}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </AnimatedImageBackground>
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

// {/*
//       {/* Content below Image */}
//       <View className="-mt-3 rounded-xl px-4">
//         <Text className="font-salsa text-2xl tracking-wider text-white">
//           {getFormattedTitle('Plot Details', 'text-3xl font-semibold')}
//         </Text>
//         <Text className="pt-2 font-salsa text-base text-neutral-300/85">
//           {/* // onLongPress={() => Clipboard.setString(animeDetails.description)}> */}
//           {showFullDescription
//             ? animeData?.info.description
//             : animeData?.info.description.substring(0, 270) + '...'}
//           {!showFullDescription ? (
//             <Text className="text-lg text-lime-300" onPress={() => setShowFullDescription(true)}>
//               Read More
//             </Text>
//           ) : (
//             <Text className="text-lg text-lime-300" onPress={() => setShowFullDescription(false)}>
//               Read Less
//             </Text>
//           )}
//         </Text>
//       </View>

// */}
