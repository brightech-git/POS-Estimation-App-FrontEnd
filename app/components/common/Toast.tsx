/**
 * Toast — lightweight auto-dismiss notification.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.show({ message: 'Saved!', type: 'success' });
 *
 * Wrap your root with <ToastProvider> to enable it.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow } from './theme';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top' | 'bottom';

export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;      // ms — default 3000
  position?: ToastPosition;
  action?: { label: string; onPress: () => void };
}

interface ToastContextValue {
  show: (opts: ToastOptions) => void;
  hide: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const META: Record<ToastType, { icon: string; color: string; bg: string; border: string }> = {
  success: { icon: '✓', color: Colors.success, bg: '#1B5E20', border: Colors.success },
  error:   { icon: '✕', color: Colors.white,   bg: '#B71C1C', border: Colors.error   },
  warning: { icon: '!', color: Colors.white,   bg: '#E65100', border: Colors.warning  },
  info:    { icon: 'i', color: Colors.white,   bg: Colors.primaryDark, border: Colors.primary },
};

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastCtx = createContext<ToastContextValue>({
  show: () => {},
  hide: () => {},
});

export const useToast = () => useContext(ToastCtx);

// ─── Provider ────────────────────────────────────────────────────────────────

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const opacity  = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const timer    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity,     { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(translateY,  { toValue: -20, duration: 250, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [opacity, translateY]);

  const show = useCallback((opts: ToastOptions) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(opts);

    const pos = opts.position ?? 'top';
    translateY.setValue(pos === 'top' ? -20 : 20);
    opacity.setValue(0);

    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0,  duration: 300, useNativeDriver: true }),
    ]).start();

    timer.current = setTimeout(hide, opts.duration ?? 3000);
  }, [hide, opacity, translateY]);

  const meta = toast ? META[toast.type ?? 'info'] : META.info;
  const isBottom = toast?.position === 'bottom';

  return (
    <ToastCtx.Provider value={{ show, hide }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.container,
            isBottom ? styles.bottom : styles.top,
            { backgroundColor: meta.bg, opacity, transform: [{ translateY }] },
          ]}
          pointerEvents="box-none"
        >
          <View style={[styles.indicator, { backgroundColor: meta.border }]} />
          <Text style={[styles.icon, { color: meta.color }]}>{meta.icon}</Text>
          <Text style={styles.message} numberOfLines={2}>{toast.message}</Text>
          {toast.action && (
            <TouchableOpacity
              onPress={() => { toast.action!.onPress(); hide(); }}
              style={styles.actionBtn}
            >
              <Text style={styles.actionText}>{toast.action.label}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={hide} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastCtx.Provider>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    overflow: 'hidden',
    ...Shadow.lg,
    zIndex: 9999,
  },
  top:    { top: 52 },
  bottom: { bottom: 32 },
  indicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: Radius.md,
    borderBottomLeftRadius: Radius.md,
  },
  icon: {
    fontSize: Typography.fontSizeMD,
    fontWeight: Typography.fontWeightBold,
    marginLeft: Spacing.sm,
    marginRight: Spacing.sm,
    color: Colors.white,
  },
  message: {
    flex: 1,
    color: Colors.white,
    fontSize: Typography.fontSizeMD,
    fontWeight: Typography.fontWeightMedium,
    lineHeight: 18,
  },
  actionBtn: {
    marginLeft: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  actionText: {
    color: Colors.white,
    fontSize: Typography.fontSizeSM,
    fontWeight: Typography.fontWeightBold,
  },
  closeBtn: {
    marginLeft: Spacing.sm,
    padding: 4,
  },
  closeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: Typography.fontSizeSM,
  },
});
