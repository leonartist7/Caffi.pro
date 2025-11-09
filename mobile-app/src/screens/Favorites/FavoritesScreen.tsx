import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Typography, ProductCard, Button } from '../../components';
import { colors, spacing } from '../../theme';
import { useFavorites } from '../../contexts/FavoritesContext';
import { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { favorites } = useFavorites();

  const handleProductPress = (productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  };

  const handleBrowseMenu = () => {
    navigation.navigate('MainTabs', { screen: 'Menu' } as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Typography variant="h2">Favorites</Typography>
        {favorites.length > 0 && (
          <Typography variant="caption" color="textSecondary">
            {favorites.length} {favorites.length === 1 ? 'item' : 'items'}
          </Typography>
        )}
      </View>

      {favorites.length === 0 ? (
        <View style={styles.emptyState}>
          <Typography variant="h1">⭐</Typography>
          <Typography variant="h3" style={styles.emptyTitle}>
            No favorites yet
          </Typography>
          <Typography variant="body" color="textSecondary" align="center">
            Tap the heart icon on products to save your favorites
          </Typography>
          <Button
            title="Browse Menu"
            variant="primary"
            style={styles.browseButton}
            onPress={handleBrowseMenu}
          />
        </View>
      ) : (
        <FlatList
          data={favorites}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() => handleProductPress(item.id)}
            />
          )}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.productsRow}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    marginTop: spacing.md,
  },
  browseButton: {
    marginTop: spacing.lg,
  },
  listContent: {
    padding: spacing.lg,
  },
  productsRow: {
    justifyContent: 'space-between',
  },
});

export default FavoritesScreen;
