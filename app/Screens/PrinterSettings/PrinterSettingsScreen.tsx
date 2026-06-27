import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  FlatList, Alert, ActivityIndicator, StyleSheet, RefreshControl,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AsyncStorageHelper } from '../../utils/AsyncStorageHelper';

import Header from '../../components/common/Header';
import { useToast } from '../../components/common/Toast';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../components/common/theme';
import { usePrinterService, type Printer } from '../../api/hooks/usePrinter';
import { checkPrinterConnection } from '../../utils/EstimationPrinterService';
import type { RootStackParamList } from '../../Navigations/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'PrinterSettings'>;

const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
const isValidIP = (ip: string) =>
  IP_REGEX.test(ip) && ip.split('.').every(o => { const n = parseInt(o); return n >= 0 && n <= 255; });

const PrinterSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const toast          = useToast();
  const printerService = usePrinterService();
  const isMounted      = useRef(true);

  const [printers,   setPrinters]   = useState<Printer[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [testing,    setTesting]    = useState<number | null>(null);
  const [editingCode,setEditingCode]= useState<number | null>(null);

  const [printerName, setPrinterName] = useState('');   // IP address stored here
  const [billType,    setBillType]    = useState('ES');
  const [operCode,    setOperCode]    = useState('');

  useEffect(() => {
    isMounted.current = true;
    AsyncStorageHelper.getOperCode().then(code => {
      if (code && isMounted.current) { setOperCode(code); loadPrinters(code); }
      else setLoading(false);
    });
    return () => { isMounted.current = false; };
  }, []);

  const loadPrinters = useCallback(async (empId?: string) => {
    const id = empId ?? operCode;
    if (!id) return;
    try {
      const list = await printerService.getPrintersByOperCode(id);
      if (isMounted.current) setPrinters(list ?? []);
    } catch {
      toast.show({ message: 'Failed to load printers', type: 'error' });
    } finally {
      if (isMounted.current) { setLoading(false); setRefreshing(false); }
    }
  }, [operCode]);

  const resetForm = () => { setPrinterName(''); setBillType('ES'); setEditingCode(null); };

  const validate = () => {
    if (!printerName.trim()) {
      toast.show({ message: 'Enter printer IP address', type: 'warning' }); return false;
    }
    if (!isValidIP(printerName.trim())) {
      toast.show({ message: 'Invalid IP address (e.g. 192.168.1.100)', type: 'warning' }); return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate() || saving) return;
    setSaving(true);
    try {
      const payload = {
        operCode:    Number(operCode),
        printerName: printerName.trim(),
        billType:    billType.trim() || 'ES',
        active:      'N',
      };
      if (editingCode) {
        await printerService.updatePrinterSetting(editingCode, payload);
        toast.show({ message: 'Printer updated', type: 'success' });
      } else {
        await printerService.createPrinterSetting(payload);
        toast.show({ message: 'Printer added', type: 'success' });
      }
      resetForm();
      await loadPrinters();
    } catch (e: any) {
      toast.show({ message: e?.message ?? 'Failed to save', type: 'error' });
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const handleActivate = async (printer: Printer) => {
    try {
      await printerService.activatePrinter(printer.printCode);
      toast.show({ message: `"${printer.printerName}" set as active`, type: 'success' });
      await loadPrinters();
    } catch (e: any) {
      toast.show({ message: e?.message ?? 'Failed to activate', type: 'error' });
    }
  };

  const handleDelete = (printer: Printer) => {
    Alert.alert('Delete Printer', `Delete "${printer.printerName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await printerService.deletePrinterSetting(printer.printCode);
            toast.show({ message: 'Printer deleted', type: 'success' });
            await loadPrinters();
          } catch (e: any) {
            toast.show({ message: e?.message ?? 'Failed to delete', type: 'error' });
          }
        },
      },
    ]);
  };

  const handleTest = async (printer: Printer) => {
    setTesting(printer.printCode);
    try {
      const result = await checkPrinterConnection(printer);
      if (result.connected) {
        Alert.alert('✅ Connected', `${printer.printerName} is online.`);
      } else {
        Alert.alert('❌ Offline', `${printer.printerName}\n${result.error ?? 'Cannot connect'}`);
      }
    } finally {
      if (isMounted.current) setTesting(null);
    }
  };

  const handleEdit = (printer: Printer) => {
    setEditingCode(printer.printCode);
    setPrinterName(printer.printerName);
    setBillType(printer.billType ?? 'ES');
  };

  const renderItem = ({ item }: { item: Printer }) => {
    const isActive = item.active === 'Y';
    return (
      <View style={[styles.printerCard, isActive && styles.activeCard]}>
        <View style={styles.printerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.printerIp}>{item.printerName}</Text>
            {isActive && (
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeBadgeText}>ACTIVE</Text>
              </View>
            )}
          </View>
          <Text style={styles.printerMeta}>Port 9100 · Bill: {item.billType ?? 'ES'}</Text>
        </View>

        <View style={styles.actions}>
          {!isActive && (
            <TouchableOpacity style={[styles.btn, styles.btnSet]} onPress={() => handleActivate(item)}>
              <Text style={styles.btnTxt}>✓</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.btn, styles.btnTest]}
            onPress={() => handleTest(item)}
            disabled={testing === item.printCode}
          >
            {testing === item.printCode
              ? <ActivityIndicator size="small" color={Colors.white} />
              : <Text style={styles.btnTxt}>📡</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnEdit]} onPress={() => handleEdit(item)}>
            <Text style={styles.btnTxt}>✎</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnDel]} onPress={() => handleDelete(item)}>
            <Text style={styles.btnTxt}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <View style={styles.root}>
      <Header title="Printer Settings" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadPrinters(); }}
            colors={[Colors.primary]}
          />
        }
      >
        {/* ── Form ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{editingCode ? 'EDIT PRINTER' : 'ADD PRINTER'}</Text>

          <Text style={styles.fieldLabel}>Printer IP Address <Text style={styles.req}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={printerName}
            onChangeText={setPrinterName}
            placeholder="192.168.1.100"
            placeholderTextColor={Colors.textDisabled}
            keyboardType="numeric"
            autoCapitalize="none"
          />

          <Text style={styles.fieldLabel}>Bill Type</Text>
          <TextInput
            style={styles.input}
            value={billType}
            onChangeText={setBillType}
            placeholder="ES"
            placeholderTextColor={Colors.textDisabled}
            autoCapitalize="characters"
          />

          <Text style={styles.hint}>Port 9100 is used by default for all printers.</Text>

          <View style={styles.formBtns}>
            {editingCode && (
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                <Text style={styles.cancelBtnTxt}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled, { flex: 1 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.saveBtnTxt}>{editingCode ? '💾 Update' : '+ Add Printer'}</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Printer list ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>YOUR PRINTERS ({printers.length})</Text>
          {printers.length === 0
            ? <Text style={styles.emptyTxt}>No printers yet. Add one above.</Text>
            : <FlatList
                data={printers}
                keyExtractor={item => String(item.printCode)}
                renderItem={renderItem}
                scrollEnabled={false}
              />}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: Colors.background },
  scroll:       { flex: 1 },
  scrollContent:{ padding: Spacing.lg },
  centered:     { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadow.sm,
  },
  sectionLabel: {
    fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightBold,
    color: Colors.textSecondary, letterSpacing: 0.8, marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold,
    color: Colors.textPrimary, marginBottom: 4, marginTop: Spacing.sm,
  },
  req:  { color: Colors.error },
  hint: { fontSize: Typography.fontSizeXS, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.sm },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    fontSize: Typography.fontSizeMD, color: Colors.textPrimary,
    backgroundColor: Colors.white, minHeight: 44, marginBottom: Spacing.sm,
  },
  formBtns:   { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  cancelBtn: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, alignItems: 'center',
  },
  cancelBtnTxt: { color: Colors.textSecondary, fontWeight: Typography.fontWeightSemiBold },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: Spacing.md, alignItems: 'center', ...Shadow.sm,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnTxt: { color: Colors.white, fontWeight: Typography.fontWeightBold, fontSize: Typography.fontSizeMD },
  emptyTxt:   { textAlign: 'center', color: Colors.textSecondary, paddingVertical: Spacing.lg },

  printerCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  activeCard:   { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  printerInfo:  { flex: 1 },
  nameRow:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  printerIp:    { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold, color: Colors.textPrimary },
  printerMeta:  { fontSize: Typography.fontSizeSM, color: Colors.textSecondary, marginTop: 2 },

  activeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  activeDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.white },
  activeBadgeText: { color: Colors.white, fontSize: 10, fontWeight: Typography.fontWeightBold },

  actions: { flexDirection: 'row', gap: Spacing.xs },
  btn:     { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnTxt:  { color: Colors.white, fontSize: 14, fontWeight: '700' },
  btnSet:  { backgroundColor: Colors.success },
  btnTest: { backgroundColor: Colors.info },
  btnEdit: { backgroundColor: Colors.warning },
  btnDel:  { backgroundColor: Colors.error },
});

export default PrinterSettingsScreen;
