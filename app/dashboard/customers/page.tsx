import { Stack, Typography } from "@mui/material";

import { requirePermission } from "@/lib/require-permission";

import CustomersListClient from "./_components/customers-list-client";
import { getCustomers } from "./data";

export default async function CustomersPage() {
  await requirePermission("customers", "view");
  const customers = await getCustomers();

  return (
    <>
      {/* <ActionButtons resource="customers" /> */}
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          {/* ลูกค้า */}
        </Typography>
        <CustomersListClient customers={customers} />
      </Stack>
    </>
  );
}
