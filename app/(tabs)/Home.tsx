import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  useWindowDimensions,
  View,
  ViewabilityConfig,
  ViewabilityConfigCallbackPair,
  ViewToken,
} from 'react-native';
import Animated, {
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import AnimeBannerText from '~/components/home/AnimeBannerText';
import Gradient from '~/components/home/Gradient';
import HomeBanner from '~/components/home/HomeBanner';
import HomeButtons from '~/components/home/HomeButtons';
import RowItem from '~/components/home/RowItem';
import { hp, wp } from '~/helpers/common';
import { fetchHomePage } from '~/services/AnimeService';
import { Anime } from '~/types';

const Home = () => {
  const { width } = useWindowDimensions();
  const {
    data: HomePageData,
    error,
    isLoading,
  } = useQuery({
    queryKey: ['homepage'],
    queryFn: fetchHomePage,
  });

  const [anime, setAnime] = useState<Anime[]>(HomePageData?.data?.spotlight || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  const x = useSharedValue(0);
  const ref = useAnimatedRef<Animated.FlatList<any>>();
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  const viewabilityConfig: ViewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  const onViewableItemsChanged = ({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index !== undefined && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0]?.index);
    }
  };

  const viewAbilityConfigCallbackPairs = useRef<ViewabilityConfigCallbackPair[]>([
    { viewabilityConfig, onViewableItemsChanged },
  ]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      x.value = e.contentOffset.x;
    },
  });

  useEffect(() => {
    if (HomePageData?.data?.spotlight) {
      setAnime(HomePageData.data.spotlight);
    }
  }, [HomePageData]);

  useEffect(() => {
    if (isAutoPlay) {
      interval.current = setInterval(() => {
        const nextIndex = (currentIndex + 1) % anime.length;
        setCurrentIndex(nextIndex);

        ref.current?.scrollToOffset({
          offset: Math.round(nextIndex * width),
          animated: true,
        });
      }, 4000);
    } else {
      if (interval.current) {
        clearInterval(interval.current);
      }
    }

    return () => {
      if (interval.current) {
        clearInterval(interval.current);
      }
    };
  }, [isAutoPlay, currentIndex, anime.length, width]);

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
      </View>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-neutral-950">
      <ScrollView
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical
        scrollEventThrottle={16}>
        {/* Home Banner for the current anime */}
        {anime.length > 0 &&
          anime.map((animeItem: Anime, index: number) => {
            return (
              currentIndex === index && (
                <HomeBanner
                  key={animeItem.slug}
                  index={index}
                  item={animeItem}
                  x={x}
                  onPress={() => {
                    router.push({
                      pathname: '/anime/[id]',
                      params: { id: animeItem.slug, poster: animeItem.image },
                    });
                  }}
                />
              )
            );
          })}
        {/* Gradient for the Banner */}
        <Gradient />

        {/* FlatList */}
        <View className="flex flex-col">
          <Animated.FlatList
            onScrollBeginDrag={() => {
              setIsAutoPlay(false);
            }}
            onScrollEndDrag={() => {
              setIsAutoPlay(true);
            }}
            style={{ flexGrow: 0 }}
            ref={ref}
            data={anime}
            onScroll={onScroll}
            horizontal
            viewabilityConfigCallbackPairs={viewAbilityConfigCallbackPairs.current}
            bounces={false}
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            initialNumToRender={10}
            maxToRenderPerBatch={20}
            keyExtractor={(_, index) => `list_item${index}`}
            onEndReachedThreshold={0.5}
            onEndReached={() => setAnime([...anime, ...(HomePageData?.data?.spotlight || [])])}
            renderItem={({ item, index }) => {
              return (
                <AnimeBannerText
                  item={item}
                  index={index}
                  x={x}
                  onPress={() => {
                    router.push({
                      pathname: '/anime/[id]',
                      params: { id: item.slug, poster: item.image },
                    });
                  }}
                />
              );
            }}
          />

          <HomeButtons />
          {/* The Main Flatlist's */}
          <RowItem
            name="Hot Trends"
            seeAll
            data={HomePageData?.data?.topTables?.newlyAdded}
            rounded
          />
          <RowItem name="Latest Episodes" seeAll data={HomePageData?.data?.recentUpdates} />
          <RowItem name="Upcoming Releases" seeAll data={HomePageData?.data?.upcoming} />
          <RowItem name="Top Airing Now" seeAll data={HomePageData?.data?.topTables?.newReleases} />
          <RowItem
            name="Completed Series"
            seeAll
            data={HomePageData?.data?.topTables?.justCompleted}
            className="mb-44"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Home;
