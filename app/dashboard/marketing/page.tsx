import { Stack, Typography } from "@mui/material";
import { ActionButtons } from "../_components/action-buttons";
import InProgressPage from "../_components/In-progress";

export default function MarketingPage() {
  return (
    <>
      <InProgressPage />
      {/* <ActionButtons resource="marketing" />
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          การตลาด
        </Typography>
        <Typography color="text.secondary">หน้าว่างสำหรับการจัดการการตลาด</Typography>
      </Stack> */}
    </>
  );
}
