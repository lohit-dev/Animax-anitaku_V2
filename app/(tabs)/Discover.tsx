import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import LottieView from 'lottie-react-native';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import RowItem from '~/components/home/RowItem';
import SearchInput from '~/components/search/SearchInput';
import AnimeCard from '~/components/shared/AnimeCard';
import { wp } from '~/helpers/common';
import { useDebounce } from '~/hooks/useDebounce';
import { fetchAniListHomePage, fetchAniListSearch } from '~/services/AniListService';
import { Anime, SearchResponse } from '~/types';

const Discover = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const normalizedSearchQuery = searchQuery.trim();
  const normalizedDebouncedSearchQuery = debouncedSearchQuery.trim();
  const hasSearchQuery = normalizedSearchQuery.length > 0;

  // Query for search results based on the search query
  const {
    data: SearchResults,
    error: searchError,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<SearchResponse>({
    queryKey: ['anilist', 'search', normalizedDebouncedSearchQuery],
    queryFn: ({ pageParam = 1 }) =>
      fetchAniListSearch({ q: normalizedDebouncedSearchQuery, page: pageParam as number }),
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasNextPage ? lastPage.pagination.currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!normalizedDebouncedSearchQuery,
  });

  const {
    data: catalogueData,
    isLoading: isCatalogueLoading,
    error: catalogueError,
  } = useQuery({
    queryKey: ['anilist', 'home'],
    queryFn: fetchAniListHomePage,
  });

  const searchAnimes = useMemo(
    () => (SearchResults?.pages.flatMap((page: SearchResponse) => page.results) ?? []) as Anime[],
    [SearchResults]
  );
  const trendingAnime = catalogueData?.data.topTables.newlyAdded ?? [];
  const upcomingAnime = catalogueData?.data.upcoming ?? [];
  const isDebouncing = normalizedSearchQuery !== normalizedDebouncedSearchQuery;
  const isSearchLoading = hasSearchQuery && (isLoading || isDebouncing);

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-neutral-950">
      {/* Search Input */}
      <SearchInput text={searchQuery} onChangeText={setSearchQuery} />

      {/* Conditional Rendering: Show only when searchQuery is empty */}
      {!hasSearchQuery && (
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

          {isCatalogueLoading && (
            <View className="items-center py-12">
              <LottieView
                source={require('~/assets/lottie/loading.json')}
                autoPlay
                loop
                style={{ height: wp(28), width: wp(28) }}
              />
            </View>
          )}
          {catalogueError && (
            <Text className="font-salsa px-8 py-12 text-center text-neutral-400">
              AniList catalogue is temporarily unavailable. Please try again.
            </Text>
          )}
          {trendingAnime.length > 0 && (
            <RowItem data={trendingAnime} name="Trending Anime" seeAll />
          )}
          {upcomingAnime.length > 0 && (
            <RowItem data={upcomingAnime} name="Upcoming Anime" seeAll />
          )}
        </ScrollView>
      )}

      {/* Loading, Error, and Search Results */}
      {hasSearchQuery && isSearchLoading && (
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
      {hasSearchQuery && !isSearchLoading && searchError && (
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
      {hasSearchQuery && !isSearchLoading && searchAnimes.length > 0 && (
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
      {hasSearchQuery && !isSearchLoading && !searchError && searchAnimes.length === 0 && (
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
