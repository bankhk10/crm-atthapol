import { Stack, Typography } from "@mui/material";
import { ActionButtons } from "../_components/action-buttons";
import { requirePermission } from "@/lib/require-permission";

export default async function MarketingPage() {
  await requirePermission("marketing", "view");
  return (
    <>
      <ActionButtons resource="marketing" />
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          การตลาด
        </Typography>
        <Typography color="text.secondary">หน้าว่างสำหรับการจัดการการตลาด</Typography>
      </Stack>
    </>
  );
}
