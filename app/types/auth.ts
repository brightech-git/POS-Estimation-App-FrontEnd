// ─── POS Estimation — Auth Types ─────────────────────────────────────────────

// ── Operator data (matches API response) ─────────────────────────
export interface OperatorData {
  OPER_CODE?:       number | string;
  OPER_NAME?:       string;
  EMP_CODE?:        string;
  ACTIVE?:          string;
  AUTHPWD?:         string | null;
  AUTH_PWD_EXISTS?: boolean;
  COST_ID?:         string;
  CREATED_BY?:      number;
  CREATED_DATE?:    string | null;
  CREATED_TIME?:    string | null;
  HOMESALES?:       string | null;
}

// ── Module structure from login response ─────────────────────────
export interface SubModule {
  subModuleName: string;
  contents:      string[];
}

export interface AppModule {
  moduleName: string;
  subModules: SubModule[];
}

// ── Login ─────────────────────────────────────────────────────────
export interface LoginPayload {
  OPER_NAME: string;
  PASSWORD:  string;
}

export interface LoginResponse {
  message?: string;
  data?: {
    operator: OperatorData;
    modules:  AppModule[];
  };
}
