import { Stack, Typography } from "@mui/material";

export default function ActivityReportPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h4" fontWeight={700}>
        รายงานกิจกรรม
      </Typography>
      <Typography color="text.secondary">หน้าว่างสำหรับเนื้อหารายงานกิจกรรม</Typography>
    </Stack>
  );
}
