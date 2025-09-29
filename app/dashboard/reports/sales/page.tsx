import { Stack, Typography } from "@mui/material";

export default function SalesReportPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h4" fontWeight={700}>
        รายงานการขาย
      </Typography>
      <Typography color="text.secondary">หน้าว่างสำหรับเนื้อหารายงานการขาย</Typography>
    </Stack>
  );
}
