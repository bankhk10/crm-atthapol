import { Stack, Typography, Button } from "@mui/material";
import Link from "next/link";
import { ActionButtons } from "../_components/action-buttons";
import { getCustomers } from "./data";
import { CustomersTable } from "./_components/customers-table";

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <>
      <ActionButtons resource="customers" />
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent={{ xs: "flex-start", sm: "flex-end" }} sx={{ mb: 1 }}>
        <Button component={Link} href="/dashboard/customers/new/dealer" variant="contained" color="primary">
          เพิ่ม Dealer
        </Button>
        <Button component={Link} href="/dashboard/customers/new/subdealer" variant="contained" color="secondary">
          เพิ่ม SubDealer
        </Button>
        <Button component={Link} href="/dashboard/customers/new/farmer" variant="contained" color="success">
          เพิ่ม Farmer
        </Button>
      </Stack>
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          ลูกค้า
        </Typography>
        <CustomersTable customers={customers} />
      </Stack>
    </>
  );
}
