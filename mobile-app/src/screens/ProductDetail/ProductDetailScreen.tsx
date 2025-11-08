import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Typography, Button, Card } from '../../components';
import { colors, spacing, borderRadius } from '../../theme';
import {
  ProductSize,
  MilkOption,
  Extra,
  ProductCustomization,
} from '../../types';
import { EXTRAS } from '../../data/products';

interface ProductDetailScreenProps {
  route: {
    params: {
      productId: string;
    };
  };
  navigation: any;
}

const SIZES: { value: ProductSize; label: string; priceMultiplier: number }[] =
  [
    { value: 'small', label: 'Small', priceMultiplier: 0.8 },
    { value: 'medium', label: 'Medium', priceMultiplier: 1.0 },
    { value: 'large', label: 'Large', priceMultiplier: 1.3 },
  ];

const MILK_OPTIONS: { value: MilkOption; label: string }[] = [
  { value: 'whole', label: 'Whole Milk' },
  { value: 'skim', label: 'Skim Milk' },
  { value: 'oat', label: 'Oat Milk' },
  { value: 'almond', label: 'Almond Milk' },
  { value: 'soy', label: 'Soy Milk' },
  { value: 'coconut', label: 'Coconut Milk' },
];

const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const { productId } = route.params;

  // State for customization
  const [size, setSize] = useState<ProductSize>('medium');
  const [milk, setMilk] = useState<MilkOption>('whole');
  const [selectedExtras, setSelectedExtras] = useState<Extra[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  // Mock product data - we'll get this from context/props later
  const product = {
    id: productId,
    name: 'Caffè Latte',
    description: 'Smooth espresso with steamed milk and a light foam layer',
    price: 4.5,
    image_url: 'https://images.unsplash.com/photo-1561882468-9110e03e0f78',
  };

  const toggleExtra = (extra: Extra) => {
    setSelectedExtras((prev) =>
      prev.find((e) => e.id === extra.id)
        ? prev.filter((e) => e.id !== extra.id)
        : [...prev, extra]
    );
  };

  const calculatePrice = () => {
    const sizeMultiplier =
      SIZES.find((s) => s.value === size)?.priceMultiplier || 1;
    const extrasPrice = selectedExtras.reduce(
      (sum, extra) => sum + extra.price,
      0
    );
    return ((product.price * sizeMultiplier + extrasPrice) * quantity).toFixed(
      2
    );
  };

  const handleAddToCart = () => {
    // We'll implement cart functionality later
    console.log('Add to cart:', {
      product,
      quantity,
      customization: { size, milk, extras: selectedExtras },
      notes,
    });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Typography variant="h3">←</Typography>
          </TouchableOpacity>
          <Image
            source={{ uri: product.image_url }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>

        <View style={styles.content}>
          {/* Product Info */}
          <Typography variant="h2" style={styles.productName}>
            {product.name}
          </Typography>
          <Typography variant="body" color="textSecondary">
            {product.description}
          </Typography>

          {/* Size Selection */}
          <View style={styles.section}>
            <Typography variant="h3" style={styles.sectionTitle}>
              Size
            </Typography>
            <View style={styles.optionsRow}>
              {SIZES.map((sizeOption) => (
                <TouchableOpacity
                  key={sizeOption.value}
                  style={[
                    styles.optionChip,
                    size === sizeOption.value && styles.optionChipActive,
                  ]}
                  onPress={() => setSize(sizeOption.value)}
                >
                  <Typography
                    variant="label"
                    color={
                      size === sizeOption.value ? 'textOnPrimary' : 'textPrimary'
                    }
                  >
                    {sizeOption.label}
                  </Typography>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Milk Selection */}
          <View style={styles.section}>
            <Typography variant="h3" style={styles.sectionTitle}>
              Milk
            </Typography>
            <View style={styles.optionsGrid}>
              {MILK_OPTIONS.map((milkOption) => (
                <TouchableOpacity
                  key={milkOption.value}
                  style={[
                    styles.optionChip,
                    milk === milkOption.value && styles.optionChipActive,
                  ]}
                  onPress={() => setMilk(milkOption.value)}
                >
                  <Typography
                    variant="label"
                    color={
                      milk === milkOption.value
                        ? 'textOnPrimary'
                        : 'textPrimary'
                    }
                  >
                    {milkOption.label}
                  </Typography>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Extras */}
          <View style={styles.section}>
            <Typography variant="h3" style={styles.sectionTitle}>
              Extras
            </Typography>
            <View style={styles.extrasList}>
              {EXTRAS.map((extra) => (
                <TouchableOpacity
                  key={extra.id}
                  style={[
                    styles.extraItem,
                    selectedExtras.find((e) => e.id === extra.id) &&
                      styles.extraItemActive,
                  ]}
                  onPress={() => toggleExtra(extra)}
                >
                  <View style={styles.extraInfo}>
                    <Typography variant="body">{extra.name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      +${extra.price.toFixed(2)}
                    </Typography>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      selectedExtras.find((e) => e.id === extra.id) &&
                        styles.checkboxActive,
                    ]}
                  >
                    {selectedExtras.find((e) => e.id === extra.id) && (
                      <Typography color="white">✓</Typography>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Quantity */}
          <View style={styles.section}>
            <Typography variant="h3" style={styles.sectionTitle}>
              Quantity
            </Typography>
            <View style={styles.quantityControl}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Typography variant="h3">-</Typography>
              </TouchableOpacity>
              <Typography variant="h3">{quantity}</Typography>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(quantity + 1)}
              >
                <Typography variant="h3">+</Typography>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.priceSection}>
          <Typography variant="caption" color="textSecondary">
            Total
          </Typography>
          <Typography variant="h2" color="primary">
            ${calculatePrice()}
          </Typography>
        </View>
        <Button
          title="Add to Cart"
          variant="primary"
          fullWidth
          onPress={handleAddToCart}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  imageContainer: {
    width: '100%',
    height: 300,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.gray200,
  },
  backButton: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    zIndex: 1,
    backgroundColor: colors.white,
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...require('../../theme').shadows.md,
  },
  content: {
    padding: spacing.lg,
  },
  productName: {
    marginBottom: spacing.sm,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  extrasList: {
    gap: spacing.sm,
  },
  extraItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  extraItemActive: {
    backgroundColor: colors.primaryLight + '20',
    borderColor: colors.primary,
  },
  extraInfo: {
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.gray400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  quantityButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default ProductDetailScreen;
