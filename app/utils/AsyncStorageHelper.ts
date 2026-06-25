import AsyncStorage from '@react-native-async-storage/async-storage';
import { OperatorData, AppModule } from '../types/auth';

// ── Storage Keys ──────────────────────────────────────────────────
const KEYS = {
  OPERATOR:     '@pos_operator',
  MODULES:      '@pos_modules',
  OPER_CODE:    '@pos_oper_code',
  OPER_NAME:    '@pos_oper_name',
  COST_ID:      '@pos_cost_id',
  COST_NAME:    '@pos_cost_name',
  COMPANY_NAME: '@pos_company_name',
  COMPANY_CODE: '@pos_company_code',
} as const;

// ── Save after login ──────────────────────────────────────────────
const saveSession = async (operator: OperatorData, modules: AppModule[]): Promise<void> => {
  const pairs: [string, string][] = [
    [KEYS.OPERATOR,  JSON.stringify(operator)],
    [KEYS.MODULES,   JSON.stringify(modules)],
  ];
  if (operator.OPER_CODE) pairs.push([KEYS.OPER_CODE, String(operator.OPER_CODE)]);
  if (operator.OPER_NAME) pairs.push([KEYS.OPER_NAME, operator.OPER_NAME]);
  await AsyncStorage.multiSet(pairs);
};

// ── Getters ───────────────────────────────────────────────────────
const getOperator = async (): Promise<OperatorData | null> => {
  const raw = await AsyncStorage.getItem(KEYS.OPERATOR);
  return raw ? JSON.parse(raw) : null;
};

const getModules = async (): Promise<AppModule[] | null> => {
  const raw = await AsyncStorage.getItem(KEYS.MODULES);
  return raw ? JSON.parse(raw) : null;
};

const getOperCode = () => AsyncStorage.getItem(KEYS.OPER_CODE);
const getOperName = () => AsyncStorage.getItem(KEYS.OPER_NAME);

// ── Cost Centre ───────────────────────────────────────────────────
const saveCostCentre = async (costId: string, costName: string): Promise<void> => {
  await AsyncStorage.multiSet([
    [KEYS.COST_ID,   costId],
    [KEYS.COST_NAME, costName],
  ]);
};

const getCostId   = () => AsyncStorage.getItem(KEYS.COST_ID);
const getCostName = () => AsyncStorage.getItem(KEYS.COST_NAME);

// ── Company ───────────────────────────────────────────────────────
const saveCompany = async (code: string, name: string): Promise<void> => {
  await AsyncStorage.multiSet([
    [KEYS.COMPANY_CODE, code],
    [KEYS.COMPANY_NAME, name],
  ]);
};

/** @deprecated use saveCompany */
const saveCompanyName = (name: string) =>
  AsyncStorage.setItem(KEYS.COMPANY_NAME, name);

const getCompanyName = () => AsyncStorage.getItem(KEYS.COMPANY_NAME);
const getCompanyCode = () => AsyncStorage.getItem(KEYS.COMPANY_CODE);

// ── Clear on logout ───────────────────────────────────────────────
const clearSession = () =>
  AsyncStorage.multiRemove(Object.values(KEYS));

export const AsyncStorageHelper = {
  KEYS,
  saveSession,
  getOperator,
  getModules,
  getOperCode,
  getOperName,
  saveCostCentre,
  getCostId,
  getCostName,
  saveCompany,
  saveCompanyName,
  getCompanyName,
  getCompanyCode,
  clearSession,
};
