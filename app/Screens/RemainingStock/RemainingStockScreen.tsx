import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  StatusBar,
} from 'react-native';

const WINDOW_H = Dimensions.get('window').height;
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import Table from '../../components/common/Table';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../components/common/theme';
import { useRemainingStock } from '../../api/hooks/useRemainingStock';
import { useStockLookup } from '../../api/hooks/useStockLookup';
import { GROUP_BY_OPTIONS } from '../../types/RemainingStock';
import type { RemainingStockItem } from '../../types/RemainingStock';
import type { RootStackParamList } from '../../Navigations/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'RemainingStock'>;

// ── Date helpers ──────────────────────────────────────────────────────
const todayISO = (): string => new Date().toISOString().split('T')[0];

const fmtDisplay = (iso: string): string => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const isoFromParts = (y: number, m: number, d: number): string =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();

// ── Table columns ────────────────────────────────────────────────────
const COLUMNS = [
  { key: 'tagNo',          title: 'Tag No',      width: 90,  sortable: true  },
  { key: 'productName',    title: 'Product',      width: 120, sortable: true  },
  {
    key: 'subProductName', title: 'Sub Product',  width: 110, sortable: false,
    render: (v: string | null) => <Text style={cellText}>{v ?? '—'}</Text>,
  },
  {
    key: 'brandName',      title: 'Brand',        width: 90,  sortable: false,
    render: (v: string | null) => <Text style={cellText}>{v ?? '—'}</Text>,
  },
  {
    key: 'sizeName',       title: 'Size',         width: 70,  sortable: false,
    render: (v: string | null) => <Text style={cellText}>{v ?? '—'}</Text>,
  },
  { key: 'tagedPCS',   title: 'Tgd PCS',  width: 72, sortable: true, align: 'right' as const },
  { key: 'salePCS',    title: 'Sale PCS', width: 72, sortable: true, align: 'right' as const },
  { key: 'balancePCS', title: 'Bal PCS',  width: 72, sortable: true, align: 'right' as const },
  {
    key: 'tagedWT',    title: 'Tgd Wt',   width: 72, sortable: true, align: 'right' as const,
    render: (v: number) => <Text style={cellText}>{Number(v).toFixed(3)}</Text>,
  },
  {
    key: 'saleWT',     title: 'Sale Wt',  width: 72, sortable: true, align: 'right' as const,
    render: (v: number) => <Text style={cellText}>{Number(v).toFixed(3)}</Text>,
  },
  {
    key: 'balanceWT',  title: 'Bal Wt',   width: 72, sortable: true, align: 'right' as const,
    render: (v: number) => <Text style={cellText}>{Number(v).toFixed(3)}</Text>,
  },
];

// ── Types ─────────────────────────────────────────────────────────────
interface FilterState {
  fromDate:        string;
  toDate:          string;
  productCode:     string;   // local only — used for cascade, NOT sent to API
  productName:     string;   // sent to API as productName text filter
  subProductCode:  string;   // sent to API
  subProductName:  string;   // display only
  sizeCode:        string;   // sent to API
  sizeName:        string;   // display only
  brandCode:       string;   // sent to API
  brandName:       string;   // display only
  groupBy:         string[];
}

const makeInitialFilters = (): FilterState => ({
  fromDate:        todayISO(),
  toDate:          todayISO(),
  productCode:     '',
  productName:     '',
  subProductCode:  '',
  subProductName:  '',
  sizeCode:        '',
  sizeName:        '',
  brandCode:       '',
  brandName:       '',
  groupBy:         [],
});

const toParams = (f: FilterState, tagNo: string) => ({
  tagNo:          tagNo.trim()        || undefined,
  fromDate:       f.fromDate          || undefined,
  toDate:         f.toDate            || undefined,
  productCode:    f.productCode       || undefined,   // send code, not name
  subProductCode: f.subProductCode    || undefined,
  sizeCode:       f.sizeCode          || undefined,
  brandCode:      f.brandCode         || undefined,
  groupBy:        f.groupBy.length ? f.groupBy.join(',') : undefined,
});

