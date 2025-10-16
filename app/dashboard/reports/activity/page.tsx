import { Box, Chip, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { ActionButtons } from "../../_components/action-buttons";
import { KpiCard } from "../_components/KpiCard";
import { Sparkline } from "../_components/Sparkline";
import { getActivityForPeriod } from "../_mock/derive";
import { ReportPeriodFilter } from "../_components/ReportPeriodFilter";
import { formatPeriodLabel, parseSearchParams } from "@/lib/report-period";

export default function ActivityReportPage({ searchParams }: any) {
  const period = parseSearchParams(searchParams);
  const data = getActivityForPeriod(period);
  return (
    <>
      <ActionButtons resource="reports" />
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          รายงานกิจกรรม
        </Typography>
        <Typography color="text.secondary">ช่วงเวลา: {formatPeriodLabel(period)}</Typography>
      </Stack>

      <Box mt={1}>
        <ReportPeriodFilter />
      </Box>

      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "repeat(4, 1fr)" }} gap={2} mt={1}>
        <Box>
          <KpiCard label={data.kpis.total.label} value={data.kpis.total.value} delta={data.kpis.total.delta} />
        </Box>
        <Box>
          <KpiCard label={data.kpis.meetings.label} value={data.kpis.meetings.value} delta={data.kpis.meetings.delta} />
        </Box>
        <Box>
          <KpiCard label={data.kpis.calls.label} value={data.kpis.calls.value} delta={data.kpis.calls.delta} />
        </Box>
        <Box>
          <KpiCard label={data.kpis.tasks.label} value={data.kpis.tasks.value} delta={data.kpis.tasks.delta} />
        </Box>
      </Box>

      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "7fr 5fr" }} gap={2} mt={0.5}>
        <Box>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography fontWeight={700} mb={1}>กิจกรรมรายสัปดาห์ (12 สัปดาห์)</Typography>
            <Sparkline data={data.byWeek} stroke="#2e7d32" fill="rgba(46, 125, 50, 0.12)" />
          </Paper>
        </Box>
        <Box>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography fontWeight={700} mb={1}>กิจกรรมล่าสุด</Typography>
            <Stack spacing={1.25}>
              {data.recent.map((a, i) => (
                <Stack key={`${a.title}-${i}`} direction="row" spacing={1.25} alignItems="center">
                  <Chip size="small" variant="outlined" label={a.type} />
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

      <Box mt={0.5}>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography fontWeight={700} mb={1}>ประสิทธิภาพทีม</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>พนักงาน</TableCell>
                    <TableCell align="right">งานสำเร็จ</TableCell>
                    <TableCell align="right">ตรงเวลา</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.team.map((m) => (
                    <TableRow key={m.name} hover>
                      <TableCell>{m.name}</TableCell>
                      <TableCell align="right">{m.done}%</TableCell>
                      <TableCell align="right">{m.ontime}%</TableCell>
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

