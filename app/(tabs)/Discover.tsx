import { useQuery } from '@tanstack/react-query';
import LottieView from 'lottie-react-native';
import { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import RowItem from '~/components/home/RowItem';
import SearchInput from '~/components/search/SearchInput';
import AnimeCard from '~/components/shared/AnimeCard';
import { hp, wp } from '~/helpers/common';
import { fetchCategory, fetchSearchDetails } from '~/services/AnimeService';
import { Anime, SearchResponse } from '~/types';

const Discover = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchAnimes, setSearchAnimes] = useState<Anime[]>([]);
  const [subbedAnime, setSubbedAnime] = useState<Anime[]>([]);
  const [dubbedAnime, setDubbedAnime] = useState<Anime[]>([]);

  // Query for search results based on the search query
  const {
    data: SearchResults,
    error,
    isLoading,
  } = useQuery<SearchResponse>({
    queryKey: ['searchDetails', searchQuery],
    queryFn: () => fetchSearchDetails({ q: searchQuery }),
    enabled: !!searchQuery,
  });

  // Query for anime categories: Subbed and Dubbed
  const { data: subbedAnimeData } = useQuery({
    queryKey: ['category', 'subbed-anime'],
    queryFn: () => fetchCategory('subbed-anime'),
  });

  const { data: dubbedAnimeData } = useQuery({
    queryKey: ['category-dubbed', 'dubbed-anime'],
    queryFn: () => fetchCategory('dubbed-anime'),
  });

  // Update searchAnimes when SearchResults changes
  useEffect(() => {
    if (SearchResults?.data.animes) {
      setSearchAnimes(SearchResults.data.animes);
    }
  }, [SearchResults]);

  // Update subbedAnime when subbedAnimeData changes
  useEffect(() => {
    if (subbedAnimeData?.data.animes) {
      setSubbedAnime(subbedAnimeData.data.animes);
    }
  }, [subbedAnimeData]);

  // Update dubbedAnime when dubbedAnimeData changes
  useEffect(() => {
    if (dubbedAnimeData?.data.animes) {
      setDubbedAnime(dubbedAnimeData.data.animes);
    }
  }, [dubbedAnimeData]);

  // const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

  // const renderSearchItem = ({ item, index }: { item: Anime; index: number }) => {
  //   return (
  //     <AnimatedTouchableOpacity
  //       entering={FadeInDown.delay(index * 500).duration(500)}
  //       className="items-center justify-center flex-1 p-2">
  //       <View className="overflow-hidden rounded-2xl">
  //         <ImageBackground source={{ uri: item.poster }} style={styles.Image} />
  //       </View>
  //     </AnimatedTouchableOpacity>
  //   );
  // };

  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      {/* Search Input */}
      <SearchInput text={searchQuery} onChangeText={setSearchQuery} />

      {/* Conditional Rendering: Show only when searchQuery is empty */}
      {!searchQuery && (
        <ScrollView>
          {/* Title Section */}
          <Animated.View entering={FadeInDown.delay(400).duration(800)}>
            <Text className="text-center font-salsa text-white" style={{ fontSize: wp(10) }}>
              What are you{'\n'}
              <Text>Looking for ?</Text>
            </Text>
            <Text
              className="mt-2 text-wrap text-center font-sans text-lg font-semibold text-neutral-400"
              numberOfLines={2}>
              Find your Favorite Anime Between more{'\n'}
              <Text>Than 10,000 Anime</Text>
            </Text>
          </Animated.View>

          {/* Subbed and Dubbed Anime Categories */}
          {subbedAnime.length > 0 && <RowItem data={subbedAnime} name="Subbed Anime" seeAll />}
          {dubbedAnime.length > 0 && <RowItem data={dubbedAnime} name="Dubbed Anime" seeAll />}
        </ScrollView>
      )}

      {/* Loading, Error, and Search Results */}
      {searchQuery && isLoading && (
        <View className="flex-1 items-center justify-center bg-neutral-950">
          <LottieView
            source={require('~/assets/lottie/loading.json')}
            autoPlay
            loop
            style={{
              height: hp(30),
              width: wp(70),
              alignSelf: 'center',
            }}
          />
        </View>
      )}
      {error && !searchQuery && (
        <View className="flex flex-1 items-center justify-center bg-neutral-950">
          <LottieView
            source={require('~/assets/lottie/Error.json')}
            autoPlay
            loop
            style={{
              height: hp(60),
              width: wp(80),
              alignSelf: 'center',
            }}
          />
        </View>
      )}

      {/* Search Results FlatList */}
      {searchQuery && !isLoading && searchAnimes.length > 0 && (
        <FlatList
          data={searchAnimes}
          keyExtractor={(_, index) => `searchItem_${index}`}
          renderItem={({ item, index }) => <AnimeCard item={item} index={index} />}
          numColumns={3}
          initialNumToRender={10}
          maxToRenderPerBatch={20}
          onEndReachedThreshold={0.5}
        />
      )}

      {/* Empty state if no search results */}
      {searchQuery && !isLoading && searchAnimes.length === 0 && (
        <View>
          <LottieView
            source={require('~/assets/lottie/no_results_found.json')}
            autoPlay
            loop
            style={{
              height: hp(60),
              width: wp(80),
              alignSelf: 'center',
            }}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

export default Discover;
