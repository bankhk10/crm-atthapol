"use client";

import { useEffect, useState } from "react";
import { OrderForm } from "../../../_components/order-form";
import type { Option, ProductOption, OrderFormInitial } from "../../../types";
import Loader from "@/components/Loader";
import { useRouter } from "next/navigation";

type Props = {
  orderId: string;
  customerOptions: Option[];
  employeeOptions: Option[];
  productOptions: ProductOption[];
};

export function EditOrderPageClient({ orderId, customerOptions, employeeOptions, productOptions }: Props) {
  const router = useRouter();
  const [initial, setInitial] = useState<OrderFormInitial | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseThaiAddress = (input?: string | null) => {
    const res: {
      line: string;
      province?: string;
      district?: string;
      subdistrict?: string;
      postalCode?: string;
    } = { line: (input || "").trim() };
    if (!input) return res;
    let s = String(input);
    const pc = s.match(/(\d{5})(?!.*\d)/);
    if (pc) {
      res.postalCode = pc[1];
      s = s.replace(pc[1], "");
    }
    const prov = s.match(/จ\.\s*([^\s]+)/);
    if (prov) {
      res.province = prov[1];
      s = s.replace(prov[0], "");
    }
    const dist = s.match(/อ\.\s*([^\s]+)/);
    if (dist) {
      res.district = dist[1];
      s = s.replace(dist[0], "");
    }
    const subd = s.match(/ต\.\s*([^\s]+)/);
    if (subd) {
      res.subdistrict = subd[1];
      s = s.replace(subd[0], "");
    }
    res.line = s.replace(/\s{2,}/g, " ").trim();
    return res;
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/sales/orders/${orderId}`);
        if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
        const so = await res.json();
        const bill = parseThaiAddress(so.billTo as string | undefined);
        const ship = parseThaiAddress(so.shipTo as string | undefined);
        const items = (so.items || []).map((it: any) => ({
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
          customerId: so.customerId,
          salespersonId: so.salespersonId || "",
          orderDate: so.orderDate ? new Date(so.orderDate).toISOString().slice(0, 10) : null,
          dueDate: so.dueDate ? new Date(so.dueDate).toISOString().slice(0, 10) : null,
          shippingDate: so.shippingDate ? new Date(so.shippingDate).toISOString().slice(0, 10) : null,
          creditTermDays: typeof so.creditTermDays === "number" ? so.creditTermDays : "",
          paymentCondition: (so.paymentCondition as any) === "POSTPAID" ? "POSTPAID" : "PREPAID",
          currency: so.currency || "THB",
          vatIncluded: Boolean(so.vatIncluded),
          vatRate: Number(so.vatRate || 0),
          billAddressLine: bill.line,
          billProvince: bill.province,
          billDistrict: bill.district,
          billSubdistrict: bill.subdistrict,
          billPostalCode: bill.postalCode,
          shipAddressLine: ship.line,
          shipProvince: ship.province,
          shipDistrict: ship.district,
          shipSubdistrict: ship.subdistrict,
          shipPostalCode: ship.postalCode,
          status: String(so.status || "DRAFT"),
          paymentStatus: String(so.paymentStatus || "UNPAID"),
          shippingFee: Number(so.shippingFee ?? 0),
          otherCharges: Number(so.otherCharges ?? 0),
          orderDiscount: Number((so as any).orderDiscount ?? 0),
          usePromotion: Number(so.promotionSpent || 0) > 0,
          promotionAmount: Number(so.promotionSpent || 0) > 0 ? Number(so.promotionSpent || 0) : "",
          poNumber: (so as any).poNumber || "",
          note: so.note || "",
          items,
          rejectReason: (so as any).rejectReason || "",
          cancelReason: (so as any).cancelReason || "",
        });
      } catch (e: any) {
        setError(e?.message || "โหลดข้อมูลไม่สำเร็จ");
      }
    })();
  }, [orderId]);

  if (error) {
    return <div style={{ color: "red" }}>{error}</div>;
  }
  if (!initial) {
    return <Loader fullscreen size={72} />;
  }

  return (
    <OrderForm
      mode="edit"
      title="แก้ไขบันทึกการขาย"
      submitLabel="บันทึก"
      customerOptions={customerOptions}
      employeeOptions={employeeOptions}
      productOptions={productOptions}
      initial={initial}
      onSubmit={async (payload) => {
        const res = await fetch(`/api/sales/orders/${orderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "บันทึกไม่สำเร็จ");
        }
        // const updated = await res.json();
        // After save, go back to orders list
        await res.json();
        router.push(`/dashboard/sales/orders?saved=1`);
      }}
    />
  );
}
