import { Stack, Typography } from "@mui/material";
import { requirePermission } from "@/lib/require-permission";
import { ManageAllCreditLimitsClient } from "../_components/manage-all-credit-limits-client";

export default async function ManageAllCreditLimitsPage() {
  await requirePermission("customers", "edit");

  return (
    <Stack spacing={2}>
      <Typography variant="h4" fontWeight={700}>
        จัดการวงเงินทั้งหมด
      </Typography>
      <Typography variant="body2" color="text.secondary">
        แก้ไขวงเงินเครดิตและวงเงินส่งเสริมการขายสำหรับร้านค้าทั้งหมด (Dealer)
      </Typography>

      <ManageAllCreditLimitsClient />
    </Stack>
  );
}