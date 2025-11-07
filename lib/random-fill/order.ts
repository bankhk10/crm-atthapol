import { choice, pick, randInt } from "@/lib/random";

import type { Option, ProductOption, OrderItemInput } from "@/app/dashboard/sales/orders/types";

export function fillOrderFormRandom(ctx: {
  customerOptions: Option[];
  employeeOptions: Option[];
  productOptions: ProductOption[];
  setCustomerId: (id: string) => void;
  setBillAddressLine: (v: string) => void;
  setBillProvince: (v: string | undefined) => void;
  setBillDistrict: (v: string | undefined) => void;
  setBillSubdistrict: (v: string | undefined) => void;
  setBillPostalCode: (v: string | undefined) => void;
  setShipAddressLine: (v: string) => void;
  setShipProvince: (v: string | undefined) => void;
  setShipDistrict: (v: string | undefined) => void;
  setShipSubdistrict: (v: string | undefined) => void;
  setShipPostalCode: (v: string | undefined) => void;
  setSalespersonId: (id: string) => void;
  setOrderDate: (v: string | null) => void;
  setShippingDate: (v: string | null) => void;
  setPaymentCondition: (v: "PREPAID" | "POSTPAID") => void;
  setCreditTermDays: (v: number | "") => void;
  setDueDate: (v: string | null) => void;
  setCurrency: (v: string) => void;
  setVatIncluded: (v: boolean) => void;
  setVatRate: (v: number) => void;
  setPoNumber: (v: string) => void;
  setNote: (v: string) => void;
  setItems: (items: OrderItemInput[]) => void;
  setShippingFee: (v: number | "") => void;
  setOtherCharges: (v: number | "") => void;
  setOrderDiscount: (v: number | "") => void;
  setWorkflowStatus: (v: string) => void;
  setStatus: (v: string) => void;
  setPaymentStatus: (v: string) => void;
  setUsePromotion: (v: boolean) => void;
  setAutoPromotion: (v: boolean) => void;
}) {
  const {
    customerOptions,
    employeeOptions,
    productOptions,
    setCustomerId,
    setBillAddressLine,
    setBillProvince,
    setBillDistrict,
    setBillSubdistrict,
    setBillPostalCode,
    setShipAddressLine,
    setShipProvince,
    setShipDistrict,
    setShipSubdistrict,
    setShipPostalCode,
    setSalespersonId,
    setOrderDate,
    setShippingDate,
    setPaymentCondition,
    setCreditTermDays,
    setDueDate,
    setCurrency,
    setVatIncluded,
    setVatRate,
    setPoNumber,
    setNote,
    setItems,
    setShippingFee,
    setOtherCharges,
    setOrderDiscount,
    setWorkflowStatus,
    setStatus,
    setPaymentStatus,
    setUsePromotion,
    setAutoPromotion,
  } = ctx;

  if (customerOptions.length > 0) {
    const c = choice(customerOptions);
    setCustomerId(c.id);
    setBillAddressLine(c.address ?? "");
    setBillProvince(c.province ?? undefined);
    setBillDistrict(c.district ?? undefined);
    setBillSubdistrict(c.subdistrict ?? undefined);
    setBillPostalCode(c.postalCode ?? undefined);
    setShipAddressLine(c.address ?? "");
    setShipProvince(c.province ?? undefined);
    setShipDistrict(c.district ?? undefined);
    setShipSubdistrict(c.subdistrict ?? undefined);
    setShipPostalCode(c.postalCode ?? undefined);
  }
  if (employeeOptions.length > 0) {
    const e = choice(employeeOptions);
    setSalespersonId(e.id);
  }

  const todayISO = new Date().toISOString().slice(0, 10);
  setOrderDate(todayISO);
  const shipOffset = randInt(1, 7);
  const shipDate = new Date();
  shipDate.setDate(shipDate.getDate() + shipOffset);
  setShippingDate(shipDate.toISOString().slice(0, 10));

  const pc: "PREPAID" | "POSTPAID" = Math.random() < 0.5 ? "PREPAID" : "POSTPAID";
  setPaymentCondition(pc);
  if (pc === "POSTPAID") {
    const term = choice([15, 30, 45]);
    setCreditTermDays(term);
    const due = new Date();
    due.setDate(due.getDate() + term);
    setDueDate(due.toISOString().slice(0, 10));
  } else {
    setCreditTermDays("");
    setDueDate(null);
  }

  setCurrency("THB");
  setVatIncluded(true);
  setVatRate(7);

  setPoNumber(`PO-${randInt(100000, 999999)}`);
  setNote("ตัวอย่างข้อมูลที่กรอกอัตโนมัติ เพื่อทดสอบการสร้างเอกสาร");

  const pickCount = Math.max(1, Math.min(4, randInt(1, 3)));
  const selected = pick(productOptions, pickCount);
  const nextItems: OrderItemInput[] = selected.map((p) => {
    const maxQty = Math.max(1, Math.min(10, Number(p.stockOnHand ?? 0) || 5));
    const qty = randInt(1, maxQty);
    const discount = Math.random() < 0.3 ? randInt(0, 50) : 0;
    return {
      productId: p.id,
      productCodeSnapshot: p.productCode,
      nameSnapshot: p.nameTH,
      unit: p.unit || undefined,
      qty,
      unitPrice: typeof p.price === "number" ? p.price : 0,
      discountPercent: 0,
      discountAmount: discount,
    };
  });
  setItems(nextItems);

  setShippingFee(randInt(0, 500));
  setOtherCharges(randInt(0, 300));
  setOrderDiscount(randInt(0, 300));

  setWorkflowStatus("DRAFT");
  setStatus("DRAFT");
  setPaymentStatus("UNPAID");

  setUsePromotion(true);
  setAutoPromotion(true);
}
