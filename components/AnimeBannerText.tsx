import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { hp, wp } from '~/helpers/common';
import { Anime } from '~/types';
type AnimeBannerTextProps = {
  item: Anime;
  index: number;
};

const getFormattedTitle = (title: string) => {
  const words = title.split(' ');
  return words.map((word, index) => {
    const firstLetter = word.charAt(0);
    const restOfWord = word.slice(1);

    return (
      <React.Fragment key={index}>
        <Text className="font-bold text-lime-300">{firstLetter}</Text>
        {restOfWord}
        {index < words.length - 1 && <Text className="text-white"> </Text>}
      </React.Fragment>
    );
  });
};

const AnimeBannerText = ({ item, index }: AnimeBannerTextProps) => {
  return (
    <>
      <View style={styles.container}>
        <View
          className="absolute bottom-0 left-0 right-0 object-contain text-center text-5xl text-white"
          style={styles.title}>
          <Text className="text-center text-5xl font-bold text-white">
            {getFormattedTitle(item.title)}
          </Text>
          <View className="flex-row flex-wrap items-center justify-center px-14">
            <Text className="font-bold text-lime-300">{item.releaseDate}</Text>
            <Text className="text-xl text-lime-300"> • </Text>
            {item.genres.map((genre, index) => (
              <React.Fragment key={index}>
                <Text className="text-sm font-semibold text-gray-300">{genre}</Text>
                {index < item.genres.length - 1 && (
                  <Text className="text-2xl text-lime-300"> • </Text>
                )}
              </React.Fragment>
            ))}
          </View>
        </View>
      </View>
    </>
  );
};
export default AnimeBannerText;

const styles = StyleSheet.create({
  container: {
    width: wp(100),
    height: hp(56),
  },
  title: {
    height: 100,
  },
});
