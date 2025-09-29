import { Stack, Typography } from "@mui/material";
import { ActionButtons } from "../_components/action-buttons";

export default function CustomersPage() {
  return (
    <>
      <ActionButtons resource="customers" />
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          ลูกค้า
        </Typography>
        <Typography color="text.secondary">หน้าว่างสำหรับการจัดการลูกค้า</Typography>
      </Stack>
    </>
  );
}
