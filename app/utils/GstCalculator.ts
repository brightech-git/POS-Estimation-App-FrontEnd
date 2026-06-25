// ─── GST Calculator (mirrors web GstCalculator) ──────────────────────────────

export type TaxType = 'INCLUSIVE' | 'EXCLUSIVE';

export interface GstResult {
  AMOUNT:       number;   // taxable
  DISCOUNTAMOUNT: number;
  TAXAMOUNT:    number;
  TOTAL:        number;
  CGSTAMOUNT:   number;
  SGSTAMOUNT:   number;
  IGSTAMOUNT:   number;
}

export const GstCalculator = {
  /**
   * Core calculation – matches web GstCalculator.calculate()
   * intraState = true → split into CGST+SGST; false → IGST
   */
  calculate(
    taxType:    TaxType,
    qty:        number,
    rate:       number,
    discPer:    number,
    gstPer:     number,
    weight      = 0,
    intraState  = true,
  ): GstResult {
    const base  = weight > 0 ? weight * rate : qty * rate;
    const disc  = base * (discPer / 100);
    const gross = base - disc;

    let amount: number;
    let taxAmount: number;
    let total: number;

    if (taxType === 'INCLUSIVE') {
      total     = gross;
      amount    = total / (1 + gstPer / 100);
      taxAmount = total - amount;
    } else {
      amount    = gross;
      taxAmount = amount * (gstPer / 100);
      total     = amount + taxAmount;
    }

    const halfGst = gstPer / 2;
    const cgst    = intraState ? r2(amount * (halfGst / 100)) : 0;
    const sgst    = intraState ? r2(amount * (halfGst / 100)) : 0;
    const igst    = intraState ? 0 : r2(amount * (gstPer   / 100));

    return {
      AMOUNT:          r2(amount),
      DISCOUNTAMOUNT:  r2(disc),
      TAXAMOUNT:       r2(taxAmount),
      TOTAL:           r2(total),
      CGSTAMOUNT:      cgst,
      SGSTAMOUNT:      sgst,
      IGSTAMOUNT:      igst,
    };
  },

  /** Totals across all items */
  calculateTotals(items: { amount: number; discount: number; gst: number; total: number }[]) {
    return {
      amount:   r2(items.reduce((s, i) => s + i.amount,   0)),
      discount: r2(items.reduce((s, i) => s + i.discount, 0)),
      gst:      r2(items.reduce((s, i) => s + i.gst,      0)),
      net:      r2(items.reduce((s, i) => s + i.total,    0)),
    };
  },

  fmt(n: number): string {
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
};

const r2 = (n: number) => Math.round(n * 100) / 100;
