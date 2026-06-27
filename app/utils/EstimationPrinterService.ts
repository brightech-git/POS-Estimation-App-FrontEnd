import TcpSocket from 'react-native-tcp-socket';
import type { Printer } from '../api/hooks/usePrinter';
import type { EstimationItem } from '../types/estimation';
import type { CustomerInfo } from '../types/customer';
import { Buffer } from "buffer";
import { FONTS, PRINTER_COMMANDS, buildQRCode } from './printerCommands';

const TCP_PORT = 9100; // default thermal printer port

// ─── Layout constants (42-char / 80mm paper) ─────────────────────────────────
const W = 42;                                     // total char width
const SEP  = '-'.repeat(W) + '\n';                // single dash separator (D)
const SEP2 = '='.repeat(W) + '\n';               // double separator (DD)

const center = (text: string, width = W): string =>
  text.length >= width ? text : ' '.repeat(Math.floor((width - text.length) / 2)) + text;

const rpad = (s: string, n: number) => s.substring(0, n).padEnd(n);
const lpad = (s: string, n: number) => s.substring(0, n).padStart(n);

const fmt = (n: number) => Number(n || 0).toFixed(2);

// ─── Check printer connectivity via TCP ──────────────────────────────────────
export const checkPrinterConnection = (
  printer: Printer,
): Promise<{ connected: boolean; error?: string }> =>
  new Promise(resolve => {
    const client = TcpSocket.createConnection(
      { host: printer.printerName, port: TCP_PORT, reuseAddress: true },
      () => { client.destroy(); resolve({ connected: true }); },
    );
    client.on('error', err => { client.destroy(); resolve({ connected: false, error: err.message }); });
    client.on('timeout', () => { client.destroy(); resolve({ connected: false, error: 'Connection timed out' }); });
    setTimeout(() => {
      try { client.destroy(); } catch (_) {}
      resolve({ connected: false, error: 'Timeout' });
    }, 6000);
  });

// ─── Build ESC/POS receipt — mirrors the Next.js EstimationPrint layout ───────
const DEFAULT_COMPANY = {
  name: "RANGAS PAATHIRA KADAL",
  address1: "NO 12, BIG BAZAAR STREET",
  address2: "THERADI BAZAAR, (OPP.) MALAI VASAL",
  address3: "TRICHY - 620002",
  mobile: "4312711916",
  gst: "33ABAFR6426L1Z3",
};

