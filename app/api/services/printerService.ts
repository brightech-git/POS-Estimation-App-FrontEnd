import { callApi } from "../apiClient";

const BASE_URL = "https://est.bmgjewellers.com/api/v1/printers";

export interface Printer {
  id: number;
  name: string;
  ip_address: string;
  port: number;
  active: boolean;
  empId: number;
}

export interface PrinterPayload {
  id?: number;
  ipAddress: string;
  port: number;
  name: string;
  active: boolean;
  empId: number;
}

// GET
export const getPrintersByEmployee = (empId: string | number) =>
  callApi<never, Printer[]>({
    method: "get",
    url: `${BASE_URL}/by-emp`,
    params: { empId },
  });

// POST
export const createPrinter = (data: PrinterPayload) =>
  callApi<PrinterPayload, Printer>({
    method: "post",
    url: `${BASE_URL}/create`,
    data,
  });

// PUT
export const updatePrinter = (data: PrinterPayload) =>
  callApi<PrinterPayload, Printer>({
    method: "put",
    url: `${BASE_URL}/update`,
    data,
  });

// DELETE
export const deletePrinter = (id: number) =>
  callApi<never, void>({
    method: "delete",
    url: `${BASE_URL}/delete`,
    params: { id },
  });