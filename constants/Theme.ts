import { DarkTheme, DefaultTheme, Theme } from '@react-navigation/native';

import { darkTheme, lightTheme } from './Colors';

export const paperLight: Theme = {
  ...DefaultTheme,
  colors: {
    ...lightTheme.colors,
  },
};

export const paperDark: Theme = {
  ...DarkTheme,
  colors: {
    ...darkTheme.colors,
  },
};
