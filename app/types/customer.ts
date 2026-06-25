// ─── CustomerInfo ─────────────────────────────────────────────────────────────
// Mirrors web PersonalInfo type – frontend field names (PNAME, MNAME …)
// API field names (CUSTOMERNAME, SURNAME …) carried as optional for mapping.

export interface CustomerInfo {
  SNO?:            number;
  UNIQUEKEY?:      string;
  // ── Name ─────────────────────────────────────────────────────────────────
  TYPE:            string;
  TITLE:           string;
  INITIAL:         string;
  PNAME:           string;   // frontend  ↔  CUSTOMERNAME (API)
  MNAME:           string;   // frontend  ↔  SURNAME      (API)
  SNAME:           string;   // frontend  ↔  LASTNAME     (API)
  // ── Contact ──────────────────────────────────────────────────────────────
  MOBILE:          string;   // frontend  ↔  MOBILENO     (API)
  PHONERES:        string;   // frontend  ↔  PHONENO      (API)
  EMAIL:           string;   // frontend  ↔  EMAILID      (API)
  // ── Address ──────────────────────────────────────────────────────────────
  DOORNO:          string;
  ADDRESS1:        string;
  ADDRESS2:        string;
  ADDRESS3:        string;
  AREA:            string;
  CITY:            string;
  STATE:           string;
  STATEID:         number;
  STATECODE:       number;
  COUNTRY:         string;
  PINCODE:         string;
  // ── Identity / Tax ────────────────────────────────────────────────────────
  PAN:             string;
  IDTYPE:          string;
  IDNO:            string;
  GSTNO:           string;   // frontend  ↔  GSTNUMBER    (API)
  // ── Dates ────────────────────────────────────────────────────────────────
  DOB:             string;   // YYYY-MM-DD
  ANNIVERSARY:     string;   // YYYY-MM-DD
  // ── Codes ────────────────────────────────────────────────────────────────
  ACCODE:          string;   // frontend  ↔  ACCTCODE     (API)
  PREVILEGEID:     string;   // frontend  ↔  PRIVILEGEID  (API)
  COMPANYID:       string;   // frontend  ↔  COMPANYCODE  (API)
  COSTID:          string;   // frontend  ↔  COSTCODE     (API)
  USERID:          number;
  // ── Misc ─────────────────────────────────────────────────────────────────
  TRANDATE:        string;
  FAX:             string;
  SYSTEMID:        string;
  CANCEL:          string;
  VATEXM:          string;
  APPVER:          string;
  RELIGION:        string;
  IDIMAGEFILE:     string;
  PIMAGEFILE:      string;
  LASTMAILDATE:    string;
  LASTSMSDATE:     string;
  BILLTYPE?:       string;
  BILLSTATUS?:     string;
  INVOICETYPE?:    string;
  DATATRANFLAG?:   string;
  ROWSIGN?:        string;
  ENTRYORDER?:     number;
  IPID?:           number;
  LOGID?:          number;
  BREFNO?:         string;
  COMPANYCODE?:    string;
  COSTCODE?:       string;
  CREATEDBY?:      number;
  CREATEDDATE?:    string;
  CREATEDTIME?:    string;
  CANCELOPER?:     number;
  CANCELIP?:       number;
}

// ─── State → GST code map ─────────────────────────────────────────────────────
export const STATE_GST_CODES: Record<string, { id: number; code: number }> = {
  'ANDHRA PRADESH': { id: 1, code: 37 }, 'ARUNACHAL PRADESH': { id: 2, code: 12 },
  'ASSAM':          { id: 3, code: 18 }, 'BIHAR':           { id: 4, code: 10 },
  'CHHATTISGARH':   { id: 5, code: 22 }, 'GOA':             { id: 6, code: 30 },
  'GUJARAT':        { id: 7, code: 24 }, 'HARYANA':         { id: 8, code: 6 },
  'HIMACHAL PRADESH': { id: 9, code: 2 }, 'JHARKHAND':      { id: 10, code: 20 },
  'KARNATAKA':      { id: 11, code: 29 }, 'KERALA':         { id: 12, code: 32 },
  'MADHYA PRADESH': { id: 13, code: 23 }, 'MAHARASHTRA':    { id: 14, code: 27 },
  'MANIPUR':        { id: 15, code: 14 }, 'MEGHALAYA':      { id: 16, code: 17 },
  'MIZORAM':        { id: 17, code: 15 }, 'NAGALAND':       { id: 18, code: 13 },
  'ODISHA':         { id: 19, code: 21 }, 'PUNJAB':         { id: 20, code: 3 },
  'RAJASTHAN':      { id: 21, code: 8 },  'SIKKIM':         { id: 22, code: 11 },
  'TAMIL NADU':     { id: 23, code: 33 }, 'TELANGANA':      { id: 24, code: 36 },
  'TRIPURA':        { id: 25, code: 16 }, 'UTTAR PRADESH':  { id: 26, code: 9 },
  'UTTARAKHAND':    { id: 27, code: 5 },  'WEST BENGAL':    { id: 28, code: 19 },
  'DELHI':          { id: 29, code: 7 },  'JAMMU AND KASHMIR': { id: 30, code: 1 },
  'LADAKH':         { id: 31, code: 38 }, 'CHANDIGARH':     { id: 32, code: 4 },
  'PUDUCHERRY':     { id: 33, code: 34 },
};

