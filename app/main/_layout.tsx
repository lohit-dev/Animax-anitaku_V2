import { type ParamListBase, type TabNavigationState } from '@react-navigation/native';
import { withLayoutContext } from 'expo-router';
import { Discover, Home2, Profile, SearchNormal1 } from 'iconsax-react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import type {
  MaterialBottomTabNavigationEventMap,
  MaterialBottomTabNavigationOptions,
} from 'react-native-paper/react-navigation';
import { createMaterialBottomTabNavigator } from 'react-native-paper/react-navigation';

import { darkTheme } from '~/constants/Colors';
import { hp, wp } from '~/helpers/common';

const { Navigator } = createMaterialBottomTabNavigator();

export const MaterialBottomTabs = withLayoutContext<
  MaterialBottomTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialBottomTabNavigationEventMap
>(Navigator);

const BottomLayout = () => {
  return (
    <MaterialBottomTabs
      barStyle={styles.tabBarStyle}
      compact
      theme={darkTheme}
      keyboardHidesNavigationBar>
      <MaterialBottomTabs.Screen
        name="Home"
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <Home2 size={24} variant="Broken" color={color} />
            ) : (
              <Home2 size={24} color={color} />
            ),
        }}
      />
      <MaterialBottomTabs.Screen
        name="Discover"
        options={{
          tabBarLabel: 'Discover',
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <Discover size="24" color={color} variant="Broken" />
            ) : (
              <Discover size="24" color={color} />
            ),
        }}
      />
      <MaterialBottomTabs.Screen
        name="MyList"
        options={{
          tabBarLabel: 'My List',
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <SearchNormal1 size="24" variant="Broken" color={color} />
            ) : (
              <SearchNormal1 size="24" color={color} />
            ),
        }}
      />
      <MaterialBottomTabs.Screen
        name="Settings"
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <Profile size="24" variant="Broken" color={color} />
            ) : (
              <Profile size="24" color={color} />
            ),
        }}
      />
    </MaterialBottomTabs>
  );
};

export default BottomLayout;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBarStyle: {
    borderRadius: 30,
    position: 'absolute',
    bottom: hp(3),
    overflow: 'hidden',
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
    borderBottomLeftRadius: wp(6),
    borderBottomRightRadius: wp(6),
    elevation: 2,
    left: wp(6),
    right: wp(6),
    shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 0.2,
    fontWeight: 'bold',
    shadowRadius: 20,
  },
});
