import { Stack, Typography } from "@mui/material";
import { ActionButtons } from "../../_components/action-buttons";

export default function ActivityReportPage() {
  return (
    <>
      <ActionButtons resource="reports" />
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          รายงานกิจกรรม
        </Typography>
        <Typography color="text.secondary">หน้าว่างสำหรับเนื้อหารายงานกิจกรรม</Typography>
      </Stack>
    </>
  );
}
