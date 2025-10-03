import { Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { ActionButtons } from "../_components/action-buttons";

export default function CustomersPage() {
  return (
    <>
      <ActionButtons resource="customers" />
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          ลูกค้า
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button
            component={Link}
            href="/dashboard/customers/new"
            variant="contained"
          >
            เพิ่มลูกค้า
          </Button>
        </Stack>
        <Typography color="text.secondary">หน้าว่างสำหรับการจัดการลูกค้า</Typography>
      </Stack>
    </>
  );
}
