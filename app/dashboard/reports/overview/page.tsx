import { Box, Chip, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
 
import { ActionButtons } from "../../_components/action-buttons";
import { KpiCard } from "../_components/KpiCard";
import { Sparkline } from "../_components/Sparkline";
import { BarList } from "../_components/BarList";
import { getOverviewForPeriod } from "../_mock/derive";
import { ReportPeriodFilter } from "../_components/ReportPeriodFilter";
import { formatPeriodLabel, parseSearchParams } from "@/lib/report-period";

function currency(n: number) {
  return n.toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

export default function OverviewReportPage({ searchParams }: any) {
  const period = parseSearchParams(searchParams);
  const data = getOverviewForPeriod(period);
  const totalRevenue = data.kpis.revenue.value;
  const productTotal = data.topProducts.reduce((s, p) => s + p.revenue, 0);

  return (
    <>
      <ActionButtons resource="reports" />
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          รายงานภาพรวม
        </Typography>
        <Typography color="text.secondary">ช่วงเวลา: {formatPeriodLabel(period)}</Typography>
      </Stack>

      <Box mt={1}>
        <ReportPeriodFilter />
      </Box>

      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "repeat(4, 1fr)" }} gap={2} mt={1}>
        <Box>
          <KpiCard label={data.kpis.revenue.label} value={`${currency(totalRevenue)} บาท`} helpText={data.kpis.revenue.help} delta={data.kpis.revenue.delta} />
        </Box>
        <Box>
          <KpiCard label={data.kpis.orders.label} value={data.kpis.orders.value} helpText={data.kpis.orders.help} delta={data.kpis.orders.delta} />
        </Box>
        <Box>
          <KpiCard label={data.kpis.aov.label} value={`${currency(data.kpis.aov.value)} บาท`} helpText={data.kpis.aov.help} delta={data.kpis.aov.delta} />
        </Box>
        <Box>
          <KpiCard label={data.kpis.newCustomers.label} value={data.kpis.newCustomers.value} helpText={data.kpis.newCustomers.help} delta={data.kpis.newCustomers.delta} />
        </Box>
      </Box>

      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "7fr 5fr" }} gap={2} mt={0.5}>
        <Box>
          <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
            <Stack spacing={1.5}>
              <Typography fontWeight={700}>แนวโน้มยอดขาย 12 เดือน</Typography>
              <Sparkline data={data.trend} />
              <Stack direction="row" spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  ยอดขายเฉลี่ย/เดือน: {currency(Math.round(data.trend.reduce((a, b) => a + b, 0) / data.trend.length))} บาท
                </Typography>
              </Stack>
            </Stack>
          </Paper>
        </Box>
        <Box>
          <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
            <Stack spacing={1.25}>
              <Typography fontWeight={700}>สัดส่วนรายได้ตามสินค้า</Typography>
              <BarList items={data.topProducts.map((p, idx) => ({ label: p.name, value: p.revenue, color: ["#1976d2", "#2e7d32", "#ed6c02", "#6d4c41", "#9c27b0"][idx % 5] }))} total={productTotal} />
              <Typography variant="caption" color="text.secondary">
                รวมสินค้าชั้นนำ {currency(productTotal)} บาท
              </Typography>
            </Stack>
          </Paper>
        </Box>
      </Box>

      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "7fr 5fr" }} gap={2} mt={0.5}>
        <Box>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography fontWeight={700} mb={1}>สินค้าขายดี</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>สินค้า</TableCell>
                    <TableCell>หมวดหมู่</TableCell>
                    <TableCell align="right">จำนวน</TableCell>
                    <TableCell align="right">รายได้</TableCell>
                    <TableCell align="right">สัดส่วน</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.topProducts.map((p) => {
                    const share = productTotal ? (p.revenue / productTotal) * 100 : 0;
                    return (
                      <TableRow key={p.name} hover>
                        <TableCell>{p.name}</TableCell>
                        <TableCell>{p.category}</TableCell>
                        <TableCell align="right">{p.units}</TableCell>
                        <TableCell align="right">{currency(p.revenue)} บาท</TableCell>
                        <TableCell align="right">{share.toFixed(1)}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
        <Box>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography fontWeight={700} mb={1}>กิจกรรมล่าสุด</Typography>
            <Stack spacing={1.25}>
              {data.recentActivities.map((a, i) => (
                <Stack key={`${a.title}-${i}`} direction="row" spacing={1.5} alignItems="center">
                  <Chip
                    size="small"
                    variant="outlined"
                    color={a.type === "order" ? "success" : a.type === "meeting" ? "primary" : a.type === "call" ? "secondary" : "default"}
                    label={a.type}
                  />
                  <Box flex={1}>
                    <Typography variant="body2" fontWeight={600}>{a.title}</Typography>
                    <Typography variant="caption" color="text.secondary">โดย {a.owner} • {a.when}</Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Box>
      </Box>
    </>
  );
}

