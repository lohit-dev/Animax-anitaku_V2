import { useColorScheme } from 'react-native';

import { darkTheme, lightTheme } from './../constants/Colors';
/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof lightTheme.colors & keyof typeof darkTheme.colors
) {
  const theme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  }

  return theme === 'dark' ? darkTheme.colors[colorName] : lightTheme.colors[colorName];
}
