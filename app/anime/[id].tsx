import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft2, DocumentDownload, Heart, Share } from 'iconsax-react-native';
import LottieView from 'lottie-react-native';
import { useRef, useState, useEffect } from 'react';
import {
  ImageBackground,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Share as RNShare,
  BackHandler,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useToast } from 'react-native-toast-notifications';

import { addAnime, removeAnime } from '~/app/_store/savedAnimesSlice';
import CharacterVoiceActorRow from '~/components/details/CharacterVoiceActorRow';
import EpisodeListSheet from '~/components/details/EpisodeListSheet';
import InfoRow from '~/components/details/InfoRow';
import { getFormattedTitle } from '~/helpers/TextFormat';
import { hp, wp } from '~/helpers/common';
import { useAppSelector, useAppDispatch } from '~/hooks/SavedAnimeHook';
import { fetchAnimeById } from '~/services/AnimeService';
import { Anime, AnimeInfoResponse } from '~/types';

export const AnimeDetails = () => {
  const nav = useRouter();
  const dispatch = useAppDispatch();
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { id } = useLocalSearchParams<{ id: string }>();
  const savedAnimes = useAppSelector((state) => state.savedAnimes.animes);
  const [selectedType, setSelectedType] = useState<'sub' | 'dub'>('sub');

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

  const toast = useToast();

  const [isFav, setIsFav] = useState(() => savedAnimes.some((anime) => anime.id === id));
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const handleShare = async () => {
    try {
      const message =
        `🌟 ${animeData?.info.name.toUpperCase()} 🌟\n\n` +
        `${animeData?.moreInfo.japanese}\n` +
        `Rating: ${animeData?.info.stats.rating}\n` +
        `Episodes: ${animeData?.info.stats.episodes.sub || animeData?.info.stats.episodes.dub}\n\n` +
        `📺 Watch now on Animax!\n` +
        `- Anime to the max! 🚀`;

      await RNShare.share({
        message,
        title: `Share ${animeData?.info.name}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddToLibrary = () => {
    if (!animeData) return;

    if (isFav) {
      dispatch(removeAnime(id));
    } else {
      const mappedAnime: Anime = {
        id: animeData.info.id,
        name: animeData.info.name,
        poster: animeData.info.poster,
        jname: animeData.moreInfo.japanese,
        description: animeData.info.description,
        rating: animeData.info.stats.rating,
        type: animeData.info.stats.type,
        episodes: {
          sub: animeData.info.stats.episodes.sub,
          dub: animeData.info.stats.episodes.dub,
        },
        duration: animeData.info.stats.duration,
      };
      dispatch(addAnime(mappedAnime));
    }

    setIsFav(!isFav);
    toast.show(isFav ? 'Removed from library' : 'Added to library', {
      type: 'success',
      placement: 'bottom',
      duration: 2000,
    });
  };

  // console.log(animeData?.info.charactersVoiceActors);

  // Add useEffect to handle back button press
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Check if bottom sheet is expanded using index
      if (bottomSheetRef.current?.present) {
        bottomSheetRef.current?.dismiss();
        return true; // Prevent default back behavior
      }
      return false; // Allow default back behavior
    });

    return () => backHandler.remove();
  }, []);

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
                {getFormattedTitle(animeData.info.name, titleStyleFirstLetter)}
              </Text>
            </View>

            <View className="flex-row items-center justify-center">
              <Text className="font-salsa text-center text-base font-semibold text-neutral-400">
                {animeData.moreInfo.status} •
              </Text>
              <Text className="font-salsa text-center text-base font-semibold text-neutral-400">
                {' '}
                {animeData.moreInfo.aired} •
              </Text>
              <Text className="font-salsa text-center text-base font-semibold text-neutral-400">
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
            <TouchableOpacity onPress={handleShare}>
              <Share size="28" color="#a3e635" variant="Bulk" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {}}>
              <DocumentDownload size="28" color="#a3e635" variant="TwoTone" />
            </TouchableOpacity>
          </View>
        </View>

        <Text className="font-salsa pt-3 text-base text-neutral-300/85">
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
        {/* Episodes Section */}
        <View className="mt-8">
          <Text className="font-salsa text-3xl tracking-wider text-white">
            {getFormattedTitle('Episodes', 'text-4xl font-semibold')}
          </Text>
          <View className="mt-4 flex-row gap-4">
            {animeData.info.stats.episodes.sub > 0 && (
              <TouchableOpacity
                className="flex-1 items-center rounded-xl bg-lime-500/20 p-3"
                onPress={() => {
                  setSelectedType('sub');
                  bottomSheetRef.current?.present();
                }}>
                <Text className="font-salsa text-lg text-white">Sub</Text>
                <Text className="font-salsa text-base text-neutral-400">
                  {animeData.info.stats.episodes.sub} Episodes
                </Text>
              </TouchableOpacity>
            )}
            {animeData.info.stats.episodes.dub > 0 && (
              <TouchableOpacity
                className="flex-1 items-center rounded-xl bg-lime-500/20 p-3"
                onPress={() => {
                  setSelectedType('dub');
                  bottomSheetRef.current?.present();
                }}>
                <Text className="font-salsa text-lg text-white">Dub</Text>
                <Text className="font-salsa text-base text-neutral-400">
                  {animeData.info.stats.episodes.dub} Episodes
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Episode List Sheet */}
        <EpisodeListSheet
          animeId={id}
          type={selectedType}
          bottomSheetRef={bottomSheetRef}
          onEpisodePress={(episodeId) => {
            console.log(`Playing ${selectedType} episode ${episodeId}`);
          }}
          enablePanDownToClose
          enableBackdropPress
        />

        {animeData.info.charactersVoiceActors.length > 0 && (
          <CharacterVoiceActorRow
            rounded
            data={animeData?.info.charactersVoiceActors}
            className="mt-4"
          />
        )}

        {/* More Info Section */}
        <View className="mb-6 mt-8">
          <Text className="font-salsa text-3xl tracking-wider text-white">
            {getFormattedTitle('More Info', 'text-4xl font-semibold')}
          </Text>
          <View
            className="mt-4 space-y-4 rounded-3xl bg-neutral-900/60 p-5"
            style={{ width: wp(90) }}>
            <InfoRow
              label="Japanese"
              value={animeData.moreInfo.japanese}
              icon="translate"
              valueStyle="text-lime-400"
              containerStyle="flex-1"
              numberOfLines={2}
            />
            <View className="h-[1px] w-full bg-neutral-800" />
            <InfoRow
              label="Premiered"
              value={animeData.moreInfo.premiered}
              icon="calendar"
              valueStyle="text-white"
            />
            <View className="h-[1px] w-full bg-neutral-800" />
            <InfoRow
              label="MAL Score"
              value={animeData.moreInfo.malscore}
              icon="star"
              valueStyle="text-lime-400"
            />
            <View className="h-[1px] w-full bg-neutral-800" />
            <InfoRow
              label="Studios"
              value={animeData.moreInfo.studios}
              icon="video"
              valueStyle="text-white"
              numberOfLines={1}
            />
            <View className="h-[1px] w-full bg-neutral-800" />
            <InfoRow
              label="Genres"
              value={animeData.moreInfo.genres.join(' • ')}
              icon="tag"
              valueStyle="text-lime-400"
              numberOfLines={2}
            />
            <View className="h-[1px] w-full bg-neutral-800" />
            <InfoRow
              label="Status"
              value={animeData.moreInfo.status}
              icon="info"
              valueStyle="text-white"
            />
          </View>
        </View>
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