// ── Screen ────────────────────────────────────────────────────────────
const RemainingStockScreen: React.FC<Props> = ({ navigation }) => {
  const { data, loading, error, fetch, reset } = useRemainingStock();

  const [tagNo, setTagNo]             = useState('');
  const [tagNoError, setTagNoError]   = useState('');
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(makeInitialFilters);
  const [draftFilters,   setDraftFilters]   = useState<FilterState>(makeInitialFilters);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Derived — active filter count (only code/value fields, not display-name mirrors)
  const activeFilterCount = useMemo(() => (
    (appliedFilters.fromDate       ? 1 : 0) +
    (appliedFilters.toDate         ? 1 : 0) +
    (appliedFilters.productCode    ? 1 : 0) +
    (appliedFilters.subProductCode ? 1 : 0) +
    (appliedFilters.brandCode      ? 1 : 0) +
    (appliedFilters.sizeCode       ? 1 : 0) +
    appliedFilters.groupBy.length
  ), [appliedFilters]);

  // Active chips — show display names, keyed by code fields
  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; value: string }[] = [];
    if (appliedFilters.fromDate)
      chips.push({ key: 'fromDate', label: 'From', value: fmtDisplay(appliedFilters.fromDate) });
    if (appliedFilters.toDate)
      chips.push({ key: 'toDate',   label: 'To',   value: fmtDisplay(appliedFilters.toDate) });
    if (appliedFilters.productCode)
      chips.push({ key: 'productCode', label: 'Product', value: appliedFilters.productName || appliedFilters.productCode });
    if (appliedFilters.subProductCode)
      chips.push({ key: 'subProductCode', label: 'Sub Product', value: appliedFilters.subProductName || appliedFilters.subProductCode });
    if (appliedFilters.brandCode)
      chips.push({ key: 'brandCode', label: 'Brand', value: appliedFilters.brandName || appliedFilters.brandCode });
    if (appliedFilters.sizeCode)
      chips.push({ key: 'sizeCode', label: 'Size', value: appliedFilters.sizeName || appliedFilters.sizeCode });
    appliedFilters.groupBy.forEach(item => {
      const opt = GROUP_BY_OPTIONS.find(o => o.value === item);
      chips.push({ key: `groupBy:${item}`, label: 'Group', value: opt?.label ?? item });
    });
    return chips;
  }, [appliedFilters]);

  const validateTagNo = useCallback((): boolean => {
    if (!tagNo.trim()) { setTagNoError('Tag number is required'); return false; }
    setTagNoError('');
    return true;
  }, [tagNo]);

  const handleSearch = useCallback(() => {
    if (!validateTagNo()) return;
    fetch(toParams(appliedFilters, tagNo));
  }, [tagNo, appliedFilters, fetch, validateTagNo]);

  const handleFullReset = useCallback(() => {
    const fresh = makeInitialFilters();
    setTagNo('');
    setTagNoError('');
    setAppliedFilters(fresh);
    setDraftFilters(fresh);
    reset();
  }, [reset]);

  const handleRemoveChip = useCallback((key: string) => {
    let updated: FilterState;
    if (key.startsWith('groupBy:')) {
      const val = key.replace('groupBy:', '');
      updated = { ...appliedFilters, groupBy: appliedFilters.groupBy.filter(v => v !== val) };
    } else if (key === 'productCode') {
      // removing product cascades sub/brand/size too
      updated = {
        ...appliedFilters,
        productCode: '', productName: '',
        subProductCode: '', subProductName: '',
        brandCode: '',      brandName: '',
        sizeCode: '',       sizeName: '',
      };
    } else if (key === 'subProductCode') {
      updated = { ...appliedFilters, subProductCode: '', subProductName: '' };
    } else if (key === 'brandCode') {
      updated = { ...appliedFilters, brandCode: '', brandName: '' };
    } else if (key === 'sizeCode') {
      updated = { ...appliedFilters, sizeCode: '', sizeName: '' };
    } else {
      updated = { ...appliedFilters, [key]: '' };
    }
    setAppliedFilters(updated);
    setDraftFilters(updated);
    if (tagNo.trim()) fetch(toParams(updated, tagNo));
  }, [appliedFilters, tagNo, fetch]);

  const openFilterModal = useCallback(() => {
    setDraftFilters({ ...appliedFilters });
    setFilterModalVisible(true);
  }, [appliedFilters]);

  const handleApplyFilters = useCallback(() => {
    setAppliedFilters({ ...draftFilters });
    setFilterModalVisible(false);
    if (tagNo.trim()) fetch(toParams(draftFilters, tagNo));
  }, [draftFilters, tagNo, fetch]);

  const summary = data?.summary;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Remaining Stock</Text>
        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={openFilterModal}
          activeOpacity={0.75}
        >
          <Text style={[styles.filterBtnText, activeFilterCount > 0 && styles.filterBtnTextActive]}>
            ⊞  Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Tag No — Required */}
          <View style={styles.card}>
            <View style={styles.labelRow}>
              <Text style={styles.sectionTitle}>Tag Number</Text>
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredBadgeText}>Required</Text>
              </View>
            </View>

            <View style={styles.tagRow}>
              <TextInput
                style={[
                  styles.tagInput,
                  tagNoError ? styles.inputError : tagNo ? styles.inputFilled : null,
                ]}
                value={tagNo}
                onChangeText={v => { setTagNo(v); if (tagNoError) setTagNoError(''); }}
                onBlur={validateTagNo}
                placeholder="e.g.  TAG001"
                placeholderTextColor={Colors.textDisabled}
                autoCapitalize="characters"
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
              <TouchableOpacity
                style={[styles.searchBtn, loading && styles.searchBtnDisabled]}
                onPress={handleSearch}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color={Colors.white} size="small" />
                  : <Text style={styles.searchBtnText}>Search</Text>}
              </TouchableOpacity>
            </View>

            {!!tagNoError && <Text style={styles.fieldError}>⚠  {tagNoError}</Text>}

            <TouchableOpacity onPress={handleFullReset} activeOpacity={0.7} style={styles.resetLink}>
              <Text style={styles.resetLinkText}>Reset all</Text>
            </TouchableOpacity>
          </View>

          {/* Active filter chips */}
          {activeFilterChips.length > 0 && (
            <View style={styles.chipsWrap}>
              {activeFilterChips.map(chip => (
                <View key={chip.key} style={styles.chip}>
                  <Text style={styles.chipText}>{chip.label}: {chip.value}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveChip(chip.key)}
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 8 }}
                  >
                    <Text style={styles.chipRemove}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{error}</Text>
            </View>
          )}

          {loading && (
            <ActivityIndicator color={Colors.primary} size="large" style={{ marginVertical: Spacing.xl }} />
          )}

          {!!summary && !loading && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Summary</Text>
              <View style={styles.summaryGrid}>
                <SummaryItem label="Tagged PCS"  value={summary.tagedPCS} />
                <SummaryItem label="Sale PCS"    value={summary.salePCS} />
                <SummaryItem label="Balance PCS" value={summary.balancePCS} highlight />
                <SummaryItem label="Tagged Wt"   value={Number(summary.tagedWT).toFixed(3)} />
                <SummaryItem label="Sale Wt"     value={Number(summary.saleWT).toFixed(3)} />
                <SummaryItem label="Balance Wt"  value={Number(summary.balanceWT).toFixed(3)} highlight />
              </View>
            </View>
          )}

          {!!data && !loading && (
            <View>
              <Text style={styles.countText}>
                {data.count} record{data.count !== 1 ? 's' : ''}
                {data.groupBy ? `  •  Grouped by: ${data.groupBy}` : ''}
              </Text>
              <Table<RemainingStockItem>
                columns={COLUMNS}
                data={data.data}
                keyExtractor={(item, i) => `${item.tagNo}-${i}`}
                emptyText="No stock records found."
                striped
              />
            </View>
          )}
        </ScrollView>
      </View>

      <FilterModal
        visible={filterModalVisible}
        filters={draftFilters}
        onChange={setDraftFilters}
        onApply={handleApplyFilters}
        onReset={() => setDraftFilters(makeInitialFilters())}
        onClose={() => setFilterModalVisible(false)}
      />
    </SafeAreaView>
  );
};

