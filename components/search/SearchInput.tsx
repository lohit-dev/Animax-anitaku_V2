import { Ionicons } from '@expo/vector-icons';
import { SearchNormal } from 'iconsax-react-native';
import React from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

type SearchInputProps = {
  text: string;
  onChangeText: React.Dispatch<React.SetStateAction<string>>;
};

const SearchInput = ({ text, onChangeText }: SearchInputProps) => {
  return (
    <SafeAreaView edges={['top']}>
      <View className="px-4 pb-4 pt-3">
        <Animated.View
          entering={FadeInDown.delay(300).duration(350)}
          className="h-12 flex-row items-center rounded-full border border-white/10 bg-neutral-900 px-4">
          <SearchNormal size={20} color="#a3a3a3" />
          <TextInput
            className="ml-3 flex-1 text-base text-white"
            placeholder="Search anime"
            placeholderTextColor="#737373"
            value={text}
            onChangeText={onChangeText}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            returnKeyType="search"
            selectionColor="#a3e635"
          />
          {!!text && (
            <TouchableOpacity
              accessibilityLabel="Clear search"
              className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-white/10"
              onPress={() => onChangeText('')}>
              <Ionicons name="close" size={18} color="#d4d4d4" />
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

export default SearchInput;
