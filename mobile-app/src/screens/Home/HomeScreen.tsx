import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Image,
} from 'react-native';
import { Typography, Button, Card } from '../../components';
import { colors, spacing } from '../../theme';

const HomeScreen: React.FC = () => {
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
              onPress={() => {}}
            />
          </View>
        </Card>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Typography variant="h3" style={styles.sectionTitle}>
            Quick Actions
          </Typography>
          <View style={styles.quickActions}>
            <Card style={styles.quickActionCard}>
              <Typography variant="body" align="center">
                ☕
              </Typography>
              <Typography variant="label" align="center">
                Reorder
              </Typography>
            </Card>
            <Card style={styles.quickActionCard}>
              <Typography variant="body" align="center">
                ⭐
              </Typography>
              <Typography variant="label" align="center">
                Favorites
              </Typography>
            </Card>
            <Card style={styles.quickActionCard}>
              <Typography variant="body" align="center">
                📍
              </Typography>
              <Typography variant="label" align="center">
                Locations
              </Typography>
            </Card>
          </View>
        </View>

        {/* Popular Items */}
        <View style={styles.section}>
          <Typography variant="h3" style={styles.sectionTitle}>
            Popular Items
          </Typography>
          <Typography variant="caption">
            Try our most loved drinks
          </Typography>
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
  sectionTitle: {
    marginBottom: spacing.sm,
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
  },
});

export default HomeScreen;
