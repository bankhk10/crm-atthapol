"use client";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SaveIcon from "@mui/icons-material/Save";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";

import { hasPermission } from "@/lib/permissions";

import type { Option, ProductOption } from "../../orders/types";

type ForecastStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

type ForecastLineState = {
  customerId?: string;
  productId?: string;
  channel?: string;
  expectedQuantity: number | "";
  expectedRevenue: number | "";
  confidence: number | "";
  note?: string;
};

type ForecastMonthState = {
  month: number;
  targetRevenue: number | "";
  targetQuantity: number | "";
  note?: string;
  lines: ForecastLineState[];
};

export type ForecastDetail = {
  id: string;
  name: string;
  year: number;
  currency: string;
  status: ForecastStatus;
  salespersonId: string;
  notes?: string | null;
  months: Array<{
    month: number;
    targetRevenue: number | null;
    targetQuantity: number | null;
    note?: string | null;
    lines: Array<{
      customerId?: string | null;
      productId?: string | null;
      channel?: string | null;
      expectedQuantity?: number | null;
      expectedRevenue?: number | null;
      confidence?: number | null;
      note?: string | null;
    }>;
  }>;
};

export type CustomerOption = {
  id: string;
  label: string;
};

type Props = {
  mode: "create" | "edit";
  initialData?: ForecastDetail | null;
  employeeOptions: Option[];
  customerOptions: CustomerOption[];
  productOptions: ProductOption[];
};

const STATUS_OPTIONS: Array<{ value: ForecastStatus; label: string; permission?: "approve" | "reject" }>
  = [
    { value: "DRAFT", label: "ร่าง" },
    { value: "SUBMITTED", label: "ส่งอนุมัติ" },
    { value: "APPROVED", label: "อนุมัติ", permission: "approve" },
    { value: "REJECTED", label: "ปฏิเสธ", permission: "reject" },
  ];

function buildDefaultMonths(): ForecastMonthState[] {
  return Array.from({ length: 12 }, (_, idx) => ({
    month: idx + 1,
    targetRevenue: "",
    targetQuantity: "",
    note: "",
    lines: [],
  }));
}

function mapInitialMonths(initial?: ForecastDetail["months"]): ForecastMonthState[] {
  const base = buildDefaultMonths();
  if (!initial || initial.length === 0) return base;
  const map = new Map(base.map((m) => [m.month, { ...m }]));
  for (const month of initial) {
    map.set(month.month, {
      month: month.month,
      targetRevenue: month.targetRevenue ?? "",
      targetQuantity: month.targetQuantity ?? "",
      note: month.note ?? "",
      lines: (month.lines ?? []).map((line) => ({
        customerId: line.customerId ?? undefined,
        productId: line.productId ?? undefined,
        channel: line.channel ?? undefined,
        expectedQuantity: line.expectedQuantity ?? "",
        expectedRevenue: line.expectedRevenue ?? "",
        confidence: line.confidence ?? "",
        note: line.note ?? "",
      })),
    });
  }
  return Array.from(map.values()).sort((a, b) => a.month - b.month);
}

