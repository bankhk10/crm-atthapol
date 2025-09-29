import { Stack, Typography } from "@mui/material";
import { ActionButtons } from "../../_components/action-buttons";

export default function SalesReportPage() {
  return (
    <>
      <ActionButtons resource="reports" />
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          รายงานการขาย
        </Typography>
        <Typography color="text.secondary">หน้าว่างสำหรับเนื้อหารายงานการขาย</Typography>
      </Stack>
    </>
  );
}
