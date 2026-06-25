import { callApi }           from '../apiClient';
import { AUTH }              from '../endpoints';
import { LoginPayload, LoginResponse } from '../../types/auth';

export type { LoginPayload, LoginResponse };

// ── Login ─────────────────────────────────────────────────────────
export const loginOperator = (payload: LoginPayload) =>
  callApi<LoginPayload, LoginResponse>({
    method: 'post',
    url:    AUTH.LOGIN,
    data:   payload,
  });
