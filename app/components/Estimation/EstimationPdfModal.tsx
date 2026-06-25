import React, { useCallback, useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { downloadFile } from '../../utils/downloadFile';
import type { EstimationItem } from '../../types/estimation';
import type { CustomerInfo } from '../../types/customer';
import { GstCalculator } from '../../utils/GstCalculator';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface EstimationPdfProps {
  visible: boolean;
  estNo: string;
  items: EstimationItem[];
  customerInfo?: CustomerInfo | null;
  salesman?: string;
  billDate: string;
  billTime: string;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => Number(n || 0).toFixed(2);

// ─── Dividers ─────────────────────────────────────────────────────────────────
const Divider = () => <View style={styles.divider} />;
const DoubleDivider = () => <View style={styles.doubleDivider} />;

// ─── PDF HTML (A4 layout — wider than thermal) ────────────────────────────────
function buildPdfHtml(props: Omit<EstimationPdfProps, 'visible' | 'onClose'>) {
  const { estNo, items, customerInfo, salesman, billDate, billTime } = props;

  const totals     = GstCalculator.calculateTotals(items);
  const grossTotal = items.reduce((s, i) => s + (i.weight > 0 ? i.weight * i.rate : i.qty * i.rate), 0);
  const discount   = totals.discount;
  const finalAmt   = grossTotal - discount;
  const rounded    = Math.round(finalAmt);
  const hasRound   = Math.abs(rounded - finalAmt) >= 0.01;
  const netTotal   = hasRound ? rounded : finalAmt;

  const discPercentages = items.map(i => i.discPer ?? 0);
  const allSameDisc = discPercentages.length > 0 && discPercentages.every(d => d === discPercentages[0]);
  const commonDiscPer = allSameDisc && discPercentages[0] > 0 ? discPercentages[0] : null;

  const customerName   = customerInfo?.PNAME?.trim() || 'WALK-IN CUSTOMER';
  const customerMobile = customerInfo?.MOBILE || '';
  const totalQty       = items.reduce((s, i) => s + i.qty, 0);

  const itemRows = items.map((item, idx) => {
    const hasWeight  = (item.weight ?? 0) > 0;
    const qtyDisplay = hasWeight ? `${item.weight} Kg` : String(item.qty);
    const rawAmount  = hasWeight ? item.weight * item.rate : item.qty * item.rate;
    const name       = item.subProductName || item.productName;
    const bg         = idx % 2 === 0 ? '#f9fafb' : '#ffffff';
    return `
      <tr style="background:${bg};">
        <td style="text-align:center;">${item.sno}</td>
        <td>
          <div style="font-weight:600;">${name}</div>
          ${item.tagNo ? `<div style="font-size:10px;color:#555;">${item.tagNo}</div>` : ''}
        </td>
        <td style="text-align:center;">${qtyDisplay}</td>
        <td style="text-align:right;">${fmt(item.rate)}</td>
        <td style="text-align:right;">${fmt(rawAmount)}</td>
        ${discount > 0 ? `<td style="text-align:right;">${item.discPer ? item.discPer + '%' : '—'}</td><td style="text-align:right;">${fmt(item.discount ?? 0)}</td>` : ''}
        <td style="text-align:right;font-weight:700;">${fmt(item.total)}</td>
      </tr>`;
  }).join('');

  const discCols = discount > 0
    ? `<th>Disc%</th><th style="text-align:right;">Disc ₹</th>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @page { size: A4; margin: 16mm 12mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, 'Helvetica Neue', sans-serif; font-size: 11px; color: #111; background: #fff; }

  .page { width: 100%; }

  /* Header */
  .header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #1E40AF; padding-bottom: 8px; }
  .header h1 { font-size: 20px; font-weight: 800; color: #1E40AF; letter-spacing: 2px; margin-bottom: 2px; }
  .header p  { font-size: 11px; color: #555; }

  /* Meta row */
  .meta { display: flex; justify-content: space-between; margin: 8px 0; font-size: 11px; }
  .meta-block { }
  .meta-block div { margin: 2px 0; }
  .meta-block .key { font-weight: 700; color: #333; }

  /* Customer box */
  .customer { border: 1px solid #ddd; border-radius: 4px; padding: 6px 10px; margin: 6px 0; font-size: 11px; background: #f8faff; }
  .customer .key { font-weight: 700; }

  /* Divider */
  .div { border-top: 1px solid #ccc; margin: 6px 0; }
  .div-bold { border-top: 2px solid #1E40AF; margin: 6px 0; }

  /* Table */
  table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 11px; }
  thead tr { background: #1E40AF; color: #fff; }
  th { padding: 5px 6px; font-weight: 700; text-align: right; }
  th:first-child { text-align: center; }
  th:nth-child(2) { text-align: left; }
  td { padding: 4px 6px; vertical-align: top; text-align: right; border-bottom: 1px solid #eee; }
  td:first-child { text-align: center; }
  td:nth-child(2) { text-align: left; }

  /* Totals */
  .totals { width: 240px; margin-left: auto; font-size: 11px; }
  .totals tr td { border: none; padding: 3px 6px; }
  .totals .t-label { text-align: left; color: #444; }
  .totals .t-value { text-align: right; font-weight: 600; }
  .totals .net td  { font-size: 13px; font-weight: 800; color: #1E40AF; border-top: 2px solid #1E40AF; padding-top: 5px; }

  /* Footer */
  .footer { margin-top: 16px; text-align: center; font-size: 10px; color: #555; border-top: 1px dashed #aaa; padding-top: 6px; }
  .footer b { color: #1E40AF; }

  /* Count row */
  .count { font-size: 11px; margin: 4px 0; }
  .count span { margin-right: 16px; }

  /* Salesman */
  .salesman { margin-top: 20px; font-size: 11px; }
  .sign-line { border-top: 1px solid #333; width: 140px; display: inline-block; margin-top: 24px; }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <h1>ESTIMATION</h1>
    <p>Estimation Receipt</p>
  </div>

  <div class="meta">
    <div class="meta-block">
      <div><span class="key">Est No :</span> ${estNo}</div>
    </div>
    <div class="meta-block" style="text-align:right;">
      <div><span class="key">Date :</span> ${billDate}</div>
      <div><span class="key">Time :</span> ${billTime}</div>
    </div>
  </div>

  ${customerName ? `
  <div class="customer">
    <div><span class="key">Name&nbsp;&nbsp;&nbsp;:</span> ${customerName}</div>
    ${customerMobile ? `<div><span class="key">Mobile :</span> ${customerMobile}</div>` : ''}
  </div>` : ''}

  <div class="div-bold"></div>

  <table>
    <thead>
      <tr>
        <th style="text-align:center;width:32px;">S.No</th>
        <th style="text-align:left;">Product</th>
        <th>Qty / Wt</th>
        <th>Rate</th>
        <th>Amount</th>
        ${discCols}
        <th>Total</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="div"></div>

  <div style="display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <div class="count">
        <span><b>Items :</b> ${items.length}</span>
        <span><b>Total Qty :</b> ${totalQty}</span>
      </div>
    </div>
    <table class="totals">
      <tr>
        <td class="t-label">Total Amount</td>
        <td class="t-value">${fmt(grossTotal)}</td>
      </tr>
      ${discount > 0 ? `
      <tr>
        <td class="t-label">${commonDiscPer ? `Discount : ${commonDiscPer}%` : 'Discount'}</td>
        <td class="t-value">- ${fmt(discount)}</td>
      </tr>` : ''}
      <tr class="net">
        <td class="t-label">NET TOTAL</td>
        <td class="t-value">&#8377; ${fmt(netTotal)}</td>
      </tr>
    </table>
  </div>

  ${salesman ? `
  <div class="salesman">
    <span class="sign-line"></span>
    <div style="font-size:10px;margin-top:2px;"><b>Salesman :</b> ${salesman}</div>
  </div>` : ''}

  <div class="footer">
    <b>⭐ Join our Exciting Chit Schemes — Ask us for details!</b><br/>
    ***THANK YOU VISIT AGAIN***
  </div>

</div>
</body>
</html>`;
}

// ─── Main Component ───────────────────────────────────────────────────────────
const EstimationPdfModal: React.FC<EstimationPdfProps> = ({
  visible,
  estNo,
  items,
  customerInfo,
  salesman,
  billDate,
  billTime,
  onClose,
}) => {
  const [saving, setSaving] = useState(false);

  const totals     = GstCalculator.calculateTotals(items);
  const grossTotal = items.reduce((s, i) => s + (i.weight > 0 ? i.weight * i.rate : i.qty * i.rate), 0);
  const discount   = totals.discount;
  const finalAmt   = grossTotal - discount;
  const rounded    = Math.round(finalAmt);
  const hasRound   = Math.abs(rounded - finalAmt) >= 0.01;
  const netTotal   = hasRound ? rounded : finalAmt;

  const discPercentages = items.map(i => i.discPer ?? 0);
  const allSameDisc = discPercentages.length > 0 && discPercentages.every(d => d === discPercentages[0]);
  const commonDiscPer = allSameDisc && discPercentages[0] > 0 ? discPercentages[0] : null;

  const customerName   = customerInfo?.PNAME?.trim() || '';
  const customerMobile = customerInfo?.MOBILE || '';
  const totalQty       = items.reduce((s, i) => s + i.qty, 0);

  // ── Save PDF ────────────────────────────────────────────────────────────────
  const handleSaveWord = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const html = buildPdfHtml({ estNo, items, customerInfo, salesman, billDate, billTime });
      await downloadFile({
        fileName: `Estimation_${estNo}.doc`,
        content:  html,
        mimeType: 'application/msword',
      });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not save Word document');
    } finally {
      setSaving(false);
    }
  }, [saving, estNo, items, customerInfo, salesman, billDate, billTime]);

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>

          {/* ── Header bar ── */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>📝 Estimation · {estNo}</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerBtn} onPress={handleSaveWord} disabled={saving}>
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.headerBtnText}>⬇ Save Word</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerBtn} onPress={onClose}>
                <Text style={styles.headerBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Receipt preview ── */}
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            <View style={styles.receipt}>

              {/* Title */}
              <View style={styles.titleBlock}>
                <Text style={styles.title}>ESTIMATION</Text>
                <Text style={styles.subtitle}>Estimation Receipt</Text>
              </View>

              <View style={styles.boldDivider} />

              {/* Est No / Date / Time */}
              <View style={styles.metaRow}>
                <Text style={styles.bodyText}><Text style={styles.label}>Est No : </Text>{estNo}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.bodyText}><Text style={styles.label}>Date : </Text>{billDate}</Text>
                  <Text style={styles.bodyText}><Text style={styles.label}>Time : </Text>{billTime}</Text>
                </View>
              </View>

              {/* Customer */}
              {(customerName || customerMobile) && (
                <View style={styles.customerBox}>
                  <Text style={styles.bodyText}>
                    <Text style={styles.label}>Name   : </Text>
                    {customerName || 'WALK-IN CUSTOMER'}
                  </Text>
                  {!!customerMobile && (
                    <Text style={styles.bodyText}>
                      <Text style={styles.label}>Mobile : </Text>{customerMobile}
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.boldDivider} />

              {/* Table header */}
              <View style={styles.tableHead}>
                <Text style={[styles.th, { flex: 0.5, textAlign: 'center' }]}>#</Text>
                <Text style={[styles.th, { flex: 3.2, textAlign: 'left' }]}>Product</Text>
                <Text style={[styles.th, { flex: 1.1, textAlign: 'right' }]}>Qty</Text>
                <Text style={[styles.th, { flex: 1.4, textAlign: 'right' }]}>Rate</Text>
                {discount > 0 && (
                  <>
                    <Text style={[styles.th, { flex: 0.9, textAlign: 'right' }]}>Disc%</Text>
                    <Text style={[styles.th, { flex: 1.2, textAlign: 'right' }]}>Disc₹</Text>
                  </>
                )}
                <Text style={[styles.th, { flex: 1.5, textAlign: 'right' }]}>Total</Text>
              </View>

              {/* Item rows */}
              {items.map((item, idx) => {
                const hasWeight  = (item.weight ?? 0) > 0;
                const qtyDisplay = hasWeight ? `${item.weight}Kg` : String(item.qty);
                const name       = item.subProductName || item.productName;
                return (
                  <View key={idx} style={[styles.tableRow, idx % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                    <Text style={[styles.td, { flex: 0.5, textAlign: 'center' }]}>{item.sno}</Text>
                    <View style={{ flex: 3.2 }}>
                      <Text style={[styles.td, styles.tdBold, { textAlign: 'left' }]} numberOfLines={2}>{name}</Text>
                      {!!item.tagNo && <Text style={styles.tagNo}>{item.tagNo}</Text>}
                    </View>
                    <Text style={[styles.td, { flex: 1.1, textAlign: 'right' }]}>{qtyDisplay}</Text>
                    <Text style={[styles.td, { flex: 1.4, textAlign: 'right' }]}>{fmt(item.rate)}</Text>
                    {discount > 0 && (
                      <>
                        <Text style={[styles.td, { flex: 0.9, textAlign: 'right' }]}>
                          {(item.discPer ?? 0) > 0 ? `${item.discPer}%` : '—'}
                        </Text>
                        <Text style={[styles.td, { flex: 1.2, textAlign: 'right' }]}>{fmt(item.discount ?? 0)}</Text>
                      </>
                    )}
                    <Text style={[styles.td, styles.tdBold, { flex: 1.5, textAlign: 'right', color: '#1E40AF' }]}>
                      {fmt(item.total)}
                    </Text>
                  </View>
                );
              })}

              <Divider />

              {/* Counts + Totals side by side */}
              <View style={styles.summaryRow}>
                <View style={{ justifyContent: 'flex-end' }}>
                  <Text style={styles.bodyText}><Text style={styles.label}>Items : </Text>{items.length}</Text>
                  <Text style={styles.bodyText}><Text style={styles.label}>Total Qty : </Text>{totalQty}</Text>
                </View>
                <View style={styles.totalsBlock}>
                  <View style={styles.totalsLine}>
                    <Text style={styles.totalsLabel}>Total Amount</Text>
                    <Text style={styles.totalsValue}>{fmt(grossTotal)}</Text>
                  </View>
                  {discount > 0 && (
                    <View style={styles.totalsLine}>
                      <Text style={styles.totalsLabel}>
                        {commonDiscPer ? `Discount : ${commonDiscPer}%` : 'Discount'}
                      </Text>
                      <Text style={[styles.totalsValue, { color: '#dc2626' }]}>- {fmt(discount)}</Text>
                    </View>
                  )}
                  <View style={styles.netLine}>
                    <Text style={styles.netLabel}>NET TOTAL</Text>
                    <Text style={styles.netValue}>₹ {fmt(netTotal)}</Text>
                  </View>
                </View>
              </View>

              {/* Salesman signature line */}
              {!!salesman && (
                <>
                  <View style={{ height: 28 }} />
                  <View style={styles.signatureRow}>
                    <View style={styles.signatureLine} />
                    <Text style={styles.bodyText}><Text style={styles.label}>Salesman : </Text>{salesman}</Text>
                  </View>
                </>
              )}

              <DoubleDivider />

              {/* Footer */}
              <Text style={styles.footerLine}>⭐ Join our Exciting Chit Schemes — Ask us for details!</Text>
              <Text style={styles.footerLine}>***THANK YOU VISIT AGAIN***</Text>

            </View>
          </ScrollView>

          {/* ── Bottom save button ── */}
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveWord} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>⬇  Save as Word</Text>}
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
    maxWidth: 480,
    maxHeight: '94%',
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
  headerTitle:   { color: '#fff', fontSize: 15, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  headerBtnText: { color: '#fff', fontSize: 13 },

  // Body
  body:        { backgroundColor: '#e5e7eb' },
  bodyContent: { padding: 12 },

  // Receipt paper
  receipt: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 6,
  },

  // Title
  titleBlock: { alignItems: 'center', marginBottom: 6 },
  title:    { fontSize: 18, fontWeight: '800', letterSpacing: 2, color: '#1E40AF' },
  subtitle: { fontSize: 11, color: '#555', marginTop: 1 },

  boldDivider: { borderTopWidth: 2, borderColor: '#1E40AF', marginVertical: 6 },
  divider:     { borderTopWidth: 1, borderColor: '#d1d5db', marginVertical: 4 },
  doubleDivider: { borderTopWidth: 3, borderStyle: 'solid', borderColor: '#1E40AF', marginVertical: 6 },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  bodyText: { fontSize: 11, marginVertical: 1 },
  label:    { fontWeight: '700', color: '#333' },

  // Customer box
  customerBox: {
    backgroundColor: '#f0f4ff',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#1E40AF',
    padding: 8,
    marginVertical: 4,
  },

  // Table
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#1E40AF',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 4,
    marginBottom: 1,
  },
  th: { fontSize: 11, fontWeight: '700', color: '#fff' },

  tableRow:  { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 3, paddingHorizontal: 4 },
  rowEven:   { backgroundColor: '#f9fafb' },
  rowOdd:    { backgroundColor: '#fff' },
  td:        { fontSize: 11, color: '#111' },
  tdBold:    { fontWeight: '600' },
  tagNo:     { fontSize: 10, color: '#777' },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 6,
  },
  totalsBlock: { minWidth: 180 },
  totalsLine:  { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  totalsLabel: { fontSize: 11, color: '#444' },
  totalsValue: { fontSize: 11, fontWeight: '600' },
  netLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 2,
    borderColor: '#1E40AF',
    marginTop: 4,
    paddingTop: 4,
  },
  netLabel: { fontSize: 13, fontWeight: '800', color: '#1E40AF' },
  netValue: { fontSize: 13, fontWeight: '800', color: '#1E40AF' },

  // Signature
  signatureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  signatureLine: { width: 100, borderTopWidth: 1, borderColor: '#333' },

  // Footer
  footerLine: { textAlign: 'center', fontSize: 10, fontWeight: '700', color: '#555', marginVertical: 1 },

  // Bottom bar
  bottomBar: { padding: 12, backgroundColor: '#f3f4f6', alignItems: 'center' },
  saveBtn: {
    backgroundColor: '#1E40AF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    minWidth: 200,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default EstimationPdfModal;
