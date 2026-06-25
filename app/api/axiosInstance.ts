import axios from 'axios';

const BASE_URL = 'https://rtmdepart.brightechsoftware.com/api/v1';

// ── In-memory auth cache ──────────────────────────────────────────
// AsyncStorage is async so we can't read it inside a synchronous
// interceptor. We keep a module-level cache that is written once
// after login (setAuthHeaders) and re-hydrated on app boot
// (restoreAuthHeaders called from AppNavigator).
let _operCode:    string = '';
let _costName:    string = '';
// Company name is fixed for this installation — fetched from /company/all
const COMPANY_NAME = 'RANGAS THANGA MALIGAI & PATHIRAKADAL';
const CASH_ID = 6;

/** Call this right after login and on app boot */
export const setAuthHeaders = (operCode: string, costName: string) => {
  _operCode = operCode;
  _costName = costName;
};

// Routes that don't need auth headers
const PUBLIC_URLS = [
  '/operator/login',
  '/operator/all',
  '/costCentre/getAll',
  // Note: /company/all is fetched AFTER setAuthHeaders, so it goes through with auth headers
];

const isPublic = (url?: string) =>
  PUBLIC_URLS.some(p => url?.includes(p));

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept:         'application/json',
  },
  timeout: 15000,
});

// ── Request interceptor — attach auth headers ─────────────────────
axiosInstance.interceptors.request.use((config) => {
  if (!isPublic(config.url)) {
    if (_operCode) config.headers['CREATEDBY']   = _operCode;
    config.headers['COMPANYNAME'] = COMPANY_NAME;
    config.headers['cashId'] = CASH_ID;
    if (_costName) config.headers['COSTNAME']    = _costName;
  }
  return config;
});

// ── Response interceptor ──────────────────────────────────────────
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error),
);
