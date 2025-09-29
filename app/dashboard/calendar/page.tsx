import { Stack, Typography } from "@mui/material";

export default function CalendarPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h4" fontWeight={700}>
        ปฏิทิน
      </Typography>
      <Typography color="text.secondary">หน้าว่างสำหรับการจัดการปฏิทิน</Typography>
    </Stack>
  );
}
