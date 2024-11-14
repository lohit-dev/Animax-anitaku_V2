import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { FlatList, Pressable, SafeAreaView, View } from 'react-native';

import AnimeBannerText from '~/components/AnimeBannerText';
import Gradient from '~/components/Gradient';
import HomeBanner from '~/components/HomeBanner';
import HomeButtons from '~/components/HomeButtons';
import { animeData } from '~/helpers/data';
import { Anime } from '~/types';

const Home = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      <StatusBar
        translucent
        backgroundColor="transparent"
        animated
        hideTransitionAnimation="fade"
      />

      {/* Home Banner for the current anime */}
      {animeData.map((anime: Anime, index) => {
        return (
          <Pressable key={anime.id}>
            {currentIndex === index && <HomeBanner index={index} item={anime} />}
          </Pressable>
        );
      })}
      <Gradient />

      {/* FlatList of Anime */}
      <View className="flex flex-col">
        <FlatList
          style={{ flexGrow: 0 }}
          data={animeData}
          horizontal
          bounces={false}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          keyExtractor={(_, index) => `list_item${index}`}
          renderItem={({ item, index }) => {
            return <AnimeBannerText item={item} index={index} />;
          }}
        />
        <HomeButtons />
      </View>
    </SafeAreaView>
  );
};

export default Home;
