import { Box, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { ActionButtons } from "../../_components/action-buttons";
import { KpiCard } from "../_components/KpiCard";
import { BarList } from "../_components/BarList";
import { getMarketingForPeriod } from "../_mock/derive";
import { ReportPeriodFilter } from "../_components/ReportPeriodFilter";
import { formatPeriodLabel, parseSearchParams } from "@/lib/report-period";

function currency(n: number) {
  return n.toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

export default function MarketingReportPage({ searchParams }: any) {
  const period = parseSearchParams(searchParams);
  const data = getMarketingForPeriod(period);
  const funnelTotal = data.funnel[0]?.value ?? 0; // visits

  return (
    <>
      <ActionButtons resource="reports" />
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          รายงานการตลาด
        </Typography>
        <Typography color="text.secondary">ช่วงเวลา: {formatPeriodLabel(period)}</Typography>
      </Stack>

      <Box mt={1}>
        <ReportPeriodFilter />
      </Box>

      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "repeat(4, 1fr)" }} gap={2} mt={1}>
        <Box>
          <KpiCard label={data.kpis.leads.label} value={data.kpis.leads.value} delta={data.kpis.leads.delta} />
        </Box>
        <Box>
          <KpiCard label={data.kpis.spend.label} value={`${currency(data.kpis.spend.value)} บาท`} delta={data.kpis.spend.delta} />
        </Box>
        <Box>
          <KpiCard label={data.kpis.cpl.label} value={`${Number(data.kpis.cpl.value).toFixed(1)} บาท`} delta={data.kpis.cpl.delta} />
        </Box>
        <Box>
          <KpiCard label={data.kpis.ctr.label} value={`${Number(data.kpis.ctr.value).toFixed(1)}%`} delta={data.kpis.ctr.delta} />
        </Box>
      </Box>

      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "7fr 5fr" }} gap={2} mt={0.5}>
        <Box>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography fontWeight={700} mb={1}>ประสิทธิภาพรายช่องทาง</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>ช่องทาง</TableCell>
                    <TableCell align="right">Impressions</TableCell>
                    <TableCell align="right">Clicks</TableCell>
                    <TableCell align="right">CTR</TableCell>
                    <TableCell align="right">Leads</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.channels.map((ch) => (
                    <TableRow key={ch.label} hover>
                      <TableCell>{ch.label}</TableCell>
                      <TableCell align="right">{ch.impressions.toLocaleString("th-TH")}</TableCell>
                      <TableCell align="right">{ch.clicks.toLocaleString("th-TH")}</TableCell>
                      <TableCell align="right">{((ch.clicks / Math.max(1, ch.impressions)) * 100).toFixed(2)}%</TableCell>
                      <TableCell align="right">{ch.leads}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
        <Box>
          <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
            <Typography fontWeight={700} mb={1}>Funnel การตลาด</Typography>
            <BarList items={data.funnel.map((f, i) => ({ label: `${f.label} (${f.value})`, value: f.value, color: ["#90caf9","#64b5f6","#42a5f5","#1e88e5","#1565c0","#0d47a1"][i % 6] }))} total={funnelTotal} />
          </Paper>
        </Box>
      </Box>

      <Box mt={0.5}>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography fontWeight={700} mb={1}>แคมเปญยอดนิยม</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>แคมเปญ</TableCell>
                    <TableCell>ช่องทาง</TableCell>
                    <TableCell align="right">งบใช้ไป</TableCell>
                    <TableCell align="right">Leads</TableCell>
                    <TableCell align="right">CPL</TableCell>
                    <TableCell align="right">ROI</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.campaigns.map((c) => (
                    <TableRow key={c.name} hover>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.channel}</TableCell>
                      <TableCell align="right">{currency(c.spend)} บาท</TableCell>
                      <TableCell align="right">{c.leads}</TableCell>
                      <TableCell align="right">{(c.spend / Math.max(1, c.leads)).toFixed(1)} บาท</TableCell>
                      <TableCell align="right">{c.roi}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
      </Box>
    </>
  );
}

