import { Box, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
 
import { ActionButtons } from "../../_components/action-buttons";
import { BarList } from "../_components/BarList";
import { salesMock } from "../_mock";

function currency(n: number) {
  return n.toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

export default function SalesReportPage() {
  const channelTotal = salesMock.channels.reduce((s, c) => s + c.value, 0);

  return (
    <>
      <ActionButtons resource="reports" />
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          รายงานการขาย
        </Typography>
        <Typography color="text.secondary">ช่วงเวลา: {salesMock.periodLabel}</Typography>
      </Stack>

      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "5fr 7fr" }} gap={2} mt={1}>
        <Box>
          <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
            <Typography fontWeight={700} mb={1}>รายได้ตามช่องทาง</Typography>
            <BarList items={salesMock.channels} total={channelTotal} />
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
                { label: `Leads (${salesMock.funnel.leads})`, value: salesMock.funnel.leads, color: "#90caf9" },
                { label: `Opp (${salesMock.funnel.opportunities})`, value: salesMock.funnel.opportunities, color: "#64b5f6" },
                { label: `Quotation (${salesMock.funnel.quotations})`, value: salesMock.funnel.quotations, color: "#42a5f5" },
                { label: `Orders (${salesMock.funnel.orders})`, value: salesMock.funnel.orders, color: "#1e88e5" },
              ]}
              total={salesMock.funnel.leads}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1.25, display: "block" }}>
              อัตราชนะ (Win Rate): {salesMock.funnel.winRate.toFixed(1)}%
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
                  {salesMock.byCategory.map((c) => (
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
                  {salesMock.topCustomers.map((c) => (
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

