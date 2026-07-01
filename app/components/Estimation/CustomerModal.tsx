import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow } from '../common/theme';
import { useToast }          from '../common/Toast';
import { useCustomerSearch, useCreateCustomer, useUpdateCustomer } from '../../api/hooks/useCustomer';
import { AsyncStorageHelper } from '../../utils/AsyncStorageHelper';
import {
  CustomerInfo,
  STATE_GST_CODES,
  emptyCustomer,
} from '../../types/customer';

const { height: SCREEN_H } = Dimensions.get('window');
const MODAL_MAX_H    = SCREEN_H * 0.92;
const MODAL_MOBILE_H = SCREEN_H * 0.42;
const MODAL_SELECT_H = SCREEN_H * 0.60;

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  visible:    boolean;
  operCode:   string;
  onConfirm:  (customer: CustomerInfo) => void;
  onSkip:     () => void;
  onClose:    () => void;
}

// ─── Step type ────────────────────────────────────────────────────────────────
type Step = 'mobile' | 'select' | 'info';

const STATE_LIST = Object.keys(STATE_GST_CODES).sort();
const TITLE_OPTIONS  = ['Mr', 'Ms', 'Mrs', 'Dr', 'Prof'];
const IDTYPE_OPTIONS = ['Aadhar', 'PAN', 'Passport', 'Voter ID', 'Driving License'];

// ─── Small labeled input ──────────────────────────────────────────────────────
interface FieldProps {
  label:       string;
  value:       string;
  onChangeText:(v: string) => void;
  placeholder?: string;
  required?:   boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  maxLength?:  number;
  inputRef?:   React.RefObject<TextInput | null>;
  onSubmitEditing?: () => void;
  readOnly?:   boolean;
}

const Field: React.FC<FieldProps> = ({
  label, value, onChangeText, placeholder, required,
  keyboardType = 'default', maxLength, inputRef, onSubmitEditing, readOnly,
}) => (
  <View style={fi.wrap}>
    <Text style={fi.label}>
      {label}{required ? <Text style={fi.req}> *</Text> : null}
    </Text>
    <TextInput
      ref={inputRef}
      style={[fi.input, readOnly && fi.readOnly]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder ?? label}
      placeholderTextColor={Colors.textDisabled}
      keyboardType={keyboardType}
      maxLength={maxLength}
      returnKeyType="next"
      onSubmitEditing={onSubmitEditing}
      editable={!readOnly}
      autoCapitalize="words"
      autoCorrect={false}
    />
  </View>
);

const fi = StyleSheet.create({
  wrap:    { marginBottom: Spacing.sm },
  label:   { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.6 },
  req:     { color: Colors.error },
  input:   { height: 44, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, fontSize: 15, color: Colors.textPrimary, backgroundColor: Colors.surface },
  readOnly:{ backgroundColor: Colors.background, color: Colors.textSecondary },
});

// ─── Inline picker (for State / Title / ID Type) ──────────────────────────────
interface PickerFieldProps {
  label:    string;
  value:    string;
  options:  string[];
  onSelect: (v: string) => void;
}

