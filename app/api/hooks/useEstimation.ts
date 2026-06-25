import { useState, useCallback, useRef } from 'react';
import { callApi }           from '../apiClient';
import { axiosInstance }     from '../axiosInstance';
import { SALES, CONTROLS, ESTIMATE } from '../endpoints';
import { ProductDetail, TaxType, EstimationItem, SaveEstimatePayload } from '../../types/estimation';
import { GstCalculator }     from '../../utils/GstCalculator';
import { AsyncStorageHelper } from '../../utils/AsyncStorageHelper';
import type { CustomerInfo }  from '../../types/customer';

// ─── Controls (tax type) ──────────────────────────────────────────────────────
export const useFetchControls = () => {
  const [taxType, setTaxType] = useState<TaxType>('EXCLUSIVE');
  const [loaded,  setLoaded]  = useState(false);

  const fetchControls = useCallback(async () => {
    if (loaded) return;
    try {
      const res: any = await callApi({ method: 'get', url: CONTROLS.ALL });
      const type = res?.data?.TAXTYPE?.controlText === 'I' ? 'INCLUSIVE' : 'EXCLUSIVE';
      setTaxType(type);
    } catch (_) {}
    finally { setLoaded(true); }
  }, [loaded]);

  return { taxType, fetchControls };
};

// ─── Tag / Barcode lookup ─────────────────────────────────────────────────────
export const useTagLookup = (taxType: TaxType) => {
  const [product,   setProduct]   = useState<ProductDetail | null>(null);
  const [searching, setSearching] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const lookup = useCallback(async (identifier: string) => {
    if (!identifier.trim()) return;
    setSearching(true);
    setError(null);
    setProduct(null);
    try {
      const res: any = await callApi({
        method: 'get',
        url:    SALES.FILTER,
        params: { identifier: identifier.trim() },
      });
      const d = res?.data || res;
      if (!d || !d.sellingRate) {
        setError('No product found for this tag / barcode');
        return;
      }
      setProduct(d);
    } catch (e: any) {
      setError(e.message ?? 'Lookup failed');
    } finally {
      setSearching(false);
    }
  }, [taxType]);

  const clearProduct = () => { setProduct(null); setError(null); };

  return { product, searching, error, lookup, clearProduct };
};

