import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { AsyncStorageHelper } from '../../utils/AsyncStorageHelper';
import type { Printer } from './usePrinter';
import { usePrinterService } from './usePrinter';
import {
  checkPrinterConnection,
  buildReceiptContent,
  printEstimation,
} from '../../utils/EstimationPrinterService';
import type { EstimationItem } from '../../types/estimation';
import type { CustomerInfo } from '../../types/customer';



export const useEstimationPrint = () => {
  const [activePrinter, setActivePrinter]   = useState<Printer | null>(null);
  const [printing,      setPrinting]        = useState(false);
  const [loadingPrinter,setLoadingPrinter]  = useState(true);
  const isMounted = useRef(true);
  const printerService = usePrinterService();

  // ── Load active printer on mount ────────────────────────────────
  const loadActivePrinter = useCallback(async () => {
    try {
      setLoadingPrinter(true);
      const operCode = await AsyncStorageHelper.getOperCode();
      if (!operCode) { setLoadingPrinter(false); return; }

      const printers = await printerService.getPrintersByEmployee(operCode);
      if (!isMounted.current) return;

      const active = printers.find(p =>
        p.active === true || (p.active as any) === 'true' || (p.active as any) === 1,
      ) ?? null;
      setActivePrinter(active);
    } catch (e) {
      console.warn('[useEstimationPrint] loadActivePrinter error:', e);
    } finally {
      if (isMounted.current) setLoadingPrinter(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    loadActivePrinter();
    return () => { isMounted.current = false; };
  }, []);

  // ── Execute print ────────────────────────────────────────────────
  const executePrint = useCallback(async (params: {
    estNo: string;
    billDate: string;
    billTime: string;
    items: EstimationItem[];
    customerInfo?: CustomerInfo | null;
    salesman?: string;
  }) => {
    if (printing) return;

    if (!activePrinter) {
      Alert.alert(
        'No Printer',
        'No active printer configured. Please add a printer in Printer Settings.',
      );
      return;
    }

    setPrinting(true);
    try {
      // Connectivity check
      const status = await checkPrinterConnection(activePrinter);
      if (!status.connected) {
        Alert.alert(
          'Printer Offline',
          `Cannot reach printer "${activePrinter.name}" at ${activePrinter.ip_address}.\n\n${status.error ?? ''}`,
          [{ text: 'OK' }],
        );
        return;
      }

      const content = buildReceiptContent(params);
      await printEstimation(activePrinter, content);
    } catch (e: any) {
      Alert.alert('Print Error', e?.message ?? 'Failed to print');
    } finally {
      if (isMounted.current) setPrinting(false);
    }
  }, [activePrinter, printing]);

  return {
    activePrinter,
    printing,
    loadingPrinter,
    executePrint,
    refreshPrinter: loadActivePrinter,
  };
};
