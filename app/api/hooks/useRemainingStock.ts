import { useState, useCallback } from 'react';
import { fetchRemainingStock } from '../services/remainingStockService';
import type { RemainingStockParams, RemainingStockResponse } from '../../types/RemainingStock';

export const useRemainingStock = () => {
  const [data,    setData]    = useState<RemainingStockResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetch = useCallback(async (params: RemainingStockParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchRemainingStock(params);
      setData(res);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to fetch remaining stock');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => { setData(null); setError(null); }, []);

  return { data, loading, error, fetch, reset };
};
