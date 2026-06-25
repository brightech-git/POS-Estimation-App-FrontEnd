import { useCallback, useRef, useState } from 'react';
import { axiosInstance } from '../axiosInstance';
import { COST_CENTRE }   from '../endpoints';
import type { CostCentre } from '../../types/costCentre';

export const useCostCentre = () => {
  const [costCentres, setCostCentres] = useState<CostCentre[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const loadingRef = useRef(false);

  const loadCostCentres = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const { data } = await axiosInstance.get<CostCentre[]>(COST_CENTRE.GET_ALL);
      const list = Array.isArray(data) ? data : [];
      setCostCentres(list.filter(cc => cc.ACTIVE === 'Y'));
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load cost centres');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  return { costCentres, loading, error, loadCostCentres };
};
