import {
  Box,
  Chip,
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
import { Sparkline } from "../_components/Sparkline";
import { getActivityForPeriod } from "../_mock/derive";
import { ReportPeriodFilter } from "../_components/ReportPeriodFilter";
import { formatPeriodLabel, parseSearchParams } from "@/lib/report-period";
import InProgressPage from "../../_components/In-progress";

export default function ActivityReportPage({ searchParams }: any) {
  const period = parseSearchParams(searchParams);
  const data = getActivityForPeriod(period);
  return (
    <>
      <InProgressPage />
    </>
  );
}
