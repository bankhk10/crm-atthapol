import { ForecastDetailClient } from "../_components/forecast-detail-client";
import type { CustomerOption } from "../_components/forecast-form";

import { getCustomers } from "@/app/dashboard/customers/data";
import { getEmployees } from "@/app/dashboard/employees/data";
import { getProducts } from "@/app/dashboard/products/data";
import { requirePermission } from "@/lib/require-permission";

export default async function ForecastDetailPage({ params }: { params: { id: string } }) {
  const forecastId = params.id;
  await requirePermission("sales", "view");
  const [employees, customers, products] = await Promise.all([
    getEmployees(),
    getCustomers(),
    getProducts(),
  ]);

  const employeeOptions = employees.map((emp) => ({
    id: emp.id,
    label:
      ([emp.prefix, emp.firstName, emp.lastName].filter(Boolean).join(" ") ||
        emp.user?.name ||
        emp.user?.email ||
        emp.id) as string,
  }));

  const customerOptions: CustomerOption[] = customers.map((customer) => ({
    id: customer.id,
    label: customer.name || customer.phone || customer.id,
  }));

  const productOptions = products.map((product) => ({
    id: product.id,
    productCode: product.productCode,
    nameTH: product.nameTH,
    unit: product.unit,
    price: product.price,
    stockOnHand: product.stockAvailable,
  }));

  return (
    <ForecastDetailClient
      forecastId={forecastId}
      employeeOptions={employeeOptions}
      customerOptions={customerOptions}
      productOptions={productOptions}
    />
  );
}
