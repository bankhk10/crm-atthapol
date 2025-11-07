import { getCustomers } from "@/app/dashboard/customers/data";
import { getEmployees } from "@/app/dashboard/employees/data";
import { getProducts } from "@/app/dashboard/products/data";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

import { EditOrderPageClient } from "./_components/edit-order-page-client";

export default async function EditSalesOrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  await requirePermission("sales", "edit");
  const { orderId } = await params;
  const [customers, employees, products, order] = await Promise.all([
    getCustomers(),
    getEmployees(),
    getProducts(),
    (prisma as any).saleOrder.findUnique({
      where: { id: orderId },
      include: { customer: true },
    }),
  ]);

  let customerOptions = customers
    .filter((c) => c.type === "DEALER")
    .map((c) => ({
      id: c.id,
      label: c.name,
      address: (c as any).address ?? null,
      province: (c as any).province ?? null,
      district: (c as any).district ?? null,
      subdistrict: (c as any).subdistrict ?? null,
      postalCode: (c as any).postalCode ?? null,
    }));

  // Ensure current order's customer appears in options even if not DEALER (view-only fallback)
  if (order?.customer && !customerOptions.some((o) => o.id === order.customerId)) {
    const c = order.customer as any;
    const label =
      c.companyName && c.companyName.trim().length > 0
        ? c.companyName
        : [c.prefix, c.firstName, c.lastName].filter(Boolean).join(" ");
    customerOptions = [
      {
        id: order.customerId,
        label: label || c.id,
        address: c.address ?? null,
        province: c.province ?? null,
        district: c.district ?? null,
        subdistrict: c.subdistrict ?? null,
        postalCode: c.postalCode ?? null,
      },
      ...customerOptions,
    ];
  }
  const employeeOptions = employees.map((e) => ({
    id: e.id,
    label: ([e.prefix, e.firstName, e.lastName].filter(Boolean).join(" ") ||
      e.user?.name ||
      e.user?.email ||
      e.id) as string,
  }));
  const productOptions = products.map((p) => ({
    id: p.id,
    productCode: (p as any).productCode,
    nameTH: (p as any).nameTH,
    unit: (p as any).unit ?? null,
    price: (p as any).price ?? null,
    stockOnHand: (p as any).stockAvailable,
  }));

  return (
    <EditOrderPageClient
      orderId={orderId}
      customerOptions={customerOptions}
      employeeOptions={employeeOptions}
      productOptions={productOptions}
    />
  );
}
