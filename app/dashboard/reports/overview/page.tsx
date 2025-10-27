import { Box, Chip, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
 
import { ActionButtons } from "../../_components/action-buttons";
import { KpiCard } from "../_components/KpiCard";
import { Sparkline } from "../_components/Sparkline";
import { BarList } from "../_components/BarList";
import { getOverviewForPeriod } from "../_mock/derive";
import { ReportPeriodFilter } from "../_components/ReportPeriodFilter";
import { formatPeriodLabel, parseSearchParams } from "@/lib/report-period";
import InProgressPage from "../../_components/In-progress";

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
      <InProgressPage />
    </>
  );
}

