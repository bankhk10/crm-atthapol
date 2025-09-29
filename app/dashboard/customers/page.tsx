import { Stack, Typography } from "@mui/material";

export default function CustomersPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h4" fontWeight={700}>
        ลูกค้า
      </Typography>
      <Typography color="text.secondary">หน้าว่างสำหรับการจัดการลูกค้า</Typography>
    </Stack>
  );
}
