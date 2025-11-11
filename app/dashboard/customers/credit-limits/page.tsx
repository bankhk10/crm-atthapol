import { Stack, Typography, Box, Button } from "@mui/material";
import Link from "next/link";
import { requirePermission } from "@/lib/require-permission";
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
          <CreditLimitsClient />
        </Box>
      </Stack>
    </>
  );
}