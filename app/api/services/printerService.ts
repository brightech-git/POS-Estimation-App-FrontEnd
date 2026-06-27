import { callApi } from '../apiClient';
import { PRINTER } from '../endpoints';

// ─── Types (mirror backend PrinterSetting entity) ─────────────────────────────
export interface Printer {
  printCode:   number;
  operCode:    number;
  printerName: string;   // stored IP address for TCP connection
  billType?:   string;
  active:      string;   // "Y" | "N"
  createdBy?:  number;
  createdDate?: string;
  createdTime?: string;
}

export interface PrinterPayload {
  printCode?:  number;
  operCode:    number;
  printerName: string;
  billType?:   string;
  active?:     string;   // "Y" | "N"
}

// ── GET /printer-setting/operator/{operCode} ──────────────────────
export const getPrintersByOperCode = (operCode: string | number) =>
  callApi<never, Printer[]>({
    method: 'get',
    url:    PRINTER.BY_OPER(operCode),
  });

// ── POST /printer-setting  (createdBy sent via axiosInstance header) ──
export const createPrinterSetting = (data: PrinterPayload) =>
  callApi<PrinterPayload, Printer>({
    method: 'post',
    url:    PRINTER.CREATE,
    data,
  });

// ── PUT /printer-setting/{printCode} ─────────────────────────────
export const updatePrinterSetting = (printCode: number, data: PrinterPayload) =>
  callApi<PrinterPayload, Printer>({
    method: 'put',
    url:    PRINTER.UPDATE(printCode),
    data,
  });

// ── PATCH /printer-setting/{printCode}/activate ───────────────────
// Server deactivates all others automatically
export const activatePrinter = (printCode: number) =>
  callApi<never, { message: string; data: Printer }>({
    method: 'patch',
    url:    PRINTER.ACTIVATE(printCode),
  });

// ── PATCH /printer-setting/{printCode}/deactivate ────────────────
export const deactivatePrinter = (printCode: number) =>
  callApi<never, { message: string; data: Printer }>({
    method: 'patch',
    url:    PRINTER.DEACTIVATE(printCode),
  });

// ── DELETE /printer-setting/{printCode} ──────────────────────────
export const deletePrinterSetting = (printCode: number) =>
  callApi<never, void>({
    method: 'delete',
    url:    PRINTER.DELETE(printCode),
  });
