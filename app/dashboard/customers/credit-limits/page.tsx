import { Stack, Typography } from "@mui/material";
import { requirePermission } from "@/lib/require-permission";
import { CreditLimitsTable } from "./_components/credit-limits-table";
import { CreditRequestList } from "./_components/credit-request-list";
import { getDealers } from "./data";

export default async function CustomersCreditLimitsPage() {
  await requirePermission("customers", "view");
  const dealers = await getDealers();

  return (
    <>
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          จัดการวงเงิน
        </Typography>
        <CreditRequestList />
        <CreditLimitsTable customers={dealers} />
      </Stack>
    </>
  );
}