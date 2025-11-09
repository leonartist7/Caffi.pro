import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Typography, Card } from '../../components';
import { colors, spacing } from '../../theme';

const OrdersScreen: React.FC = () => {
  const hasOrders = false; // We'll replace with actual orders state later

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Typography variant="h2">Orders</Typography>
        <Typography variant="caption">Track your order history</Typography>
      </View>

      {hasOrders ? (
        <ScrollView style={styles.ordersContainer}>
          {/* Orders list will go here */}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Typography variant="h1">📋</Typography>
          <Typography variant="h3" style={styles.emptyTitle}>
            No orders yet
          </Typography>
          <Typography variant="body" color="textSecondary" align="center">
            Your order history will appear here
          </Typography>
        </View>
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
  ordersContainer: {
    flex: 1,
    padding: spacing.lg,
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
});

export default OrdersScreen;
