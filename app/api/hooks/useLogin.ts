import { useState } from 'react';
import { loginOperator, LoginPayload } from '../services/authService';
import { AsyncStorageHelper }          from '../../utils/AsyncStorageHelper';
import { setAuthHeaders } from '../axiosInstance';
import { OperatorData, AppModule }     from '../../types/auth';

interface LoginState {
  loginLoading: boolean;
  loginError:   string | null;
  operator:     OperatorData | null;
  modules:      AppModule[];
  isLoggedIn:   boolean;
}

const initial: LoginState = {
  loginLoading: false,
  loginError:   null,
  operator:     null,
  modules:      [],
  isLoggedIn:   false,
};

export const useLogin = () => {
  const [state, setState] = useState<LoginState>(initial);

  const login = async (payload: LoginPayload, costId = '', costName = '') => {
    setState(s => ({ ...s, loginLoading: true, loginError: null }));
    try {
      const res = await loginOperator(payload);

      // API returns { message: "LOGIN SUCCESSFUL", data: { operator, modules } }
      const success = res.message?.toUpperCase().includes('SUCCESS') && res.data?.operator;
      if (!success) {
        setState(s => ({
          ...s,
          loginLoading: false,
          loginError: res.message ?? 'Login failed. Please check your credentials.',
        }));
        return;
      }

      const operator: OperatorData = res.data!.operator;
      const modules:  AppModule[]  = res.data!.modules ?? [];

      await AsyncStorageHelper.saveSession(operator, modules);

      // Save cost centre and populate in-memory auth headers
      if (costId || costName) {
        await AsyncStorageHelper.saveCostCentre(costId, costName);
      }
      setAuthHeaders(String(operator.OPER_CODE ?? ''), costName);

      setState({ loginLoading: false, loginError: null, operator, modules, isLoggedIn: true });
    } catch (err: any) {
      setState(s => ({ ...s, loginLoading: false, loginError: err.message ?? 'Login failed.' }));
    }
  };

  const clearError = () => setState(s => ({ ...s, loginError: null }));

  const logout = async () => {
    await AsyncStorageHelper.clearSession();
    setState(initial);
  };

  return { ...state, login, clearError, logout };
};
