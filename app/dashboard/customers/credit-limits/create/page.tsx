import { getDealers } from "../data";
import { requirePermission } from "@/lib/require-permission";
import { CreateRequestClient } from "./_components/create-request-client";

export default async function CreateTempCreditRequestPage() {
  await requirePermission("customers", "create");
  const dealers = await getDealers();
  
  // Convert dealers to customer options
  const customerOptions = dealers.map((c) => ({
    id: c.id,
    label: c.companyName || [c.prefix, c.firstName, c.lastName].filter(Boolean).join(" "),
    companyName: c.companyName || c.firstName,
  }));

  return <CreateRequestClient customerOptions={customerOptions} />;
}