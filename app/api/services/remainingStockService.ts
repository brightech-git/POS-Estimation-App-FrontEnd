import { axiosInstance } from '../axiosInstance';
import { REMAINING_STOCK } from '../endpoints';
import type { RemainingStockParams, RemainingStockResponse } from '../../types/RemainingStock';

export const fetchRemainingStock = async (
  params: RemainingStockParams,
): Promise<RemainingStockResponse> => {
  const qp: Record<string, string> = {};
  if (params.tagNo?.trim())          qp.tagNo          = params.tagNo.trim();
  if (params.fromDate?.trim())       qp.fromDate       = params.fromDate.trim();
  if (params.toDate?.trim())         qp.toDate         = params.toDate.trim();
  if (params.productName?.trim())    qp.productName    = params.productName.trim();
  if (params.subProductCode?.trim()) qp.subProductCode = params.subProductCode.trim();
  if (params.sizeCode?.trim())       qp.sizeCode       = params.sizeCode.trim();
  if (params.brandCode?.trim())      qp.brandCode      = params.brandCode.trim();
  if (params.groupBy?.trim())        qp.groupBy        = params.groupBy.trim();

  const { data } = await axiosInstance.get<RemainingStockResponse>(
    REMAINING_STOCK.GET,
    { params: qp },
  );
  return data;
};
