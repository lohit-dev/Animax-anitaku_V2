import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
// import * as Linking from 'expo-linking';
import { NavigationBar } from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from 'react-native-toast-notifications';
import { Provider } from 'react-redux';

import { store } from './_store/store';

import { useColorScheme } from '~/hooks/useColorScheme';
import 'react-native-reanimated';
import '../global.css';

SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient();

// const prefix = Linking.createURL('/');

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    'Salsa-Regular': require('../assets/fonts/Salsa-Regular.ttf'),
  });

  useEffect(() => {
    const setSystemBars = () => {
      try {
        if (Platform.OS === 'android') {
          NavigationBar.setHidden(true);
          NavigationBar.setStyle('light');
        }
      } catch (error) {
        console.error('Error setting navigation bar:', error);
      }
    };

    setSystemBars();
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  const linking = {
    prefixes: ['animax://', 'https://animax.app'],
    config: {
      screens: {
        index: '',
        '(tabs)': {
          screens: {
            Home: '',
          },
        },
        'anime/[id]': 'anime/:id',
        'anime/watch/[episodeId]': 'anime/watch/:episodeId',
      },
    },
  };

  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <BottomSheetModalProvider>
            <QueryClientProvider client={queryClient}>
              <ToastProvider>
                <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                  <StatusBar animated style="inverted" hidden />
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" options={{ headerShown: false }} />
                    <Stack.Screen
                      name="(tabs)"
                      options={{ headerShown: false }}
                      initialParams={{ linking }}
                    />
                  </Stack>
                </ThemeProvider>
              </ToastProvider>
            </QueryClientProvider>
          </BottomSheetModalProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Provider>
  );
}