export const TODAY = new Date().toISOString().split('T')[0];

export const emptyCustomer = (mobile = ''): CustomerInfo => ({
  TYPE: 'C', ACCODE: '', STATECODE: 33, TRANDATE: TODAY,
  TITLE: '', INITIAL: '', PNAME: '', MNAME: '', SNAME: '',
  DOORNO: '', ADDRESS1: '', ADDRESS2: '', ADDRESS3: '', AREA: '',
  CITY: '', STATE: 'TAMIL NADU', STATEID: 23, COUNTRY: 'India', PINCODE: '',
  PHONERES: '', MOBILE: mobile, EMAIL: '', FAX: '',
  SYSTEMID: 'SYS', CANCEL: 'N', VATEXM: 'N', APPVER: '1.0',
  PREVILEGEID: 'P001', COMPANYID: '001', COSTID: '01',
  LASTMAILDATE: TODAY, LASTSMSDATE: TODAY,
  PAN: '', IDTYPE: '', IDNO: '', IDIMAGEFILE: '', PIMAGEFILE: '',
  RELIGION: '', GSTNO: '', DOB: '', ANNIVERSARY: '', USERID: 1,
});

/** Map raw API record → CustomerInfo */
export const mapApiToCustomer = (record: any, mobile: string): CustomerInfo => {
  const stateUpper = (record.STATE || '').toUpperCase();
  const stateMeta  = STATE_GST_CODES[stateUpper] ?? { id: 0, code: Number(record.STATECODE) || 0 };
  return {
    ...emptyCustomer(mobile),
    SNO:         record.SNO,
    ACCODE:      record.ACCTCODE   || '',
    PNAME:       record.CUSTOMERNAME || '',
    MNAME:       record.SURNAME    || '',
    SNAME:       record.LASTNAME   || '',
    MOBILE:      record.MOBILENO   || mobile,
    PHONERES:    record.PHONENO    || '',
    EMAIL:       record.EMAILID    || '',
    ADDRESS1:    record.ADDRESS1   || '',
    ADDRESS2:    record.ADDRESS2   || '',
    ADDRESS3:    record.ADDRESS3   || '',
    AREA:        record.AREA       || '',
    CITY:        record.CITY       || '',
    STATE:       stateUpper        || 'TAMIL NADU',
    STATEID:     stateMeta.id,
    STATECODE:   stateMeta.code,
    PINCODE:     record.PINCODE    || '',
    GSTNO:       record.GSTNUMBER  || '',
    DOB:         record.DTOFBIRTH  ? record.DTOFBIRTH.split('T')[0] : '',
    ANNIVERSARY: record.DTOFWEDDING ? record.DTOFWEDDING.split('T')[0] : '',
    PREVILEGEID: record.PRIVILEGEID || '',
    COMPANYID:   record.COMPANYCODE || '',
    COSTID:      record.COSTCODE   || '',
    UNIQUEKEY:   record.UNIQUEKEY  || '',
    // Preserve server-generated fields so updates don't send NULLs
    IPID:        record.IPID       ?? 8,
    LOGID:       record.LOGID      ?? 0,
    USERID:      record.CREATEDBY  || record.USERID || 1,
  };
};

/** Map CustomerInfo → API payload body */
export const mapCustomerToApi = (p: CustomerInfo, operCode: string) => ({
  CUSTOMERNAME: p.PNAME   || '',
  SURNAME:      p.MNAME   || '',
  LASTNAME:     p.SNAME   || '',
  ACCTCODE:     p.ACCODE  || '',
  MOBILENO:     p.MOBILE  || '',
  PHONENO:      p.PHONERES || '',
  EMAILID:      p.EMAIL   || '',
  ADDRESS1:     p.ADDRESS1 || '',
  ADDRESS2:     p.ADDRESS2 || '',
  ADDRESS3:     p.ADDRESS3 || '',
  AREA:         p.AREA    || '',
  CITY:         p.CITY    || '',
  STATE:        p.STATE   || '',
  PINCODE:      p.PINCODE || '',
  STATECODE:    String(p.STATECODE || ''),
  GSTNUMBER:    p.GSTNO   || '',
  DTOFBIRTH:    p.DOB     || null,
  DTOFWEDDING:  p.ANNIVERSARY || null,
  PRIVILEGEID:  p.PREVILEGEID || '',
  COMPANYCODE:  p.COMPANYID   || '',
  COSTCODE:     p.COSTID      || '',
  COSTID:       p.COSTID      || '',
  INVOICETYPE:  'ES',
  BILLTYPE:     'ES',
  BILLSTATUS:   '',
  BREFNO:       '',
  ROWSIGN:      '',
  ENTRYORDER:   1,
  DATATRANFLAG: 'N',
  CREATEDBY:    parseInt(operCode, 10) || 0,
  CREATEDDATE:  new Date().toISOString().split('T')[0],
  CREATEDTIME:  new Date().toISOString(),
  CASHID:       0,
  IPID:         8,   // always 8 — the stored IPID (1) is an invalid FK in the target DB
  LOGID:        p.LOGID ?? 0,
  CANCELOPER:   p.CANCELOPER ?? 0,
  CANCELIP:     p.CANCELIP ?? 0,
  CANCELDATE:   null,
  CANCELTIME:   null,
  UNIQUEKEY:    p.UNIQUEKEY   || '',
});
