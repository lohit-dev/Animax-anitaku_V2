import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { BottomNavigation } from 'react-native-paper';

import { darkTheme } from '~/constants/Colors';
import { hp, wp } from '~/helpers/common';

const TabBar = (props: BottomTabBarProps) => (
  <BottomNavigation.Bar
    theme={darkTheme}
    key={props.state.key}
    style={styles.tabBarStyle}
    navigationState={props.state}
    safeAreaInsets={props.insets}
    onTabPress={({ route, preventDefault }) => {
      const event = props.navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (event.defaultPrevented) {
        preventDefault();
      } else {
        props.navigation.dispatch({
          ...CommonActions.navigate(route.name, route.params),
          target: props.state.key,
        });
      }
    }}
    renderIcon={({ route, focused, color }) => {
      const { options } = props.descriptors[route.key];
      if (options.tabBarIcon) {
        return options.tabBarIcon({ focused, color, size: 24 });
      }

      return null;
    }}
    getLabelText={({ route }) => {
      const { options } = props.descriptors[route.key];
      // Ensuring we always return a string or undefined
      const label =
        options.tabBarLabel !== undefined
          ? options.tabBarLabel
          : options.title !== undefined
            ? options.title
            : route.name;

      // Make sure to return a string, not a ReactNode or function
      return typeof label === 'string' ? label : undefined;
    }}
  />
);

export default TabBar;

const styles = StyleSheet.create({
  tabBarStyle: {
    borderRadius: 30,
    position: 'absolute',
    bottom: hp(2),
    overflow: 'hidden',
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
    borderBottomLeftRadius: wp(6),
    borderBottomRightRadius: wp(6),
    elevation: 2,
    fontFamily: 'Salsa-Regular',
    left: wp(6),
    right: wp(6),
    shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 0.2,
    fontWeight: 'bold',
    shadowRadius: 20,
  },
});
