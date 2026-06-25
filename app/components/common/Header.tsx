import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { Colors, Typography, Spacing, Shadow } from './theme';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HeaderAction {
  icon: React.ReactNode;
  onPress: () => void;
  label?: string;
  badge?: number;
}

export interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: HeaderAction[];
  /** Override background colour (default: Colors.primary) */
  backgroundColor?: string;
  /** Show a thin bottom border shadow (default: true) */
  elevated?: boolean;
  centerTitle?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight ?? 0;

const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  actions = [],
  backgroundColor = Colors.primary,
  elevated = true,
  centerTitle = false,
}) => {
  return (
    <>
      <StatusBar backgroundColor={backgroundColor} barStyle="light-content" />
      <View
        style={[
          styles.container,
          { backgroundColor },
          elevated && Shadow.md,
        ]}
      >
        {/* Left — back button */}
        <View style={styles.left}>
          {showBack && (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={onBack}
              activeOpacity={0.7}
              accessibilityLabel="Go back"
            >
              <Text style={styles.backArrow}>‹</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Centre — title */}
        <View style={[styles.titleWrap, centerTitle && styles.titleCenter]}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Right — action buttons */}
        <View style={styles.right}>
          {actions.map((action, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.iconBtn}
              onPress={action.onPress}
              activeOpacity={0.7}
              accessibilityLabel={action.label}
            >
              {action.icon}
              {action.badge != null && action.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {action.badge > 99 ? '99+' : action.badge}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const Radius_full = 999;
const styles = StyleSheet.create({
  container: {
    paddingTop: STATUSBAR_HEIGHT,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56 + STATUSBAR_HEIGHT,
  },
  left: {
    width: 40,
    alignItems: 'flex-start',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  titleWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  titleCenter: {
    alignItems: 'center',
  },
  title: {
    color: Colors.textInverse,
    fontSize: Typography.fontSizeLG,
    fontWeight: Typography.fontWeightBold,
    letterSpacing: 0.3,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: Typography.fontSizeSM,
    marginTop: 1,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  backArrow: {
    color: Colors.textInverse,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: Typography.fontWeightBold,
    marginTop: -2,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Colors.error,
    borderRadius: Radius_full,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: Typography.fontWeightBold,
  },
});



export default Header;
