import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft2, DocumentDownload, Heart, Share } from 'iconsax-react-native';
import LottieView from 'lottie-react-native';
import React, { useCallback, useRef, useState } from 'react';
import {
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Share as RNShare,
  BackHandler,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from 'react-native-toast-notifications';

import { useSavedAnimesStore } from '~/app/_store/useSavedAnimesStore';
// import CharacterVoiceActorRow from '~/components/details/CharacterVoiceActorRow';
import EpisodeListSheet from '~/components/details/EpisodeListSheet';
import InfoRow from '~/components/details/InfoRow';
import { getFormattedTitle } from '~/helpers/TextFormat';
import { hp, wp } from '~/helpers/common';
import { fetchAnimeById } from '~/services/AnimeService';
import { Anime, AnimeInfoResponse } from '~/types';

export const AnimeDetails = () => {
  const nav = useRouter();
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { id } = useLocalSearchParams<{ id: string }>();
  const savedAnimes = useSavedAnimesStore((s) => s.animes);
  const addAnime = useSavedAnimesStore((s) => s.addAnime);
  const removeAnime = useSavedAnimesStore((s) => s.removeAnime);
  const [selectedType, setSelectedType] = useState<'sub' | 'dub'>('sub');
  const [isEpisodeSheetOpen, setIsEpisodeSheetOpen] = useState(false);

  const {
    data: animeData,
    error,
    isLoading,
  } = useQuery<AnimeInfoResponse>({
    queryKey: ['details_page', id],
    queryFn: () => fetchAnimeById(id),
  });

  const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);

  const titleLength = animeData?.title?.length;
  const titleStyle = titleLength && titleLength > 12 ? 'text-3xl' : 'text-4xl';
  const titleStyleFirstLetter = titleLength && titleLength > 12 ? 'text-4xl' : 'text-5xl';

  const toast = useToast();

  const [isFav, setIsFav] = useState(() => savedAnimes.some((anime) => anime.slug === id));
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const handleBack = React.useCallback(() => {
    if (isEpisodeSheetOpen) {
      bottomSheetRef.current?.dismiss();
      return;
    }

    if (nav.canGoBack()) {
      nav.back();
      return;
    }

    nav.replace('/(tabs)/Home');
  }, [isEpisodeSheetOpen, nav]);

  const openEpisodeSheet = React.useCallback((type: 'sub' | 'dub') => {
    setSelectedType(type);
    setIsEpisodeSheetOpen(true);
    requestAnimationFrame(() => bottomSheetRef.current?.present());
  }, []);

  const handleShare = async () => {
    try {
      const deepLink = `animax://anime/${id}`;
      const webFallback = 'https://github.com/lohit-dev/Animax-anitaku_V2';

      const message =
        `🌟 ${animeData?.title.toUpperCase()} 🌟\n\n` +
        `${animeData?.alternateTitles?.[0] || 'Unknown'}\n` +
        `Rating: ${animeData?.rating}\n\n` +
        `📺 Watch now on Animax!\n` +
        `- Anime to the max! 🚀\n\n` +
        `📱 Open in Animax: ${deepLink}\n` +
        `🌐 Or visit: ${webFallback}`;

      await RNShare.share({
        message,
        title: `Share ${animeData?.title}`,
        url: deepLink,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddToLibrary = useCallback(() => {
    if (!animeData) return;

    if (isFav) {
      removeAnime(id as string);
    } else {
      const basicAnime: Anime = {
        slug: animeData.id,
        title: animeData.title,
        image: animeData.image,
        synopsis: animeData.synopsis,
        rating: animeData.rating,
        type: animeData.type,
      };
      addAnime(basicAnime);
    }
    setIsFav(!isFav);
    toast.show(isFav ? 'Removed from library' : 'Added to library', {
      type: 'success',
      placement: 'bottom',
      duration: 2000,
    });
  }, [animeData, id, isFav, addAnime, removeAnime, toast]);

  // console.log(animeData?.info.charactersVoiceActors);

  // Add useEffect to handle back button press
  useFocusEffect(
    React.useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });

      return () => backHandler.remove();
    }, [handleBack])
  );

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
        // @ts-ignore
        sharedTransitionTag="image"
        source={{ uri: animeData.image }}
        resizeMode="cover"
        style={styles.image}>
        <LinearGradient
          style={StyleSheet.absoluteFill}
          colors={[
            'rgba(0,0,0,0.10)',
            'rgba(0,0,0,0.20)',
            'rgba(11,11,11,0.88)',
            'rgba(11,11,11,1)',
          ]}
          locations={[0, 0.45, 0.82, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}>
          <View style={styles.heroContent}>
            <SafeAreaView className="flex flex-1">
              <View className="flex-row items-center justify-between px-3">
                <TouchableOpacity
                  accessibilityLabel="Go back"
                  className="rounded-xl bg-lime-500 p-1"
                  hitSlop={12}
                  onPress={handleBack}
                  style={styles.headerBackButton}>
                  <ArrowLeft2 size={26} strokeWidth={2.5} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAddToLibrary}>
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
                className={`font-salsa pt-2 text-center tracking-wider text-white ${titleStyle}`}>
                {getFormattedTitle(animeData.title, titleStyleFirstLetter)}
              </Text>
            </View>

            <View className="flex-row items-center justify-center">
              <Text className="font-salsa text-center text-base font-semibold text-neutral-400">
                {animeData.status} •
              </Text>
              <Text className="font-salsa text-center text-base font-semibold text-neutral-400">
                {' '}
                {animeData.released} •
              </Text>
              <Text className="font-salsa text-center text-base font-semibold text-neutral-400">
                {' '}
                {animeData.duration}
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
            <TouchableOpacity onPress={handleShare}>
              <Share size="28" color="#a3e635" variant="Bulk" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {}}>
              <DocumentDownload size="28" color="#a3e635" variant="TwoTone" />
            </TouchableOpacity>
          </View>
        </View>

        <Text className="font-salsa pt-3 text-base text-neutral-300/85">
          {showFullDescription ? animeData.synopsis : `${animeData.synopsis.substring(0, 155)}...`}
          {animeData.synopsis.length > 155 && (
            <Text
              className="text-lg text-lime-300"
              onPress={() => setShowFullDescription(!showFullDescription)}>
              {showFullDescription ? ' Read Less' : ' Read More'}
            </Text>
          )}
        </Text>
        {/* Episodes Section */}
        <View className="mt-8">
          <Text className="font-salsa text-3xl tracking-wider text-white">
            {getFormattedTitle('Episodes', 'text-4xl font-semibold')}
          </Text>
          <View className="mt-4 flex-row gap-4">
            <TouchableOpacity
              className="flex-1 items-center rounded-xl bg-lime-500/20 p-3"
              onPress={() => {
                openEpisodeSheet('sub');
              }}>
              <Text className="font-salsa text-lg text-white">Sub</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 items-center rounded-xl bg-lime-500/20 p-3"
              onPress={() => {
                openEpisodeSheet('dub');
              }}>
              <Text className="font-salsa text-lg text-white">Dub</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Episode List Sheet */}
        <EpisodeListSheet
          animeId={id}
          animeTitle={animeData.title}
          animeImage={animeData.image}
          type={selectedType}
          bottomSheetRef={bottomSheetRef as React.RefObject<BottomSheetModal>}
          onEpisodePress={(episodeId: string) => {
            console.log(`Playing ${selectedType} episode ${episodeId}`);
          }}
          onDismiss={() => setIsEpisodeSheetOpen(false)}
          enablePanDownToClose
          enableBackdropPress
        />

        {/* More Info Section */}
        <View className="mb-6 mt-8">
          <Text className="font-salsa text-3xl tracking-wider text-white">
            {getFormattedTitle('More Info', 'text-4xl font-semibold')}
          </Text>
          <View
            className="mt-4 space-y-4 rounded-3xl bg-neutral-900/60 p-5"
            style={{ width: wp(90) }}>
            <InfoRow
              label="Alternate Title"
              value={animeData.alternateTitles?.[0] || 'N/A'}
              icon="translate"
              valueStyle="text-lime-400"
              containerStyle="flex-1"
              numberOfLines={2}
            />
            <View className="h-[1px] w-full bg-neutral-800" />
            <InfoRow
              label="Premiered"
              value={animeData.released}
              icon="calendar"
              valueStyle="text-white"
            />
            <View className="h-[1px] w-full bg-neutral-800" />
            <InfoRow
              label="MAL Score"
              value={animeData.malRating || 'N/A'}
              icon="star"
              valueStyle="text-lime-400"
            />
            <View className="h-[1px] w-full bg-neutral-800" />
            <InfoRow
              label="Studios"
              value="N/A"
              icon="video"
              valueStyle="text-white"
              numberOfLines={1}
            />
            <View className="h-[1px] w-full bg-neutral-800" />
            <InfoRow
              label="Genres"
              value={animeData.genres?.join(' • ') || 'N/A'}
              icon="tag"
              valueStyle="text-lime-400"
              numberOfLines={2}
            />
            <View className="h-[1px] w-full bg-neutral-800" />
            <InfoRow label="Status" value={animeData.status} icon="info" valueStyle="text-white" />
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default AnimeDetails;

const styles = StyleSheet.create({
  headerBackButton: {
    elevation: 2,
    zIndex: 2,
  },
  heroContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 48,
  },
  image: {
    resizeMode: 'stretch',
    width: wp(100),
    height: hp(63),
  },
});
