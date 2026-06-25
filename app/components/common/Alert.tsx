import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow } from './theme';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  onDismiss?: () => void;
  /** Whether tapping the backdrop closes the alert */
  dismissible?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const META: Record<AlertType, { icon: string; color: string; bg: string }> = {
  success: { icon: '✓', color: Colors.success,  bg: Colors.successBg },
  error:   { icon: '✕', color: Colors.error,    bg: Colors.errorBg   },
  warning: { icon: '!', color: Colors.warning,  bg: Colors.warningBg },
  info:    { icon: 'i', color: Colors.info,     bg: Colors.infoBg    },
  confirm: { icon: '?', color: Colors.primary,  bg: Colors.primaryBg },
};

const BTN_STYLE: Record<string, object> = {
  default:     { backgroundColor: Colors.primary },
  cancel:      { backgroundColor: Colors.border  },
  destructive: { backgroundColor: Colors.error   },
};
const BTN_TEXT_STYLE: Record<string, object> = {
  default:     { color: Colors.white         },
  cancel:      { color: Colors.textSecondary },
  destructive: { color: Colors.white         },
};

// ─── Component ───────────────────────────────────────────────────────────────

const AppAlert: React.FC<AlertProps> = ({
  visible,
  type = 'info',
  title,
  message,
  buttons = [{ text: 'OK', style: 'default' }],
  onDismiss,
  dismissible = true,
}) => {
  const meta = META[type];

  const handleBackdrop = () => {
    if (dismissible) onDismiss?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleBackdrop}
    >
      <TouchableWithoutFeedback onPress={handleBackdrop}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* Icon badge */}
              <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
                <Text style={[styles.icon, { color: meta.color }]}>{meta.icon}</Text>
              </View>

              {/* Text */}
              <Text style={styles.title}>{title}</Text>
              {message ? <Text style={styles.message}>{message}</Text> : null}

              {/* Buttons */}
              <View style={[styles.btnRow, buttons.length === 1 && styles.btnRowSingle]}>
                {buttons.map((btn, idx) => {
                  const btnStyle = btn.style ?? 'default';
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.btn, BTN_STYLE[btnStyle], buttons.length > 1 && { flex: 1 }]}
                      onPress={() => {
                        btn.onPress?.();
                        onDismiss?.();
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.btnText, BTN_TEXT_STYLE[btnStyle]]}>
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    ...Shadow.lg,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  icon: {
    fontSize: 26,
    fontWeight: Typography.fontWeightBold,
  },
  title: {
    fontSize: Typography.fontSizeXL,
    fontWeight: Typography.fontWeightBold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: Typography.fontSizeMD,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  btnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
    marginTop: Spacing.md,
  },
  btnRowSingle: {
    justifyContent: 'center',
  },
  btn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    minWidth: 90,
  },
  btnText: {
    fontSize: Typography.fontSizeMD,
    fontWeight: Typography.fontWeightSemiBold,
  },
});

export default AppAlert;
