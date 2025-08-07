import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, ScrollView, Text, View, Dimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import AnimeCard from '~/components/shared/AnimeCard';
import { getFormattedTitle } from '~/helpers/TextFormat';
import { useAppSelector } from '~/hooks/SavedAnimeHook';

const MyList = () => {
  const savedAnimes = useAppSelector((state) => state.savedAnimes.animes);

  const screenWidth = Dimensions.get('window').width;
  const cardWidth = (screenWidth - 64) / 3;

  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      <View className="relative">
        <LinearGradient
          colors={['rgba(163, 230, 53, 0.2)', 'transparent']}
          className="absolute h-72 w-full rounded-full"
        />
      </View>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="mt-16 items-center px-6 pt-8">
          <Text className="font-salsa pt-6 text-5xl text-white">
            {getFormattedTitle('My Library', 'text-5xl font-salsa font-semibold')}
          </Text>
          <Text className="font-salsa mt-2 text-lg text-neutral-400">
            {getFormattedTitle(
              `${savedAnimes.length} Saved Anime`,
              'text-lg font-salsa font-semibold'
            )}
          </Text>
        </View>
        {savedAnimes.length > 0 ? (
          <Animated.View entering={FadeInDown} className="flex-1 px-4 pt-4">
            <View className="flex-row flex-wrap justify-between">
              {savedAnimes.map((anime, index) => (
                <View key={anime.id} className="mb-4" style={{ width: cardWidth }}>
                  <AnimeCard item={anime} index={index} />
                </View>
              ))}
            </View>
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeInDown.delay(300)}
            className="flex-1 items-center justify-center p-8 pt-20">
            <Text className="font-salsa text-center text-2xl text-neutral-400">
              Your library is empty{'\n'}Add some anime to get started!
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default MyList;
