import {
  getPrintersByEmployee,
  createPrinter,
  updatePrinter,
  deletePrinter,
} from '../services/printerService';

export type { Printer, PrinterPayload } from '../services/printerService';

// Thin hook — exposes service functions so components don't import services directly.
// Add loading/error state here if needed in future.
export const usePrinterService = () => ({
  getPrintersByEmployee,
  createPrinter,
  updatePrinter,
  deletePrinter,
});
