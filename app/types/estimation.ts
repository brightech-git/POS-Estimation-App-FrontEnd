// ─── Estimation Types ─────────────────────────────────────────────────────────

export type TaxType = 'INCLUSIVE' | 'EXCLUSIVE';

export interface ProductDetail {
  tagNo?:              string;
  orionBarcode?:       string;
  productCode?:        number;
  subProductCode?:     number;
  productName?:        string;
  subProductName?:     string;
  sellingRate?:        number;
  mrp?:                number;
  weight?:             number;
  pieces?:             number;
  stockPieces?:        number;
  availablePieces?:    number;
  unitName?:           string;
  hsnCode?:            string;
  hsnTaxCode?:         number;
  sourceTable?:        string;
  aboveCgstTaxPer?:    number;
  aboveSgstTaxPer?:    number;
  aboveIgstTaxPer?:    number;
  belowCgstTaxPer?:    number;
  belowSgstTaxPer?:    number;
  belowIgstTaxPer?:    number;
  belowSalesAmount?:   number;
  cgstTaxCode?:        number;
  sgstTaxCode?:        number;
  igstTaxCode?:        number;
  brandCode?:          number;
  sizeCode?:           number;
  purRate?:            number;
}

export interface EstimationItem {
  sno:           number;
  tagNo:         string;
  productName:   string;
  subProductName: string;
  qty:           number;
  uom:           string;
  rate:          number;
  weight:        number;
  discPer:       number;
  discount:      number;   // disc amount
  amount:        number;   // taxable
  gst:           number;   // tax amount
  total:         number;
  // tax breakdown
  TAXPER:        number;
  CGSTPER:       number;
  CGSTAMOUNT:    number;
  SGSTPER:       number;
  SGSTAMOUNT:    number;
  IGSTPER:       number;
  IGSTAMOUNT:    number;
  // codes
  PRODUCTCODE:   number;
  SUBPRODUCTCODE: number;
  ORIONBARCODE:  string;
  MRP:           number;
  HSNCODE:       string;
  HSNTAXCODE:    number;
  SALEMANCODE:   string;
  UNIQUEKEY:     string;
  CGSTTAXCODE:   number;
  SGSTTAXCODE:   number;
  IGSTTAXCODE:   number;
  BRANDCODE:     number;
  SIZECODE:      number;
}

export interface ControlsResponse {
  data?: {
    TAXTYPE?: { controlText: string };
  };
}

export interface SaveEstimatePayload {
  ipid: number;
  customerInfo: {
    CUSTOMERNAME:  string;
    MOBILENO:      string;
    INVOICETYPE:   string;
    BILLTYPE:      string;
    IPID:          number;
    ENTRYORDER:    number;
    [key: string]: any;
  };
  estimates: any[];
}
