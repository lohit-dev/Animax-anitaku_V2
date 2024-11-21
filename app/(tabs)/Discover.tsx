/* eslint-disable @typescript-eslint/no-unused-vars */
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { fetchSearchDetails } from '~/services/AnimeService';
import { SearchResponse } from '~/types';

const Discover = () => {
  const [query, setQuery] = useState('Demon');
  const { data, error, isLoading } = useQuery<SearchResponse>({
    queryKey: ['searchDetails', query],
    queryFn: () => fetchSearchDetails({ q: query }),
  });

  console.log(data);

  return (
    <View className="flex-1 items-center justify-center bg-neutral-950">
      <Text className="font-salsa text-4xl text-white">Discover</Text>
    </View>
  );
};

export default Discover;
