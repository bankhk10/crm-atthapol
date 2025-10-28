"use client";

import { useRouter } from "next/navigation";
import type { Option, ProductOption } from "../../types";
import { QuoteForm } from "../../_components/quote-form";

type Props = {
  customerOptions: Option[];
  employeeOptions: Option[];
  productOptions: ProductOption[];
};

export function CreateQuotePageClient({ customerOptions, employeeOptions, productOptions }: Props) {
  const router = useRouter();
  return (
    <QuoteForm
      title="สร้างใบเสนอราคา"
      submitLabel="บันทึก"
      customerOptions={customerOptions}
      employeeOptions={employeeOptions}
      productOptions={productOptions}
      showFillRandom
      onSubmit={async (payload) => {
        const res = await fetch("/api/sales/quotations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "บันทึกใบเสนอราคาไม่สำเร็จ");
        }
        const created = await res.json();
        router.push(`/dashboard/sales/quotations/${created.id}`);
      }}
    />
  );
}