const PickerField: React.FC<PickerFieldProps> = ({ label, value, options, onSelect }) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={pk.wrap}>
      <Text style={fi.label}>{label}</Text>
      <TouchableOpacity style={pk.btn} onPress={() => setOpen(o => !o)}>
        <Text style={[pk.text, !value && { color: Colors.textDisabled }]}>
          {value || `Select ${label}`}
        </Text>
        <Text style={pk.arrow}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={pk.dropdown}>
          <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
            {options.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[pk.option, opt === value && pk.optionActive]}
                onPress={() => { onSelect(opt); setOpen(false); }}
              >
                <Text style={[pk.optionText, opt === value && pk.optionTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const pk = StyleSheet.create({
  wrap:           { marginBottom: Spacing.sm, zIndex: 10 },
  btn:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, backgroundColor: Colors.surface },
  text:           { fontSize: 15, color: Colors.textPrimary, flex: 1 },
  arrow:          { fontSize: 12, color: Colors.textSecondary },
  dropdown:       { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, marginTop: 2, ...Shadow.md },
  option:         { paddingVertical: 10, paddingHorizontal: Spacing.sm },
  optionActive:   { backgroundColor: Colors.primary },
  optionText:     { fontSize: 15, color: Colors.textPrimary },
  optionTextActive:{ color: Colors.white, fontWeight: '600' },
});

// ─── Custom Date Picker ───────────────────────────────────────────────────────
const MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const ITEM_H   = 44;

const toYMD = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d + 1).padStart(2, '0')}`;

const daysInMonth = (month: number, year: number) =>
  new Date(year, month + 1, 0).getDate();

// Single scrollable column
interface ColProps {
  items:    (string | number)[];
  selected: number;
  onSelect: (idx: number) => void;
}
const PickerColumn: React.FC<ColProps> = ({ items, selected, onSelect }) => {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => {
      ref.current?.scrollTo({ y: selected * ITEM_H, animated: false });
    }, 60);
  }, [selected]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    if (idx >= 0 && idx < items.length && idx !== selected) onSelect(idx);
  };

  return (
    <View style={dpc.colWrap}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScroll}
        onScrollEndDrag={handleScroll}
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
        style={dpc.col}
      >
        {items.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[dpc.item, i === selected && dpc.itemSel]}
            onPress={() => {
              onSelect(i);
              ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
            }}
          >
            <Text style={[dpc.itemText, i === selected && dpc.itemTextSel]}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View pointerEvents="none" style={dpc.lineTop} />
      <View pointerEvents="none" style={dpc.lineBot} />
    </View>
  );
};

interface DatePickerModalProps {
  visible:  boolean;
  label:    string;
  value:    string;
  maxDate?: Date;
  onDone:   (ymd: string) => void;
  onCancel: () => void;
}
const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible, label, value, maxDate, onDone, onCancel,
}) => {
  const now    = new Date();
  const maxY   = maxDate ? maxDate.getFullYear() : now.getFullYear();
  const years  = Array.from({ length: 101 }, (_, i) => maxY - 100 + i);

  const parseValue = () => {
    const d = value ? new Date(value + 'T12:00:00') : now;
    return isNaN(d.getTime()) ? now : d;
  };

  const [dayIdx,  setDayIdx]  = useState(() => parseValue().getDate() - 1);
  const [monIdx,  setMonIdx]  = useState(() => parseValue().getMonth());
  const [yearIdx, setYearIdx] = useState(() => {
    const idx = years.indexOf(parseValue().getFullYear());
    return idx === -1 ? years.length - 1 : idx;
  });

  // Re-sync when modal opens
  useEffect(() => {
    if (visible) {
      const d = parseValue();
      setMonIdx(d.getMonth());
      const yi = years.indexOf(d.getFullYear());
      setYearIdx(yi === -1 ? years.length - 1 : yi);
      setDayIdx(d.getDate() - 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const numDays   = daysInMonth(monIdx, years[yearIdx] ?? maxY);
  const days      = Array.from({ length: numDays }, (_, i) => String(i + 1).padStart(2, '0'));
  const safeDayIdx = Math.min(dayIdx, numDays - 1);

  const handleDone = () => onDone(toYMD(years[yearIdx] ?? maxY, monIdx, safeDayIdx));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={dpc.backdrop} activeOpacity={1} onPress={onCancel} />
      <View style={dpc.sheet}>
        {/* Header */}
        <View style={dpc.header}>
          <TouchableOpacity onPress={onCancel} style={dpc.headerBtn}>
            <Text style={dpc.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={dpc.headerTitle}>{label}</Text>
          <TouchableOpacity onPress={handleDone} style={dpc.headerBtn}>
            <Text style={dpc.doneText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Column labels */}
        <View style={dpc.colLabels}>
          <Text style={[dpc.colLabel, { flex: 1 }]}>Day</Text>
          <Text style={[dpc.colLabel, { flex: 1.4 }]}>Month</Text>
          <Text style={[dpc.colLabel, { flex: 1.6 }]}>Year</Text>
        </View>

        {/* Columns */}
        <View style={dpc.cols}>
          <View style={{ flex: 1 }}>
            <PickerColumn items={days}   selected={safeDayIdx} onSelect={setDayIdx}  />
          </View>
          <View style={dpc.sep} />
          <View style={{ flex: 1.4 }}>
            <PickerColumn items={MONTHS} selected={monIdx}     onSelect={setMonIdx}  />
          </View>
          <View style={dpc.sep} />
          <View style={{ flex: 1.6 }}>
            <PickerColumn items={years}  selected={yearIdx}    onSelect={setYearIdx} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const dpc = StyleSheet.create({
  backdrop:    { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  sheet:       { width: '88%', maxWidth: 420, backgroundColor: Colors.surface, borderRadius: 16, paddingBottom: 24, ...Shadow.lg },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  headerBtn:   { minWidth: 64, alignItems: 'center' },
  cancelText:  { fontSize: 16, color: Colors.textSecondary },
  doneText:    { fontSize: 16, fontWeight: '700', color: Colors.primary },
  colLabels:   { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 2 },
  colLabel:    { textAlign: 'center', fontSize: 11, color: Colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  cols:        { flexDirection: 'row', height: ITEM_H * 5, paddingHorizontal: Spacing.sm },
  sep:         { width: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  colWrap:     { flex: 1, position: 'relative' },
  col:         { flex: 1 },
  item:        { height: ITEM_H, justifyContent: 'center', alignItems: 'center' },
  itemSel:     { backgroundColor: Colors.primaryBg, borderRadius: Radius.sm },
  itemText:    { fontSize: 16, color: Colors.textSecondary },
  itemTextSel: { color: Colors.primary, fontWeight: '700', fontSize: 17 },
  lineTop:     { position: 'absolute', top: ITEM_H * 2,       left: 4, right: 4, height: 1, backgroundColor: Colors.border },
  lineBot:     { position: 'absolute', top: ITEM_H * 2 + ITEM_H, left: 4, right: 4, height: 1, backgroundColor: Colors.border },
});

// ─── DateField (trigger button) ───────────────────────────────────────────────
interface DateFieldProps {
  label:    string;
  value:    string;
  onChange: (v: string) => void;
  required?: boolean;
  maxDate?: Date;
}

const DateField: React.FC<DateFieldProps> = ({ label, value, onChange, required, maxDate }) => {
  const [show, setShow] = useState(false);

  const safeDate = value ? new Date(value + 'T12:00:00') : null;
  const isValid  = safeDate ? !isNaN(safeDate.getTime()) : false;
  const displayText = isValid
    ? safeDate!.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Select date';

  return (
    <View style={fi.wrap}>
      <Text style={fi.label}>{label}{required && <Text style={fi.req}> *</Text>}</Text>
      <TouchableOpacity style={df.btn} onPress={() => setShow(true)}>
        <Text style={[df.btnText, !isValid && df.placeholder]}>📅  {displayText}</Text>
      </TouchableOpacity>
      <DatePickerModal
        visible={show}
        label={label}
        value={value}
        maxDate={maxDate}
        onDone={(ymd) => { onChange(ymd); setShow(false); }}
        onCancel={() => setShow(false)}
      />
    </View>
  );
};

const df = StyleSheet.create({
  btn:        { height: 44, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, backgroundColor: Colors.surface, justifyContent: 'center' },
  btnText:    { fontSize: 15, color: Colors.textPrimary },
  placeholder:{ color: Colors.textDisabled },
});

// ─── Customer Selection List ───────────────────────────────────────────────────
interface SelectListProps {
  customers:    CustomerInfo[];
  onSelect:     (c: CustomerInfo) => void;
  onNewCustomer:() => void;
  onBack:       () => void;
  mobile:       string;
}

const CustomerSelectList: React.FC<SelectListProps> = ({
  customers, onSelect, onNewCustomer, onBack, mobile,
}) => {
  const [q, setQ] = useState('');
  const filtered = customers.filter(c => {
    const query = q.toLowerCase();
    return (
      (c.PNAME || '').toLowerCase().includes(query) ||
      (c.MOBILE || '').includes(query) ||
      (c.ACCODE || '').toLowerCase().includes(query)
    );
  });

  return (
    <View>
      {/* Search */}
      <Text style={sl.sectionLabel}>SELECT CUSTOMER</Text>
      <TextInput
        style={sl.search}
        placeholder="Search by name or mobile…"
        placeholderTextColor={Colors.textDisabled}
        value={q}
        onChangeText={setQ}
        autoCorrect={false}
      />

      {/* List */}
      <View style={sl.table}>
        {/* Header */}
        <View style={[sl.row, sl.header]}>
          <Text style={[sl.cell, sl.cellName, sl.hText]}>Name</Text>
          <Text style={[sl.cell, sl.cellMobile, sl.hText]}>Mobile</Text>
          <Text style={[sl.cell, sl.cellCity, sl.hText]}>City</Text>
        </View>
        {/* Rows */}
        <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
          {filtered.length === 0 ? (
            <Text style={sl.empty}>No customers found</Text>
          ) : filtered.map((c, idx) => (
            <TouchableOpacity
              key={c.SNO ?? idx}
              style={[sl.row, idx % 2 === 0 ? sl.rowEven : sl.rowOdd]}
              onPress={() => onSelect(c)}
            >
              <Text style={[sl.cell, sl.cellName]} numberOfLines={1}>{c.PNAME || '—'}</Text>
              <Text style={[sl.cell, sl.cellMobile]} numberOfLines={1}>{c.MOBILE || ''}</Text>
              <Text style={[sl.cell, sl.cellCity]} numberOfLines={1}>{c.CITY || ''}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={sl.hint}>{filtered.length} record(s) for +91 {mobile}</Text>

      {/* Buttons */}
      <View style={sl.btnRow}>
        <TouchableOpacity style={[sl.btn, sl.btnGray]} onPress={onBack}>
          <Text style={sl.btnGrayText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[sl.btn, sl.btnOrange]} onPress={onNewCustomer}>
          <Text style={sl.btnText}>+ Register New</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const sl = StyleSheet.create({
  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: Spacing.sm, letterSpacing: 0.5 },
  search:       { height: 42, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, fontSize: 15, color: Colors.textPrimary, marginBottom: Spacing.sm, backgroundColor: Colors.surface },
  table:        { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, overflow: 'hidden', marginBottom: Spacing.sm },
  header:       { backgroundColor: '#f0f4f8' },
  row:          { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: Spacing.sm },
  rowEven:      { backgroundColor: Colors.surface },
  rowOdd:       { backgroundColor: Colors.background },
  hText:        { fontWeight: '700', color: Colors.textSecondary, fontSize: 13, textTransform: 'uppercase' },
  cell:         { fontSize: 14, color: Colors.textPrimary },
  cellName:     { flex: 2 },
  cellMobile:   { flex: 1.5 },
  cellCity:     { flex: 1 },
  empty:        { textAlign: 'center', color: Colors.textSecondary, padding: Spacing.md, fontSize: 14 },
  hint:         { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.sm },
  btnRow:       { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  btn:          { flex: 1, height: 44, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  btnGray:      { borderWidth: 1, borderColor: Colors.border },
  btnOrange:    { backgroundColor: '#e67e22' },
  btnGrayText:  { fontSize: 15, color: Colors.textPrimary },
  btnText:      { fontSize: 15, color: Colors.white, fontWeight: '600' },
});

// ─── Main Component ───────────────────────────────────────────────────────────
const CustomerModal: React.FC<Props> = ({
  visible, operCode, onConfirm, onSkip, onClose,
}) => {
  const toast = useToast();

  const [step,         setStep]         = useState<Step>('mobile');
  const [mobileInput,  setMobileInput]  = useState('');
  const [mobileError,  setMobileError]  = useState('');
  const [customer,     setCustomer]     = useState<CustomerInfo>(emptyCustomer());
  const [customerList, setCustomerList] = useState<CustomerInfo[]>([]);
  const [isNew,        setIsNew]        = useState(false);

  // Real company code + cost ID loaded from AsyncStorage (set at login)
  const [companyCode, setCompanyCode] = useState('');
  const [costId,      setCostId]      = useState('');

  const { loading: searching, searchByMobile } = useCustomerSearch();
  const { saving: creating,   create }          = useCreateCustomer();
  const { saving: updating,   update }          = useUpdateCustomer();

  const mobileRef = useRef<TextInput>(null);
  const nameRef   = useRef<TextInput>(null);

  // Load company/cost defaults once on mount
  useEffect(() => {
    (async () => {
      const [cc, ci] = await Promise.all([
        AsyncStorageHelper.getCompanyCode(),
        AsyncStorageHelper.getCostId(),
      ]);
      if (cc) setCompanyCode(cc);
      if (ci) setCostId(ci);
    })();
  }, []);

  /** Create a blank customer with real company/cost defaults */
  const newBlankCustomer = useCallback((mobile = '') =>
    ({ ...emptyCustomer(mobile), COMPANYID: companyCode || 'RTM', COSTID: costId || 'CO' }),
  [companyCode, costId]);

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setStep('mobile');
      setMobileInput('');
      setMobileError('');
      setCustomer(newBlankCustomer());
      setCustomerList([]);
      setIsNew(false);
      setTimeout(() => mobileRef.current?.focus(), 300);
    }
  }, [visible, newBlankCustomer]);

  // ── Mobile submit ─────────────────────────────────────────────────
  const handleMobileSubmit = useCallback(async () => {
    const cleaned = mobileInput.trim();
    if (!/^\d{10}$/.test(cleaned)) {
      setMobileError('Enter a valid 10-digit mobile number');
      return;
    }
    setMobileError('');
    const list = await searchByMobile(cleaned);

    if (list.length === 0) {
      setCustomer(newBlankCustomer(cleaned));
      setIsNew(true);
      setStep('info');
      toast.show({ message: 'No records found. Fill in details for new customer.', type: 'info' });
      setTimeout(() => nameRef.current?.focus(), 300);
    } else if (list.length === 1) {
      setCustomer(list[0]);
      setIsNew(false);
      setStep('info');
      toast.show({ message: `Welcome back, ${list[0].PNAME || 'Customer'}!`, type: 'success' });
      setTimeout(() => nameRef.current?.focus(), 300);
    } else {
      setCustomerList(list);
      setStep('select');
      toast.show({ message: `${list.length} customers found. Select one.`, type: 'info' });
    }
  }, [mobileInput, searchByMobile]);

  // ── Grid select ───────────────────────────────────────────────────
  const handleGridSelect = useCallback((selected: CustomerInfo) => {
    setCustomer(selected);
    setIsNew(false);
    setStep('info');
    toast.show({ message: `${selected.PNAME || 'Customer'} loaded.`, type: 'success' });
    setTimeout(() => nameRef.current?.focus(), 300);
  }, []);

  // ── New from grid ─────────────────────────────────────────────────
  const handleNewFromGrid = useCallback(() => {
    setCustomer(newBlankCustomer(mobileInput));
    setIsNew(true);
    setStep('info');
    setTimeout(() => nameRef.current?.focus(), 300);
  }, [mobileInput]);

  // ── Field helpers ─────────────────────────────────────────────────
  const set = useCallback((key: keyof CustomerInfo, val: string) => {
    setCustomer(p => ({ ...p, [key]: val }));
  }, []);

  const handleStateChange = useCallback((stateName: string) => {
    const meta = STATE_GST_CODES[stateName] ?? { id: 0, code: 0 };
    setCustomer(p => ({ ...p, STATE: stateName, STATEID: meta.id, STATECODE: meta.code }));
  }, []);

  // ── Confirm ───────────────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    if (!customer.PNAME.trim()) {
      toast.show({ message: 'Customer name is required', type: 'warning' });
      nameRef.current?.focus();
      return;
    }
    if (!/^\d{10}$/.test(customer.MOBILE)) {
      toast.show({ message: 'Enter a valid 10-digit mobile number', type: 'warning' });
      return;
    }

    if (isNew) {
      // Create new customer then confirm
      const saved = await create(customer, operCode);
      if (saved) {
        onConfirm({ ...customer, SNO: saved.SNO });
      } else {
        // Still let them proceed even if save fails (non-blocking)
        toast.show({ message: 'Customer save failed, proceeding anyway', type: 'warning' });
        onConfirm(customer);
      }
    } else {
      // Update existing — fire-and-forget (server has known IPID constraint issue on depttest)
      if (customer.SNO) {
        update(customer.SNO, customer, operCode).catch(() => {/* silent */});
      }
      onConfirm(customer);
    }
  }, [customer, isNew, create, update, operCode, onConfirm]);

  // ─────────────────────────────────────────────────────────────────
  const headerTitle = step === 'mobile' ? 'Customer Identification'
    : step === 'select' ? 'Select Customer'
    : isNew ? 'New Customer' : 'Customer Details';

  const headerSub = step === 'mobile' ? 'Enter mobile to look up or register'
    : step === 'select' ? `${customerList.length} records for +91 ${mobileInput}`
    : `+91 ${customer.MOBILE}${isNew ? ' (New)' : ''}`;

  const isBusy = searching || creating || updating;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={[s.kavWrapper, step === 'mobile' && { height: MODAL_MOBILE_H }, step === 'select' && { height: MODAL_SELECT_H }]}>
          <View style={s.sheet}>

            {/* ── Header ── */}
            <View style={s.header}>
              <View style={s.headerLeft}>
                <Text style={s.headerTitle}>{headerTitle}</Text>
                <Text style={s.headerSub}>{headerSub}</Text>
              </View>
              {step === 'info' && (
                <View style={[s.badge, isNew ? s.badgeNew : s.badgeExist]}>
                  <Text style={s.badgeText}>{isNew ? 'NEW' : 'EXISTING'}</Text>
                </View>
              )}
              <TouchableOpacity style={s.closeBtn} onPress={onClose}>
                <Text style={s.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* ── Body ── */}
            <ScrollView
              style={s.body}
              contentContainerStyle={s.bodyContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              nestedScrollEnabled
              bounces={false}
            >

              {/* ══ MOBILE STEP ════════════════════════════════════ */}
              {step === 'mobile' && (
                <View>
                  <View style={s.mobileHint}>
                    <Text style={s.mobileHintText}>
                      📱 Enter 10-digit mobile to look up an existing customer or register a new one.
                    </Text>
                  </View>

                  <Text style={fi.label}>Mobile Number <Text style={fi.req}>*</Text></Text>
                  <View style={s.mobileRow}>
                    <View style={s.mobilePrefix}>
                      <Text style={s.mobilePrefixText}>+91</Text>
                    </View>
                    <TextInput
                      ref={mobileRef}
                      style={[s.mobileInput, mobileError ? s.inputError : null]}
                      value={mobileInput}
                      onChangeText={v => { setMobileInput(v.replace(/\D/g, '').slice(0, 10)); setMobileError(''); }}
                      placeholder="10-digit mobile"
                      placeholderTextColor={Colors.textDisabled}
                      keyboardType="phone-pad"
                      maxLength={10}
                      returnKeyType="go"
                      onSubmitEditing={handleMobileSubmit}
                    />
                  </View>
                  {!!mobileError && <Text style={s.errorText}>{mobileError}</Text>}

                  <View style={s.btnRow}>
                    <TouchableOpacity
                      style={[s.btn, s.btnPrimary, (mobileInput.length !== 10 || isBusy) && s.btnDisabled]}
                      onPress={handleMobileSubmit}
                      disabled={mobileInput.length !== 10 || isBusy}
                    >
                      {isBusy
                        ? <ActivityIndicator color={Colors.white} size="small" />
                        : <Text style={s.btnPrimaryText}>Continue →</Text>
                      }
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.btn, s.btnOutline]} onPress={onSkip}>
                      <Text style={s.btnOutlineText}>Walk-in (Skip)</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ══ SELECT STEP ════════════════════════════════════ */}
              {step === 'select' && (
                <CustomerSelectList
                  customers={customerList}
                  onSelect={handleGridSelect}
                  onNewCustomer={handleNewFromGrid}
                  onBack={() => setStep('mobile')}
                  mobile={mobileInput}
                />
              )}

              {/* ══ INFO STEP ══════════════════════════════════════ */}
              {step === 'info' && (
                <View>
                  {/* ── Section: Personal Info ── */}
                  <View style={s.sectionHeader}>
                    <Text style={s.sectionIcon}>👤</Text>
                    <Text style={s.sectionTitle}>Personal Info</Text>
                  </View>

                  {/* Name — full width */}
                  <Field
                    label="Customer Name" required
                    value={customer.PNAME}
                    onChangeText={v => set('PNAME', v)}
                    placeholder="Full Name"
                    inputRef={nameRef}
                  />

                  {/* Mobile + Email */}
                  <View style={s.row2}>
                    <View style={{ flex: 1 }}>
                      <Field
                        label="Mobile" value={customer.MOBILE}
                        onChangeText={v => set('MOBILE', v.replace(/\D/g, '').slice(0, 10))}
                        keyboardType="phone-pad" maxLength={10}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field
                        label="Email" value={customer.EMAIL}
                        onChangeText={v => set('EMAIL', v)}
                        keyboardType="email-address"
                      />
                    </View>
                  </View>

                  {/* ── Section: Address ── */}
                  <View style={[s.sectionHeader, { marginTop: Spacing.sm }]}>
                    <Text style={s.sectionIcon}>📍</Text>
                    <Text style={s.sectionTitle}>Address</Text>
                  </View>

                  {/* Door + Street */}
                  <View style={s.row2}>
                    <View style={{ width: 90 }}>
                      <Field label="Door No" value={customer.DOORNO} onChangeText={v => set('DOORNO', v)} placeholder="12A" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field label="Street" value={customer.ADDRESS3} onChangeText={v => set('ADDRESS3', v)} />
                    </View>
                  </View>

                  {/* Area + City */}
                  <View style={s.row2}>
                    <View style={{ flex: 1 }}>
                      <Field label="Area" value={customer.AREA} onChangeText={v => set('AREA', v)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field label="City" value={customer.CITY} onChangeText={v => set('CITY', v)} />
                    </View>
                  </View>

                  {/* State + Pincode */}
                  <View style={s.row2}>
                    <View style={{ flex: 2 }}>
                      <PickerField
                        label="State"
                        value={customer.STATE}
                        options={STATE_LIST}
                        onSelect={handleStateChange}
                      />
                    </View>
                    <View style={{ width: 110 }}>
                      <Field label="Pincode" value={customer.PINCODE}
                        onChangeText={v => set('PINCODE', v.replace(/\D/g, '').slice(0, 6))}
                        keyboardType="numeric" maxLength={6} placeholder="600001"
                      />
                    </View>
                  </View>

                  {/* Buttons */}
                  <View style={[s.btnRow, { marginTop: Spacing.md }]}>
                    <TouchableOpacity
                      style={[s.btn, s.btnOutline, { flex: 0, minWidth: 80 }]}
                      onPress={() => setStep(!isNew && customerList.length > 1 ? 'select' : 'mobile')}
                    >
                      <Text style={s.btnOutlineText}>← Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.btn, s.btnGreen, isBusy && s.btnDisabled]}
                      onPress={handleConfirm}
                      disabled={isBusy}
                    >
                      {isBusy
                        ? <ActivityIndicator color={Colors.white} size="small" />
                        : <Text style={s.btnPrimaryText}>{isNew ? '✓  Proceed' : '✓  Update & Proceed'}</Text>
                      }
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.btn, s.btnOutline, { flex: 0, minWidth: 80 }]} onPress={onSkip}>
                      <Text style={s.btnOutlineText}>Skip</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: {
    flex:              1,
    backgroundColor:   'rgba(0,0,0,0.6)',
    justifyContent:    'center',
    alignItems:        'center',
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.lg,
  },
  kavWrapper: {
    width:    '100%',
    maxWidth: 520,
    height:   MODAL_MAX_H,
  },
  sheet: {
    flex:             1,
    backgroundColor:  Colors.surface,
    borderRadius:     20,
    overflow:         'hidden',
    ...Shadow.lg,
  },

  /* ── Header ── */
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   '#1a56db',
    paddingHorizontal: Spacing.md,
    paddingTop:        16,
    paddingBottom:     14,
  },
  headerLeft:  { flex: 1 },
  headerTitle: { color: Colors.white, fontWeight: '800', fontSize: 19, letterSpacing: 0.3 },
  headerSub:   { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 3 },

  badge:      { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginRight: Spacing.sm },
  badgeNew:   { backgroundColor: '#e67e22' },
  badgeExist: { backgroundColor: '#27ae60' },
  badgeText:  { color: Colors.white, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  closeBtn:     { marginLeft: Spacing.sm, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: Colors.white, fontSize: 18, lineHeight: 22, fontWeight: '600' },

  body:        { flex: 1 },
  bodyContent: { padding: Spacing.md, paddingBottom: 24 },

  row2: { flexDirection: 'row', gap: Spacing.sm },

  /* ── Section header inside info step ── */
  sectionHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            6,
    marginBottom:   Spacing.sm,
    paddingBottom:  6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionIcon:  { fontSize: 15 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },

  /* ── Buttons ── */
  btnRow:        { flexDirection: 'row', gap: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  btn:           { flex: 1, height: 46, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.sm },
  btnOutline:    { borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  btnGreen:      { backgroundColor: Colors.primary },
  btnDisabled:   { opacity: 0.55 },
  btnOutlineText:{ fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },
  btnPrimaryText:{ fontSize: 14, color: Colors.white, fontWeight: '800', letterSpacing: 0.3 },

  /* ── Mobile step ── */
  mobileHint:      { backgroundColor: Colors.primaryBg, borderRadius: Radius.sm, padding: Spacing.sm, marginBottom: Spacing.sm },
  mobileHintText:  { fontSize: 14, color: Colors.textSecondary },
  mobileRow:       { flexDirection: 'row', marginBottom: Spacing.sm },
  mobilePrefix:    { height: 48, paddingHorizontal: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderTopLeftRadius: Radius.sm, borderBottomLeftRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  mobilePrefixText:{ fontSize: 15, color: Colors.textSecondary, fontWeight: '700' },
  mobileInput:     { flex: 1, height: 48, borderWidth: 1, borderLeftWidth: 0, borderColor: Colors.border, borderTopRightRadius: Radius.sm, borderBottomRightRadius: Radius.sm, paddingHorizontal: Spacing.sm, fontSize: 20, color: Colors.textPrimary, backgroundColor: Colors.surface, letterSpacing: 3, fontWeight: '700' },
  inputError:      { borderColor: Colors.error },
  errorText:       { color: Colors.error, fontSize: 13, marginBottom: Spacing.sm },
  btnPrimary:      { backgroundColor: Colors.primary },
});

export default CustomerModal;
