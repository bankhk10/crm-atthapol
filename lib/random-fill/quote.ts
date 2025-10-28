import type { Option, ProductOption } from "@/app/dashboard/sales/orders/types";
import type { QuoteItemInput } from "@/app/dashboard/sales/quotations/types";
import { choice, randInt, pick } from "@/lib/random";

export function fillQuoteFormRandom(ctx: {
  customerOptions: Option[];
  employeeOptions: Option[];
  productOptions: ProductOption[];
  setCustomerId: (id: string) => void;
  setSalespersonId: (id: string) => void;
  setQuoteDate: (v: string | null) => void;
  setValidUntil: (v: string | null) => void;
  setPaymentCondition: (v: "PREPAID" | "POSTPAID") => void;
  setCreditTermDays: (v: number | "") => void;
  setCurrency: (v: string) => void;
  setVatIncluded: (v: boolean) => void;
  setVatRate: (v: number) => void;
  setShippingMethod: (v: string) => void;
  setNote: (v: string) => void;
  setItems: (items: QuoteItemInput[]) => void;
  setShippingFee: (v: number | "") => void;
  setOtherCharges: (v: number | "") => void;
  setOrderDiscount: (v: number | "") => void;
  setStatus: (v: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED") => void;
}) {
  const {
    customerOptions,
    employeeOptions,
    productOptions,
    setCustomerId,
    setSalespersonId,
    setQuoteDate,
    setValidUntil,
    setPaymentCondition,
    setCreditTermDays,
    setCurrency,
    setVatIncluded,
    setVatRate,
    setShippingMethod,
    setNote,
    setItems,
    setShippingFee,
    setOtherCharges,
    setOrderDiscount,
    setStatus,
  } = ctx;

  if (customerOptions.length > 0) {
    const c = choice(customerOptions);
    setCustomerId(c.id);
  }
  if (employeeOptions.length > 0) {
    const e = choice(employeeOptions);
    setSalespersonId(e.id);
  }

  const today = new Date();
  setQuoteDate(today.toISOString().slice(0, 10));
  const valid = new Date(today);
  valid.setDate(valid.getDate() + randInt(7, 30));
  setValidUntil(valid.toISOString().slice(0, 10));

  const pc: "PREPAID" | "POSTPAID" = Math.random() < 0.5 ? "PREPAID" : "POSTPAID";
  setPaymentCondition(pc);
  setCreditTermDays(pc === "POSTPAID" ? choice([15, 30, 45]) : "");

  setCurrency("THB");
  setVatIncluded(true);
  setVatRate(7);

  setShippingMethod(choice(["รับเอง", "จัดส่งโดยบริษัท", "ขนส่งเอกชน"]));
  setNote("ตัวอย่างใบเสนอราคาที่สร้างโดยการสุ่มสำหรับทดสอบ");

  const pickCount = Math.max(1, Math.min(4, randInt(1, 3)));
  const selected = pick(productOptions, pickCount);
  const items: QuoteItemInput[] = selected.map((p) => ({
    productId: p.id,
    productCodeSnapshot: p.productCode,
    nameSnapshot: p.nameTH,
    unit: p.unit || undefined,
    qty: randInt(1, Math.max(1, Math.min(10, Number(p.stockOnHand ?? 0) || 5))),
    unitPrice: typeof p.price === "number" ? p.price : 0,
    discountPercent: 0,
    discountAmount: Math.random() < 0.3 ? randInt(0, 50) : 0,
  }));
  setItems(items);

  setShippingFee(randInt(0, 400));
  setOtherCharges(randInt(0, 200));
  setOrderDiscount(randInt(0, 300));

  setStatus("DRAFT");
}

