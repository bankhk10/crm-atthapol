import { Stack, Typography } from "@mui/material";

export default function EmployeesPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h4" fontWeight={700}>
        พนักงาน
      </Typography>
      <Typography color="text.secondary">หน้าว่างสำหรับการจัดการพนักงาน</Typography>
    </Stack>
  );
}
