import { Stack, Typography, Box } from "@mui/material";
import { requirePermission } from "@/lib/require-permission";
import { CreditRequestList } from "./_components/credit-request-list";
import { CreditLimitsClient } from "./_components/credit-limits-client";

export default async function CustomersCreditLimitsPage() {
  await requirePermission("customers", "view");

  return (
    <>
      <Stack>
        <Typography variant="h4" fontWeight={700} align="center">
          จัดการวงเงิน
        </Typography>

        <Box sx={{ my: 4 }}>
          <CreditRequestList />
          <CreditLimitsClient />
        </Box>
      </Stack>
    </>
  );
}