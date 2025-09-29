import { Stack, Typography } from "@mui/material";
import { ActionButtons } from "../_components/action-buttons";

export default function ProductsPage() {
  return (
    <>
      <ActionButtons resource="products" />
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          สินค้า
        </Typography>
        <Typography color="text.secondary">หน้าว่างสำหรับการจัดการสินค้า</Typography>
      </Stack>
    </>
  );
}
