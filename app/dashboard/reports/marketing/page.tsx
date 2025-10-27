import {
  Box,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { ActionButtons } from "../../_components/action-buttons";
import { KpiCard } from "../_components/KpiCard";
import { BarList } from "../_components/BarList";
import { getMarketingForPeriod } from "../_mock/derive";
import { ReportPeriodFilter } from "../_components/ReportPeriodFilter";
import { formatPeriodLabel, parseSearchParams } from "@/lib/report-period";
import InProgressPage from "../../_components/In-progress";

function currency(n: number) {
  return n.toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

export default function MarketingReportPage({ searchParams }: any) {
  const period = parseSearchParams(searchParams);
  const data = getMarketingForPeriod(period);
  const funnelTotal = data.funnel[0]?.value ?? 0; // visits

  return (
    <>
      <InProgressPage />
    </>
  );
}
