export interface RemainingStockItem {
  productCode:    string;
  productName:    string;
  subProductCode: string | null;
  subProductName: string | null;
  tagNo:          string;
  sizeCode:       string | null;
  sizeName:       string | null;
  brandCode:      string | null;
  brandName:      string | null;
  tagedPCS:       number;
  salePCS:        number;
  balancePCS:     number;
  tagedWT:        number;
  saleWT:         number;
  balanceWT:      number;
}

export interface RemainingStockSummary {
  tagedPCS:   number;
  salePCS:    number;
  balancePCS: number;
  tagedWT:    number;
  saleWT:     number;
  balanceWT:  number;
}

export interface RemainingStockResponse {
  fromDate: string | null;
  toDate:   string | null;
  summary:  RemainingStockSummary;
  data:     RemainingStockItem[];
  count:    number;
  tagNo:    string | null;
  groupBy:  string;
  status:   string;
}

export interface RemainingStockParams {
  tagNo?:          string;
  fromDate?:       string;
  toDate?:         string;
  productName?:    string;
  subProductCode?: string;
  sizeCode?:       string;
  brandCode?:      string;
  groupBy?:        string;
}

export const GROUP_BY_OPTIONS = [
  { value: 'PRODUCTNAME',    label: 'Product Name' },
  { value: 'SUBPRODUCTNAME', label: 'Sub Product'  },
  { value: 'BRANDNAME',      label: 'Brand'        },
  { value: 'SIZENAME',       label: 'Size'         },
];
