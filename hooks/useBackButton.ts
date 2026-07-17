import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler } from 'react-native';

export const useBackButton = () => {
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.back();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [router])
  );
};
