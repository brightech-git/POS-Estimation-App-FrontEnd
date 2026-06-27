import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as Print from 'expo-print';
import type { EstimationItem } from '../../types/estimation';
import type { CustomerInfo } from '../../types/customer';
import { GstCalculator } from '../../utils/GstCalculator';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ReceiptProps {
  visible: boolean;
  estNo: string;
  items: EstimationItem[];
  customerInfo?: CustomerInfo | null;
  salesman?: string;
  billDate: string;
  billTime: string;
  onClose: () => void;
  autoPrint?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => Number(n || 0).toFixed(2);

// ─── Divider ─────────────────────────────────────────────────────────────────
const Divider = () => <View style={styles.divider} />;
const DoubleDivider = () => <View style={styles.doubleDivider} />;

// ─── Print HTML ───────────────────────────────────────────────────────────────
function buildPrintHtml(props: Omit<ReceiptProps, 'visible' | 'onClose'>) {
  const { estNo, items, customerInfo, salesman, billDate, billTime } = props;
  const totals    = GstCalculator.calculateTotals(items);
  const grossTotal = items.reduce((s, i) => s + (i.weight > 0 ? i.weight * i.rate : i.qty * i.rate), 0);
  const discount  = totals.discount;
  const finalAmt  = grossTotal - discount;
  const rounded   = Math.round(finalAmt);
  const roundOff  = rounded - finalAmt;
  const hasRound  = Math.abs(roundOff) >= 0.01;

  const discPercentages = items.map(i => i.discPer ?? 0);
  const allSameDisc = discPercentages.length > 0 && discPercentages.every(d => d === discPercentages[0]);
  const commonDiscPer = allSameDisc ? discPercentages[0] : null;

  const customerName = customerInfo?.PNAME?.trim() || 'WALK-IN CUSTOMER';
  const customerMobile = customerInfo?.MOBILE || '';

  const itemRows = items.map((item, idx) => {
    const hasWeight = (item.weight ?? 0) > 0;
    const qtyDisplay = hasWeight ? `${item.weight} Kg` : String(item.qty);
    const rawAmount = hasWeight ? item.weight * item.rate : item.qty * item.rate;
    const name = item.subProductName || item.productName;
    return `
      <tr>
        <td>${item.sno}</td>
        <td style="text-align:left;word-break:break-word;">
          <div>${name}</div>
          ${item.tagNo ? `<div style="font-size:9px;">${item.tagNo}</div>` : ''}
        </td>
        <td>${qtyDisplay}</td>
        <td>${fmt(item.rate)}</td>
        <td style="text-align:right;">${fmt(rawAmount)}</td>
      </tr>`;
  }).join('');

  const discountRow = discount > 0
    ? `<div class="row"><span>${commonDiscPer && commonDiscPer > 0 ? `Discount : ${commonDiscPer}%` : 'Discount'}</span><span>${fmt(discount)}</span></div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
@page { size: 72mm auto; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 72mm; background: #fff; font-family: Arial, sans-serif; font-size: 9pt; }
.receipt { padding: 4px; }
.center { text-align: center; }
.bold { font-weight: bold; }
.title { font-size: 12pt; font-weight: bold; letter-spacing: 1px; text-align: center; margin: 3px 0; }
.divider { border-top: 1px dashed #000; margin: 3px 0; }
.dbl { border-top: 3px double #000; margin: 4px 0; }
.row { display: flex; justify-content: space-between; font-size: 9pt; margin: 1px 0; }
.net { display: flex; justify-content: space-between; font-size: 11pt; font-weight: bold; margin: 2px 0; }
table { width: 100%; border-collapse: collapse; }
th { font-size: 9pt; font-weight: bold; border-bottom: 1px solid #000; padding: 1px; text-align: right; }
th:first-child { text-align: left; }
th:nth-child(2) { text-align: left; }
td { font-size: 9pt; padding: 1px; text-align: right; vertical-align: top; }
td:first-child { text-align: left; }
td:nth-child(2) { text-align: left; }
.footer { text-align: center; font-size: 9pt; font-weight: bold; margin: 2px 0; }
</style>
</head>
<body>
<div class="receipt">
  <div class="title">ESTIMATION</div>
  <div class="divider"></div>

  <div style="display:flex;justify-content:space-between;font-size:9pt;margin:2px 0;">
    <div><span class="bold">Est No :</span> ${estNo}</div>
    <div style="text-align:right;">
      <div><span class="bold">Date :</span> ${billDate}</div>
      <div><span class="bold">Time :</span> ${billTime}</div>
    </div>
  </div>

  ${customerName ? `
  <div class="divider"></div>
  <div style="font-size:9pt;margin:2px 0;">
    <div><span class="bold">Name   :</span> ${customerName}</div>
    ${customerMobile ? `<div><span class="bold">Mobile :</span> ${customerMobile}</div>` : ''}
  </div>` : ''}

  <div class="divider"></div>

  <table>
    <thead>
      <tr>
        <th style="text-align:left;width:18px;">S.No</th>
        <th style="text-align:left;">Product</th>
        <th>Qty</th>
        <th>Rate</th>
        <th style="text-align:right;">Amt</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="divider"></div>

  <div class="row"><span>Total Amount</span><span>${fmt(grossTotal)}</span></div>
  ${discountRow}

  <div class="divider"></div>

  <div class="net">
    <span>NET TOTAL</span>
    <span>&#8377; ${fmt(hasRound ? rounded : finalAmt)}</span>
  </div>

  <div class="divider"></div>

  <div style="font-size:9pt;margin:2px 0;">
    <span class="bold">Items :</span> ${items.length}&nbsp;&nbsp;
    <span class="bold">Total Qty :</span> ${items.reduce((s, i) => s + i.qty, 0)}
  </div>

  ${salesman ? `
  <br/><br/><br/>
  <div style="font-size:9pt;margin:1px 0;"><span class="bold">Salesman :</span> ${salesman}</div>` : ''}

  <div class="dbl"></div>
  <div class="footer">&#11088; Join our Exciting Chit Schemes — Ask us for details!</div>
  <div class="footer">***THANK YOU VISIT AGAIN***</div>
</div>
</body>
</html>`;
}

// ─── Main Component ───────────────────────────────────────────────────────────
const EstimationReceiptModal: React.FC<ReceiptProps> = ({
  visible,
  estNo,
  items,
  customerInfo,
  salesman,
  billDate,
  billTime,
  onClose,
  autoPrint = false,
}) => {
  const [printing, setPrinting] = useState(false);

  const totals     = GstCalculator.calculateTotals(items);
  const grossTotal = items.reduce((s, i) => s + (i.weight > 0 ? i.weight * i.rate : i.qty * i.rate), 0);
  const discount   = totals.discount;
  const finalAmt   = grossTotal - discount;
  const rounded    = Math.round(finalAmt);
  const hasRound   = Math.abs(rounded - finalAmt) >= 0.01;
  const netTotal   = hasRound ? rounded : finalAmt;

  const discPercentages = items.map(i => i.discPer ?? 0);
  const allSameDisc = discPercentages.length > 0 && discPercentages.every(d => d === discPercentages[0]);
  const commonDiscPer = allSameDisc ? discPercentages[0] : null;

  const customerName   = customerInfo?.PNAME?.trim() || '';
  const customerMobile = customerInfo?.MOBILE || '';
  const totalQty       = items.reduce((s, i) => s + i.qty, 0);

  const handlePrint = useCallback(async () => {
    if (printing) return;
    setPrinting(true);
    try {
      const html = buildPrintHtml({ estNo, items, customerInfo, salesman, billDate, billTime });
      await Print.printAsync({ html });
    } catch (_) {
      // user cancelled or print failed — silently ignore
    } finally {
      setPrinting(false);
    }
  }, [printing, estNo, items, customerInfo, salesman, billDate, billTime]);

  // Auto-print: fire once when modal becomes visible, then close
  const autoPrintFiredRef = React.useRef(false);
  useEffect(() => {
    if (!autoPrint || !visible) return;
    if (autoPrintFiredRef.current) return;
    autoPrintFiredRef.current = true;
    (async () => {
      try {
        const html = buildPrintHtml({ estNo, items, customerInfo, salesman, billDate, billTime });
        await Print.printAsync({ html });
      } catch (_) {
        // cancelled or error — still close
      } finally {
        autoPrintFiredRef.current = false;
        onClose();
      }
    })();
  }, [visible, autoPrint, estNo, items, customerInfo, salesman, billDate, billTime, onClose]);

  // Auto-print mode: render nothing — print dialog opens directly
  if (autoPrint) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>

          {/* ── Header bar ── */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Estimation · {estNo}</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerBtn} onPress={handlePrint} disabled={printing}>
                {printing
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.headerBtnText}>🖨 Print</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerBtn} onPress={onClose}>
                <Text style={styles.headerBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Receipt body ── */}
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            <View style={styles.receipt}>

              {/* Title */}
              <Text style={styles.title}>ESTIMATION</Text>
              <Divider />

              {/* Est No / Date / Time */}
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.bodyText}><Text style={styles.label}>Est No : </Text>{estNo}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.bodyText}><Text style={styles.label}>Date : </Text>{billDate}</Text>
                  <Text style={styles.bodyText}><Text style={styles.label}>Time : </Text>{billTime}</Text>
                </View>
              </View>

              {/* Customer */}
              {(customerName || customerMobile) && (
                <>
                  <Divider />
                  <Text style={styles.bodyText}>
                    <Text style={styles.label}>Name   : </Text>
                    {customerName || 'WALK-IN CUSTOMER'}
                  </Text>
                  {!!customerMobile && (
                    <Text style={styles.bodyText}>
                      <Text style={styles.label}>Mobile : </Text>{customerMobile}
                    </Text>
                  )}
                </>
              )}

              <Divider />

              {/* Items table header */}
              <View style={styles.tableHead}>
                <Text style={[styles.th, { flex: 0.6 }]}>S.No</Text>
                <Text style={[styles.th, { flex: 3, textAlign: 'left' }]}>Product</Text>
                <Text style={[styles.th, { flex: 1.2, textAlign: 'right' }]}>Qty</Text>
                <Text style={[styles.th, { flex: 1.4, textAlign: 'right' }]}>Rate</Text>
                <Text style={[styles.th, { flex: 1.6, textAlign: 'right' }]}>Amount</Text>
              </View>

              {/* Item rows */}
              {items.map((item, idx) => {
                const hasWeight = (item.weight ?? 0) > 0;
                const qtyDisplay = hasWeight ? `${item.weight}Kg` : String(item.qty);
                const rawAmount  = hasWeight ? item.weight * item.rate : item.qty * item.rate;
                const name       = item.subProductName || item.productName;
                return (
                  <View key={idx} style={[styles.tableRow, idx % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                    <Text style={[styles.td, { flex: 0.6 }]}>{item.sno}</Text>
                    <View style={{ flex: 3 }}>
                      <Text style={[styles.td, { textAlign: 'left' }]} numberOfLines={2}>{name}</Text>
                      {!!item.tagNo && <Text style={styles.tagNo}>{item.tagNo}</Text>}
                    </View>
                    <Text style={[styles.td, { flex: 1.2, textAlign: 'right' }]}>{qtyDisplay}</Text>
                    <Text style={[styles.td, { flex: 1.4, textAlign: 'right' }]}>{fmt(item.rate)}</Text>
                    <Text style={[styles.td, { flex: 1.6, textAlign: 'right' }]}>{fmt(rawAmount)}</Text>
                  </View>
                );
              })}

              <Divider />

              {/* Totals */}
              <View style={styles.rowBetween}>
                <Text style={styles.bodyText}>Total Amount</Text>
                <Text style={styles.bodyText}>{fmt(grossTotal)}</Text>
              </View>
              {discount > 0 && (
                <View style={styles.rowBetween}>
                  <Text style={styles.bodyText}>
                    {commonDiscPer && commonDiscPer > 0 ? `Discount : ${commonDiscPer}%` : 'Discount'}
                  </Text>
                  <Text style={styles.bodyText}>{fmt(discount)}</Text>
                </View>
              )}

              <Divider />

              {/* Net total */}
              <View style={styles.rowBetween}>
                <Text style={styles.netLabel}>NET TOTAL</Text>
                <Text style={styles.netValue}>₹ {fmt(netTotal)}</Text>
              </View>

              <Divider />

              {/* Items / Qty count */}
              <View style={styles.countRow}>
                <Text style={styles.bodyText}><Text style={styles.label}>Items : </Text>{items.length}</Text>
                <Text style={[styles.bodyText, { marginLeft: 12 }]}><Text style={styles.label}>Total Qty : </Text>{totalQty}</Text>
              </View>

              {/* Spacer for signature */}
              <View style={{ height: 36 }} />

              {/* Salesman */}
              {!!salesman && (
                <Text style={styles.bodyText}><Text style={styles.label}>Salesman : </Text>{salesman}</Text>
              )}

              <DoubleDivider />

              {/* Footer */}
              <Text style={styles.footerLine}>⭐ Join our Exciting Chit Schemes — Ask us for details!</Text>
              <Text style={styles.footerLine}>***THANK YOU VISIT AGAIN***</Text>

            </View>
          </ScrollView>

          {/* ── Bottom print button ── */}
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.printBtn} onPress={handlePrint} disabled={printing}>
              {printing
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.printBtnText}>🖨  Print Estimation</Text>}
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 8,
    width: '100%',
    maxWidth: 400,
    maxHeight: '92%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },

  // Header
  header: {
    backgroundColor: '#1E40AF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerBtnText: { color: '#fff', fontSize: 13 },

  // Scroll / body
  body: { backgroundColor: '#e5e7eb' },
  bodyContent: { padding: 12 },

  // Receipt paper
  receipt: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 4,
  },

  title: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    marginVertical: 3,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  divider: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#000',
    marginVertical: 3,
  },
  doubleDivider: {
    borderTopWidth: 3,
    borderStyle: 'solid',
    borderColor: '#000',
    marginVertical: 4,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginVertical: 1,
  },

  bodyText: { fontSize: 11 },
  label: { fontWeight: '700', fontSize: 11 },

  // Table
  tableHead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000',
    paddingBottom: 2,
    marginBottom: 1,
  },
  th: { fontSize: 11, fontWeight: '700' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 2,
  },
  rowEven: { backgroundColor: '#f9f9f9' },
  rowOdd:  { backgroundColor: '#fff' },
  td:      { fontSize: 11 },
  tagNo:   { fontSize: 10, color: '#555' },

  // Net total
  netLabel: { fontSize: 13, fontWeight: '700' },
  netValue: { fontSize: 13, fontWeight: '700' },

  countRow: { flexDirection: 'row', marginVertical: 1 },

  footerLine: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    marginVertical: 1,
  },

  // Bottom bar
  bottomBar: {
    padding: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  printBtn: {
    backgroundColor: '#1E40AF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    minWidth: 200,
    alignItems: 'center',
  },
  printBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default EstimationReceiptModal;
