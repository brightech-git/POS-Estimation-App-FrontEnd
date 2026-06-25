import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import Header                            from '../../components/common/Header';
import { useToast }                      from '../../components/common/Toast';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../components/common/theme';
import { GstCalculator }                 from '../../utils/GstCalculator';
import { useFetchControls, useTagLookup, useSaveEstimate } from '../../api/hooks/useEstimation';
import { AsyncStorageHelper }            from '../../utils/AsyncStorageHelper';
import type { EstimationItem }           from '../../types/estimation';
import type { CustomerInfo }             from '../../types/customer';
import type { RootStackParamList }       from '../../Navigations/AppNavigator';
import CustomerModal                     from '../../components/Estimation/CustomerModal';
import EstimationReceiptModal            from '../../components/Estimation/EstimationReceiptModal';
import EstimationPdfModal               from '../../components/Estimation/EstimationPdfModal';

type Props = NativeStackScreenProps<RootStackParamList, 'Estimation'>;

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmt = GstCalculator.fmt;

// ─── Component ────────────────────────────────────────────────────────────────
const EstimationScreen: React.FC<Props> = ({ navigation }) => {
  const toast = useToast();
  const tagRef      = useRef<TextInput>(null);
  const qtyRef      = useRef<TextInput>(null);
  const discRef     = useRef<TextInput>(null);
  const salesmanRef = useRef<TextInput>(null);

  const { taxType, fetchControls } = useFetchControls();
  const { product, searching, error: lookupError, lookup, clearProduct } = useTagLookup(taxType);
  const { saving, saveError, savedEstNo, save, clearSaveError } = useSaveEstimate();

  const [tagInput,         setTagInput]         = useState('');
  const [qty,              setQty]              = useState('1');
  const [discPer,          setDiscPer]          = useState('0');
  const [salesman,         setSalesman]         = useState('');
  const [items,            setItems]            = useState<EstimationItem[]>([]);
  const [operCode,         setOperCode]         = useState('');
  const [showCustomerModal,setShowCustomerModal]= useState(false);

  // ── Output mode: 'print' | 'pdf' — set this to choose which modal appears ──
  // Change to 'pdf' to show the PDF preview modal instead of auto-printing
  const OUTPUT_MODE: 'print' | 'pdf' = 'pdf';

  // Receipt modal state
  const [showReceipt,      setShowReceipt]      = useState(false);
  const [showPdf,          setShowPdf]          = useState(false);
  const [receiptEstNo,     setReceiptEstNo]      = useState('');
  const [receiptItems,     setReceiptItems]      = useState<EstimationItem[]>([]);
  const [receiptCustomer,  setReceiptCustomer]   = useState<CustomerInfo | null>(null);
  const [receiptSalesman,  setReceiptSalesman]   = useState('');
  const [receiptDate,      setReceiptDate]       = useState('');
  const [receiptTime,      setReceiptTime]       = useState('');

  // Load operator code + controls on mount
  useEffect(() => {
    fetchControls();
    AsyncStorageHelper.getOperator().then(op => {
      if (op?.OPER_CODE) setOperCode(String(op.OPER_CODE));
    });
  }, []);

  // When tag lookup returns product — set qty to available pieces, focus QTY
  useEffect(() => {
    if (product) {
      const avail = product.pieces ?? product.stockPieces ?? product.availablePieces ?? 0;
      // For weight items auto-fill weight, otherwise default 1 (capped at stock)
      if (product.weight && product.weight > 0) {
        setQty(String(product.weight));
      } else if (avail > 0) {
        setQty('1');           // start at 1; user can increase up to avail
      } else {
        setQty('1');
      }
      setTimeout(() => qtyRef.current?.focus(), 100);
    }
  }, [product]);

  // lookup error toast
  useEffect(() => {
    if (lookupError) {
      toast.show({ message: lookupError, type: 'error' });
      setTagInput('');
      setTimeout(() => tagRef.current?.focus(), 100);
    }
  }, [lookupError]);

  // save error toast
  useEffect(() => {
    if (saveError) { toast.show({ message: saveError, type: 'error' }); clearSaveError(); }
  }, [saveError]);

  // save success — show receipt or PDF modal depending on OUTPUT_MODE
  useEffect(() => {
    if (savedEstNo) {
      setReceiptEstNo(savedEstNo);
      if (OUTPUT_MODE === 'pdf') {
        setShowPdf(true);
      } else {
        setShowReceipt(true);
      }
    }
  }, [savedEstNo]);

  // ── Tag submit ────────────────────────────────────────────────────
  const handleTagSubmit = useCallback(() => {
    if (!tagInput.trim()) return;
    lookup(tagInput.trim());
  }, [tagInput, lookup]);

  // ── QTY change — enforce max available pieces ─────────────────────
  const availablePieces = product
    ? (product.pieces ?? product.stockPieces ?? product.availablePieces ?? 0)
    : 0;

  const handleQtyChange = useCallback((text: string) => {
    // Allow empty / partial input while typing
    if (text === '' || text === '.') { setQty(text); return; }
    const num = Number(text);
    if (isNaN(num)) return;          // reject non-numeric
    if (availablePieces > 0 && num > availablePieces) {
      toast.show({ message: `Only ${availablePieces} pcs available`, type: 'warning', duration: 2000 });
      setQty(String(availablePieces));
      return;
    }
    setQty(text);
  }, [availablePieces]);

  // ── Add item ──────────────────────────────────────────────────────
  const handleAdd = useCallback(() => {
    if (!product) { toast.show({ message: 'Scan or enter a tag / barcode first', type: 'warning' }); return; }
    const q = Number(qty);
    if (!q || q <= 0) { toast.show({ message: 'Enter a valid quantity', type: 'warning' }); return; }

    // Hard check: don't allow qty > available
    const avail = product.pieces ?? product.stockPieces ?? product.availablePieces ?? 0;
    if (avail > 0 && q > avail) {
      toast.show({ message: `Max allowed: ${avail} pcs`, type: 'warning' });
      setQty(String(avail));
      return;
    }

    if (!salesman.trim()) { toast.show({ message: 'Enter salesman code', type: 'warning' }); return; }

    // Duplicate check
    const tagKey = product.tagNo || product.orionBarcode || '';
    if (tagKey && items.some(i => i.tagNo === tagKey || i.ORIONBARCODE === tagKey)) {
      toast.show({ message: `Tag ${tagKey} already added`, type: 'warning' }); return;
    }

    const rate    = product.sellingRate || product.mrp || 0;
    const weight  = product.weight || 0;
    const gstPer  = (product.aboveCgstTaxPer || 0) + (product.aboveSgstTaxPer || 0);
    const disc    = Number(discPer) || 0;
    const calc    = GstCalculator.calculate(taxType, q, rate, disc, gstPer, weight);

    const newItem: EstimationItem = {
      sno:            items.length + 1,
      tagNo:          product.tagNo || product.orionBarcode || '',
      productName:    product.productName || '',
      subProductName: product.subProductName || '',
      qty:            q,
      uom:            product.unitName || (weight > 0 ? 'KGS' : 'PCS'),
      rate,
      weight,
      discPer:        disc,
      discount:       calc.DISCOUNTAMOUNT,
      amount:         calc.AMOUNT,
      gst:            calc.TAXAMOUNT,
      total:          calc.TOTAL,
      TAXPER:         gstPer,
      CGSTPER:        gstPer / 2,
      CGSTAMOUNT:     calc.CGSTAMOUNT,
      SGSTPER:        gstPer / 2,
      SGSTAMOUNT:     calc.SGSTAMOUNT,
      IGSTPER:        0,
      IGSTAMOUNT:     0,
      PRODUCTCODE:    product.productCode || 0,
      SUBPRODUCTCODE: product.subProductCode || 0,
      ORIONBARCODE:   product.orionBarcode || product.tagNo || '',
      MRP:            product.mrp || rate,
      HSNCODE:        product.hsnCode || '',
      HSNTAXCODE:     product.hsnTaxCode || 0,
      SALEMANCODE:    salesman.trim(),
      UNIQUEKEY:      product.sourceTable || 'TRN001',
      CGSTTAXCODE:    product.cgstTaxCode || 0,
      SGSTTAXCODE:    product.sgstTaxCode || 0,
      IGSTTAXCODE:    product.igstTaxCode || 0,
      BRANDCODE:      product.brandCode || 0,
      SIZECODE:       product.sizeCode || 0,
    };

    setItems(prev => [...prev, newItem].map((it, i) => ({ ...it, sno: i + 1 })));
    toast.show({ message: 'Item added', type: 'success', duration: 1500 });

    // Reset form, keep salesman
    setTagInput('');
    setQty('1');
    setDiscPer('0');
    clearProduct();
    setTimeout(() => tagRef.current?.focus(), 100);
  }, [product, qty, discPer, salesman, items, taxType, clearProduct]);

  // ── Delete item ───────────────────────────────────────────────────
  const handleDelete = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index).map((it, i) => ({ ...it, sno: i + 1 })));
  };

  // ── Clear all ─────────────────────────────────────────────────────
  const handleClear = () => {
    Alert.alert('Clear All', 'Remove all items?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive', onPress: () => {
          setItems([]);
          setTagInput('');
          setQty('1');
          setDiscPer('0');
          setSalesman('');
          clearProduct();
          setTimeout(() => tagRef.current?.focus(), 100);
        },
      },
    ]);
  };

  // ── Save flow ─────────────────────────────────────────────────────
  // Step 1: open customer modal
  const handleSave = () => {
    if (!items.length) { toast.show({ message: 'Add at least one item', type: 'warning' }); return; }
    setShowCustomerModal(true);
  };

  // Step 2a: customer confirmed → save with their info
  const handleCustomerConfirm = async (customerInfo: CustomerInfo) => {
    setShowCustomerModal(false);
    // Snapshot before saving
    const now = new Date();
    setReceiptItems([...items]);
    setReceiptCustomer(customerInfo);
    setReceiptSalesman(salesman);
    setReceiptDate(now.toLocaleDateString('en-IN'));
    setReceiptTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    const estNo = await save(items, taxType, operCode, customerInfo);
    if (estNo) {
      // Form cleared after user closes receipt modal
    }
  };

  // Step 2b: walk-in / skip → save with empty customer
  const handleCustomerSkip = async () => {
    setShowCustomerModal(false);
    // Snapshot before saving
    const now = new Date();
    setReceiptItems([...items]);
    setReceiptCustomer(null);
    setReceiptSalesman(salesman);
    setReceiptDate(now.toLocaleDateString('en-IN'));
    setReceiptTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    const estNo = await save(items, taxType, operCode, null);
    if (estNo) {
      // Form cleared after user closes receipt modal
    }
  };

  // Close receipt / PDF and reset form
  const resetForm = () => {
    setItems([]);
    setTagInput('');
    setQty('1');
    setDiscPer('0');
    clearProduct();
    setTimeout(() => tagRef.current?.focus(), 100);
  };

  const handleReceiptClose = () => { setShowReceipt(false); resetForm(); };
  const handlePdfClose     = () => { setShowPdf(false);     resetForm(); };

  // ── Totals ────────────────────────────────────────────────────────
  const totals = GstCalculator.calculateTotals(items);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <Header
        title="Estimation"
        showBack
        onBack={() => navigation.goBack()}
        actions={[
          {
            icon: <Text style={styles.headerIcon}>🗑</Text>,
            onPress: handleClear,
            label: 'Clear all',
          },
        ]}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Entry form ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>ADD ITEM</Text>

          {/* Tag No */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Tag / Barcode <Text style={styles.req}>*</Text></Text>
            <View style={styles.tagRow}>
              <TextInput
                ref={tagRef}
                style={[styles.input, styles.tagInput]}
                placeholder="Scan or type tag no…"
                placeholderTextColor={Colors.textDisabled}
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={handleTagSubmit}
                returnKeyType="search"
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.lookupBtn}
                onPress={handleTagSubmit}
                disabled={searching}
              >
                {searching
                  ? <ActivityIndicator size="small" color={Colors.white} />
                  : <Text style={styles.lookupBtnText}>Search</Text>
                }
              </TouchableOpacity>
            </View>
          </View>

          {/* Product details (readonly after lookup) */}
          {product && (
            <View style={styles.productBox}>
              <Text style={styles.productName}>
                {product.productName}{product.subProductName ? ` — ${product.subProductName}` : ''}
              </Text>
              <View style={styles.productMeta}>
                <MetaChip label="Rate"   value={`₹${fmt(product.sellingRate || 0)}`} />
                <MetaChip label="UOM"    value={product.unitName || (product.weight ? 'KGS' : 'PCS')} />
                {(product.weight || 0) > 0 && <MetaChip label="Weight" value={`${product.weight} kg`} />}
                <MetaChip label="Stock"  value={String(product.pieces ?? product.stockPieces ?? '—')} />
              </View>
            </View>
          )}

          {/* QTY / Disc / Salesman */}
          <View style={styles.row3}>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>
                Qty <Text style={styles.req}>*</Text>
                {availablePieces > 0 && (
                  <Text style={styles.maxHint}> (max {availablePieces})</Text>
                )}
              </Text>
              <TextInput
                ref={qtyRef}
                style={[styles.input, availablePieces > 0 && Number(qty) > availablePieces && styles.inputError]}
                value={qty}
                onChangeText={handleQtyChange}
                keyboardType="decimal-pad"
                returnKeyType="next"
                onSubmitEditing={() => discRef.current?.focus()}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Disc %</Text>
              <TextInput
                ref={discRef}
                style={styles.input}
                value={discPer}
                onChangeText={setDiscPer}
                keyboardType="decimal-pad"
                returnKeyType="next"
                onSubmitEditing={() => salesmanRef.current?.focus()}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Salesman <Text style={styles.req}>*</Text></Text>
              <TextInput
                ref={salesmanRef}
                style={styles.input}
                value={salesman}
                onChangeText={setSalesman}
                placeholder="Code"
                placeholderTextColor={Colors.textDisabled}
                autoCapitalize="characters"
                returnKeyType="done"
                onSubmitEditing={handleAdd}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.85}>
            <Text style={styles.addBtnText}>+ Add to Bill</Text>
          </TouchableOpacity>
        </View>

        {/* ── Items table ── */}
        {items.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>ITEMS ({items.length})</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator persistentScrollbar>
              <View>
                {/* Header row */}
                <View style={[styles.tableRow, styles.tableHeader]}>
                  {['#','Product','Tag','Rate','Qty','UOM','Gross','Disc%','Disc₹','Taxable','GST','Total','Del']
                    .map(h => <Text key={h} style={[styles.th, colStyle(h)]}>{h}</Text>)}
                </View>

                {/* Data rows */}
                {items.map((item, idx) => {
                  const gross = item.weight > 0 ? item.weight * item.rate : item.qty * item.rate;
                  return (
                    <View key={idx} style={[styles.tableRow, idx % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                      <Text style={[styles.td, colStyle('#')]}>{item.sno}</Text>
                      <Text style={[styles.td, colStyle('Product')]} numberOfLines={1}>
                        {item.productName.split(' - ')[0]}
                      </Text>
                      <Text style={[styles.td, colStyle('Tag')]} numberOfLines={1}>{item.tagNo}</Text>
                      <Text style={[styles.td, colStyle('Rate')]}>{fmt(item.rate)}</Text>
                      <Text style={[styles.td, colStyle('Qty')]}>{item.qty}</Text>
                      <Text style={[styles.td, colStyle('UOM')]}>{item.uom}</Text>
                      <Text style={[styles.td, colStyle('Gross')]}>{fmt(gross)}</Text>
                      <Text style={[styles.td, colStyle('Disc%')]}>{item.discPer}</Text>
                      <Text style={[styles.td, colStyle('Disc₹')]}>{fmt(item.discount)}</Text>
                      <Text style={[styles.td, colStyle('Taxable')]}>{fmt(item.amount)}</Text>
                      <Text style={[styles.td, colStyle('GST'), { color: Colors.info }]}>{fmt(item.gst)}</Text>
                      <Text style={[styles.td, colStyle('Total'), { color: Colors.success, fontWeight: '700' }]}>{fmt(item.total)}</Text>
                      <TouchableOpacity style={[styles.td, colStyle('Del')]} onPress={() => handleDelete(idx)}>
                        <Text style={styles.deleteBtn}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* ── Summary ── */}
        {items.length > 0 && (
          <View style={styles.summaryCard}>
            <SummaryRow label="Items"    value={String(items.length)} />
            <SummaryRow label="Gross"    value={`₹${fmt(totals.amount + totals.discount)}`} />
            <SummaryRow label="Discount" value={`₹${fmt(totals.discount)}`} color={Colors.warning} />
            <SummaryRow label="Taxable"  value={`₹${fmt(totals.amount)}`} />
            <SummaryRow label="GST"      value={`₹${fmt(totals.gst)}`} color={Colors.info} />
            <SummaryRow label="NET TOTAL" value={`₹${fmt(totals.net)}`} color={Colors.success} bold />
          </View>
        )}

        {/* ── Save button ── */}
        {items.length > 0 && (
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.saveBtnText}>💾  Save Estimate</Text>
            }
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Customer Modal ── */}
      <CustomerModal
        visible={showCustomerModal}
        operCode={operCode}
        onConfirm={handleCustomerConfirm}
        onSkip={handleCustomerSkip}
        onClose={() => setShowCustomerModal(false)}
      />

      {/* ── Estimation Receipt Modal (auto-print) ── */}
      <EstimationReceiptModal
        autoPrint={true}
        visible={showReceipt}
        estNo={receiptEstNo}
        items={receiptItems}
        customerInfo={receiptCustomer}
        salesman={receiptSalesman}
        billDate={receiptDate}
        billTime={receiptTime}
        onClose={handleReceiptClose}
      />

      {/* ── Estimation PDF Preview Modal ── */}
      <EstimationPdfModal
        visible={showPdf}
        estNo={receiptEstNo}
        items={receiptItems}
        customerInfo={receiptCustomer}
        salesman={receiptSalesman}
        billDate={receiptDate}
        billTime={receiptTime}
        onClose={handlePdfClose}
      />
    </View>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const MetaChip: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.chip}>
    <Text style={styles.chipLabel}>{label}</Text>
    <Text style={styles.chipValue}>{value}</Text>
  </View>
);

const SummaryRow: React.FC<{ label: string; value: string; color?: string; bold?: boolean }> = (
  { label, value, color, bold }
) => (
  <View style={styles.summaryRow}>
    <Text style={[styles.summaryLabel, bold && { fontWeight: '700' }]}>{label}</Text>
    <Text style={[styles.summaryValue, { color: color ?? Colors.textPrimary }, bold && { fontWeight: '700', fontSize: Typography.fontSizeLG }]}>
      {value}
    </Text>
  </View>
);

// ─── Column width helper ──────────────────────────────────────────────────────
const COL_WIDTHS: Record<string, number> = {
  '#': 28, Product: 100, Tag: 90, Rate: 70, Qty: 44, UOM: 40,
  Gross: 80, 'Disc%': 48, 'Disc₹': 68, Taxable: 80, GST: 64, Total: 80, Del: 36,
};

const colStyle = (col: string) => ({ width: COL_WIDTHS[col] ?? 70 });

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg },
  headerIcon: { color: Colors.white, fontSize: 18 },

  card: {
    backgroundColor: Colors.white,
    borderRadius:    Radius.lg,
    padding:         Spacing.lg,
    marginBottom:    Spacing.lg,
    ...Shadow.sm,
  },
  sectionLabel: {
    fontSize:      Typography.fontSizeXS,
    fontWeight:    Typography.fontWeightBold,
    color:         Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom:  Spacing.md,
  },

  // Tag row
  fieldRow:   { marginBottom: Spacing.md },
  fieldLabel: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold, color: Colors.textPrimary, marginBottom: 4 },
  req:        { color: Colors.error },
  maxHint:    { color: Colors.textSecondary, fontWeight: Typography.fontWeightNormal, fontSize: Typography.fontSizeXS },
  inputError: { borderColor: Colors.error },
  tagRow:     { flexDirection: 'row', gap: Spacing.sm },
  tagInput:   { flex: 1 },
  input: {
    borderWidth:       1.5,
    borderColor:       Colors.border,
    borderRadius:      Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.sm,
    fontSize:          Typography.fontSizeMD,
    color:             Colors.textPrimary,
    backgroundColor:   Colors.white,
    minHeight:         44,
  },
  lookupBtn: {
    backgroundColor:  Colors.primary,
    borderRadius:     Radius.md,
    paddingHorizontal: Spacing.lg,
    alignItems:       'center',
    justifyContent:   'center',
    minWidth:         80,
    minHeight:        44,
  },
  lookupBtnText: { color: Colors.white, fontWeight: Typography.fontWeightBold, fontSize: Typography.fontSizeSM },

  // Product box
  productBox: {
    backgroundColor: Colors.primaryBg,
    borderRadius:    Radius.md,
    padding:         Spacing.md,
    marginBottom:    Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  productName: { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold, color: Colors.primaryDark, marginBottom: Spacing.xs },
  productMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    backgroundColor: Colors.white,
    borderRadius:    Radius.sm,
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  chipLabel: { fontSize: Typography.fontSizeXS, color: Colors.textSecondary },
  chipValue: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightBold, color: Colors.textPrimary },

  // 3-col row
  row3: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  col:  { flex: 1 },

  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius:    Radius.md,
    paddingVertical: Spacing.md,
    alignItems:      'center',
    ...Shadow.sm,
  },
  addBtnText: { color: Colors.white, fontWeight: Typography.fontWeightBold, fontSize: Typography.fontSizeMD },

  // Table
  tableRow:   { flexDirection: 'row', alignItems: 'center' },
  tableHeader: { backgroundColor: Colors.tableHeader, paddingVertical: Spacing.sm, borderRadius: Radius.sm, marginBottom: 2 },
  rowEven:    { backgroundColor: Colors.tableRowEven, paddingVertical: Spacing.xs },
  rowOdd:     { backgroundColor: Colors.tableRowOdd,  paddingVertical: Spacing.xs },
  th: {
    fontSize:   Typography.fontSizeXS,
    fontWeight: Typography.fontWeightBold,
    color:      Colors.white,
    textAlign:  'center',
    paddingHorizontal: 2,
  },
  td: {
    fontSize:  Typography.fontSizeXS,
    color:     Colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  deleteBtn: { color: Colors.error, fontWeight: Typography.fontWeightBold, fontSize: 14 },

  // Summary
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius:    Radius.lg,
    padding:         Spacing.lg,
    marginBottom:    Spacing.lg,
    ...Shadow.sm,
  },
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  summaryLabel: { fontSize: Typography.fontSizeMD, color: Colors.textSecondary },
  summaryValue: { fontSize: Typography.fontSizeMD, color: Colors.textPrimary },

  // Save
  saveBtn: {
    backgroundColor: Colors.success,
    borderRadius:    Radius.lg,
    paddingVertical: Spacing.lg,
    alignItems:      'center',
    marginBottom:    Spacing.lg,
    ...Shadow.md,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: Colors.white, fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold },
});

export default EstimationScreen;
