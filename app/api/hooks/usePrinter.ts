import {
  getPrintersByOperCode,
  createPrinterSetting,
  updatePrinterSetting,
  activatePrinter,
  deactivatePrinter,
  deletePrinterSetting,
} from '../services/printerService';

export type { Printer, PrinterPayload } from '../services/printerService';

export const usePrinterService = () => ({
  getPrintersByOperCode,
  createPrinterSetting,
  updatePrinterSetting,
  activatePrinter,
  deactivatePrinter,
  deletePrinterSetting,
});
