import { Stack, Typography } from "@mui/material";
import { requirePermission } from "@/lib/require-permission";
import CustomersListClient from "../_components/customers-list-client";
import { getCustomers } from "../data";

export default async function CustomersInformationPage() {
  await requirePermission("customers", "view");
  const customers = await getCustomers();

  return (
    <>
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          ข้อมูลลูกค้า
        </Typography>
        <CustomersListClient customers={customers} />
      </Stack>
    </>
  );
}