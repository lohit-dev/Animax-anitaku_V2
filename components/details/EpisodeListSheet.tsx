import { BottomSheetModal, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Play, SearchNormal1 } from 'iconsax-react-native';
import { useCallback, useMemo, useState, RefObject } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { fetchAnimeEpisode } from '~/services/AnimeService';

type Episode = {
  episodeId: string;
  number: number;
  title: string;
  isFiller: boolean;
};

type EpisodeListSheetProps = {
  animeId: string;
  type: 'sub' | 'dub';
  bottomSheetRef: RefObject<BottomSheetModal>;
  onEpisodePress?: (episodeId: string) => void;
  enablePanDownToClose?: boolean;
  enableBackdropPress?: boolean;
};

type SortOrder = 'asc' | 'desc';

const EpisodeListSheet = ({
  animeId,
  type,
  bottomSheetRef,
  onEpisodePress,
  enablePanDownToClose = true,
  enableBackdropPress = true,
}: EpisodeListSheetProps) => {
  const router = useRouter();
  const snapPoints = useMemo(() => ['50%', '100%'], []);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [isSearching, setIsSearching] = useState(false);

  const {
    data: episodeData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['episodes', animeId, type],
    queryFn: () => fetchAnimeEpisode(animeId),
    enabled: !!animeId,
  });

  const episodes = useMemo(() => {
    if (!episodeData?.data?.episodes) return [];
    return episodeData.data.episodes;
  }, [episodeData]);

  const filteredAndSortedEpisodes = useMemo(() => {
    setIsSearching(true);
    let result = [...episodes];

    // Filter by search query
    if (searchQuery) {
      result = result.filter(
        (episode) =>
          episode.number.toString().includes(searchQuery) ||
          episode.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort episodes
    result.sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.number - b.number;
      }
      return b.number - a.number;
    });

    // Add a small delay to show the loader
    setTimeout(() => {
      setIsSearching(false);
    }, 500);

    return result;
  }, [episodes, searchQuery, sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
  };

  const handleEpisodePress = (episodeId: string) => {
    bottomSheetRef.current?.dismiss?.();
    router.push({
      pathname: '/anime/watch/[episodeId]',
      params: {
        episodeId,
        animeId,
        type,
      },
    });
  };

  const renderEpisodeCard = useCallback(
    ({ item, index }: { item: Episode; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 100).duration(400)}>
        <TouchableOpacity
          className="mx-4 mb-4 overflow-hidden rounded-xl bg-neutral-800/40 p-4"
          style={{
            borderLeftWidth: 4,
            borderLeftColor: item.isFiller ? '#ef4444' : '#84cc16',
          }}
          onPress={() => handleEpisodePress(item.episodeId)}>
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="font-salsa text-lg text-white">Episode {item.number}</Text>
                {item.isFiller && (
                  <View className="rounded-full bg-red-500/20 px-2 py-1">
                    <Text className="font-salsa text-xs text-red-400">Filler</Text>
                  </View>
                )}
              </View>
              <Text className="font-salsa mt-1 text-sm text-neutral-400" numberOfLines={2}>
                {item.title}
              </Text>
            </View>
            <TouchableOpacity
              className="rounded-full bg-lime-500 p-3"
              onPress={() => onEpisodePress?.(item.episodeId)}>
              <Play size={20} color="#FFF" variant="Bold" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      index={0}
      enablePanDownToClose={enablePanDownToClose}
      backdropComponent={enableBackdropPress ? undefined : () => null}
      onDismiss={() => {
        setSearchQuery('');
        setSortOrder('asc');
        setIsSearching(false);
      }}
      backgroundStyle={{ backgroundColor: '#12140e' }}
      handleIndicatorStyle={{ backgroundColor: '#4a4a4a' }}>
      <View className="flex-1">
        <View className="border-b border-neutral-800 px-4 py-3">
          <Text className="font-salsa text-2xl text-white">
            {type === 'sub' ? 'Subbed' : 'Dubbed'} Episodes
          </Text>
          <Text className="font-salsa text-sm text-neutral-400">
            {episodes.length} Episodes Available
          </Text>
        </View>

        {/* Search and Filter Section */}
        <View className="flex-row items-center gap-2 px-4 py-2">
          <View className="flex-1 flex-row items-center rounded-xl bg-neutral-800/40 px-3 py-2">
            <SearchNormal1 size={20} color="#a3e635" />
            <TextInput
              className="font-salsa flex-1 px-2 text-base text-white"
              placeholder="Search episodes..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            onPress={toggleSortOrder}
            className="rounded-xl bg-neutral-800/40 px-4 py-2">
            <Text className="font-salsa text-base">
              <Text className={sortOrder === 'asc' ? 'text-lime-400' : 'text-neutral-400'}>
                ASC
              </Text>
              <Text className="text-neutral-400">/</Text>
              <Text className={sortOrder === 'desc' ? 'text-lime-400' : 'text-neutral-400'}>
                DESC
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Episodes List with loading state */}
        <View className="flex-1">
          {isLoading || isSearching ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#84cc16" />
              <Text className="font-salsa mt-2 text-sm text-neutral-400">
                {isSearching ? 'Searching episodes...' : 'Loading episodes...'}
              </Text>
            </View>
          ) : error ? (
            <View className="flex-1 items-center justify-center px-4">
              <Text className="font-salsa text-center text-lg text-red-400">
                Failed to load episodes. Please try again.
              </Text>
            </View>
          ) : !filteredAndSortedEpisodes.length ? (
            <View className="flex-1 items-center justify-center px-4">
              <Text className="font-salsa text-center text-lg text-neutral-400">
                {searchQuery
                  ? 'No episodes found matching your search'
                  : `No ${type === 'sub' ? 'subbed' : 'dubbed'} episodes available`}
              </Text>
            </View>
          ) : (
            <BottomSheetFlatList
              data={filteredAndSortedEpisodes}
              renderItem={renderEpisodeCard}
              keyExtractor={(item) => item.episodeId}
              contentContainerStyle={{ paddingVertical: 16 }}
            />
          )}
        </View>
      </View>
    </BottomSheetModal>
  );
};

export default EpisodeListSheet;
