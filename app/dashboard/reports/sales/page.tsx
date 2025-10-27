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
import { BarList } from "../_components/BarList";
import { getSalesForPeriod } from "../_mock/derive";
import { ReportPeriodFilter } from "../_components/ReportPeriodFilter";
import { formatPeriodLabel, parseSearchParams } from "@/lib/report-period";
import InProgressPage from "../../_components/In-progress";

function currency(n: number) {
  return n.toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

export default function SalesReportPage({ searchParams }: any) {
  const period = parseSearchParams(searchParams);
  const data = getSalesForPeriod(period);
  const channelTotal = data.channels.reduce((s, c) => s + c.value, 0);

  return (
    <>
      <InProgressPage />
    </>
  );
}
