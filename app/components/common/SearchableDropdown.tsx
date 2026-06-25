import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow } from './theme';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface DropdownOption {
  label:     string;
  subLabel?: string;
  value:     any;
}

interface Props {
  label?:        string;
  required?:     boolean;
  placeholder?:  string;
  options:       DropdownOption[];
  selectedValue: any | null;
  onSelect:      (option: DropdownOption) => void;
  onSearch?:     (query: string) => void;
  loading?:      boolean;
  loadingMore?:  boolean;
  onLoadMore?:   () => void;
  error?:        string;
  leftIcon?:     React.ReactNode;
}

const LIST_HEIGHT = 220;

// ─── Component ────────────────────────────────────────────────────────────────
const SearchableDropdown: React.FC<Props> = ({
  label,
  required,
  placeholder = 'Search…',
  options,
  selectedValue,
  onSelect,
  onSearch,
  loading     = false,
  loadingMore = false,
  onLoadMore,
  error,
  leftIcon,
}) => {
  const [query,   setQuery]   = useState('');
  const [open,    setOpen]    = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef  = useRef<TextInput>(null);

  // Fill input label when an external value is set
  useEffect(() => {
    const label = selectedValue?.OPER_NAME   // operator
               ?? selectedValue?.COSTNAME    // cost centre
               ?? selectedValue?.label       // generic DropdownOption
               ?? null;
    if (label) setQuery(label);
  }, [selectedValue]);

  const handleChangeText = (text: string) => {
    setQuery(text);
    setOpen(true);
    onSearch?.(text);
  };

  const handleSelect = (opt: DropdownOption) => {
    setQuery(opt.label);
    setOpen(false);
    inputRef.current?.blur();
    onSelect(opt);
  };

  const handleFocus = () => {
    setFocused(true);
    setOpen(true);
    onSearch?.(query);
  };

  const handleBlur = () => {
    setFocused(false);
    setTimeout(() => setOpen(false), 180);
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!onLoadMore || loadingMore) return;
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 20) {
      onLoadMore();
    }
  };

  const borderColor = error ? Colors.error : focused ? Colors.primary : Colors.border;

  return (
    <View style={styles.root}>
      {/* Label */}
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      {/* Input */}
      <View style={[styles.inputWrap, { borderColor }]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textDisabled}
          value={query}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />

        {query.length > 0 ? (
          <TouchableOpacity
            style={styles.rightBtn}
            onPress={() => {
              setQuery('');
              onSearch?.('');
              setOpen(true);
              inputRef.current?.focus();
            }}
          >
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.chevron}>{open ? '▴' : '▾'}</Text>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* ── Inline dropdown list (not absolute — no clipping) ── */}
      {open && (
        <View style={styles.listBox}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.stateText}>  Loading…</Text>
            </View>
          ) : options.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.stateText}>No results found</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              keyboardShouldPersistTaps="always"
              nestedScrollEnabled
              scrollEventThrottle={16}
              onScroll={handleScroll}
              showsVerticalScrollIndicator
              persistentScrollbar
              indicatorStyle="black"
            >
              {options.map((item, index) => {
                const isSelected = item.label === query && item.value === selectedValue
                  || (item.value?.OPER_CODE != null && item.value?.OPER_CODE === selectedValue?.OPER_CODE)
                  || (item.value?.COSTID    != null && item.value?.COSTID    === selectedValue?.COSTID);
                return (
                  <View key={index}>
                    <TouchableOpacity
                      style={[styles.item, isSelected && styles.itemSelected]}
                      onPress={() => handleSelect(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.itemLeft}>
                        <Text style={[styles.itemLabel, isSelected && styles.itemLabelActive]}>
                          {item.label}
                        </Text>
                        {item.subLabel ? (
                          <Text style={styles.itemSub}>{item.subLabel}</Text>
                        ) : null}
                      </View>
                      {isSelected && <Text style={styles.check}>✓</Text>}
                    </TouchableOpacity>
                    {index < options.length - 1 && <View style={styles.separator} />}
                  </View>
                );
              })}

              {/* Load more */}
              {onLoadMore && (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={onLoadMore}
                  disabled={loadingMore}
                  activeOpacity={0.7}
                >
                  {loadingMore
                    ? <ActivityIndicator size="small" color={Colors.primary} />
                    : <Text style={styles.loadMoreText}>Load more ↓</Text>
                  }
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize:      Typography.fontSizeSM,
    fontWeight:    Typography.fontWeightSemiBold,
    color:         Colors.textPrimary,
    marginBottom:  Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  required: { color: Colors.error },

  inputWrap: {
    flexDirection:     'row',
    alignItems:        'center',
    borderWidth:       1.5,
    borderRadius:      Radius.md,
    paddingHorizontal: Spacing.md,
    backgroundColor:   Colors.white,
    minHeight:         48,
  },
  leftIcon:  { marginRight: Spacing.sm },
  input: {
    flex:            1,
    fontSize:        Typography.fontSizeMD,
    color:           Colors.textPrimary,
    paddingVertical: Spacing.md,
  },
  rightBtn:  { padding: Spacing.xs, marginLeft: Spacing.sm },
  clearText: { fontSize: 12, color: Colors.textSecondary },
  chevron:   { fontSize: 14, color: Colors.textSecondary, marginLeft: Spacing.sm },
  errorText: { fontSize: Typography.fontSizeXS, color: Colors.error, marginTop: Spacing.xs },

  // Inline list box — part of normal flow, no absolute
  listBox: {
    marginTop:       2,
    borderWidth:     1.5,
    borderColor:     Colors.primary,
    borderRadius:    Radius.md,
    backgroundColor: Colors.white,
    height:          LIST_HEIGHT,   // fixed height, scrolls inside
    ...Shadow.md,
  },
  scroll: {
    flex: 1,
  },

  center: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    flex:           1,
    padding:        Spacing.lg,
  },
  stateText: { color: Colors.textSecondary, fontSize: Typography.fontSizeMD },

  item: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight:         48,
  },
  itemSelected:    { backgroundColor: Colors.primaryBg },
  itemLeft:        { flex: 1 },
  itemLabel: {
    fontSize:   Typography.fontSizeMD,
    color:      Colors.textPrimary,
    fontWeight: Typography.fontWeightMedium,
  },
  itemLabelActive: { color: Colors.primary, fontWeight: Typography.fontWeightBold },
  itemSub:  { fontSize: Typography.fontSizeXS, color: Colors.textSecondary, marginTop: 2 },
  check:    { fontSize: 16, color: Colors.primary },
  separator: {
    height:           1,
    backgroundColor:  Colors.divider,
    marginHorizontal: Spacing.lg,
  },

  loadMoreBtn: {
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: Spacing.md,
    borderTopWidth:  1,
    borderTopColor:  Colors.border,
  },
  loadMoreText: {
    fontSize:   Typography.fontSizeSM,
    color:      Colors.primary,
    fontWeight: Typography.fontWeightSemiBold,
  },
});

export default SearchableDropdown;