// ─── Save estimate batch ──────────────────────────────────────────────────────
export const useSaveEstimate = () => {
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState<string | null>(null);
  const [savedEstNo,  setSavedEstNo]  = useState<string | null>(null);

  const save = useCallback(async (
    items:        EstimationItem[],
    taxType:      TaxType,
    operCode:     string,
    customerInfo?: CustomerInfo | null,
  ) => {
    if (!items.length) return null;
    setSaving(true);
    setSaveError(null);
    setSavedEstNo(null);

    const now      = new Date();
    const estDate  = now.toISOString().split('T')[0];
    const taxCalc  = taxType === 'INCLUSIVE' ? 'I' : 'E';
    const userId   = parseInt(operCode, 10) || 0;   // server expects integer

    const payload: SaveEstimatePayload = {
      ipid: 8,
      customerInfo: {
        SNO:           customerInfo?.SNO,
        CUSTOMERNAME:  customerInfo?.PNAME       || '',
        SURNAME:       customerInfo?.MNAME       || '',
        LASTNAME:      customerInfo?.SNAME       || '',
        MOBILENO:      customerInfo?.MOBILE      || '',
        EMAILID:       customerInfo?.EMAIL       || '',
        ADDRESS1:      customerInfo?.DOORNO && customerInfo?.ADDRESS3
                         ? `${customerInfo.DOORNO} ${customerInfo.ADDRESS3}`.trim()
                         : (customerInfo?.ADDRESS1 || ''),
        ADDRESS2:      customerInfo?.ADDRESS2    || '',
        AREA:          customerInfo?.AREA        || '',
        CITY:          customerInfo?.CITY        || '',
        STATE:         customerInfo?.STATE       || '',
        PINCODE:       customerInfo?.PINCODE     || '',
        DTOFBIRTH:     customerInfo?.DOB         || null,
        DTOFWEDDING:   customerInfo?.ANNIVERSARY || null,
        STATECODE:     String(customerInfo?.STATECODE || ''),
        GSTNUMBER:     customerInfo?.GSTNO       || '',
        INVOICETYPE:   'ES',
        BREFNO:        '',
        ACCTCODE:      customerInfo?.ACCODE      || '',
        PRIVILEGEID:   customerInfo?.PREVILEGEID || '',
        PHONENO:       customerInfo?.PHONERES    || '',
        COMPANYCODE:   customerInfo?.COMPANYID   || '',
        COSTCODE:      customerInfo?.COSTID      || '',
        DATATRANFLAG:  'N',
        ROWSIGN:       '',
        ENTRYORDER:    1,
        BILLSTATUS:    '',
        BILLTYPE:      'ES',
        IPID:          8,
        UNIQUEKEY:     customerInfo?.UNIQUEKEY   || '',
      },
      estimates: items.map((item, idx) => ({
        ESTTYPE:        'ES',
        PRODUCTCODE:    item.PRODUCTCODE || 0,
        SUBPRODUCTCODE: item.SUBPRODUCTCODE || 0,
        UNITCODE:       1,
        TAGORION:       item.tagNo || item.ORIONBARCODE || '',
        PIECES:         item.qty || 1,
        WEIGHT:         item.weight || 0,
        NETWEIGHT:      item.weight || 0,
        LESSWEIGHT:     0,
        WASTAGEPER:     0,
        RATE:           item.rate || 0,
        SALERATEBASEDON:'P',
        MRPRATE:        item.MRP || item.rate || 0,
        PURRATE:        0,
        TOTALAMOUNT:    item.total || 0,
        AMOUNT:         item.amount || 0,
        TAXCALC:        taxCalc,
        TAXCODE:        item.HSNTAXCODE || 0,
        TAXPER:         item.TAXPER || (item.CGSTPER + item.SGSTPER + item.IGSTPER) || 0,
        TAXAMOUNT:      item.gst || 0,
        SALEMAN_CODE:   item.SALEMANCODE || '',
        DISCCALCTYPE:   'B',
        DISCTYPE:       '',
        DISCCODE:       0,
        DISCPER:        item.discPer || 0,
        DISCOUNT:       item.discount || 0,
        PRIVILEGEID:    customerInfo?.PREVILEGEID || '',
        ACCTCODE:       customerInfo?.ACCODE || 'CASH',
        HSNCODE:        item.HSNCODE || '',
        HSNTAXCODE:     item.HSNTAXCODE || 0,
        SGSTTAXCODE:    item.SGSTTAXCODE || 0,
        SGSTPER:        item.SGSTPER || 0,
        SGSTAMOUNT:     item.SGSTAMOUNT || 0,
        CGSTTAXCODE:    item.CGSTTAXCODE || 0,
        CGSTPER:        item.CGSTPER || 0,
        CGSTAMOUNT:     item.CGSTAMOUNT || 0,
        IGSTTAXCODE:    item.IGSTTAXCODE || 0,
        IGSTPER:        item.IGSTPER || 0,
        IGSTAMOUNT:     item.IGSTAMOUNT || 0,
        SRVTAXCODE:     0,
        SRVPER:         0,
        SRVAMOUNT:      0,
        SALESGSTBILLNO: '',
        HSNCALC:        'I',
        SGSTACCTCODE:   '',
        CGSTACCTCODE:   '',
        IGSTACCTCODE:   '',
        SRVACCTCODE:    '',
        CREATEDBY:      userId,
        CREATEDDATE:    estDate,
        CREATEDTIME:    now.toISOString(),
        IPID:           8,
        COMPANYCODE:    customerInfo?.COMPANYID || '',
        ENTRYORDER:     idx + 1,
        BILLSTATUS:     '',
        BRANDCODE:      item.BRANDCODE ?? 0,
        SIZECODE:       item.SIZECODE ?? 0,
      })),
    };

    try {
      console.log('[Estimate Save] Payload →', JSON.stringify(payload, null, 2));
      const { data: res } = await axiosInstance.post(ESTIMATE.BATCH, payload);
      console.log('[Estimate Save] Response →', JSON.stringify(res, null, 2));
      const arr   = Array.isArray(res) ? res : res?.data ?? [];
      const estNo = arr[0]?.ESTNO ?? res?.estNo ?? res?.ESTNO ?? String(Date.now()).slice(-6);
      setSavedEstNo(String(estNo));
      return String(estNo);
    } catch (e: any) {
      // Log full raw error so we can see exactly what the server rejected
      console.log('[Estimate Save] HTTP status:', e?.response?.status);
      console.log('[Estimate Save] Error body:', JSON.stringify(e?.response?.data, null, 2));
      console.log('[Estimate Save] Headers sent:', JSON.stringify(e?.config?.headers, null, 2));
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Failed to save estimate';
      setSaveError(msg);
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  return { saving, saveError, savedEstNo, save, clearSaveError: () => setSaveError(null) };
};
