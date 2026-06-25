import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useLogin }           from '../../api/hooks/useLogin';
import { useOperators }       from '../../api/hooks/useOperators';
import { useCostCentre }      from '../../api/hooks/useCostCentre';
import { useToast }           from '../../components/common/Toast';
import InputBox               from '../../components/common/InputBox';
import SearchableDropdown, { DropdownOption } from '../../components/common/SearchableDropdown';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../components/common/theme';
import { OperatorData }       from '../../types/auth';
import type { CostCentre }    from '../../types/costCentre';
import type { RootStackParamList } from '../../Navigations/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

// ─── Component ────────────────────────────────────────────────────────────────
const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login, loginLoading, loginError, isLoggedIn, clearError } = useLogin();
  const { operators, loading, loadingMore, hasMore, loadOperators, loadMore, search } = useOperators();
  const { costCentres, loading: ccLoading, loadCostCentres } = useCostCentre();
  const toast = useToast();

  const [selectedOp, setSelectedOp]   = useState<OperatorData | null>(null);
  const [selectedCC, setSelectedCC]   = useState<CostCentre | null>(null);
  const [password,   setPassword]     = useState('');
  const [showPass,   setShowPass]     = useState(false);
  const [errors,     setErrors]       = useState<{ operator?: string; costCentre?: string; password?: string }>({});

  // Load operator list + cost centres on mount
  useEffect(() => {
    loadOperators();
    loadCostCentres();
  }, []);

  // Navigate after successful login
  useEffect(() => {
    if (isLoggedIn) {
      toast.show({ message: `Welcome, ${selectedOp?.OPER_NAME ?? 'Operator'}!`, type: 'success' });
      navigation.replace('Home');
    }
  }, [isLoggedIn]);

  // Show API error
  useEffect(() => {
    if (loginError) {
      toast.show({ message: loginError, type: 'error', duration: 4000 });
    }
  }, [loginError]);

  // Map operators → dropdown options
  const operatorOptions: DropdownOption[] = operators.map(op => ({
    label:    op.OPER_NAME ?? '',
    subLabel: op.EMP_CODE ? `Emp: ${op.EMP_CODE}` : undefined,
    value:    op,
  }));

  // Map cost centres → dropdown options
  const ccOptions: DropdownOption[] = costCentres.map(cc => ({
    label:    cc.COSTNAME,
    subLabel: cc.COSTID ? `ID: ${cc.COSTID}` : undefined,
    value:    cc,
  }));

  // Validation
  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!selectedOp)              errs.operator   = 'Please select an operator';
    if (!selectedCC)              errs.costCentre = 'Please select a cost centre';
    if (!password.trim())         errs.password   = 'Password is required';
    else if (password.length < 4) errs.password   = 'Minimum 4 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = () => {
    if (!validate()) return;
    login(
      { OPER_NAME: selectedOp!.OPER_NAME!, PASSWORD: password },
      selectedCC!.COSTID,
      selectedCC!.COSTNAME,
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        bounces={false}
      >
        {/* Brand */}
        <View style={styles.brandWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>POS</Text>
          </View>
          <Text style={styles.appName}>POS Estimation</Text>
          <Text style={styles.appTagline}>Operator Portal</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>
          <Text style={styles.cardSub}>Select operator, cost centre and enter your password</Text>

          {/* Operator searchable dropdown */}
          <SearchableDropdown
            label="Operator Name"
            required
            placeholder="Search operator…"
            options={operatorOptions}
            selectedValue={selectedOp}
            onSelect={(opt) => {
              setSelectedOp(opt.value as OperatorData);
              setErrors(e => ({ ...e, operator: undefined }));
            }}
            onSearch={search}
            loading={loading}
            loadingMore={loadingMore}
            onLoadMore={hasMore ? loadMore : undefined}
            error={errors.operator}
            leftIcon={<Text style={styles.icon}>👤</Text>}
          />

          {/* Cost Centre dropdown */}
          <SearchableDropdown
            label="Cost Centre (Store)"
            required
            placeholder={ccLoading ? 'Loading cost centres…' : 'Select cost centre…'}
            options={ccOptions}
            selectedValue={selectedCC}
            onSelect={(opt) => {
              setSelectedCC(opt.value as CostCentre);
              setErrors(e => ({ ...e, costCentre: undefined }));
            }}
            loading={ccLoading}
            error={errors.costCentre}
            leftIcon={<Text style={styles.icon}>🏪</Text>}
          />

          {/* Password */}
          <InputBox
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={(v: string) => {
              setPassword(v);
              setErrors(e => ({ ...e, password: undefined }));
            }}
            error={errors.password}
            required
            secureTextEntry={!showPass}
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            leftIcon={<Text style={styles.icon}>🔒</Text>}
            rightIcon={
              <TouchableOpacity
                onPress={() => setShowPass(s => !s)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.icon}>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            }
          />

          {/* Submit */}
          <TouchableOpacity
            style={[styles.loginBtn, loginLoading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loginLoading}
            activeOpacity={0.85}
          >
            <Text style={styles.loginBtnText}>
              {loginLoading ? 'Signing in…' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          © {new Date().getFullYear()} Brightech Softwares. All rights reserved.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    flexGrow:      1,
    padding:       Spacing.xl,
    paddingBottom: Spacing.xl * 4,
  },

  brandWrap: { alignItems: 'center', marginBottom: Spacing.xxxl },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  logoText: {
    color: Colors.white, fontSize: Typography.fontSizeXXL,
    fontWeight: Typography.fontWeightBold, letterSpacing: 2,
  },
  appName: {
    fontSize: Typography.fontSizeXXL, fontWeight: Typography.fontWeightBold,
    color: Colors.textPrimary, letterSpacing: 0.5,
  },
  appTagline: { fontSize: Typography.fontSizeMD, color: Colors.textSecondary, marginTop: 4 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    ...Shadow.md,
    marginBottom: Spacing.xl,
  },
  cardTitle: {
    fontSize: Typography.fontSizeXXL, fontWeight: Typography.fontWeightBold,
    color: Colors.textPrimary, marginBottom: Spacing.xs,
  },
  cardSub: {
    fontSize: Typography.fontSizeMD, color: Colors.textSecondary,
    marginBottom: Spacing.xl, lineHeight: 20,
  },

  icon: { fontSize: 16 },

  loginBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: Spacing.lg, alignItems: 'center',
    marginTop: Spacing.sm, ...Shadow.sm,
  },
  loginBtnDisabled: { opacity: 0.65 },
  loginBtnText: {
    color: Colors.white, fontSize: Typography.fontSizeLG,
    fontWeight: Typography.fontWeightBold, letterSpacing: 0.5,
  },

  footer: {
    textAlign: 'center', fontSize: Typography.fontSizeXS,
    color: Colors.textDisabled, marginTop: Spacing.lg,
  },
});

export default LoginScreen;
