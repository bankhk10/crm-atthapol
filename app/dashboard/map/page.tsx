import { Stack, Typography } from "@mui/material";
import { ActionButtons } from "../_components/action-buttons";

export default function MapPage() {
  return (
    <>
      <ActionButtons resource="map" />
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          แผนที่
        </Typography>
        <Typography color="text.secondary">
          หน้าว่างสำหรับแสดงข้อมูลแผนที่ ลูกค้าสามารถปรับปรุงภายหลังได้ตามความต้องการ
          เช่น การปักหมุดสาขาและการวิเคราะห์พื้นที่เป้าหมาย
        </Typography>
      </Stack>
    </>
  );
}
