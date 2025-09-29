import { Stack, Typography } from "@mui/material";

export default function ProductsPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h4" fontWeight={700}>
        สินค้า
      </Typography>
      <Typography color="text.secondary">หน้าว่างสำหรับการจัดการสินค้า</Typography>
    </Stack>
  );
}
