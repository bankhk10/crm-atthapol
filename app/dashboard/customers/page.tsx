import { Stack, Typography } from "@mui/material";
import { ActionButtons } from "../_components/action-buttons";
import { getCustomers } from "./data";
import { CustomersTable } from "./_components/customers-table";

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <>
      <ActionButtons resource="customers" />
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          ลูกค้า
        </Typography>
        <CustomersTable customers={customers} />
      </Stack>
    </>
  );
}
