import { getCustomers } from "@/app/dashboard/customers/data";
import { requirePermission } from "@/lib/require-permission";
import { CreateRequestClient } from "./_components/create-request-client";

export default async function CreateTempCreditRequestPage() {
  await requirePermission("customers", "create");
  const customers = await getCustomers();
  
  // Filter for main branch DEALER type customers only
  const customerOptions = customers
    .filter((c) => c.type === "DEALER" && c.branches.length > 0)
    .map((c) => ({
      id: c.id,
      label: c.name,
      companyName: c.name,
    }));

  return <CreateRequestClient customerOptions={customerOptions} />;
}