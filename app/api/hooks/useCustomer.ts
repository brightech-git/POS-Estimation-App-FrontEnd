import { useCallback, useState } from 'react';
import { axiosInstance } from '../axiosInstance';
import { CUSTOMER }  from '../endpoints';
import {
  CustomerInfo,
  mapApiToCustomer,
  mapCustomerToApi,
} from '../../types/customer';

// ─── Search by mobile ─────────────────────────────────────────────────────────
export const useCustomerSearch = () => {
  const [loading,  setLoading]  = useState(false);
  const [results,  setResults]  = useState<CustomerInfo[]>([]);
  const [error,    setError]    = useState<string | null>(null);

  const searchByMobile = useCallback(async (mobile: string): Promise<CustomerInfo[]> => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axiosInstance.get(CUSTOMER.SEARCH, {
        params: { search: mobile },
      });
      // API may return { data: [...] } or [...]
      const raw: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.data) ? data.data
        : data ? [data] : [];

      const mapped = raw.map(r => mapApiToCustomer(r, mobile));
      setResults(mapped);
      return mapped;
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Search failed';
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, results, error, searchByMobile };
};

// ─── Create customer ──────────────────────────────────────────────────────────
export const useCreateCustomer = () => {
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const create = useCallback(async (
    customer: CustomerInfo,
    operCode: string,
  ): Promise<CustomerInfo | null> => {
    setSaving(true);
    setError(null);
    try {
      const { data } = await axiosInstance.post(
        CUSTOMER.CREATE,
        mapCustomerToApi(customer, operCode),
      );
      console.log('[Customer Create] Response →', JSON.stringify(data, null, 2));
      // Return the saved record (API usually returns it or an id)
      const saved = data?.data ?? data;
      return saved?.SNO
        ? mapApiToCustomer(saved, customer.MOBILE)
        : { ...customer, SNO: saved?.SNO ?? undefined };
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Could not save customer';
      console.log('[Customer Create] Error →', msg, e?.response?.data);
      setError(msg);
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  return { saving, error, create };
};

// ─── Update customer ──────────────────────────────────────────────────────────
export const useUpdateCustomer = () => {
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const update = useCallback(async (
    sno: number,
    customer: CustomerInfo,
    operCode: string,
  ): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const payload = mapCustomerToApi(customer, operCode);
      console.log('[Customer Update] Payload →', JSON.stringify(payload, null, 2));
      const { data } = await axiosInstance.put(
        CUSTOMER.UPDATE(sno),
        payload,
      );
      console.log('[Customer Update] Response →', JSON.stringify(data, null, 2));
      return true;
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Could not update customer';
      console.log('[Customer Update] Error →', msg, e?.response?.data);
      setError(msg);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { saving, error, update };
};
