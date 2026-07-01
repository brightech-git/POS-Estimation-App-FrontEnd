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
  const [activePrinter,  setActivePrinter]  = useState<Printer | null>(null);
  const [printing,       setPrinting]       = useState(false);
  const [loadingPrinter, setLoadingPrinter] = useState(true);
  const isMounted      = useRef(true);
  const printerService = usePrinterService();

  // ── Load active printer for logged-in operator ────────────────────
  const loadActivePrinter = useCallback(async () => {
    try {
      setLoadingPrinter(true);
      const operCode = await AsyncStorageHelper.getOperCode();
      if (!operCode) { setLoadingPrinter(false); return; }

      const printers = await printerService.getPrintersByOperCode(operCode);
      if (!isMounted.current) return;

      // active is "Y" | "N" from backend
      const active = printers.find(p => p.active === 'Y') ?? null;
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

  // ── Execute print ─────────────────────────────────────────────────
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
        'No active printer configured. Go to Printer Settings to add one.',
      );
      return;
    }

    setPrinting(true);
    try {
      const status = await checkPrinterConnection(activePrinter);
      if (!status.connected) {
        Alert.alert(
          'Printer Offline',
          `Cannot reach "${activePrinter.printerName}" on port 9100.\n\n${status.error ?? 'Network unreachable'}\n\nCheck: printer is ON, on Wi-Fi, and IP is correct.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Retry',
              onPress: async () => {
                if (!isMounted.current) return;
                setPrinting(true);
                try {
                  const retry = await checkPrinterConnection(activePrinter);
                  if (!retry.connected) {
                    Alert.alert('Still Offline', retry.error ?? 'Cannot connect');
                    return;
                  }
                  const retryContent = buildReceiptContent(params);
                  await printEstimation(activePrinter, retryContent);
                } catch (e2: any) {
                  Alert.alert('Print Error', e2?.message ?? 'Failed to print');
                } finally {
                  if (isMounted.current) setPrinting(false);
                }
              },
            },
          ],
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
