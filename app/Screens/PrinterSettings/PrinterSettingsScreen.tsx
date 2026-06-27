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

const DEFAULT_PORT = '9100';
const IP_REGEX     = /^(\d{1,3}\.){3}\d{1,3}$/;

const isValidIP = (ip: string) =>
  IP_REGEX.test(ip) && ip.split('.').every(o => { const n = parseInt(o); return n >= 0 && n <= 255; });

const isValidPort = (p: string) => {
  const n = Number(p);
  return !isNaN(n) && n >= 1 && n <= 65535;
};

// ─── Component ────────────────────────────────────────────────────────────────
const PrinterSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const toast          = useToast();
  const printerService = usePrinterService();
  const isMounted      = useRef(true);

  const [printers,      setPrinters]      = useState<Printer[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [testing,       setTesting]       = useState<number | null>(null);
  const [editingId,     setEditingId]     = useState<number | null>(null);

  const [name,          setName]          = useState('');
  const [ip,            setIp]            = useState('');
  const [port,          setPort]          = useState(DEFAULT_PORT);
  const [operCode,      setOperCode]      = useState('');

  useEffect(() => {
    isMounted.current = true;
    loadOperCode();
    return () => { isMounted.current = false; };
  }, []);

  const loadOperCode = async () => {
    const code = await AsyncStorageHelper.getOperCode();
    if (code && isMounted.current) {
      setOperCode(code);
      await loadPrinters(code);
    } else {
      setLoading(false);
    }
  };

  const loadPrinters = useCallback(async (empId?: string) => {
    const id = empId ?? operCode;
    if (!id) return;
    try {
      const list = await printerService.getPrintersByEmployee(id);
      if (isMounted.current) setPrinters(list ?? []);
    } catch (e) {
      toast.show({ message: 'Failed to load printers', type: 'error' });
    } finally {
      if (isMounted.current) { setLoading(false); setRefreshing(false); }
    }
  }, [operCode]);

  const resetForm = () => { setName(''); setIp(''); setPort(DEFAULT_PORT); setEditingId(null); };

  const validate = () => {
    if (!ip.trim()) { toast.show({ message: 'Enter printer IP address', type: 'warning' }); return false; }
    if (!isValidIP(ip.trim())) { toast.show({ message: 'Invalid IP (e.g. 192.168.1.100)', type: 'warning' }); return false; }
    if (!isValidPort(port.trim())) { toast.show({ message: 'Invalid port (1–65535)', type: 'warning' }); return false; }
    return true;
  };

  const handleSave = async () => {
    if (!validate() || saving) return;
    setSaving(true);
    try {
      const data = {
        ipAddress: ip.trim(),
        port:      Number(port),
        name:      name.trim() || `Printer ${ip.trim()}`,
        active:    false,
        empId:     Number(operCode),
        ...(editingId ? { id: editingId } : {}),
      };
      if (editingId) {
        await printerService.updatePrinter(data);
        toast.show({ message: 'Printer updated', type: 'success' });
      } else {
        await printerService.createPrinter(data);
        toast.show({ message: 'Printer added', type: 'success' });
      }
      resetForm();
      await loadPrinters();
    } catch (e: any) {
      toast.show({ message: e?.message ?? 'Failed to save printer', type: 'error' });
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const handleSetActive = async (printer: Printer) => {
    try {
      // Deactivate all, then activate selected
      const updates = printers.map(p =>
        printerService.updatePrinter({
          id: p.id, ipAddress: p.ip_address, port: p.port,
          name: p.name, active: p.id === printer.id, empId: p.empId,
        })
      );
      await Promise.all(updates);
      toast.show({ message: `${printer.name} set as active`, type: 'success' });
      await loadPrinters();
    } catch (e: any) {
      toast.show({ message: e?.message ?? 'Failed to set active', type: 'error' });
    }
  };

  const handleDelete = (printer: Printer) => {
    Alert.alert('Delete Printer', `Delete "${printer.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await printerService.deletePrinter(printer.id);
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
    setTesting(printer.id);
    try {
      const result = await checkPrinterConnection(printer);
      if (result.connected) {
        Alert.alert('✅ Connected', `${printer.name} is online.`);
      } else {
        Alert.alert('❌ Offline', `${printer.name}\n${result.error ?? 'Cannot connect'}`);
      }
    } finally {
      if (isMounted.current) setTesting(null);
    }
  };

  const handleEdit = (printer: Printer) => {
    setEditingId(printer.id);
    setName(printer.name);
    setIp(printer.ip_address);
    setPort(String(printer.port));
  };

  // ── Render printer item ───────────────────────────────────────────
  const renderItem = ({ item }: { item: Printer }) => {
    const isActive = item.active === true || (item.active as any) === 'true' || (item.active as any) === 1;
    return (
      <View style={[styles.printerCard, isActive && styles.activeCard]}>
        <View style={styles.printerInfo}>
          <View style={styles.printerNameRow}>
            <Text style={styles.printerName}>{item.name}</Text>
            {isActive && (
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeBadgeText}>ACTIVE</Text>
              </View>
            )}
          </View>
          <Text style={styles.printerAddr}>{item.ip_address} : {item.port}</Text>
        </View>

        <View style={styles.printerActions}>
          {!isActive && (
            <TouchableOpacity style={[styles.actionBtn, styles.btnSet]} onPress={() => handleSetActive(item)}>
              <Text style={styles.actionBtnText}>✓</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, styles.btnTest]}
            onPress={() => handleTest(item)}
            disabled={testing === item.id}
          >
            {testing === item.id
              ? <ActivityIndicator size="small" color={Colors.white} />
              : <Text style={styles.actionBtnText}>📡</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.btnEdit]} onPress={() => handleEdit(item)}>
            <Text style={styles.actionBtnText}>✎</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.btnDelete]} onPress={() => handleDelete(item)}>
            <Text style={styles.actionBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Header title="Printer Settings" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPrinters(); }} colors={[Colors.primary]} />
        }
      >
        {/* ── Form ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{editingId ? 'EDIT PRINTER' : 'ADD PRINTER'}</Text>

          <Text style={styles.fieldLabel}>Printer Name (optional)</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Billing Counter" placeholderTextColor={Colors.textDisabled} />

          <Text style={styles.fieldLabel}>IP Address <Text style={styles.req}>*</Text></Text>
          <TextInput style={styles.input} value={ip} onChangeText={setIp} placeholder="192.168.1.100" placeholderTextColor={Colors.textDisabled} keyboardType="numeric" autoCapitalize="none" />

          <Text style={styles.fieldLabel}>Port <Text style={styles.req}>*</Text></Text>
          <TextInput style={styles.input} value={port} onChangeText={setPort} placeholder="9100" placeholderTextColor={Colors.textDisabled} keyboardType="numeric" />

          <View style={styles.formButtons}>
            {editingId && (
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled, editingId ? { flex: 1 } : { flex: 1 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.saveBtnText}>{editingId ? '💾 Update' : '+ Add Printer'}</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Printer list ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>YOUR PRINTERS ({printers.length})</Text>
          {printers.length === 0
            ? <Text style={styles.emptyText}>No printers yet. Add one above.</Text>
            : <FlatList
                data={printers}
                keyExtractor={item => String(item.id)}
                renderItem={renderItem}
                scrollEnabled={false}
              />}
        </View>
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  scroll:  { flex: 1 },
  scrollContent: { padding: Spacing.lg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

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
  req:   { color: Colors.error },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    fontSize: Typography.fontSizeMD, color: Colors.textPrimary,
    backgroundColor: Colors.white, minHeight: 44, marginBottom: Spacing.sm,
  },
  formButtons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  cancelBtn: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, alignItems: 'center',
  },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: Typography.fontWeightSemiBold },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: Spacing.md, alignItems: 'center', ...Shadow.sm,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: Colors.white, fontWeight: Typography.fontWeightBold, fontSize: Typography.fontSizeMD },
  emptyText: { textAlign: 'center', color: Colors.textSecondary, paddingVertical: Spacing.lg },

  // Printer card
  printerCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  activeCard: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  printerInfo:    { flex: 1 },
  printerNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  printerName:    { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold, color: Colors.textPrimary },
  printerAddr:    { fontSize: Typography.fontSizeSM, color: Colors.textSecondary, marginTop: 2 },

  activeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  activeDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.white },
  activeBadgeText: { color: Colors.white, fontSize: 10, fontWeight: Typography.fontWeightBold },

  printerActions: { flexDirection: 'row', gap: Spacing.xs },
  actionBtn: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnText: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  btnSet:    { backgroundColor: Colors.success },
  btnTest:   { backgroundColor: Colors.info },
  btnEdit:   { backgroundColor: Colors.warning },
  btnDelete: { backgroundColor: Colors.error },
});

export default PrinterSettingsScreen;
