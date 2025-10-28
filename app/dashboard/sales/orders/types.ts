export type Option = {
  id: string;
  label: string;
  address?: string | null;
  province?: string | null;
  district?: string | null;
  subdistrict?: string | null;
  postalCode?: string | null;
};

export type ProductOption = {
  id: string;
  productCode: string;
  nameTH: string;
  unit?: string | null;
  price?: number | null;
  stockOnHand: number;
};

export type OrderItemInput = {
  productId?: string;
  productCodeSnapshot?: string;
  nameSnapshot: string;
  unit?: string;
  qty: number;
  unitPrice: number | "";
  discountPercent?: number;
  discountAmount?: number | "";
};

export type OrderFormInitial = {
  customerId: string;
  salespersonId: string;
  orderDate: string | null;
  dueDate: string | null;
  shippingDate: string | null;
  creditTermDays: number | "";
  paymentCondition: "PREPAID" | "POSTPAID";
  currency: string;
  vatIncluded: boolean;
  vatRate: number;
  billAddressLine: string;
  billProvince?: string;
  billDistrict?: string;
  billSubdistrict?: string;
  billPostalCode?: string;
  shipAddressLine: string;
  shipProvince?: string;
  shipDistrict?: string;
  shipSubdistrict?: string;
  shipPostalCode?: string;
  status: string;
  paymentStatus: string;
  shippingFee: number | "";
  otherCharges: number | "";
  orderDiscount: number | "";
  usePromotion: boolean;
  promotionAmount: number | "";
  poNumber: string;
  note: string;
  items: OrderItemInput[];
  rejectReason?: string;
  cancelReason?: string;
};
