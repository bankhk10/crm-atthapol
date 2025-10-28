import { getCustomers } from "@/app/dashboard/customers/data";
import { getEmployees } from "@/app/dashboard/employees/data";
import { getProducts } from "@/app/dashboard/products/data";
import EditQuotePageClient from "./_components/edit-quote-page-client";

export default async function EditQuotePage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params;
  const [customers, employees, products] = await Promise.all([
    getCustomers(),
    getEmployees(),
    getProducts(),
  ]);

  const customerOptions = customers.map((c) => ({
    id: c.id,
    label: c.name,
    address: (c as any).address ?? null,
    province: (c as any).province ?? null,
    district: (c as any).district ?? null,
    subdistrict: (c as any).subdistrict ?? null,
    postalCode: (c as any).postalCode ?? null,
  }));
  const employeeOptions = employees.map((e) => ({
    id: e.id,
    label: ([e.prefix, e.firstName, e.lastName].filter(Boolean).join(" ") || e.user?.name || e.user?.email || e.id) as string,
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
    <EditQuotePageClient
      quoteId={quoteId}
      customerOptions={customerOptions}
      employeeOptions={employeeOptions}
      productOptions={productOptions}
    />
  );
}
