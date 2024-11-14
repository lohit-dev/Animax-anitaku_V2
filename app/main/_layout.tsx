import { useTheme, type ParamListBase, type TabNavigationState } from '@react-navigation/native';
import { withLayoutContext } from 'expo-router';
import { Discover, Home2, Profile, SearchNormal1 } from 'iconsax-react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import type {
  MaterialBottomTabNavigationEventMap,
  MaterialBottomTabNavigationOptions,
} from 'react-native-paper/react-navigation';
import { createMaterialBottomTabNavigator } from 'react-native-paper/react-navigation';

const { Navigator } = createMaterialBottomTabNavigator();

export const MaterialBottomTabs = withLayoutContext<
  MaterialBottomTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialBottomTabNavigationEventMap
>(Navigator);

const BottomLayout = () => {
  return (
    <MaterialBottomTabs theme={useTheme()} barStyle={styles.tabBarStyle} keyboardHidesNavigationBar>
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

          // <MaterialCommunityIcons name="home" size={24} color={color} />
        }}
      />
      <MaterialBottomTabs.Screen
        name="Discover"
        options={{
          tabBarLabel: 'Discover',
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              // <MaterialCommunityIcons name="compass" size={24} color={color} />
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
            // <MaterialIcons name="library-books" size={24} color={color} />
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
            // <MaterialIcons name="settings" size={24} color={color} />
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
  tabBarStyle: {
    borderRadius: 30,
    position: 'absolute',
    bottom: 24,
    overflow: 'hidden',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 30,
    elevation: 3,
    left: 16,
    right: 16,
    borderBottomRightRadius: 30,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
});
