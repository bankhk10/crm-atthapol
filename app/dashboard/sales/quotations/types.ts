import type { Option, ProductOption } from "../orders/types";

export type { Option, ProductOption };

export type QuoteItemInput = {
  productId?: string;
  productCodeSnapshot?: string;
  nameSnapshot: string;
  unit?: string;
  qty: number;
  unitPrice: number | "";
  discountPercent?: number;
  discountAmount?: number | "";
};

export type QuoteFormInitial = {
  customerId: string;
  salespersonId: string;
  quoteDate: string | null;
  validUntil: string | null;
  paymentCondition: "PREPAID" | "POSTPAID";
  creditTermDays: number | "";
  currency: string;
  vatIncluded: boolean;
  vatRate: number;
  shippingMethod?: string;
  note: string;
  items: QuoteItemInput[];
  shippingFee: number | "";
  otherCharges: number | "";
  orderDiscount: number | "";
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";
};

