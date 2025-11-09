import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { CartItem as CartItemType } from '../types';
import { Typography, Card } from './';
import { colors, spacing, borderRadius } from '../theme';

interface CartItemCardProps {
  item: CartItemType;
  index: number;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemove: (index: number) => void;
}

export const CartItemCard: React.FC<CartItemCardProps> = ({
  item,
  index,
  onUpdateQuantity,
  onRemove,
}) => {
  const calculateItemPrice = (): number => {
    const sizeMultipliers = {
      small: 0.8,
      medium: 1.0,
      large: 1.3,
    };
    const basePrice = item.product.price * sizeMultipliers[item.customization.size];
    const extrasPrice = item.customization.extras.reduce(
      (sum, extra) => sum + extra.price,
      0
    );
    return basePrice + extrasPrice;
  };

  const itemPrice = calculateItemPrice();
  const totalPrice = itemPrice * item.quantity;

  const formatSize = (size: string) => {
    return size.charAt(0).toUpperCase() + size.slice(1);
  };

  return (
    <Card style={styles.card} variant="outlined">
      <View style={styles.container}>
        {/* Product Image */}
        <Image
          source={{ uri: item.product.image_url }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Product Info */}
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Typography variant="body" weight="semibold">
                {item.product.name}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {formatSize(item.customization.size)}
                {item.customization.milk && ` • ${item.customization.milk} milk`}
              </Typography>
            </View>
            <TouchableOpacity
              onPress={() => onRemove(index)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Typography variant="body" color="error">
                ✕
              </Typography>
            </TouchableOpacity>
          </View>

          {/* Extras */}
          {item.customization.extras.length > 0 && (
            <View style={styles.extras}>
              {item.customization.extras.map((extra, idx) => (
                <Typography
                  key={idx}
                  variant="caption"
                  color="textSecondary"
                  style={styles.extraItem}
                >
                  + {extra.name}
                </Typography>
              ))}
            </View>
          )}

          {/* Notes */}
          {item.notes && (
            <View style={styles.notes}>
              <Typography variant="caption" color="textSecondary">
                Note: {item.notes}
              </Typography>
            </View>
          )}

          {/* Bottom Row */}
          <View style={styles.bottomRow}>
            {/* Quantity Controls */}
            <View style={styles.quantityControl}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => onUpdateQuantity(index, item.quantity - 1)}
              >
                <Typography variant="body" weight="semibold">
                  -
                </Typography>
              </TouchableOpacity>
              <Typography variant="body" weight="medium">
                {item.quantity}
              </Typography>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => onUpdateQuantity(index, item.quantity + 1)}
              >
                <Typography variant="body" weight="semibold">
                  +
                </Typography>
              </TouchableOpacity>
            </View>

            {/* Price */}
            <Typography variant="body" weight="semibold" color="primary">
              ${totalPrice.toFixed(2)}
            </Typography>
          </View>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  container: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray200,
  },
  content: {
    flex: 1,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    gap: spacing.xs,
  },
  extras: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  extraItem: {
    backgroundColor: colors.gray100,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  notes: {
    backgroundColor: colors.accentLight + '30',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
