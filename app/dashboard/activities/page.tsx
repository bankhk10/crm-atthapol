import { Stack, Typography } from "@mui/material";

export default function ActivitiesPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h4" fontWeight={700}>
        กิจกรรม
      </Typography>
      <Typography color="text.secondary">หน้าว่างสำหรับจัดการกิจกรรม</Typography>
    </Stack>
  );
}