export const buildReceiptContent = (params: {
  estNo: string;
  billDate: string;
  billTime: string;
  items: EstimationItem[];
  customerInfo?: CustomerInfo | null;
  salesman?: string;
  footer?: string;
}): string => {
  const {
    estNo, billDate, billTime, items,
    customerInfo, salesman,
    footer = '***THANK YOU VISIT AGAIN***',
  } = params;

  // ── Calculations ───────────────────────────────────────────────
  const grossTotal = items.reduce(
    (s, i) => s + ((i.weight ?? 0) > 0 ? i.weight * i.rate : i.qty * i.rate),
    0,
  );
  const discount    = items.reduce((s, i) => s + (i.discount || 0), 0);
  const finalAmount = grossTotal - discount;
  const roundedAmt  = Math.round(finalAmount);
  const hasRoundOff = Math.abs(roundedAmt - finalAmount) >= 0.01;
  const netTotal    = hasRoundOff ? roundedAmt : finalAmount;
  const totalQty    = items.reduce((s, i) => s + i.qty, 0);

  const customerName   = customerInfo?.PNAME?.trim() || '';
  const customerMobile = customerInfo?.MOBILE || '';

  let c = '';
  c += PRINTER_COMMANDS.INIT;

  // ── Company Text Header (Replacing Logo Block) ───────────────────
  c += FONTS.ALIGN_CENTER;
  
  // Large & Bold for the Main Title
  c += FONTS.BIG;
  c += FONTS.BOLD_ON;
  c += `${DEFAULT_COMPANY.name}\n`;
  // Address & Details lines (Normal Font, Centered)
  c += FONTS.NORMAL;
  c += `${DEFAULT_COMPANY.address1}\n`;
  c += `${DEFAULT_COMPANY.address2}\n`;
  c += `${DEFAULT_COMPANY.address3}\n`;
  c += `Mob: ${DEFAULT_COMPANY.mobile}\n`;
  c += `GSTIN: ${DEFAULT_COMPANY.gst}\n`;
  c += FONTS.BOLD_OFF;

  // ── ESTIMATION title ─────────────────────────────────────────────
  c += FONTS.ALIGN_LEFT; 
  c += SEP;
  c += FONTS.ALIGN_CENTER;
  c += FONTS.BOLD_HEIGHT;
  c += 'ESTIMATION\n';
  c += FONTS.NORMAL;
  c += FONTS.ALIGN_LEFT;
  c += SEP;

  // ── Est No | Date | Time ─────────────────────────────────────────
  const estLabel  = `Est No : ${estNo}`;
  const dateLabel = `Date : ${billDate}`;
  const timeLabel = `Time : ${billTime}`;
  
  const gap1 = Math.max(1, W - estLabel.length - dateLabel.length);
  c += estLabel + ' '.repeat(gap1) + dateLabel + '\n';
  
  const gap2 = Math.max(1, W - timeLabel.length);
  c += ' '.repeat(gap2) + timeLabel + '\n';

  // ── Customer ─────────────────────────────────────────────────────
  if (customerName || customerMobile) {
    c += SEP;
    c += FONTS.BOLD_ON;
    if (customerName)   c += `Name : ${customerName}\n`;
    if (customerMobile) c += `Mobile : ${customerMobile}\n`;
    c += FONTS.BOLD_OFF;
  }

  c += SEP;

  // ── Items table header ────────────────────────────────────────────
  const COL = { sno: 5, prod: 14, qty: 7, rate: 8, amt: 8 };
  
  c += FONTS.BOLD_ON;
  c += 'S.No'.padEnd(COL.sno)
     + 'Product'.padEnd(COL.prod)
     + 'Qty/Wt'.padStart(COL.qty)
     + 'Rate'.padStart(COL.rate)
     + 'Amount'.padStart(COL.amt) + '\n';
  c += FONTS.BOLD_OFF;
  c += SEP;

  // ── Items ─────────────────────────────────────────────────────────
  items.forEach(item => {
    const hasWeight  = (item.weight ?? 0) > 0;
    const qtyDisplay = hasWeight ? `${item.weight}Kg` : String(item.qty);
    const rawAmt     = hasWeight ? item.weight * item.rate : item.qty * item.rate;
    const prodName   = (item.subProductName || item.productName);

    c += String(item.sno).padEnd(COL.sno)
       + rpad(prodName, COL.prod)
       + lpad(qtyDisplay, COL.qty)
       + lpad(fmt(item.rate), COL.rate)
       + lpad(fmt(rawAmt), COL.amt) + '\n';

    if (item.tagNo) {
      c += ' '.repeat(COL.sno) + item.tagNo + '\n';
    }
  });

  c += SEP;

  // ── Totals ────────────────────────────────────────────────────────
  const totRow = (label: string, value: string) => {
    const gap = Math.max(1, W - label.length - value.length);
    return label + ' '.repeat(gap) + value + '\n';
  };

  c += totRow('Total Amount', fmt(grossTotal));
  c += SEP;

  // ── NET TOTAL (Large with Safe Currency Character) ───────────────
  c += FONTS.BOLD_HEIGHT;
  const netLabel = 'NET TOTAL';
  const netVal   = `Rs. ${fmt(netTotal)}`; 
  const netGap   = Math.max(1, W - netLabel.length - netVal.length);
  c += netLabel + ' '.repeat(netGap) + netVal + '\n';
  c += FONTS.NORMAL;

  c += SEP;

  c += `Items : ${items.length}   Total Qty : ${totalQty}\n`;

  if (estNo) {
    c += '\n';
    c += FONTS.ALIGN_LEFT;
    c += buildQRCode(estNo);
    c += '\n\n';
  }

  if (salesman) {
    c += FONTS.ALIGN_LEFT;
    c += FONTS.BOLD_ON;
    c += `Salesman : ${salesman}\n`;
    c += FONTS.BOLD_OFF;
  }

  c += SEP2;

  c += FONTS.ALIGN_CENTER;
  c += FONTS.BOLD_ON;
  c += 'Join our Exciting Chit Schemes  Ask us for details!\n';
  c += footer + '\n';
  c += FONTS.NORMAL;

  c += PRINTER_COMMANDS.FEED_LINES(4);
  c += PRINTER_COMMANDS.CUT;

  return c;
};

// ─── Send to thermal printer via TCP ─────────────────────────────────────────
export const printEstimation = (printer: Printer, content: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const client = TcpSocket.createConnection(
      { host: printer.printerName, port: TCP_PORT, reuseAddress: true },
      () => {
        client.write(Buffer.from(content, 'utf8'), undefined, err => {
          if (err) { client.destroy(); return reject(err); }
          setTimeout(() => { client.destroy(); resolve(); }, 1000);
        });
      },
    );
    client.on('error', err => { client.destroy(); reject(err); });
    client.on('timeout', () => { client.destroy(); reject(new Error('Print connection timed out')); });
    setTimeout(() => {
      try { client.destroy(); } catch (_) {}
      reject(new Error('Print operation timed out'));
    }, 15000);
  });
