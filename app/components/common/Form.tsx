/**
 * Form — layout wrapper with section support, submit/cancel buttons,
 * and optional keyboard-avoiding scroll.
 *
 * Usage:
 *   <Form title="New Estimate" onSubmit={handleSubmit} onCancel={goBack}>
 *     <Form.Section title="Customer Details">
 *       <InputBox label="Name" ... />
 *     </Form.Section>
 *   </Form>
 */
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow } from './theme';

// ─── Section ─────────────────────────────────────────────────────────────────

interface SectionProps {
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

const Section: React.FC<SectionProps> = ({ title, children, style }) => (
  <View style={[styles.section, style]}>
    {title && <Text style={styles.sectionTitle}>{title}</Text>}
    {children}
  </View>
);

// ─── Form ────────────────────────────────────────────────────────────────────

interface FormProps {
  title?: string;
  children: React.ReactNode;
  onSubmit?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  submitDisabled?: boolean;
  loading?: boolean;
  /** Hide the default action row */
  hideActions?: boolean;
  /** Extra style on the outer card */
  cardStyle?: ViewStyle;
  /** Wrap in a KeyboardAvoidingView+ScrollView (default true) */
  scrollable?: boolean;
}

const Form: React.FC<FormProps> & { Section: typeof Section } = ({
  title,
  children,
  onSubmit,
  onCancel,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  submitDisabled = false,
  loading = false,
  hideActions = false,
  cardStyle,
  scrollable = true,
}) => {
  const content = (
    <View style={[styles.card, cardStyle]}>
      {title && (
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
      )}

      <View style={styles.cardBody}>{children}</View>

      {!hideActions && (
        <View style={styles.actionsRow}>
          {onCancel && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
          )}
          {onSubmit && (
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (submitDisabled || loading) && styles.submitDisabled,
              ]}
              onPress={onSubmit}
              disabled={submitDisabled || loading}
              activeOpacity={0.8}
            >
              <Text style={styles.submitText}>
                {loading ? 'Please wait…' : submitLabel}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  if (!scrollable) return content;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {content}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

Form.Section = Section;

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.md,
  },
  cardHeader: {
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cardTitle: {
    fontSize: Typography.fontSizeXL,
    fontWeight: Typography.fontWeightBold,
    color: Colors.primaryDark,
  },
  cardBody: {
    padding: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.fontSizeSM,
    fontWeight: Typography.fontWeightBold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primaryBg,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    backgroundColor: Colors.background,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizeMD,
    fontWeight: Typography.fontWeightSemiBold,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: Colors.white,
    fontSize: Typography.fontSizeMD,
    fontWeight: Typography.fontWeightBold,
  },
});

export default Form;
