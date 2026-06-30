import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import Table from '../../components/common/Table';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../components/common/theme';
import { useRemainingStock } from '../../api/hooks/useRemainingStock';
import { GROUP_BY_OPTIONS } from '../../types/RemainingStock';
import type { RemainingStockItem } from '../../types/RemainingStock';
import type { RootStackParamList } from '../../Navigations/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'RemainingStock'>;

// ─────────────────────────────────────────────────────────────────────
// NOTE: We replaced <Header> with a custom TopBar so the Filters button
// is always visible.  If your Header supports a `right` prop, you can
// pass the filterBtn there instead and remove the TopBar below.
// ─────────────────────────────────────────────────────────────────────

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
  fromDate: string;
  toDate: string;
  productName: string;
  subProductCode: string;
  sizeCode: string;
  brandCode: string;
  groupBy: string;
}

const INITIAL_FILTERS: FilterState = {
  fromDate: '',
  toDate: '',
  productName: '',
  subProductCode: '',
  sizeCode: '',
  brandCode: '',
  groupBy: '',
};

const FILTER_LABELS: Record<keyof FilterState, string> = {
  fromDate: 'From',
  toDate: 'To',
  productName: 'Product',
  subProductCode: 'Sub product',
  sizeCode: 'Size',
  brandCode: 'Brand',
  groupBy: 'Group by',
};

// ── Screen ────────────────────────────────────────────────────────────

const RemainingStockScreen: React.FC<Props> = ({ navigation }) => {
  const { data, loading, error, fetch, reset } = useRemainingStock();

  const [tagNo, setTagNo]                       = useState('');
  const [tagNoError, setTagNoError]             = useState('');
  const [appliedFilters, setAppliedFilters]     = useState<FilterState>(INITIAL_FILTERS);
  const [draftFilters, setDraftFilters]         = useState<FilterState>(INITIAL_FILTERS);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Derived
  const activeFilterCount = Object.values(appliedFilters).filter(Boolean).length;

  const activeFilterChips = (Object.keys(appliedFilters) as (keyof FilterState)[])
    .filter(k => appliedFilters[k])
    .map(k => ({ key: k as string, label: FILTER_LABELS[k], value: appliedFilters[k] }));

  // Handlers
  const validateTagNo = useCallback((): boolean => {
    if (!tagNo.trim()) {
      setTagNoError('Tag number is required');
      return false;
    }
    setTagNoError('');
    return true;
  }, [tagNo]);

  const handleSearch = useCallback(() => {
    if (!validateTagNo()) return;
    fetch({ tagNo: tagNo.trim(), ...appliedFilters });
  }, [tagNo, appliedFilters, fetch, validateTagNo]);

  const handleFullReset = useCallback(() => {
    setTagNo('');
    setTagNoError('');
    setAppliedFilters(INITIAL_FILTERS);
    setDraftFilters(INITIAL_FILTERS);
    reset();
  }, [reset]);

  const handleRemoveChip = useCallback((key: string) => {
    const updated = { ...appliedFilters, [key]: '' };
    setAppliedFilters(updated);
    if (tagNo.trim()) fetch({ tagNo: tagNo.trim(), ...updated });
  }, [appliedFilters, tagNo, fetch]);

  const openFilterModal = useCallback(() => {
    setDraftFilters({ ...appliedFilters });
    setFilterModalVisible(true);
  }, [appliedFilters]);

  const handleApplyFilters = useCallback(() => {
    setAppliedFilters({ ...draftFilters });
    setFilterModalVisible(false);
    if (tagNo.trim()) fetch({ tagNo: tagNo.trim(), ...draftFilters });
  }, [draftFilters, tagNo, fetch]);

  const summary = data?.summary;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* ── Custom Top Bar (filter button lives here, always visible) ── */}
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

      {/* ── Body ── */}
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

            {!!tagNoError && (
              <Text style={styles.fieldError}>⚠  {tagNoError}</Text>
            )}

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

          {/* API Error */}
          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{error}</Text>
            </View>
          )}

          {/* Loading */}
          {loading && (
            <ActivityIndicator
              color={Colors.primary}
              size="large"
              style={{ marginVertical: Spacing.xl }}
            />
          )}

          {/* Summary */}
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

          {/* Table */}
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

      {/* Filter Bottom-Sheet Modal */}
      <FilterModal
        visible={filterModalVisible}
        filters={draftFilters}
        onChange={setDraftFilters}
        onApply={handleApplyFilters}
        onReset={() => setDraftFilters(INITIAL_FILTERS)}
        onClose={() => setFilterModalVisible(false)}
      />
    </SafeAreaView>
  );
};

