import TcpSocket from 'react-native-tcp-socket';
import { Alert } from 'react-native';
import type { Printer } from '../api/hooks/usePrinter';
import type { EstimationItem } from '../types/estimation';
import type { CustomerInfo } from '../types/customer';
import {
  FONTS,
  PRINTER_COMMANDS,
  formatLine,
  SEPARATOR,
  buildQRCode,
} from './printerCommands';

const fmt = (n: number) => Number(n || 0).toFixed(2);

// ─── Check printer connectivity via TCP ──────────────────────────────────────
export const checkPrinterConnection = (
  printer: Printer,
): Promise<{ connected: boolean; error?: string }> => {
  return new Promise(resolve => {
    const client = TcpSocket.createConnection(
      { host: printer.ip_address, port: printer.port, reuseAddress: true, timeout: 5000 },
      () => {
        client.destroy();
        resolve({ connected: true });
      },
    );
    client.on('error', err => {
      client.destroy();
      resolve({ connected: false, error: err.message });
    });
    client.on('timeout', () => {
      client.destroy();
      resolve({ connected: false, error: 'Connection timed out' });
    });
    setTimeout(() => {
      try { client.destroy(); } catch (_) {}
      resolve({ connected: false, error: 'Timeout' });
    }, 6000);
  });
};

// ─── Build ESC/POS receipt content ───────────────────────────────────────────
export const buildReceiptContent = (params: {
  estNo: string;
  billDate: string;
  billTime: string;
  items: EstimationItem[];
  customerInfo?: CustomerInfo | null;
  salesman?: string;
}): string => {
  const { estNo, billDate, billTime, items, customerInfo, salesman } = params;

  const grossTotal = items.reduce(
    (s, i) => s + (i.weight > 0 ? i.weight * i.rate : i.qty * i.rate),
    0,
  );
  const discount  = items.reduce((s, i) => s + (i.discount || 0), 0);
  const finalAmt  = grossTotal - discount;
  const netTotal  = Math.abs(Math.round(finalAmt) - finalAmt) >= 0.01
    ? Math.round(finalAmt)
    : finalAmt;

  const customerName   = customerInfo?.PNAME?.trim() || '';
  const customerMobile = customerInfo?.MOBILE || '';
  const totalQty       = items.reduce((s, i) => s + i.qty, 0);

  // Disc check
  const discPercentages = items.map(i => i.discPer ?? 0);
  const allSameDisc = discPercentages.length > 0 && discPercentages.every(d => d === discPercentages[0]);
  const commonDiscPer = allSameDisc && discPercentages[0] > 0 ? discPercentages[0] : null;

  let content = '';
  content += PRINTER_COMMANDS.INIT;
  content += FONTS.ALIGN_CENTER;

  // ── Title ─────────────────────────────────────────────────────────
  content += FONTS.BOLD_ON + FONTS.DOUBLE_HEIGHT;
  content += 'ESTIMATION\n';
  content += FONTS.NORMAL;

  content += SEPARATOR;

  // ── Est No / Date / Time ──────────────────────────────────────────
  content += formatLine(`Est No : ${estNo}`, `Date: ${billDate}`);
  content += formatLine('', `Time: ${billTime}`);

  // ── Customer ──────────────────────────────────────────────────────
  if (customerName || customerMobile) {
    content += SEPARATOR;
    if (customerName)   content += formatLine(`Name   : ${customerName}`);
    if (customerMobile) content += formatLine(`Mobile : ${customerMobile}`);
  }

  content += SEPARATOR;

  // ── Items table header ────────────────────────────────────────────
  content += FONTS.BOLD_ON;
  content += formatLine('S# Product', 'Qty      Rate     Amt');
  content += FONTS.BOLD_OFF;
  content += SEPARATOR;

  // ── Items ─────────────────────────────────────────────────────────
  items.forEach(item => {
    const hasWeight  = (item.weight ?? 0) > 0;
    const qtyDisplay = hasWeight ? `${item.weight}Kg` : `${item.qty}`;
    const rawAmt     = hasWeight ? item.weight * item.rate : item.qty * item.rate;
    const name       = (item.subProductName || item.productName).substring(0, 18);
    const right      = `${qtyDisplay.padStart(5)}  ${fmt(item.rate).padStart(7)}  ${fmt(rawAmt).padStart(7)}`;
    content += formatLine(`${item.sno} ${name}`, right);
    if (item.tagNo) content += formatLine(`  [${item.tagNo}]`);
  });

  content += SEPARATOR;

  // ── Totals ────────────────────────────────────────────────────────
  content += formatLine('Total Amount', fmt(grossTotal));
  if (discount > 0) {
    const discLabel = commonDiscPer ? `Discount : ${commonDiscPer}%` : 'Discount';
    content += formatLine(discLabel, fmt(discount));
  }

  content += SEPARATOR;

  // ── Net Total ─────────────────────────────────────────────────────
  content += FONTS.BOLD_ON + FONTS.DOUBLE_HEIGHT;
  content += formatLine('NET TOTAL', `Rs.${fmt(netTotal)}`);
  content += FONTS.NORMAL;

  content += SEPARATOR;

  // ── Counts ────────────────────────────────────────────────────────
  content += formatLine(`Items: ${items.length}`, `Total Qty: ${totalQty}`);

  // ── Salesman ──────────────────────────────────────────────────────
  if (salesman) {
    content += SEPARATOR;
    content += formatLine(`Salesman : ${salesman}`);
  }

  // ── QR Code ───────────────────────────────────────────────────────
  content += '\n';
  content += FONTS.ALIGN_CENTER;
  content += buildQRCode(estNo);
  content += '\n';

  // ── Footer ────────────────────────────────────────────────────────
  content += FONTS.ALIGN_CENTER;
  content += FONTS.BOLD_ON;
  content += 'Join our Exciting Chit Schemes!\n';
  content += '*** THANK YOU VISIT AGAIN ***\n';
  content += FONTS.NORMAL;

  content += PRINTER_COMMANDS.FEED_LINES(4);
  content += PRINTER_COMMANDS.CUT;

  return content;
};

// ─── Send to thermal printer via TCP ─────────────────────────────────────────
export const printEstimation = (
  printer: Printer,
  content: string,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const client = TcpSocket.createConnection(
      { host: printer.ip_address, port: printer.port, reuseAddress: true, timeout: 10000 },
      () => {
        client.write(content, 'binary', err => {
          if (err) {
            client.destroy();
            return reject(err);
          }
          setTimeout(() => {
            client.destroy();
            resolve();
          }, 1000);
        });
      },
    );
    client.on('error', err => {
      client.destroy();
      reject(err);
    });
    client.on('timeout', () => {
      client.destroy();
      reject(new Error('Print connection timed out'));
    });
    setTimeout(() => {
      try { client.destroy(); } catch (_) {}
      reject(new Error('Print operation timed out'));
    }, 15000);
  });
};
