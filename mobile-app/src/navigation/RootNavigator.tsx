import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { TabNavigator } from './TabNavigator';
import ProductDetailScreen from '../screens/ProductDetail/ProductDetailScreen';
import FavoritesScreen from '../screens/Favorites/FavoritesScreen';
import LocationsScreen from '../screens/Locations/LocationsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        <Stack.Screen name="Favorites" component={FavoritesScreen} />
        <Stack.Screen name="Locations" component={LocationsScreen} />
        {/* We'll add Checkout screen later */}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
