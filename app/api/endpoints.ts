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

export const PRINTER = {
  BY_EMP:  '/printers/by-emp',   // GET ?empId=
  CREATE:  '/printers/create',   // POST
  UPDATE:  '/printers/update',   // PUT
  DELETE:  '/printers/delete',   // DELETE ?id=
};
