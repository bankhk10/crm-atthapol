"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import { QuoteForm } from "../../../_components/quote-form";
import type { Option, ProductOption } from "../../../types";
import type { QuoteFormInitial } from "../../../types";

type Props = {
  quoteId: string;
  customerOptions: Option[];
  employeeOptions: Option[];
  productOptions: ProductOption[];
};

export function EditQuotePageClient({ quoteId, customerOptions, employeeOptions, productOptions }: Props) {
  const router = useRouter();
  const [initial, setInitial] = useState<QuoteFormInitial | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/sales/quotations/${quoteId}`);
        if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
        const q = await res.json();
        const items = (q.items || []).map((it: any) => ({
          productId: it.productId ?? undefined,
          productCodeSnapshot: it.productCodeSnapshot ?? undefined,
          nameSnapshot: it.nameSnapshot ?? "",
          unit: it.unit ?? undefined,
          qty: Number(it.qty || 0),
          unitPrice: Number(it.unitPrice || 0),
          discountPercent: Number(it.discountPercent || 0),
          discountAmount: Number(it.discountAmount || 0),
        }));
        setInitial({
          customerId: q.customerId,
          salespersonId: q.salespersonId || "",
          quoteDate: q.quoteDate ? new Date(q.quoteDate).toISOString().slice(0, 10) : null,
          validUntil: q.validUntil ? new Date(q.validUntil).toISOString().slice(0, 10) : null,
          paymentCondition: (q.paymentCondition as any) === "POSTPAID" ? "POSTPAID" : "PREPAID",
          creditTermDays: typeof q.creditTermDays === "number" ? q.creditTermDays : "",
          currency: q.currency || "THB",
          vatIncluded: Boolean(q.vatIncluded),
          vatRate: Number(q.vatRate || 0),
          shippingMethod: q.shippingMethod || "",
          note: q.note || "",
          items,
          shippingFee: Number(q.shippingFee ?? 0),
          otherCharges: Number(q.otherCharges ?? 0),
          orderDiscount: Number(q.orderDiscount ?? 0),
          status: String(q.status || "DRAFT") as any,
        });
      } catch (e: any) {
        setError(e?.message || "โหลดข้อมูลไม่สำเร็จ");
      }
    })();
  }, [quoteId]);

  if (error) return <div style={{ color: "red" }}>{error}</div>;
  if (!initial) return <Loader fullscreen />;

  return (
    <QuoteForm
      title={`แก้ไขใบเสนอราคา`}
      submitLabel="บันทึก"
      customerOptions={customerOptions}
      employeeOptions={employeeOptions}
      productOptions={productOptions}
      initial={initial}
      onSubmit={async (payload) => {
        const res = await fetch(`/api/sales/quotations/${quoteId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "บันทึกไม่สำเร็จ");
        }
        const updated = await res.json();
        router.push(`/dashboard/sales/quotations/${(updated as any).id}`);
      }}
    />
  );
}

export default EditQuotePageClient;
