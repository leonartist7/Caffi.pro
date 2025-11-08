import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Typography, Card, Input, ProductCard } from '../../components';
import { colors, spacing, borderRadius } from '../../theme';
import { ProductCategory, Product, RootStackParamList } from '../../types';
import { getProductsByCategory, searchProducts } from '../../data/products';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CATEGORIES: { id: ProductCategory; label: string }[] = [
  { id: 'hot', label: 'Hot' },
  { id: 'iced', label: 'Iced' },
  { id: 'specialty', label: 'Specialty' },
  { id: 'food', label: 'Food' },
];

const MenuScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [selectedCategory, setSelectedCategory] =
    useState<ProductCategory>('hot');
  const [searchQuery, setSearchQuery] = useState('');

  // Get filtered products based on search and category
  const filteredProducts = useMemo(() => {
    if (searchQuery.trim()) {
      return searchProducts(searchQuery);
    }
    return getProductsByCategory(selectedCategory);
  }, [selectedCategory, searchQuery]);

  const handleProductPress = (productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Typography variant="h2">Menu</Typography>
        <Typography variant="caption">Discover your next favorite</Typography>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Input
          placeholder="Search for drinks..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          icon={<Typography>🔍</Typography>}
        />
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory === category.id && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Typography
              variant="label"
              color={
                selectedCategory === category.id
                  ? 'textOnPrimary'
                  : 'textPrimary'
              }
            >
              {category.label}
            </Typography>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Products Grid */}
      <View style={styles.productsContainer}>
        <Typography variant="caption" style={styles.productsHeader}>
          {searchQuery.trim()
            ? `${filteredProducts.length} results`
            : `Showing ${selectedCategory} items`}
        </Typography>
        {filteredProducts.length > 0 ? (
          <FlatList
            data={filteredProducts}
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                onPress={() => handleProductPress(item.id)}
              />
            )}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.productsRow}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Typography variant="body" align="center" color="textSecondary">
              No products found
            </Typography>
          </View>
        )}
      </View>
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
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  categoriesContainer: {
    flexGrow: 0,
    marginBottom: spacing.md,
  },
  categoriesContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray100,
    marginRight: spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
  },
  productsContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  productsHeader: {
    marginBottom: spacing.md,
  },
  productsRow: {
    justifyContent: 'space-between',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MenuScreen;
