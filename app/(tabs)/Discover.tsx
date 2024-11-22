import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import {
  TextInput,
  View,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Text,
  ScrollView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import RowItem from '~/components/home/RowItem';
import SearchInput from '~/components/search/SearchInput';
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

  // Render individual anime item in search result
  const renderSearchItem = ({ item }: { item: Anime }) => {
    return (
      <View className="flex-1 items-center justify-center p-2">
        <Text className="text-lg text-white">{item.jname}</Text>
      </View>
    );
  };

  return (
    <ScrollView className="flex-1 bg-neutral-950">
      {/* Search Input */}
      <SearchInput text={searchQuery} onChangeText={setSearchQuery} />

      {/* Title Section */}
      <Animated.View entering={FadeInDown.delay(400).duration(800)}>
        <Text className="text-center font-salsa text-white" style={{ fontSize: wp(10) }}>
          What are you{'\n'}
          <Text>Looking for ?</Text>
        </Text>
        <Text
          className="mt-2 text-wrap text-center font-mono text-lg text-neutral-400"
          numberOfLines={2}>
          Find your Favorite Anime Between more{'\n'}
          <Text>Than 10,000 Anime</Text>
        </Text>
      </Animated.View>

      {/* Loading, Error, and Search Results */}
      {isLoading && <Text className="text-center text-white">Loading...</Text>}
      {error && <Text className="text-center text-white">Error occurred. Please try again.</Text>}

      {/* Search Results FlatList */}
      {searchAnimes.length > 0 && (
        <FlatList
          data={searchAnimes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderSearchItem}
          numColumns={3}
          onEndReachedThreshold={0.5}
        />
      )}

      {/* Subbed and Dubbed Anime Categories */}
      {subbedAnime.length > 0 && <RowItem data={subbedAnime} name="Subbed Anime" seeAll />}

      {dubbedAnime.length > 0 && <RowItem data={dubbedAnime} name="Dubbed Anime" seeAll />}
    </ScrollView>
  );
};

export default Discover;
