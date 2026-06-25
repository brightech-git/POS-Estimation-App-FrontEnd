import React, { forwardRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from './theme';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InputBoxProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Icon or element rendered on the left inside the input */
  leftIcon?: React.ReactNode;
  /** Icon or element rendered on the right inside the input */
  rightIcon?: React.ReactNode;
  /** Shortcut: show a clearable × button when there is a value */
  clearable?: boolean;
  onClear?: () => void;
  disabled?: boolean;
  /** Visual variant */
  variant?: 'outlined' | 'filled' | 'underlined';
}

// ─── Component ───────────────────────────────────────────────────────────────

const InputBox = forwardRef<TextInput, InputBoxProps>(
  (
    {
      label,
      hint,
      error,
      required = false,
      leftIcon,
      rightIcon,
      clearable = false,
      onClear,
      disabled = false,
      variant = 'outlined',
      value,
      onFocus,
      onBlur,
      style,
      ...rest
    },
    ref,
  ) => {
    const [focused, setFocused] = useState(false);

    const hasError  = !!error;
    const showClear = clearable && !!value && !disabled;

    const borderColor = hasError
      ? Colors.error
      : focused
      ? Colors.primary
      : Colors.border;

    const wrapperStyle = [
      styles.inputWrapper,
      variant === 'outlined'  && [styles.outlined,  { borderColor }],
      variant === 'filled'    && [styles.filled,     { borderColor }],
      variant === 'underlined'&& [styles.underlined, { borderBottomColor: borderColor }],
      disabled && styles.disabled,
    ];

    return (
      <View style={styles.root}>
        {/* Label */}
        {label && (
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        )}

        {/* Input row */}
        <View style={wrapperStyle as any}>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}

          <TextInput
            ref={ref}
            value={value}
            editable={!disabled}
            style={[
              styles.input,
              leftIcon  ? { paddingLeft: 0 } : undefined,
              (rightIcon || showClear) ? { paddingRight: 0 } : undefined,
              style,
            ]}
            placeholderTextColor={Colors.textDisabled}
            onFocus={e => { setFocused(true);  onFocus?.(e); }}
            onBlur={e  => { setFocused(false); onBlur?.(e);  }}
            {...rest}
          />

          {showClear && (
            <TouchableOpacity style={styles.iconRight} onPress={onClear} activeOpacity={0.6}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}

          {!showClear && rightIcon && (
            <View style={styles.iconRight}>{rightIcon}</View>
          )}
        </View>

        {/* Hint / Error */}
        {(error || hint) && (
          <Text style={[styles.hint, hasError && styles.hintError]}>
            {error ?? hint}
          </Text>
        )}
      </View>
    );
  },
);

InputBox.displayName = 'InputBox';

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.fontSizeSM,
    fontWeight: Typography.fontWeightSemiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  required: {
    color: Colors.error,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  outlined: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
  },
  filled: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background,
  },
  underlined: {
    borderBottomWidth: 1.5,
    paddingHorizontal: 0,
    paddingBottom: Spacing.xs,
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSizeMD,
    color: Colors.textPrimary,
    paddingVertical: Spacing.md,
    minHeight: 44,
  },
  iconLeft: {
    marginRight: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRight: {
    marginLeft: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  clearIcon: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  hint: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSizeXS,
    color: Colors.textSecondary,
  },
  hintError: {
    color: Colors.error,
  },
});

export default InputBox;
