import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Typography, Card } from '../../components';
import { colors, spacing, borderRadius } from '../../theme';

interface MenuItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
}) => (
  <TouchableOpacity onPress={onPress}>
    <Card style={styles.menuItem} variant="outlined">
      <View style={styles.menuItemLeft}>
        <Typography variant="body" style={styles.menuItemIcon}>
          {icon}
        </Typography>
        <View>
          <Typography variant="body" weight="medium">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption">{subtitle}</Typography>
          )}
        </View>
      </View>
      <Typography variant="body" color="textSecondary">
        →
      </Typography>
    </Card>
  </TouchableOpacity>
);

const ProfileScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Typography variant="h1">👤</Typography>
          </View>
          <Typography variant="h2" style={styles.name}>
            Guest User
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Login to save your preferences
          </Typography>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionTitle}>
            ACCOUNT
          </Typography>
          <MenuItem
            icon="⭐"
            title="Favorites"
            subtitle="Your saved items"
            onPress={() => {}}
          />
          <MenuItem
            icon="🎁"
            title="Rewards"
            subtitle="Earn points on every order"
            onPress={() => {}}
          />
          <MenuItem
            icon="💳"
            title="Payment Methods"
            onPress={() => {}}
          />
        </View>

        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionTitle}>
            PREFERENCES
          </Typography>
          <MenuItem
            icon="📍"
            title="Store Locations"
            onPress={() => {}}
          />
          <MenuItem
            icon="🔔"
            title="Notifications"
            onPress={() => {}}
          />
          <MenuItem
            icon="⚙️"
            title="Settings"
            onPress={() => {}}
          />
        </View>

        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionTitle}>
            SUPPORT
          </Typography>
          <MenuItem
            icon="❓"
            title="Help & Support"
            onPress={() => {}}
          />
          <MenuItem
            icon="ℹ️"
            title="About"
            onPress={() => {}}
          />
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
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  name: {
    marginBottom: spacing.xs,
  },
  section: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  menuItemIcon: {
    fontSize: 24,
  },
});

export default ProfileScreen;
