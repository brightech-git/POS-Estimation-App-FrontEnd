// ── Auth / Operator ───────────────────────────────────────────────
export const AUTH = {
  LOGIN: '/operator/login',
};

export const OPERATOR = {
  ALL: (page: number, size: number) => `/operator/all?page=${page}&size=${size}`,
};

export const SALES = {
  FILTER: '/sales/filter',          // GET ?identifier=tagNo
};

export const CONTROLS = {
  ALL: '/pos-control/controls',     // GET → TAXTYPE etc.
};

export const ESTIMATE = {
  BATCH: '/estimate/batch',         // POST → save estimate
};

export const CUSTOMER = {
  SEARCH: '/customer/search',                    // GET ?search=mobile
  CREATE: '/customer',                           // POST → new customer
  UPDATE: (sno: number) => `/customer/${sno}`,  // PUT → update customer
};

export const COST_CENTRE = {
  GET_ALL: '/costCentre/getAll',                 // GET → all cost centres
};

export const COMPANY = {
  GET_ALL: '/company/all',                       // GET → first item has COMPANYNAME
};

export const EMPLOYEE = {
  SEARCH: (search: string, page = 0, size = 10) =>
    `/employee/all?page=${page}&size=${size}&search=${encodeURIComponent(search)}`,
};

export const REMAINING_STOCK = {
  GET: '/remaining-stock',
};

export const PRINTER = {
  BY_OPER:    (operCode: string | number) => `/printer-setting/operator/${operCode}`,
  CREATE:     '/printer-setting',
  UPDATE:     (printCode: number) => `/printer-setting/${printCode}`,
  ACTIVATE:   (printCode: number) => `/printer-setting/${printCode}/activate`,
  DEACTIVATE: (printCode: number) => `/printer-setting/${printCode}/deactivate`,
  DELETE:     (printCode: number) => `/printer-setting/${printCode}`,
};
