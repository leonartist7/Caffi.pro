import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Typography, Card, Button } from '../../components';
import { colors, spacing, borderRadius } from '../../theme';
import { STORE_LOCATIONS } from '../../data/locations';
import { StoreLocation } from '../../types';

interface LocationCardProps {
  location: StoreLocation;
}

const LocationCard: React.FC<LocationCardProps> = ({ location }) => {
  const handleCall = () => {
    Linking.openURL(`tel:${location.phone}`);
  };

  const handleDirections = () => {
    const address = `${location.address}, ${location.city}, ${location.state} ${location.zip}`;
    const url = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
    Linking.openURL(url);
  };

  return (
    <Card style={styles.locationCard} variant="elevated">
      <View style={styles.locationHeader}>
        <View style={styles.locationInfo}>
          <Typography variant="body" weight="semibold">
            {location.name}
          </Typography>
          {location.distance !== undefined && (
            <Typography variant="caption" color="primary" weight="medium">
              {location.distance} mi away
            </Typography>
          )}
        </View>
      </View>

      <View style={styles.locationDetails}>
        <View style={styles.detailRow}>
          <Typography variant="caption" style={styles.icon}>
            📍
          </Typography>
          <View style={styles.detailText}>
            <Typography variant="caption" color="textSecondary">
              {location.address}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {location.city}, {location.state} {location.zip}
            </Typography>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Typography variant="caption" style={styles.icon}>
            📞
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {location.phone}
          </Typography>
        </View>

        <View style={styles.detailRow}>
          <Typography variant="caption" style={styles.icon}>
            🕐
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {location.hours}
          </Typography>
        </View>
      </View>

      <View style={styles.locationActions}>
        <Button
          title="Call"
          variant="outline"
          size="small"
          style={styles.actionButton}
          onPress={handleCall}
        />
        <Button
          title="Directions"
          variant="primary"
          size="small"
          style={styles.actionButton}
          onPress={handleDirections}
        />
      </View>
    </Card>
  );
};

const LocationsScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Typography variant="h3">←</Typography>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Typography variant="h2">Locations</Typography>
          <Typography variant="caption" color="textSecondary">
            {STORE_LOCATIONS.length} stores near you
          </Typography>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {STORE_LOCATIONS.map((location) => (
          <LocationCard key={location.id} location={location} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    marginRight: spacing.md,
    padding: spacing.xs,
  },
  headerContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  locationCard: {
    marginBottom: spacing.md,
  },
  locationHeader: {
    marginBottom: spacing.md,
  },
  locationInfo: {
    gap: spacing.xs,
  },
  locationDetails: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  icon: {
    fontSize: 16,
    width: 20,
  },
  detailText: {
    flex: 1,
  },
  locationActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});

export default LocationsScreen;
