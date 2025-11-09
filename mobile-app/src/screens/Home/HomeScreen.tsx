import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Typography, Button, Card, ProductCard } from '../../components';
import { colors, spacing, borderRadius } from '../../theme';
import { RootStackParamList } from '../../types';
import { PRODUCTS } from '../../data/products';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useCart } from '../../contexts/CartContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { favorites } = useFavorites();
  const { itemCount } = useCart();

  // Get popular items (first 4 products)
  const popularItems = PRODUCTS.filter(p => p.category === 'hot' || p.category === 'iced').slice(0, 4);

  const handleOrderNow = () => {
    navigation.navigate('MainTabs', { screen: 'Menu' } as any);
  };

  const handleFavorites = () => {
    navigation.navigate('Favorites');
  };

  const handleLocations = () => {
    navigation.navigate('Locations');
  };

  const handleProductPress = (productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Typography variant="h1">Cofi</Typography>
          <Typography variant="caption">Your daily coffee companion</Typography>
        </View>

        {/* Hero Banner */}
        <Card style={styles.heroBanner} variant="elevated">
          <View style={styles.heroBannerContent}>
            <Typography variant="h2" color="white">
              Welcome Back!
            </Typography>
            <Typography variant="body" color="white" style={styles.heroText}>
              Order your favorite coffee and pick it up when it's ready
            </Typography>
            <Button
              title="Order Now"
              variant="secondary"
              style={styles.heroButton}
              onPress={handleOrderNow}
            />
          </View>
        </Card>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Typography variant="h3" style={styles.sectionTitle}>
            Quick Actions
          </Typography>
          <View style={styles.quickActions}>
            <TouchableOpacity onPress={handleOrderNow}>
              <Card style={styles.quickActionCard}>
                <Typography variant="body" align="center" style={styles.quickActionIcon}>
                  ☕
                </Typography>
                <Typography variant="label" align="center">
                  Order
                </Typography>
                {itemCount > 0 && (
                  <View style={styles.badge}>
                    <Typography variant="caption" color="white" style={styles.badgeText}>
                      {itemCount}
                    </Typography>
                  </View>
                )}
              </Card>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleFavorites}>
              <Card style={styles.quickActionCard}>
                <Typography variant="body" align="center" style={styles.quickActionIcon}>
                  ⭐
                </Typography>
                <Typography variant="label" align="center">
                  Favorites
                </Typography>
                {favorites.length > 0 && (
                  <View style={styles.badge}>
                    <Typography variant="caption" color="white" style={styles.badgeText}>
                      {favorites.length}
                    </Typography>
                  </View>
                )}
              </Card>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLocations}>
              <Card style={styles.quickActionCard}>
                <Typography variant="body" align="center" style={styles.quickActionIcon}>
                  📍
                </Typography>
                <Typography variant="label" align="center">
                  Locations
                </Typography>
              </Card>
            </TouchableOpacity>
          </View>
        </View>

        {/* Popular Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Typography variant="h3" style={styles.sectionTitle}>
                Popular Items
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Try our most loved drinks
              </Typography>
            </View>
            <Button
              title="View All"
              variant="text"
              size="small"
              onPress={handleOrderNow}
            />
          </View>
          <View style={styles.popularGrid}>
            {popularItems.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                onPress={() => handleProductPress(item.id)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  heroBanner: {
    margin: spacing.lg,
    marginTop: 0,
    backgroundColor: colors.primary,
    minHeight: 200,
    justifyContent: 'center',
  },
  heroBannerContent: {
    padding: spacing.lg,
  },
  heroText: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  heroButton: {
    alignSelf: 'flex-start',
  },
  section: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  quickActionCard: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    position: 'relative',
  },
  quickActionIcon: {
    fontSize: 32,
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
});

export default HomeScreen;
