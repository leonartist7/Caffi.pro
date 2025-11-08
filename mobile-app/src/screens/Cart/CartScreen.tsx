import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Typography, Button, Card } from '../../components';
import { colors, spacing } from '../../theme';

const CartScreen: React.FC = () => {
  const isCartEmpty = true; // We'll replace this with actual cart state later

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Typography variant="h2">Cart</Typography>
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
            onPress={() => {}}
          />
        </View>
      ) : (
        <>
          <ScrollView style={styles.itemsContainer}>
            {/* Cart items will go here */}
          </ScrollView>

          <View style={styles.footer}>
            <Card variant="elevated" padding="lg">
              <View style={styles.totalRow}>
                <Typography variant="h3">Total</Typography>
                <Typography variant="h3" color="primary">
                  $0.00
                </Typography>
              </View>
              <Button
                title="Checkout"
                variant="primary"
                fullWidth
                style={styles.checkoutButton}
                onPress={() => {}}
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
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
