"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { canShowRandomFill } from "@/lib/ui-permissions";
import type { Option, ProductOption } from "../../types";
import { OrderForm } from "../../_components/order-form";

type Props = {
  customerOptions: Option[];
  employeeOptions: Option[];
  productOptions: ProductOption[];
};

export function CreateOrderPageClient({ customerOptions, employeeOptions, productOptions }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const perms = session?.user?.permissions ?? [];
  const showRandom = canShowRandomFill(perms, "sales", "create");

  return (
    <OrderForm
      mode="create"
      title="สร้างบันทึกการขาย"
      submitLabel="บันทึก"
      customerOptions={customerOptions}
      employeeOptions={employeeOptions}
      productOptions={productOptions}
      showFillRandom={showRandom}
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
        // const created = await res.json();
        // After save, go back to orders list
        await res.json();
        router.push(`/dashboard/sales/orders?saved=1`);
      }}
    />
  );
}
