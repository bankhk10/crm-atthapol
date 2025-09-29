import { Stack, Typography } from "@mui/material";
import { ActionButtons } from "../../_components/action-buttons";

export default function OverviewReportPage() {
  return (
    <>
      <ActionButtons resource="reports" />
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          รายงานภาพรวม
        </Typography>
        <Typography color="text.secondary">
          หน้าว่างสำหรับสรุปข้อมูลภาพรวมของธุรกิจ เช่น ยอดขาย สถานะลูกค้า และกิจกรรมล่าสุด
          ผู้ดูแลระบบสามารถปรับแต่งแผนภูมิและตัวเลขสำคัญให้ตรงกับความต้องการของทีมได้ภายหลัง
        </Typography>
      </Stack>
    </>
  );
}
