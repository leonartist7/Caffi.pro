import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Typography, Button, Card, CartItemCard } from '../../components';
import { colors, spacing } from '../../theme';
import { useCart } from '../../contexts/CartContext';
import { MainTabParamList } from '../../types';

type NavigationProp = BottomTabNavigationProp<MainTabParamList>;

const CartScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { items, itemCount, subtotal, tax, total, updateQuantity, removeItem, clearCart } = useCart();

  const handleCheckout = () => {
    // TODO: Navigate to checkout screen (Phase 4)
    Alert.alert(
      'Checkout',
      'Checkout functionality will be added in Phase 4!',
      [{ text: 'OK' }]
    );
  };

  const handleClearCart = () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: clearCart,
        },
      ]
    );
  };

  const handleBrowseMenu = () => {
    navigation.navigate('Menu');
  };

  const isCartEmpty = items.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Typography variant="h2">Cart</Typography>
        {!isCartEmpty && (
          <Typography variant="caption" color="textSecondary">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </Typography>
        )}
      </View>

      {isCartEmpty ? (
        <View style={styles.emptyState}>
          <Typography variant="h1">🛒</Typography>
          <Typography variant="h3" style={styles.emptyTitle}>
            Your cart is empty
          </Typography>
          <Typography variant="body" color="textSecondary" align="center">
            Add items from the menu to get started
          </Typography>
          <Button
            title="Browse Menu"
            variant="primary"
            style={styles.browseButton}
            onPress={handleBrowseMenu}
          />
        </View>
      ) : (
        <>
          <ScrollView style={styles.itemsContainer}>
            {/* Cart Items */}
            {items.map((item, index) => (
              <CartItemCard
                key={index}
                item={item}
                index={index}
                onUpdateQuantity={updateQuantity}
                onRemove={removeItem}
              />
            ))}

            {/* Clear Cart Button */}
            <Button
              title="Clear Cart"
              variant="text"
              onPress={handleClearCart}
              style={styles.clearButton}
            />
          </ScrollView>

          <View style={styles.footer}>
            <Card variant="elevated" padding="lg">
              {/* Subtotal */}
              <View style={styles.summaryRow}>
                <Typography variant="body">Subtotal</Typography>
                <Typography variant="body">
                  ${subtotal.toFixed(2)}
                </Typography>
              </View>

              {/* Tax */}
              <View style={styles.summaryRow}>
                <Typography variant="body">Tax (8%)</Typography>
                <Typography variant="body">
                  ${tax.toFixed(2)}
                </Typography>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Total */}
              <View style={styles.totalRow}>
                <Typography variant="h3">Total</Typography>
                <Typography variant="h3" color="primary">
                  ${total.toFixed(2)}
                </Typography>
              </View>

              <Button
                title="Proceed to Checkout"
                variant="primary"
                fullWidth
                style={styles.checkoutButton}
                onPress={handleCheckout}
              />
            </Card>
          </View>
        </>
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
  itemsContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  clearButton: {
    marginTop: spacing.md,
    alignSelf: 'center',
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  checkoutButton: {
    marginTop: spacing.sm,
  },
});

export default CartScreen;