// ── Filter Modal ──────────────────────────────────────────────────────

interface FilterModalProps {
  visible: boolean;
  filters: FilterState;
  onChange: (f: FilterState) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible, filters, onChange, onApply, onReset, onClose,
}) => {
  const set = (key: keyof FilterState) => (val: string) =>
    onChange({ ...filters, [key]: val });

  const toggleGroup = (val: string) =>
    onChange({ ...filters, groupBy: filters.groupBy === val ? '' : val });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      {/* Backdrop — tap to close */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Stop tap from bubbling to backdrop */}
          <Pressable onPress={e => e.stopPropagation()} style={styles.sheet}>

            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filters</Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.sheetClose}
              >
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
                <SheetField label="From date" value={filters.fromDate}
                  onChange={set('fromDate')} placeholder="YYYY-MM-DD" half />
                <SheetField label="To date"   value={filters.toDate}
                  onChange={set('toDate')}   placeholder="YYYY-MM-DD" half />
              </View>

              {/* Product Details */}
              <Text style={styles.sheetGroupLabel}>Product Details</Text>
              <SheetField
                label="Product name" value={filters.productName}
                onChange={set('productName')} placeholder="e.g. Gold Ring"
              />
              <View style={styles.sheetRow}>
                <SheetField label="Sub product code" value={filters.subProductCode}
                  onChange={set('subProductCode')} placeholder="SUB01" half />
                <SheetField label="Size code"        value={filters.sizeCode}
                  onChange={set('sizeCode')}         placeholder="S / M / L" half />
              </View>
              <SheetField
                label="Brand code" value={filters.brandCode}
                onChange={set('brandCode')} placeholder="BRAND01"
              />

              {/* Group By */}
              <Text style={styles.sheetGroupLabel}>Group By</Text>
              <View style={styles.sheetChips}>
                {GROUP_BY_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.sheetChip,
                      filters.groupBy === opt.value && styles.sheetChipActive,
                    ]}
                    onPress={() => toggleGroup(opt.value)}
                    activeOpacity={0.75}
                  >
                    <Text style={[
                      styles.sheetChipText,
                      filters.groupBy === opt.value && styles.sheetChipTextActive,
                    ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Action buttons */}
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
  );
};

// ── SheetField ────────────────────────────────────────────────────────

const SheetField = ({
  label, value, onChange, placeholder, half,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  half?: boolean;
}) => (
  <View style={[styles.sheetField, half && styles.sheetFieldHalf]}>
    <Text style={styles.sheetFieldLabel}>{label}</Text>
    <TextInput
      style={[styles.sheetInput, value ? styles.sheetInputFilled : null]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder ?? label}
      placeholderTextColor={Colors.textDisabled}
    />
  </View>
);

// ── SummaryItem ───────────────────────────────────────────────────────

const SummaryItem = ({
  label, value, highlight,
}: { label: string; value: string | number; highlight?: boolean }) => (
  <View style={[styles.summaryItem, highlight && styles.summaryItemHL]}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={[styles.summaryValue, highlight && styles.summaryValueHL]}>{value}</Text>
  </View>
);

// ── Shared cell style ─────────────────────────────────────────────────

const cellText = {
  fontSize: Typography.fontSizeMD,
  color: Colors.textPrimary,
};

// ── Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  root: { flex: 1, backgroundColor: Colors.background },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: 30,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    ...Shadow.sm,
  },
  backBtn: {
    paddingRight: Spacing.md,
    paddingVertical: 2,
  },
  backIcon: {
    fontSize: 50,
    lineHeight: 32,
    color: Colors.primary,
    fontWeight: '300',
  },
  topBarTitle: {
    flex: 1,
    fontSize: Typography.fontSizeLG,
    fontWeight: Typography.fontWeightBold,
    color: Colors.textPrimary,
    alignSelf:"center"
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    backgroundColor: Colors.background,
  },
  filterBtnActive: {
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primary,
  },
  filterBtnText: {
    fontSize: Typography.fontSizeXS,
    fontWeight: Typography.fontWeightSemiBold,
    color: Colors.textSecondary,
  },
  filterBtnTextActive: {
    color: Colors.primary,
  },

  // Scroll
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },

  // Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadow.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSizeSM,
    fontWeight: Typography.fontWeightBold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Tag No
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  requiredBadge: {
    backgroundColor: Colors.errorBg,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  requiredBadgeText: {
    fontSize: 10,
    fontWeight: Typography.fontWeightBold,
    color: Colors.error,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  tagInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: Typography.fontSizeMD,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  inputError:  { borderColor: Colors.error,   backgroundColor: Colors.errorBg },
  inputFilled: { borderColor: Colors.primary },
  searchBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 82,
    minHeight: 44,
  },
  searchBtnDisabled: { opacity: 0.6 },
  searchBtnText: {
    color: Colors.white,
    fontWeight: Typography.fontWeightBold,
    fontSize: Typography.fontSizeMD,
  },
  fieldError: {
    fontSize: Typography.fontSizeXS,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  resetLink: { alignSelf: 'flex-end', marginTop: Spacing.sm },
  resetLinkText: {
    fontSize: Typography.fontSizeXS,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },

  // Active chips
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.full,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
    paddingVertical: 4,
    gap: 4,
  },
  chipText: {
    fontSize: Typography.fontSizeXS,
    color: Colors.primary,
    fontWeight: Typography.fontWeightSemiBold,
  },
  chipRemove: { fontSize: 16, color: Colors.primary, lineHeight: 18 },

  // Error box
  errorBox: {
    backgroundColor: Colors.errorBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  errorBoxText: { color: Colors.error, fontSize: Typography.fontSizeMD },

  // Summary
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  summaryItem: {
    flex: 1,
    minWidth: 90,
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  summaryItemHL: { backgroundColor: Colors.primaryBg },
  summaryLabel: {
    fontSize: Typography.fontSizeXS,
    color: Colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: Typography.fontSizeLG,
    fontWeight: Typography.fontWeightBold,
    color: Colors.textPrimary,
  },
  summaryValueHL: { color: Colors.primary },

  // Count
  countText: {
    fontSize: Typography.fontSizeXS,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },

  // Modal backdrop
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },

  // Center modal
  sheet: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.xl,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  sheetTitle: {
    fontSize: Typography.fontSizeLG,
    fontWeight: Typography.fontWeightBold,
    color: Colors.textPrimary,
  },
  sheetClose: { padding: 4 },
  sheetCloseText: { fontSize: 18, color: Colors.textSecondary },

  sheetBody: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  sheetGroupLabel: {
    fontSize: Typography.fontSizeXS,
    fontWeight: Typography.fontWeightBold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sheetRow: { flexDirection: 'row', gap: Spacing.md },
  sheetField: { marginBottom: Spacing.sm },
  sheetFieldHalf: { flex: 1 },
  sheetFieldLabel: {
    fontSize: Typography.fontSizeXS,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  sheetInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.fontSizeMD,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  sheetInputFilled: { borderColor: Colors.primary },

  sheetChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  sheetChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: Colors.background,
  },
  sheetChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  sheetChipText: { fontSize: Typography.fontSizeSM, color: Colors.textSecondary },
  sheetChipTextActive: { color: Colors.white, fontWeight: Typography.fontWeightSemiBold },

  sheetActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  sheetBtnSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  sheetBtnSecondaryText: {
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeightSemiBold,
    fontSize: Typography.fontSizeMD,
  },
  sheetBtnPrimary: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  sheetBtnPrimaryText: {
    color: Colors.white,
    fontWeight: Typography.fontWeightBold,
    fontSize: Typography.fontSizeMD,
  },
});

export default RemainingStockScreen;