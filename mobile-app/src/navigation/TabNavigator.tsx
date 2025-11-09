import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types';
import { colors } from '../theme';
import { useCart } from '../contexts/CartContext';

// Import screens
import HomeScreen from '../screens/Home/HomeScreen';
import MenuScreen from '../screens/Menu/MenuScreen';
import CartScreen from '../screens/Cart/CartScreen';
import OrdersScreen from '../screens/Orders/OrdersScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';

// Simple icon components (we'll use text for now, can be replaced with icon library later)
const HomeIcon = ({ focused }: { focused: boolean }) => (
  <Text style={{ fontSize: 24 }}>{focused ? '🏠' : '🏡'}</Text>
);

const MenuIcon = ({ focused }: { focused: boolean }) => (
  <Text style={{ fontSize: 24 }}>☕</Text>
);

const CartIcon = ({ focused }: { focused: boolean }) => (
  <Text style={{ fontSize: 24 }}>🛒</Text>
);

const OrdersIcon = ({ focused }: { focused: boolean }) => (
  <Text style={{ fontSize: 24 }}>📋</Text>
);

const ProfileIcon = ({ focused }: { focused: boolean }) => (
  <Text style={{ fontSize: 24 }}>👤</Text>
);

const Tab = createBottomTabNavigator<MainTabParamList>();

export const TabNavigator: React.FC = () => {
  const { itemCount } = useCart();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray500,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.white,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <HomeIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{
          tabBarIcon: ({ focused }) => <MenuIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarIcon: ({ focused }) => <CartIcon focused={focused} />,
          tabBarBadge: itemCount > 0 ? itemCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.primary,
            color: colors.white,
          },
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarIcon: ({ focused }) => <OrdersIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => <ProfileIcon focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};
