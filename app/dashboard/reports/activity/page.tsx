import { Box, Chip, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { ActionButtons } from "../../_components/action-buttons";
import { KpiCard } from "../_components/KpiCard";
import { Sparkline } from "../_components/Sparkline";
import { activityMock } from "../_mock";

export default function ActivityReportPage() {
  return (
    <>
      <ActionButtons resource="reports" />
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          รายงานกิจกรรม
        </Typography>
        <Typography color="text.secondary">ติดตามกิจกรรม ทีม และแนวโน้มการทำงาน</Typography>
      </Stack>

      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "repeat(4, 1fr)" }} gap={2} mt={1}>
        <Box>
          <KpiCard label={activityMock.kpis.total.label} value={activityMock.kpis.total.value} delta={activityMock.kpis.total.delta} />
        </Box>
        <Box>
          <KpiCard label={activityMock.kpis.meetings.label} value={activityMock.kpis.meetings.value} delta={activityMock.kpis.meetings.delta} />
        </Box>
        <Box>
          <KpiCard label={activityMock.kpis.calls.label} value={activityMock.kpis.calls.value} delta={activityMock.kpis.calls.delta} />
        </Box>
        <Box>
          <KpiCard label={activityMock.kpis.tasks.label} value={activityMock.kpis.tasks.value} delta={activityMock.kpis.tasks.delta} />
        </Box>
      </Box>

      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "7fr 5fr" }} gap={2} mt={0.5}>
        <Box>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography fontWeight={700} mb={1}>กิจกรรมรายสัปดาห์ (12 สัปดาห์)</Typography>
            <Sparkline data={activityMock.byWeek} stroke="#2e7d32" fill="rgba(46, 125, 50, 0.12)" />
          </Paper>
        </Box>
        <Box>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography fontWeight={700} mb={1}>กิจกรรมล่าสุด</Typography>
            <Stack spacing={1.25}>
              {activityMock.recent.map((a, i) => (
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
                  {activityMock.team.map((m) => (
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

