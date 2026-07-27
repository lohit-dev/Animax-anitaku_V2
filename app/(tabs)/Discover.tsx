import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import LottieView from 'lottie-react-native';
import { useEffect, useState } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import RowItem from '~/components/home/RowItem';
import SearchInput from '~/components/search/SearchInput';
import AnimeCard from '~/components/shared/AnimeCard';
import { wp } from '~/helpers/common';
import { useDebounce } from '~/hooks/useDebounce';
import { fetchSearchDetails } from '~/services/AnimeService';
import { Anime, SearchResponse } from '~/types';

const Discover = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchAnimes, setSearchAnimes] = useState<Anime[]>([]);
  const [subbedAnime, setSubbedAnime] = useState<Anime[]>([]);
  const [dubbedAnime, setDubbedAnime] = useState<Anime[]>([]);

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Query for search results based on the search query
  const {
    data: SearchResults,
    error,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<SearchResponse>({
    queryKey: ['searchDetails', debouncedSearchQuery],
    queryFn: ({ pageParam = 1 }) =>
      fetchSearchDetails({ q: debouncedSearchQuery, page: pageParam as number }),
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasNextPage ? lastPage.pagination.currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!debouncedSearchQuery,
  });

  // Query for anime categories: Subbed and Dubbed
  const { data: subbedAnimeData } = useQuery({
    queryKey: ['category', 'subbed-anime'],
    queryFn: () => fetchSearchDetails({ q: '', filters: { language: 'sub' } }),
  });

  const { data: dubbedAnimeData } = useQuery({
    queryKey: ['category-dubbed', 'dubbed-anime'],
    queryFn: () => fetchSearchDetails({ q: '', filters: { language: 'dub' } }),
  });

  // Update searchAnimes when SearchResults changes
  useEffect(() => {
    if (SearchResults?.pages) {
      setSearchAnimes(SearchResults.pages.flatMap((page: { results: Anime[] }) => page.results) as Anime[]);
    } else {
      setSearchAnimes([]);
    }
  }, [SearchResults]);

  // Update subbedAnime when subbedAnimeData changes
  useEffect(() => {
    if (subbedAnimeData?.results) {
      const subOnly = subbedAnimeData.results.filter(
        (anime: Anime) => anime.languages?.includes('Sub') && !anime.languages?.includes('Dub')
      );
      setSubbedAnime(subOnly as Anime[]);
    }
  }, [subbedAnimeData]);

  // Update dubbedAnime when dubbedAnimeData changes
  useEffect(() => {
    if (dubbedAnimeData?.results) {
      setDubbedAnime(dubbedAnimeData.results as Anime[]);
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

  const isDebouncing = searchQuery !== debouncedSearchQuery;
  const isSearchLoading = isLoading || isDebouncing;

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-neutral-950">
      {/* Search Input */}
      <SearchInput text={searchQuery} onChangeText={setSearchQuery} />

      {/* Conditional Rendering: Show only when searchQuery is empty */}
      {!searchQuery && (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}>
          {/* Title Section */}
          <Animated.View entering={FadeInDown.delay(400).duration(800)}>
            <Text className="font-salsa text-center text-white" style={{ fontSize: wp(10) }}>
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
      {searchQuery && isSearchLoading && (
        <View className="flex-1 items-center justify-center bg-neutral-950 pb-24">
          <LottieView
            source={require('~/assets/lottie/loading.json')}
            autoPlay
            loop
            style={{
              height: wp(30),
              width: wp(30),
            }}
          />
        </View>
      )}
      {error && !searchQuery && (
        <View className="flex-1 items-center justify-center bg-neutral-950 pb-24">
          <LottieView
            source={require('~/assets/lottie/Error.json')}
            autoPlay
            loop
            style={{
              height: wp(60),
              width: wp(60),
            }}
          />
        </View>
      )}

      {/* Search Results FlatList */}
      {searchQuery && !isSearchLoading && searchAnimes.length > 0 && (
        <FlatList
          data={searchAnimes}
          keyExtractor={(item, index) => item.slug || `searchItem_${index}`}
          renderItem={({ item, index }) => <AnimeCard item={item} index={index} />}
          numColumns={3}
          initialNumToRender={12}
          maxToRenderPerBatch={15}
          windowSize={5}
          removeClippedSubviews
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="items-center py-4">
                <Text className="text-neutral-400">Loading more...</Text>
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 110 }}
        />
      )}

      {/* Empty state if no search results */}
      {searchQuery && !isSearchLoading && searchAnimes.length === 0 && (
        <View className="flex-1 items-center justify-center pb-24">
          <LottieView
            source={require('~/assets/lottie/no_results_found.json')}
            autoPlay
            loop
            style={{
              height: wp(60),
              width: wp(60),
            }}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

export default Discover;
