"use client";

import { useRouter } from "next/navigation";
import type { Option, ProductOption } from "../../types";
import { OrderForm } from "../../_components/order-form";

type Props = {
  customerOptions: Option[];
  employeeOptions: Option[];
  productOptions: ProductOption[];
};

export function CreateOrderPageClient({ customerOptions, employeeOptions, productOptions }: Props) {
  const router = useRouter();

  return (
    <OrderForm
      mode="create"
      title="สร้างบันทึกการขาย"
      submitLabel="บันทึก"
      customerOptions={customerOptions}
      employeeOptions={employeeOptions}
      productOptions={productOptions}
      showFillRandom
      onSubmit={async (payload) => {
        const res = await fetch("/api/sales/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "บันทึกใบสั่งขายไม่สำเร็จ");
        }
        const created = await res.json();
        router.push(`/dashboard/sales/orders/${created.id}`);
      }}
    />
  );
}