// ── SelectionModal — center-aligned picker ────────────────────────────
interface SelectionModalProps {
  visible:        boolean;
  title:          string;
  items:          Array<{ label: string; value: string }>;
  selectedValue?: string;
  loading:        boolean;
  error?:         string;
  searchText:     string;
  onSearchChange: (text: string) => void;
  onSelect:       (value: string, label: string) => void;
  onClose:        () => void;
}

const SelectionModal: React.FC<SelectionModalProps> = ({
  visible, title, items, selectedValue, loading, error,
  searchText, onSearchChange, onSelect, onClose,
}) => {
  const filtered = useMemo(() => {
    if (!searchText.trim()) return items;
    const q = searchText.toLowerCase();
    return items.filter(i => i.label.toLowerCase().includes(q));
  }, [items, searchText]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={selStyles.overlay} onPress={onClose}>
        <Pressable onPress={e => e.stopPropagation()} style={selStyles.card}>

          {/* Header */}
          <View style={selStyles.header}>
            <Text style={selStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={selStyles.closeBtn}>
              <Text style={selStyles.closeBtnTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={selStyles.searchWrap}>
            <Text style={selStyles.searchIcon}>🔍</Text>
            <TextInput
              style={selStyles.searchInput}
              value={searchText}
              onChangeText={onSearchChange}
              placeholder="Search…"
              placeholderTextColor={Colors.textDisabled}
              autoCorrect={false}
              autoCapitalize="words"
            />
            {!!searchText && (
              <TouchableOpacity onPress={() => onSearchChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={selStyles.searchClear}>×</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Count hint */}
          {!loading && (
            <Text style={selStyles.countHint}>
              {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
              {searchText ? ' found' : ''}
            </Text>
          )}

          {/* List — wrapped in flex:1 container so card height stays fixed */}
          <View style={selStyles.listWrap}>
            {loading ? (
              <View style={selStyles.loaderWrap}>
                <ActivityIndicator color={Colors.primary} size="large" />
                <Text style={selStyles.loaderTxt}>Loading…</Text>
              </View>
            ) : error ? (
              <View style={selStyles.loaderWrap}>
                <Text style={selStyles.errorTxt}>⚠ {error}</Text>
              </View>
            ) : filtered.length === 0 ? (
              <View style={selStyles.loaderWrap}>
                <Text style={selStyles.emptyTxt}>No items found</Text>
              </View>
            ) : (
              <ScrollView
                style={selStyles.list}
                keyboardShouldPersistTaps="handled"
                bounces={false}
                showsVerticalScrollIndicator
              >
                {filtered.map(item => {
                  const isSelected = item.value === selectedValue;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[selStyles.item, isSelected && selStyles.itemSelected]}
                      onPress={() => onSelect(item.value, item.label)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[selStyles.itemText, isSelected && selStyles.itemTextSelected]}
                        numberOfLines={2}
                      >
                        {item.label}
                      </Text>
                      {isSelected && <Text style={selStyles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ── PickerButton — replaces text input in filter sheet ────────────────
interface PickerButtonProps {
  label:    string;
  value:    string;
  disabled?: boolean;
  onPress:  () => void;
  onClear:  () => void;
}

const PickerButton: React.FC<PickerButtonProps> = ({ label, value, disabled, onPress, onClear }) => (
  <View style={styles.sheetField}>
    <Text style={styles.sheetFieldLabel}>{label}</Text>
    <TouchableOpacity
      style={[styles.pickerBtn, value && styles.pickerBtnFilled, disabled && styles.pickerBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
    >
      <Text
        style={[styles.pickerBtnText, !value && styles.pickerBtnPlaceholder]}
        numberOfLines={1}
      >
        {value || `Select ${label}…`}
      </Text>
      {value ? (
        <TouchableOpacity
          onPress={e => { e.stopPropagation?.(); onClear(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.pickerBtnClear}>×</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.pickerBtnArrow}>{disabled ? '—' : '▼'}</Text>
      )}
    </TouchableOpacity>
  </View>
);

// ── PickerButtonRow — two pickers side by side ────────────────────────
interface PickerButtonRowProps {
  leftLabel:   string;
  leftValue:   string;
  leftDisabled?: boolean;
  onLeftPress: () => void;
  onLeftClear: () => void;
  rightLabel:   string;
  rightValue:   string;
  rightDisabled?: boolean;
  onRightPress: () => void;
  onRightClear: () => void;
}

const PickerButtonRow: React.FC<PickerButtonRowProps> = ({
  leftLabel, leftValue, leftDisabled, onLeftPress, onLeftClear,
  rightLabel, rightValue, rightDisabled, onRightPress, onRightClear,
}) => (
  <View style={styles.sheetRow}>
    <View style={{ flex: 1 }}>
      <Text style={styles.sheetFieldLabel}>{leftLabel}</Text>
      <TouchableOpacity
        style={[styles.pickerBtn, leftValue && styles.pickerBtnFilled, leftDisabled && styles.pickerBtnDisabled]}
        onPress={onLeftPress}
        disabled={leftDisabled}
        activeOpacity={0.75}
      >
        <Text style={[styles.pickerBtnText, !leftValue && styles.pickerBtnPlaceholder]} numberOfLines={1}>
          {leftValue || `Select…`}
        </Text>
        {leftValue ? (
          <TouchableOpacity onPress={e => { e.stopPropagation?.(); onLeftClear(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.pickerBtnClear}>×</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.pickerBtnArrow}>{leftDisabled ? '—' : '▼'}</Text>
        )}
      </TouchableOpacity>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.sheetFieldLabel}>{rightLabel}</Text>
      <TouchableOpacity
        style={[styles.pickerBtn, rightValue && styles.pickerBtnFilled, rightDisabled && styles.pickerBtnDisabled]}
        onPress={onRightPress}
        disabled={rightDisabled}
        activeOpacity={0.75}
      >
        <Text style={[styles.pickerBtnText, !rightValue && styles.pickerBtnPlaceholder]} numberOfLines={1}>
          {rightValue || `Select…`}
        </Text>
        {rightValue ? (
          <TouchableOpacity onPress={e => { e.stopPropagation?.(); onRightClear(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.pickerBtnClear}>×</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.pickerBtnArrow}>{rightDisabled ? '—' : '▼'}</Text>
        )}
      </TouchableOpacity>
    </View>
  </View>
);

// ── Filter Modal (bottom sheet) ───────────────────────────────────────
interface FilterModalProps {
  visible:  boolean;
  filters:  FilterState;
  onChange: (f: FilterState) => void;
  onApply:  () => void;
  onReset:  () => void;
  onClose:  () => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible, filters, onChange, onApply, onReset, onClose,
}) => {
  const { fetchProducts, fetchSubProducts, fetchBrands, fetchSizes, fetchCascade } = useStockLookup();

  const toggleGroup = (val: string) => {
    const next = filters.groupBy.includes(val)
      ? filters.groupBy.filter(v => v !== val)
      : [...filters.groupBy, val];
    onChange({ ...filters, groupBy: next });
  };

  // ── Date picker ─────────────────────────────────────────────────────
  const [datePickerField, setDatePickerField] = useState<'fromDate' | 'toDate' | null>(null);
  const [datePickerValue, setDatePickerValue] = useState('');

  const openDatePicker = (field: 'fromDate' | 'toDate') => {
    setDatePickerField(field);
    setDatePickerValue(filters[field] || todayISO());
  };

  const confirmDate = () => {
    if (datePickerField) onChange({ ...filters, [datePickerField]: datePickerValue });
    setDatePickerField(null);
  };

  // ── Selection modal state ───────────────────────────────────────────
  type SelectorField = 'product' | 'subProduct' | 'brand' | 'size';

  const [selectorField,    setSelectorField]    = useState<SelectorField>('product');
  const [selectorTitle,    setSelectorTitle]    = useState('');
  const [selectorAllItems, setSelectorAllItems] = useState<Array<{ label: string; value: string }>>([]);
  const [selectorItems,    setSelectorItems]    = useState<Array<{ label: string; value: string }>>([]);
  const [selectorLoading,  setSelectorLoading]  = useState(false);
  const [selectorOpen,     setSelectorOpen]     = useState(false);
  const [selectorSearch,   setSelectorSearch]   = useState('');
  const [selectorError,    setSelectorError]    = useState('');

  const setAllAndItems = (items: Array<{ label: string; value: string }>) => {
    setSelectorAllItems(items);
    setSelectorItems(items);
  };

  const openSelector = useCallback(async (field: SelectorField) => {
    setSelectorField(field);
    setSelectorSearch('');
    setSelectorAllItems([]);
    setSelectorItems([]);
    setSelectorError('');
    setSelectorLoading(true);
    setSelectorOpen(true);

    try {
      const productCodeNum    = Number(filters.productCode)    || undefined;
      const subProductCodeNum = Number(filters.subProductCode) || undefined;

      if (field === 'product') {
        setSelectorTitle('Select Product');
        const res = await fetchProducts(undefined, 0, 200);
        const items = (res?.content ?? [])
          .filter(p => p.PRODUCTCODE != null)
          .map(p => ({ label: p.PRODUCTNAME, value: String(p.PRODUCTCODE) }));
        setAllAndItems(items);

      } else if (field === 'subProduct') {
        setSelectorTitle('Select Sub Product');
        // Pass productCodeNum=0 when no product → returns all sub-products
        const res = await fetchSubProducts(productCodeNum ?? 0, undefined, 0, 200);
        const items = (res?.content ?? [])
          .filter(p => p.SUBPRODUCTCODE != null)
          .map(p => ({ label: p.SUBPRODUCTNAME, value: String(p.SUBPRODUCTCODE) }));
        setAllAndItems(items);

      } else if (field === 'brand') {
        // Filter by: productCode (if set) + subProductCode (if set); else show all
        const titleParts = ['Select Brand'];
        if (filters.productName)    titleParts.push(filters.productName);
        if (filters.subProductName) titleParts.push('› ' + filters.subProductName);
        setSelectorTitle(titleParts.join(' — '));

        const res = await fetchBrands(undefined, productCodeNum, subProductCodeNum, 0, 200);
        const items = (res?.data ?? [])
          .filter(b => b.BRANDCODE != null && b.BRANDNAME?.trim())
          .map(b => ({ label: b.BRANDNAME, value: String(b.BRANDCODE) }));
        setAllAndItems(items);

      } else if (field === 'size') {
        // Filter by: productCode (if set) + subProductCode (if set); else show all
        const titleParts = ['Select Size'];
        if (filters.productName)    titleParts.push(filters.productName);
        if (filters.subProductName) titleParts.push('› ' + filters.subProductName);
        setSelectorTitle(titleParts.join(' — '));

        const res = await fetchSizes(undefined, productCodeNum, subProductCodeNum, 0, 200);
        const items = ((res?.data?.data) ?? [])
          .filter(s => s.SIZECODE != null && s.SIZENAME?.trim())
          .map(s => ({ label: s.SIZENAME, value: String(s.SIZECODE) }));
        setAllAndItems(items);
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to load. Check connection.';
      setSelectorError(msg);
      setSelectorAllItems([]);
      setSelectorItems([]);
    } finally {
      setSelectorLoading(false);
    }
  }, [filters.productCode, filters.subProductCode, filters.productName, filters.subProductName,
      fetchProducts, fetchSubProducts, fetchBrands, fetchSizes]);

  // ── Cascade search: fires when selectorSearch changes (product/subProduct only) ──
  useEffect(() => {
    if (!selectorOpen) return;
    if (selectorField !== 'product' && selectorField !== 'subProduct') return;

    // Empty search → restore initial loaded list
    if (!selectorSearch.trim()) {
      setSelectorItems(selectorAllItems);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSelectorLoading(true);
      try {
        const res = await fetchCascade(selectorSearch.trim());
        if (cancelled) return;
        const allData = res?.data ?? [];

        if (selectorField === 'product') {
          const seen = new Set<number>();
          const items: Array<{ label: string; value: string }> = [];
          for (const r of allData) {
            if (r.productCode == null || seen.has(r.productCode)) continue;
            seen.add(r.productCode);
            items.push({ label: r.productName, value: String(r.productCode) });
          }
          setSelectorItems(items);

        } else {
          // subProduct — optionally filter by selected productCode
          const pcNum = Number(filters.productCode) || null;
          const seen = new Set<number>();
          const items: Array<{ label: string; value: string }> = [];
          for (const r of allData) {
            if (r.subProductCode == null) continue;
            if (pcNum && r.productCode !== pcNum) continue;
            if (seen.has(r.subProductCode)) continue;
            seen.add(r.subProductCode);
            items.push({ label: r.subProductName, value: String(r.subProductCode) });
          }
          setSelectorItems(items);
        }
      } catch {
        // keep existing items on error
      } finally {
        if (!cancelled) setSelectorLoading(false);
      }
    }, 400);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [selectorSearch, selectorOpen, selectorField]);

  const handleSelectorSelect = useCallback((value: string, label: string) => {
    if (selectorField === 'product') {
      onChange({
        ...filters,
        productCode:    value,
        productName:    label,
        subProductCode: '', subProductName: '',
        brandCode:      '', brandName:      '',
        sizeCode:       '', sizeName:       '',
      });
    } else if (selectorField === 'subProduct') {
      onChange({ ...filters, subProductCode: value, subProductName: label });
    } else if (selectorField === 'brand') {
      onChange({ ...filters, brandCode: value, brandName: label });
    } else if (selectorField === 'size') {
      onChange({ ...filters, sizeCode: value, sizeName: label });
    }
    setSelectorOpen(false);
  }, [selectorField, filters, onChange]);

  const currentSelectorValue = (() => {
    if (selectorField === 'product')    return filters.productCode;
    if (selectorField === 'subProduct') return filters.subProductCode;
    if (selectorField === 'brand')      return filters.brandCode;
    if (selectorField === 'size')       return filters.sizeCode;
    return '';
  })();

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.kavWrapper}
          >
            <Pressable onPress={e => e.stopPropagation()} style={styles.sheet}>

              <View style={styles.sheetHandle} />

              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Filters</Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.sheetClose}>
                  <Text style={styles.sheetCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={styles.sheetBody}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Date Range */}
                <Text style={styles.sheetGroupLabel}>Date Range</Text>
                <View style={styles.sheetRow}>
                  <DateDisplayField
                    label="From date"
                    value={filters.fromDate}
                    onPress={() => openDatePicker('fromDate')}
                    onClear={() => onChange({ ...filters, fromDate: '' })}
                  />
                  <DateDisplayField
                    label="To date"
                    value={filters.toDate}
                    onPress={() => openDatePicker('toDate')}
                    onClear={() => onChange({ ...filters, toDate: '' })}
                  />
                </View>

                {/* Product — selection picker */}
                <Text style={styles.sheetGroupLabel}>Product Details</Text>

                <PickerButton
                  label="Product"
                  value={filters.productName}
                  onPress={() => openSelector('product')}
                  onClear={() => onChange({
                    ...filters,
                    productCode: '', productName: '',
                    subProductCode: '', subProductName: '',
                    brandCode: '',    brandName: '',
                    sizeCode: '',     sizeName: '',
                  })}
                />

                <PickerButton
                  label="Sub Product"
                  value={filters.subProductName}
                  disabled={!filters.productCode}
                  onPress={() => openSelector('subProduct')}
                  onClear={() => onChange({ ...filters, subProductCode: '', subProductName: '' })}
                />

                <PickerButtonRow
                  leftLabel="Brand"
                  leftValue={filters.brandName}
                  onLeftPress={() => openSelector('brand')}
                  onLeftClear={() => onChange({ ...filters, brandCode: '', brandName: '' })}
                  rightLabel="Size"
                  rightValue={filters.sizeName}
                  onRightPress={() => openSelector('size')}
                  onRightClear={() => onChange({ ...filters, sizeCode: '', sizeName: '' })}
                />

                {/* Group By — multi select */}
                <Text style={styles.sheetGroupLabel}>
                  Group By{'  '}
                  <Text style={styles.multiHint}>(select multiple)</Text>
                </Text>
                <View style={styles.sheetChips}>
                  {GROUP_BY_OPTIONS.map(opt => {
                    const active = filters.groupBy.includes(opt.value);
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.sheetChip, active && styles.sheetChipActive]}
                        onPress={() => toggleGroup(opt.value)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.sheetChipText, active && styles.sheetChipTextActive]}>
                          {active ? '✓  ' : ''}{opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <View style={styles.sheetActions}>
                <TouchableOpacity style={styles.sheetBtnSecondary} onPress={onReset} activeOpacity={0.8}>
                  <Text style={styles.sheetBtnSecondaryText}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sheetBtnPrimary} onPress={onApply} activeOpacity={0.8}>
                  <Text style={styles.sheetBtnPrimaryText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>

            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* ── Date Picker Modal ── */}
      <Modal
        visible={datePickerField !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setDatePickerField(null)}
      >
        <Pressable style={styles.dpBackdrop} onPress={() => setDatePickerField(null)}>
          <Pressable onPress={e => e.stopPropagation()} style={styles.dpCard}>
            <Text style={styles.dpTitle}>
              {datePickerField === 'fromDate' ? 'From Date' : 'To Date'}
            </Text>
            <DatePicker value={datePickerValue} onChange={setDatePickerValue} />
            <View style={styles.dpActions}>
              <TouchableOpacity style={styles.dpCancel} onPress={() => setDatePickerField(null)}>
                <Text style={styles.dpCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dpConfirm} onPress={confirmDate}>
                <Text style={styles.dpConfirmTxt}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Selection Modal (center) ── */}
      <SelectionModal
        visible={selectorOpen}
        title={selectorTitle}
        items={selectorItems}
        selectedValue={currentSelectorValue}
        loading={selectorLoading}
        error={selectorError}
        searchText={selectorSearch}
        onSearchChange={setSelectorSearch}
        onSelect={handleSelectorSelect}
        onClose={() => setSelectorOpen(false)}
      />
    </>
  );
};

// ── DatePicker — +/− spinner for day / month / year ───────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const DatePicker: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const parts = value.split('-');
  const y = parseInt(parts[0]) || new Date().getFullYear();
  const m = parseInt(parts[1]) || new Date().getMonth() + 1;
  const d = parseInt(parts[2]) || new Date().getDate();

  const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

  const update = (ny: number, nm: number, nd: number) => {
    const maxD = daysInMonth(ny, nm);
    onChange(isoFromParts(ny, nm, clamp(nd, 1, maxD)));
  };

  const maxDay = daysInMonth(y, m);

  return (
    <View style={styles.dpSpinner}>
      <SpinnerColumn
        label="Day"
        value={String(d).padStart(2, '0')}
        onUp={() => update(y, m, d < maxDay ? d + 1 : 1)}
        onDown={() => update(y, m, d > 1 ? d - 1 : maxDay)}
      />
      <SpinnerColumn
        label="Month"
        value={MONTHS[m - 1]}
        onUp={() => update(y, m < 12 ? m + 1 : 1, d)}
        onDown={() => update(y, m > 1 ? m - 1 : 12, d)}
      />
      <SpinnerColumn
        label="Year"
        value={String(y)}
        onUp={() => update(y + 1, m, d)}
        onDown={() => update(y - 1, m, d)}
      />
    </View>
  );
};

const SpinnerColumn: React.FC<{
  label: string; value: string; onUp: () => void; onDown: () => void;
}> = ({ label, value, onUp, onDown }) => (
  <View style={styles.spinnerCol}>
    <Text style={styles.spinnerLabel}>{label}</Text>
    <TouchableOpacity style={styles.spinnerArrow} onPress={onUp} activeOpacity={0.7}>
      <Text style={styles.spinnerArrowTxt}>▲</Text>
    </TouchableOpacity>
    <View style={styles.spinnerValue}>
      <Text style={styles.spinnerValueTxt}>{value}</Text>
    </View>
    <TouchableOpacity style={styles.spinnerArrow} onPress={onDown} activeOpacity={0.7}>
      <Text style={styles.spinnerArrowTxt}>▼</Text>
    </TouchableOpacity>
  </View>
);

// ── DateDisplayField — pressable date display ─────────────────────────
const DateDisplayField: React.FC<{
  label: string; value: string; onPress: () => void; onClear: () => void;
}> = ({ label, value, onPress, onClear }) => (
  <View style={[styles.sheetField, styles.sheetFieldHalf]}>
    <Text style={styles.sheetFieldLabel}>{label}</Text>
    <TouchableOpacity
      style={[styles.dateDisplay, value ? styles.dateDisplayFilled : null]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.dateDisplayText, !value && styles.dateDisplayPlaceholder]}>
        📅 {value ? fmtDisplay(value) : 'Set date'}
      </Text>
      {!!value && (
        <TouchableOpacity
          onPress={e => { e.stopPropagation?.(); onClear(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.dateClear}>×</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  </View>
);

// ── SummaryItem ───────────────────────────────────────────────────────
const SummaryItem = ({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) => (
  <View style={[styles.summaryItem, highlight && styles.summaryItemHL]}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={[styles.summaryValue, highlight && styles.summaryValueHL]}>{value}</Text>
  </View>
);

const cellText = { fontSize: Typography.fontSizeMD, color: Colors.textPrimary };

// ── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  root: { flex: 1, backgroundColor: Colors.background },

  topBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md, paddingVertical: 30,
    borderBottomWidth: 0.5, borderBottomColor: Colors.border, ...Shadow.sm,
  },
  backBtn:   { paddingRight: Spacing.md, paddingVertical: 2 },
  backIcon:  { fontSize: 50, lineHeight: 32, color: Colors.primary, fontWeight: '300' },
  topBarTitle: { flex: 1, fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.textPrimary, alignSelf: 'center' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 7, backgroundColor: Colors.background },
  filterBtnActive:     { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  filterBtnText:       { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightSemiBold, color: Colors.textSecondary },
  filterBtnTextActive: { color: Colors.primary },

  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadow.sm },
  sectionTitle: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightBold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },

  labelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  requiredBadge: { backgroundColor: Colors.errorBg, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  requiredBadgeText: { fontSize: 10, fontWeight: Typography.fontWeightBold, color: Colors.error, textTransform: 'uppercase', letterSpacing: 0.5 },

  tagRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  tagInput: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    fontSize: Typography.fontSizeMD, color: Colors.textPrimary, backgroundColor: Colors.background,
  },
  inputError:  { borderColor: Colors.error, backgroundColor: Colors.errorBg },
  inputFilled: { borderColor: Colors.primary },
  searchBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2,
    alignItems: 'center', justifyContent: 'center', minWidth: 82, minHeight: 44,
  },
  searchBtnDisabled: { opacity: 0.6 },
  searchBtnText: { color: Colors.white, fontWeight: Typography.fontWeightBold, fontSize: Typography.fontSizeMD },
  fieldError:   { fontSize: Typography.fontSizeXS, color: Colors.error, marginTop: Spacing.xs },
  resetLink:    { alignSelf: 'flex-end', marginTop: Spacing.sm },
  resetLinkText:{ fontSize: Typography.fontSizeXS, color: Colors.textSecondary, textDecorationLine: 'underline' },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.md },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primaryBg, borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.full, paddingLeft: Spacing.md, paddingRight: Spacing.sm, paddingVertical: 4, gap: 4 },
  chipText:   { fontSize: Typography.fontSizeXS, color: Colors.primary, fontWeight: Typography.fontWeightSemiBold },
  chipRemove: { fontSize: 16, color: Colors.primary, lineHeight: 18 },

  errorBox:     { backgroundColor: Colors.errorBg, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.error },
  errorBoxText: { color: Colors.error, fontSize: Typography.fontSizeMD },

  summaryGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  summaryItem:   { flex: 1, minWidth: 90, backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  summaryItemHL: { backgroundColor: Colors.primaryBg },
  summaryLabel:  { fontSize: Typography.fontSizeXS, color: Colors.textSecondary, marginBottom: 4, textAlign: 'center' },
  summaryValue:  { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.textPrimary },
  summaryValueHL:{ color: Colors.primary },
  countText:     { fontSize: Typography.fontSizeXS, color: Colors.textSecondary, marginBottom: Spacing.sm },

  // Filter modal (bottom sheet)
  backdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  kavWrapper: { width: '100%' },
  sheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '92%', minHeight: '65%',
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.xl,
  },
  sheetHandle:  { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: Radius.full, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  sheetTitle:   { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.textPrimary },
  sheetClose:   { padding: 4 },
  sheetCloseText: { fontSize: 18, color: Colors.textSecondary },
  sheetBody:    { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  sheetGroupLabel: { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightBold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.7, marginTop: Spacing.md, marginBottom: Spacing.sm },
  multiHint:    { fontSize: Typography.fontSizeXS, fontWeight: '400', color: Colors.textSecondary, textTransform: 'none', letterSpacing: 0 },
  sheetRow:     { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xs },
  sheetField:   { marginBottom: Spacing.sm },
  sheetFieldHalf: { flex: 1 },
  sheetFieldLabel: { fontSize: Typography.fontSizeXS, color: Colors.textSecondary, marginBottom: 4, fontWeight: Typography.fontWeightSemiBold },

  // PickerButton
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    backgroundColor: Colors.background, minHeight: 44,
  },
  pickerBtnFilled:      { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  pickerBtnDisabled:    { opacity: 0.45 },
  pickerBtnText:        { flex: 1, fontSize: Typography.fontSizeSM, color: Colors.textPrimary, fontWeight: Typography.fontWeightSemiBold },
  pickerBtnPlaceholder: { color: Colors.textDisabled, fontWeight: '400' },
  pickerBtnArrow:       { fontSize: 11, color: Colors.textSecondary, marginLeft: 4 },
  pickerBtnClear:       { fontSize: 18, color: Colors.primary, lineHeight: 20, paddingLeft: 4 },

  // Pressable date display
  dateDisplay: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.background, minHeight: 44,
  },
  dateDisplayFilled:      { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  dateDisplayText:        { fontSize: Typography.fontSizeSM, color: Colors.textPrimary, fontWeight: Typography.fontWeightSemiBold, flex: 1 },
  dateDisplayPlaceholder: { color: Colors.textDisabled, fontWeight: '400' },
  dateClear:              { fontSize: 18, color: Colors.primary, lineHeight: 20, paddingLeft: 6 },

  sheetChips:          { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  sheetChip:           { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 8, backgroundColor: Colors.background },
  sheetChipActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  sheetChipText:       { fontSize: Typography.fontSizeSM, color: Colors.textSecondary },
  sheetChipTextActive: { color: Colors.white, fontWeight: Typography.fontWeightSemiBold },

  sheetActions:          { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 0.5, borderTopColor: Colors.border },
  sheetBtnSecondary:     { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  sheetBtnSecondaryText: { color: Colors.textSecondary, fontWeight: Typography.fontWeightSemiBold, fontSize: Typography.fontSizeMD },
  sheetBtnPrimary:       { flex: 2, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  sheetBtnPrimaryText:   { color: Colors.white, fontWeight: Typography.fontWeightBold, fontSize: Typography.fontSizeMD },

  // Date picker modal
  dpBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  dpCard:     { backgroundColor: Colors.white, borderRadius: 20, padding: Spacing.xl, width: '100%', ...Shadow.sm },
  dpTitle:    { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.lg },
  dpActions:  { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
  dpCancel:   { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  dpCancelTxt:{ color: Colors.textSecondary, fontWeight: Typography.fontWeightSemiBold },
  dpConfirm:  { flex: 2, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  dpConfirmTxt:{ color: Colors.white, fontWeight: Typography.fontWeightBold, fontSize: Typography.fontSizeMD },

  // Spinner date picker
  dpSpinner:    { flexDirection: 'row', justifyContent: 'center', gap: Spacing.lg },
  spinnerCol:   { alignItems: 'center', minWidth: 72 },
  spinnerLabel: { fontSize: Typography.fontSizeXS, color: Colors.textSecondary, marginBottom: Spacing.sm, fontWeight: Typography.fontWeightSemiBold, textTransform: 'uppercase', letterSpacing: 0.5 },
  spinnerArrow: { width: 48, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  spinnerArrowTxt: { fontSize: 16, color: Colors.primary, fontWeight: Typography.fontWeightBold },
  spinnerValue: { paddingVertical: Spacing.md, alignItems: 'center', minWidth: 72 },
  spinnerValueTxt: { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.textPrimary },
});

// ── Selection Modal Styles ────────────────────────────────────────────
const selStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  // Fixed pixel height so the card NEVER grows when scrolling
  card: {
    width: '100%', maxWidth: 420,
    height: WINDOW_H * 0.78,      // ← fixed, not maxHeight
    backgroundColor: Colors.white,
    borderRadius: 20,
    ...Shadow.lg,
    overflow: 'hidden',
    flexDirection: 'column',       // explicit column so flex children work
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a56db',
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    flexShrink: 0,
  },
  title:      { flex: 1, fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.white },
  closeBtn:   { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  closeBtnTxt:{ color: Colors.white, fontSize: 16, lineHeight: 18, fontWeight: '600' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.md, gap: Spacing.xs,
    flexShrink: 0,
  },
  searchIcon:  { fontSize: 16 },
  searchInput: { flex: 1, height: 44, fontSize: Typography.fontSizeMD, color: Colors.textPrimary },
  searchClear: { fontSize: 20, color: Colors.textSecondary, lineHeight: 22 },

  countHint: {
    fontSize: Typography.fontSizeXS, color: Colors.textSecondary,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    backgroundColor: Colors.background,
    borderBottomWidth: 0.5, borderBottomColor: Colors.border,
    flexShrink: 0,
  },

  // listWrap expands to fill remaining card space — ScrollView inside scrolls within it
  listWrap:  { flex: 1 },
  list:      { flex: 1 },
  loaderWrap:{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 120 },
  loaderTxt: { marginTop: Spacing.sm, fontSize: Typography.fontSizeSM, color: Colors.textSecondary },
  emptyTxt:  { fontSize: Typography.fontSizeSM, color: Colors.textSecondary },
  errorTxt:  { fontSize: Typography.fontSizeSM, color: Colors.error, textAlign: 'center', paddingHorizontal: Spacing.md },

  item: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: Colors.border,
  },
  itemSelected:     { backgroundColor: Colors.primaryBg },
  itemText:         { flex: 1, fontSize: Typography.fontSizeMD, color: Colors.textPrimary },
  itemTextSelected: { color: Colors.primary, fontWeight: Typography.fontWeightBold },
  checkmark:        { fontSize: 16, color: Colors.primary, fontWeight: Typography.fontWeightBold, marginLeft: Spacing.sm },
});

export default RemainingStockScreen;
