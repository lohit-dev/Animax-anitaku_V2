import { SearchNormal, Thorchain } from 'iconsax-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Searchbar } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

type SearchInputProps = {
  text: string;
  onChangeText: React.Dispatch<React.SetStateAction<string>>;
};

const SearchInput = ({ text, onChangeText }: SearchInputProps) => {
  return (
    <SafeAreaView>
      <View className="px-6 pb-10 pt-20">
        <Animated.View
          entering={FadeInDown.delay(650).duration(500)}
          className="rounded-full bg-lime-50/70 p-1">
          <Searchbar
            placeholder="Type to Discover Anime..."
            onChangeText={onChangeText}
            value={text}
            mode="bar"
            style={styles.container}
            clearButtonMode="while-editing"
            clearTextOnFocus
            icon={() => <SearchNormal size={24} color="#111827" />}
            traileringIcon={() => <Thorchain size={24} color="#111827" />}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

export default SearchInput;

const styles = StyleSheet.create({
  container: { backgroundColor: 'transparent', padding: 0 },
});
