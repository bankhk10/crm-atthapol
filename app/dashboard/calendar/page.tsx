import { Stack, Typography } from "@mui/material";
import { ActionButtons } from "../_components/action-buttons";

export default function CalendarPage() {
  return (
    <>
      <ActionButtons resource="calendar" />
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          ปฏิทิน
        </Typography>
        <Typography color="text.secondary">หน้าว่างสำหรับการจัดการปฏิทิน</Typography>
      </Stack>
    </>
  );
}
