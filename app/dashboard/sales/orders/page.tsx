import { Stack, Typography } from "@mui/material";
import { ActionButtons } from "../../_components/action-buttons";
import { getCustomers } from "@/app/dashboard/customers/data";
import { getEmployees } from "@/app/dashboard/employees/data";
import { OrdersClient } from "./_components/orders-client";

export default async function SalesOrdersPage() {
  const [customers, employees] = await Promise.all([getCustomers(), getEmployees()]);
  const customerOptions = customers.map((c) => ({ id: c.id, label: c.name }));
  const employeeOptions = employees.map((e) => ({
    id: e.id,
    label: ([e.prefix, e.firstName, e.lastName].filter(Boolean).join(" ") || e.user?.name || e.user?.email || e.id) as string,
  }));

  return (
    <>
      <ActionButtons resource="sales" />
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          รายการขาย
        </Typography>
        <OrdersClient customerOptions={customerOptions} employeeOptions={employeeOptions} />
      </Stack>
    </>
  );
}
