import {
  fetchProducts,
  fetchSubProducts,
  fetchBrands,
  fetchSizes,
  fetchCascade,
} from '../services/stockLookupService';

export type {
  ProductOption,
  SubProductOption,
  BrandOption,
  SizeOption,
  CascadeItem,
} from '../services/stockLookupService';

export const useStockLookup = () => ({
  fetchProducts,
  fetchSubProducts,
  fetchBrands,
  fetchSizes,
  fetchCascade,
});
