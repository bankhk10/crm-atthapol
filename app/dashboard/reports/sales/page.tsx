import { Box, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
 
import { ActionButtons } from "../../_components/action-buttons";
import { BarList } from "../_components/BarList";
import { getSalesForPeriod } from "../_mock/derive";
import { ReportPeriodFilter } from "../_components/ReportPeriodFilter";
import { formatPeriodLabel, parseSearchParams } from "@/lib/report-period";

function currency(n: number) {
  return n.toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

export default function SalesReportPage({ searchParams }: any) {
  const period = parseSearchParams(searchParams);
  const data = getSalesForPeriod(period);
  const channelTotal = data.channels.reduce((s, c) => s + c.value, 0);

  return (
    <>
      <ActionButtons resource="reports" />
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          รายงานการขาย
        </Typography>
        <Typography color="text.secondary">ช่วงเวลา: {formatPeriodLabel(period)}</Typography>
      </Stack>

      <Box mt={1}>
        <ReportPeriodFilter />
      </Box>

      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "5fr 7fr" }} gap={2} mt={1}>
        <Box>
          <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
            <Typography fontWeight={700} mb={1}>รายได้ตามช่องทาง</Typography>
            <BarList items={data.channels} total={channelTotal} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1.25, display: "block" }}>
              รวม {currency(channelTotal)} บาท
            </Typography>
          </Paper>
        </Box>
        <Box>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography fontWeight={700} mb={1}>ภาพรวม Funnel</Typography>
            <BarList
              items={[
                { label: `Leads (${data.funnel.leads})`, value: data.funnel.leads, color: "#90caf9" },
                { label: `Opp (${data.funnel.opportunities})`, value: data.funnel.opportunities, color: "#64b5f6" },
                { label: `Quotation (${data.funnel.quotations})`, value: data.funnel.quotations, color: "#42a5f5" },
                { label: `Orders (${data.funnel.orders})`, value: data.funnel.orders, color: "#1e88e5" },
              ]}
              total={data.funnel.leads}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1.25, display: "block" }}>
              อัตราชนะ (Win Rate): {data.funnel.winRate.toFixed(1)}%
            </Typography>
          </Paper>
        </Box>
      </Box>

      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "7fr 5fr" }} gap={2} mt={0.5}>
        <Box>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography fontWeight={700} mb={1}>ยอดขายตามหมวดหมู่สินค้า</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>หมวดหมู่</TableCell>
                    <TableCell align="right">รายได้</TableCell>
                    <TableCell align="right">จำนวนชิ้น</TableCell>
                    <TableCell align="right">ราคาเฉลี่ย</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.byCategory.map((c) => (
                    <TableRow key={c.category} hover>
                      <TableCell>{c.category}</TableCell>
                      <TableCell align="right">{currency(c.revenue)} บาท</TableCell>
                      <TableCell align="right">{c.units}</TableCell>
                      <TableCell align="right">{currency(c.avg)} บาท</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
        <Box>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography fontWeight={700} mb={1}>ลูกค้าสร้างรายได้สูง</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>ลูกค้า</TableCell>
                    <TableCell align="right">รายได้</TableCell>
                    <TableCell align="right">ออเดอร์</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.topCustomers.map((c) => (
                    <TableRow key={c.name} hover>
                      <TableCell>{c.name}</TableCell>
                      <TableCell align="right">{currency(c.revenue)} บาท</TableCell>
                      <TableCell align="right">{c.orders}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </Box>
    </>
  );
}

