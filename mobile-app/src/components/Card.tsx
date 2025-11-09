import React from 'react';
import { View, StyleSheet, ViewProps, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../theme';

interface CardProps extends ViewProps {
  variant?: 'elevated' | 'outlined' | 'flat';
  padding?: keyof typeof spacing;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'elevated',
  padding = 'md',
  children,
  style,
  ...props
}) => {
  const cardStyles: ViewStyle[] = [
    styles.card,
    styles[variant],
    { padding: spacing[padding] },
  ];

  return (
    <View style={[cardStyles, style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
  },
  elevated: {
    ...shadows.md,
  },
  outlined: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  flat: {
    backgroundColor: colors.backgroundSecondary,
  },
});