const numberFormatter = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function ForecastForm({
  mode,
  initialData,
  employeeOptions,
  customerOptions,
  productOptions,
}: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const canCreate = hasPermission(session?.user?.permissions, "sales", "create");
  const canEdit = hasPermission(session?.user?.permissions, "sales", "edit");
  const canDelete = hasPermission(session?.user?.permissions, "sales", "delete");
  const canApprove = hasPermission(session?.user?.permissions, "sales", "approve");
  const canReject = hasPermission(session?.user?.permissions, "sales", "reject");
  const readOnly = mode === "edit" && !canEdit;

  const [name, setName] = useState(initialData?.name ?? "");
  const [year, setYear] = useState(initialData?.year ?? new Date().getFullYear());
  const [currency, setCurrency] = useState(initialData?.currency ?? "THB");
  const [salespersonId, setSalespersonId] = useState(initialData?.salespersonId ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [status, setStatus] = useState<ForecastStatus>(initialData?.status ?? "DRAFT");
  const [months, setMonths] = useState<ForecastMonthState[]>(() =>
    initialData ? mapInitialMonths(initialData.months) : buildDefaultMonths(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const summary = useMemo(() => {
    return months.reduce(
      (acc, month) => {
        const rev = Number(month.targetRevenue) || 0;
        const qty = Number(month.targetQuantity) || 0;
        acc.totalRevenue += rev;
        acc.totalQuantity += qty;
        return acc;
      },
      { totalRevenue: 0, totalQuantity: 0 },
    );
  }, [months]);

  const handleMonthField = (index: number, key: keyof ForecastMonthState, value: string) => {
    setMonths((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [key]: key === "note" ? value : value === "" ? "" : Number(value),
      } as ForecastMonthState;
      return next;
    });
  };

  const handleLineChange = (
    monthIndex: number,
    lineIndex: number,
    key: keyof ForecastLineState,
    value: string,
  ) => {
    setMonths((prev) => {
      const next = [...prev];
      const lines = [...next[monthIndex].lines];
      lines[lineIndex] = {
        ...lines[lineIndex],
        [key]: ["expectedQuantity", "expectedRevenue", "confidence"].includes(key)
          ? value === ""
            ? ""
            : Number(value)
          : value,
      } as ForecastLineState;
      next[monthIndex] = { ...next[monthIndex], lines };
      return next;
    });
  };

  const addLine = (monthIndex: number) => {
    setMonths((prev) => {
      const next = [...prev];
      next[monthIndex] = {
        ...next[monthIndex],
        lines: [
          ...next[monthIndex].lines,
          {
            customerId: "",
            productId: "",
            channel: "",
            expectedQuantity: "",
            expectedRevenue: "",
            confidence: "",
            note: "",
          },
        ],
      };
      return next;
    });
  };

  const removeLine = (monthIndex: number, lineIndex: number) => {
    setMonths((prev) => {
      const next = [...prev];
      next[monthIndex] = {
        ...next[monthIndex],
        lines: next[monthIndex].lines.filter((_, idx) => idx !== lineIndex),
      };
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("กรุณากรอกชื่อแผน");
      return;
    }
    if (!salespersonId) {
      setError("กรุณาเลือกพนักงานผู้รับผิดชอบ");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        year: Number(year) || new Date().getFullYear(),
        currency: currency || "THB",
        salespersonId,
        notes: notes?.trim() || undefined,
        status,
        months: months.map((month) => ({
          month: month.month,
          targetRevenue: Number(month.targetRevenue) || 0,
          targetQuantity: Number(month.targetQuantity) || 0,
          note: month.note?.trim() || undefined,
          lines: month.lines
            .filter((line) =>
              Boolean(
                line.customerId ||
                  line.productId ||
                  line.channel ||
                  line.expectedQuantity ||
                  line.expectedRevenue,
              ),
            )
            .map((line) => ({
              customerId: line.customerId || undefined,
              productId: line.productId || undefined,
              channel: line.channel || undefined,
              expectedQuantity: line.expectedQuantity === "" ? undefined : Number(line.expectedQuantity) || 0,
              expectedRevenue: line.expectedRevenue === "" ? undefined : Number(line.expectedRevenue) || 0,
              confidence: (() => {
                if (line.confidence === "") return undefined;
                const value = Number(line.confidence);
                return Number.isFinite(value) ? value : undefined;
              })(),
              note: line.note?.trim() || undefined,
            })),
        })),
      };

      const endpoint =
        mode === "create"
          ? "/api/sales/forecasts"
          : `/api/sales/forecasts/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "บันทึกไม่สำเร็จ");
      }
      setSuccess("บันทึกสำเร็จ");
      if (mode === "create" && data?.id) {
        router.push(`/dashboard/sales/forecasts/${data.id}`);
      } else if (mode === "edit") {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;
    const confirm = window.confirm("ยืนยันการลบ Forecast นี้?");
    if (!confirm) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sales/forecasts/${initialData.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "ลบไม่สำเร็จ");
      }
      router.push("/dashboard/sales/forecasts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const disableSubmit = readOnly || saving || (mode === "create" ? !canCreate : false);

  return (
    <Stack spacing={3}>
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={700}>
            ข้อมูลพื้นฐาน
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="ชื่อแผน"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                disabled={readOnly}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                type="number"
                label="ปี"
                value={year}
                onChange={(e) => setYear(Number(e.target.value) || year)}
                fullWidth
                disabled={readOnly}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                label="สกุลเงิน"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                fullWidth
                disabled={readOnly}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                select
                label="พนักงานผู้รับผิดชอบ"
                value={salespersonId}
                onChange={(e) => setSalespersonId(e.target.value)}
                fullWidth
                disabled={readOnly}
              >
                <MenuItem value="">เลือกพนักงาน</MenuItem>
                {employeeOptions.map((opt) => (
                  <MenuItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                select
                label="สถานะ"
                value={status}
                onChange={(e) => setStatus(e.target.value as ForecastStatus)}
                fullWidth
                disabled={readOnly}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <MenuItem
                    key={opt.value}
                    value={opt.value}
                    disabled={
                      (opt.permission === "approve" && !canApprove) ||
                      (opt.permission === "reject" && !canReject)
                    }
                  >
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="หมายเหตุ"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                fullWidth
                multiline
                minRows={2}
                disabled={readOnly}
              />
            </Grid>
          </Grid>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
          <Typography variant="h6" fontWeight={700} flexGrow={1}>
            เป้าหมายรวม
          </Typography>
          <Stack direction="row" spacing={2}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                มูลค่ารวม
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {numberFormatter.format(summary.totalRevenue)} {currency}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                จำนวนรวม
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {numberFormatter.format(summary.totalQuantity)} หน่วย
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Paper>

      <Stack spacing={2}>
        {months.map((monthState, idx) => (
          <Accordion key={monthState.month} defaultExpanded={idx === new Date().getMonth()}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ width: "100%" }}>
                <Typography fontWeight={600}>เดือน {monthState.month}</Typography>
                <Typography color="text.secondary">
                  เป้า {numberFormatter.format(Number(monthState.targetRevenue) || 0)} {currency} / {" "}
                  {numberFormatter.format(Number(monthState.targetQuantity) || 0)} หน่วย
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    type="number"
                    label="เป้ายอดขาย (บาท)"
                    value={monthState.targetRevenue}
                    onChange={(e) => handleMonthField(idx, "targetRevenue", e.target.value)}
                    fullWidth
                    disabled={readOnly}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    type="number"
                    label="เป้าจำนวน (หน่วย)"
                    value={monthState.targetQuantity}
                    onChange={(e) => handleMonthField(idx, "targetQuantity", e.target.value)}
                    fullWidth
                    disabled={readOnly}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="หมายเหตุ"
                    value={monthState.note}
                    onChange={(e) => handleMonthField(idx, "note", e.target.value)}
                    fullWidth
                    multiline
                    minRows={2}
                    disabled={readOnly}
                  />
                </Grid>
              </Grid>

              <Stack spacing={2} mt={2}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    รายการขายภายใต้เดือนนี้
                  </Typography>
                  <Button
                    startIcon={<AddIcon />}
                    variant="outlined"
                    size="small"
                    onClick={() => addLine(idx)}
                    disabled={readOnly}
                  >
                    เพิ่มรายการ
                  </Button>
                </Stack>

                {monthState.lines.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    ยังไม่มีรายการสินค้า
                  </Typography>
                ) : (
                  monthState.lines.map((line, lineIdx) => (
                    <Paper key={lineIdx} variant="outlined" sx={{ p: 2 }}>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <TextField
                            select
                            label="ลูกค้า"
                            value={line.customerId ?? ""}
                            onChange={(e) => handleLineChange(idx, lineIdx, "customerId", e.target.value)}
                            fullWidth
                            disabled={readOnly}
                          >
                            <MenuItem value="">เลือก (ไม่บังคับ)</MenuItem>
                            {customerOptions.map((opt) => (
                              <MenuItem key={opt.id} value={opt.id}>
                                {opt.label}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <TextField
                            select
                            label="สินค้า"
                            value={line.productId ?? ""}
                            onChange={(e) => handleLineChange(idx, lineIdx, "productId", e.target.value)}
                            fullWidth
                            disabled={readOnly}
                          >
                            <MenuItem value="">เลือก (ไม่บังคับ)</MenuItem>
                            {productOptions.map((opt) => (
                              <MenuItem key={opt.id} value={opt.id}>
                                {opt.nameTH}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <TextField
                            label="ช่องทาง"
                            value={line.channel ?? ""}
                            onChange={(e) => handleLineChange(idx, lineIdx, "channel", e.target.value)}
                            fullWidth
                            disabled={readOnly}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <TextField
                            type="number"
                            label="จำนวนคาดการณ์"
                            value={line.expectedQuantity}
                            onChange={(e) => handleLineChange(idx, lineIdx, "expectedQuantity", e.target.value)}
                            fullWidth
                            disabled={readOnly}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <TextField
                            type="number"
                            label="มูลค่าคาดการณ์"
                            value={line.expectedRevenue}
                            onChange={(e) => handleLineChange(idx, lineIdx, "expectedRevenue", e.target.value)}
                            fullWidth
                            disabled={readOnly}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <TextField
                            type="number"
                            label="ความมั่นใจ (%)"
                            value={line.confidence}
                            onChange={(e) => handleLineChange(idx, lineIdx, "confidence", e.target.value)}
                            fullWidth
                            disabled={readOnly}
                          />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <TextField
                            label="หมายเหตุ"
                            value={line.note ?? ""}
                            onChange={(e) => handleLineChange(idx, lineIdx, "note", e.target.value)}
                            fullWidth
                            disabled={readOnly}
                          />
                        </Grid>
                        {!readOnly && (
                          <Grid size={{ xs: 12 }}>
                            <Stack direction="row" justifyContent="flex-end">
                              <Tooltip title="ลบรายการ">
                                <IconButton onClick={() => removeLine(idx, lineIdx)}>
                                  <RemoveCircleOutlineIcon />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </Grid>
                        )}
                      </Grid>
                    </Paper>
                  ))
                )}
              </Stack>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="flex-end">
        {mode === "edit" && canDelete && initialData?.id ? (
          <Button
            color="error"
            variant="outlined"
            startIcon={<DeleteOutlineIcon />}
            onClick={handleDelete}
            disabled={saving}
          >
            ลบ Forecast
          </Button>
        ) : null}
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSubmit}
          disabled={disableSubmit || saving}
        >
          บันทึก
        </Button>
      </Stack>
    </Stack>
  );
}
