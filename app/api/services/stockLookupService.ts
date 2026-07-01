import { callApi } from '../apiClient';
import { PRODUCT, SUB_PRODUCT, CASCADE } from '../endpoints';

// ─── Types — field names match actual API JSON ─────────────────────────────────

// /product/all → UPPERCASE fields
export interface ProductOption {
  PRODUCTCODE: number;
  PRODUCTNAME: string;
}

// /subproduct/all → UPPERCASE fields
export interface SubProductOption {
  SUBPRODUCTCODE: number;
  SUBPRODUCTNAME: string;
  PRODUCTCODE:    number;
}

// /brand → UPPERCASE fields
export interface BrandOption {
  BRANDCODE: number;
  BRANDNAME: string;
}

// /size → UPPERCASE fields
export interface SizeOption {
  SIZECODE: number;
  SIZENAME: string;
}

// /filter/cascade → camelCase fields
export interface CascadeItem {
  productCode:    number;
  productName:    string;
  subProductCode: number;
  subProductName: string;
}

interface Paged<T> {
  content:       T[];
  totalElements: number;
  totalPages:    number;
}

interface BrandApiResponse { data: BrandOption[] }
interface SizeApiResponse  { data: { data: SizeOption[] } }

interface CascadeResponse {
  data:          CascadeItem[];
  size:          number;
  totalPages:    number;
  page:          number;
  totalElements: number;
}

// ─── Service functions ────────────────────────────────────────────────────────

export const fetchProducts = (search?: string, page = 0, size = 200) =>
  callApi<never, Paged<ProductOption>>({
    method: 'get',
    url:    PRODUCT.ALL(page, size, search),
  });

export const fetchSubProducts = (productCode: number, search?: string, page = 0, size = 200) =>
  callApi<never, Paged<SubProductOption>>({
    method: 'get',
    url:    SUB_PRODUCT.ALL(page, size, search, productCode),
  });

// Brand — uses params object (matches reference getAllBrand exactly)
export const fetchBrands = async (
  search?: string,
  productCode?: number,
  subProductCode?: number,
  page = 0,
  size = 200,
) => {
  const params: Record<string, any> = { PAGE: page, SIZE: size };
  if (search?.trim())  params.SEARCH         = search.trim();
  if (productCode)     params.PRODUCTCODE     = productCode;
  if (subProductCode)  params.SUBPRODUCTCODES = String(subProductCode);

  console.log('[fetchBrands] params →', JSON.stringify(params));

  const res = await callApi<never, BrandApiResponse>({ method: 'get', url: '/brand', params });

  console.log('[fetchBrands] response →', JSON.stringify({
    count:    res?.data?.length,
    firstFew: res?.data?.slice(0, 3),
  }));

  return res;
};

// Size — uses params object (matches reference getAllSize exactly)
export const fetchSizes = async (
  search?: string,
  productCode?: number,
  subProductCode?: number,
  page = 0,
  size = 200,
) => {
  const params: Record<string, any> = { page, size };
  if (search?.trim())  params.search          = search.trim();
  if (productCode)     params.productCode      = productCode;
  if (subProductCode)  params.subProductCodes  = String(subProductCode);

  console.log('[fetchSizes] params →', JSON.stringify(params));

  const res = await callApi<never, SizeApiResponse>({ method: 'get', url: '/size', params });

  console.log('[fetchSizes] response →', JSON.stringify({
    count:    res?.data?.data?.length,
    firstFew: res?.data?.data?.slice(0, 3),
  }));

  return res;
};

/** Search across ALL product+subProduct records */
export const fetchCascade = (search: string, page = 0, size = 500) =>
  callApi<never, CascadeResponse>({
    method: 'get',
    url:    CASCADE.FILTER(search, page, size),
  });
