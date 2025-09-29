import { Stack, Typography } from "@mui/material";
import { ActionButtons } from "../_components/action-buttons";

export default function ActivitiesPage() {
  return (
    <>
      <ActionButtons resource="activities" />
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          กิจกรรม
        </Typography>
        <Typography color="text.secondary">หน้าว่างสำหรับจัดการกิจกรรม</Typography>
      </Stack>
    </>
  );
}
