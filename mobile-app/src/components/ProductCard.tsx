import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Product } from '../types';
import { Typography, Card } from './';
import { colors, spacing, borderRadius } from '../theme';
import { useFavorites } from '../contexts/FavoritesContext';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

const CARD_WIDTH = (Dimensions.get('window').width - spacing.lg * 3) / 2;

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
}) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const isProductFavorite = isFavorite(product.id);

  const handleFavoritePress = (e: any) => {
    e.stopPropagation();
    toggleFavorite(product);
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card} variant="elevated">
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: product.image_url }}
            style={styles.image}
            resizeMode="cover"
          />
          {!product.available && (
            <View style={styles.unavailableBadge}>
              <Typography variant="caption" color="white">
                Unavailable
              </Typography>
            </View>
          )}
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={handleFavoritePress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Typography variant="body" style={styles.favoriteIcon}>
              {isProductFavorite ? '❤️' : '🤍'}
            </Typography>
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          <Typography variant="label" numberOfLines={1}>
            {product.name}
          </Typography>
          <Typography
            variant="caption"
            numberOfLines={2}
            style={styles.description}
          >
            {product.description}
          </Typography>
          <Typography variant="body" weight="semibold" color="primary">
            ${product.price.toFixed(2)}
          </Typography>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    marginBottom: spacing.md,
    overflow: 'hidden',
    padding: 0,
  },
  imageContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.gray200,
  },
  unavailableBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  favoriteButton: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.white,
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  favoriteIcon: {
    fontSize: 18,
  },
  content: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  description: {
    marginBottom: spacing.xs,
  },
});
