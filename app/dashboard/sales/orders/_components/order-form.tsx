"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
// Link removed; using router via shared buttons
import Autocomplete from "@mui/material/Autocomplete";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { th } from "date-fns/locale";
import ThaiAddressPicker from "@/components/ThaiAddressPicker";
import type { Option, ProductOption, OrderItemInput, OrderFormInitial } from "../types";
import { SaveBackButtons } from "@/components/SaveBackButtons";
import { FillRandomButton } from "@/components/FillRandomButton";
import { fillOrderFormRandom } from "@/lib/random-fill/order";
import Loader from "@/components/Loader";

// Option and ProductOption moved to ../types

// OrderItemInput, OrderFormInitial moved to ../types

const DEFAULT_ITEM: OrderItemInput = {
  nameSnapshot: "",
  unit: "",
  qty: 1,
  unitPrice: "",
  discountPercent: 0,
  discountAmount: "",
};

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "ร่าง" },
  { value: "PENDING_APPROVAL", label: "รออนุมัติ" },
  { value: "APPROVED", label: "อนุมัติ" },
  { value: "REJECTED", label: "ปฏิเสธ" },
  { value: "AWAITING_STOCK", label: "รอสินค้า" },
  { value: "READY_TO_SHIP", label: "รอจัดส่ง" },
  { value: "IN_TRANSIT", label: "อยู่ระหว่างจัดส่ง" },
  { value: "COMPLETED", label: "สำเร็จ" },
  { value: "CANCELLED", label: "ยกเลิก" },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: "UNPAID", label: "ยังไม่ชำระ" },
  { value: "PARTIAL", label: "บางส่วน" },
  { value: "PAID", label: "ชำระแล้ว" },
  { value: "OVERDUE", label: "เกินกำหนด" },
];

function computeTotals(
  items: OrderItemInput[],
  vatRate: number,
  shippingFee: number,
  otherCharges: number,
) {
  let subTotal = 0;
  let discountTotal = 0;
  let taxAmount = 0;
  for (const it of items) {
    const base = Number(it.qty) * Number(it.unitPrice);
    const discA = Math.max(0, Number(it.discountAmount ?? 0));
    const discP = Math.max(0, Math.min(100, Number(it.discountPercent ?? 0)));
    const discFromPct = base * (discP / 100);
    const disc = Math.min(base, discA + discFromPct);
    const taxable = Math.max(0, base - disc);
    subTotal += taxable;
    discountTotal += disc;
    taxAmount += taxable * (vatRate / 100);
  }
  const grandTotal = subTotal + taxAmount + Number(shippingFee || 0) + Number(otherCharges || 0);
  return { subTotal, discountTotal, taxAmount, grandTotal };
}

export type OrderFormProps = {
  mode: "create" | "edit";
  title: string;
  submitLabel: string;
  customerOptions: Option[];
  employeeOptions: Option[];
  productOptions: ProductOption[];
  initial?: Partial<OrderFormInitial>;
  onSubmit: (payload: any) => Promise<void> | void;
  showFillRandom?: boolean;
};

export function OrderForm({
  mode,
  title,
  submitLabel,
  customerOptions,
  employeeOptions,
  productOptions,
  initial,
  onSubmit,
  showFillRandom = false,
}: OrderFormProps) {
  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");
  const [salespersonId, setSalespersonId] = useState(initial?.salespersonId ?? "");
  const [orderDate, setOrderDate] = useState<string | null>(
    initial?.orderDate ?? new Date().toISOString().slice(0, 10),
  );
  const [dueDate, setDueDate] = useState<string | null>(initial?.dueDate ?? null);
  const [shippingDate, setShippingDate] = useState<string | null>(initial?.shippingDate ?? null);
  const [creditTermDays, setCreditTermDays] = useState<number | "">(initial?.creditTermDays ?? "");
  const [paymentCondition, setPaymentCondition] = useState<"PREPAID" | "POSTPAID">(
    initial?.paymentCondition ?? "PREPAID",
  );
  const [currency, setCurrency] = useState(initial?.currency ?? "THB");
  const [vatIncluded, setVatIncluded] = useState(initial?.vatIncluded ?? true);
  const [vatRate, setVatRate] = useState<number>(initial?.vatRate ?? 7);
  const [billAddressLine, setBillAddressLine] = useState(initial?.billAddressLine ?? "");
  const [billProvince, setBillProvince] = useState<string | undefined>(initial?.billProvince);
  const [billDistrict, setBillDistrict] = useState<string | undefined>(initial?.billDistrict);
  const [billSubdistrict, setBillSubdistrict] = useState<string | undefined>(
    initial?.billSubdistrict,
  );
  const [billPostalCode, setBillPostalCode] = useState<string | undefined>(initial?.billPostalCode);
  const [shipAddressLine, setShipAddressLine] = useState(initial?.shipAddressLine ?? "");
  const [shipProvince, setShipProvince] = useState<string | undefined>(initial?.shipProvince);
  const [shipDistrict, setShipDistrict] = useState<string | undefined>(initial?.shipDistrict);
  const [shipSubdistrict, setShipSubdistrict] = useState<string | undefined>(
    initial?.shipSubdistrict,
  );
  const [shipPostalCode, setShipPostalCode] = useState<string | undefined>(initial?.shipPostalCode);
  const [status, setStatus] = useState(initial?.status ?? "DRAFT");
  const [paymentStatus, setPaymentStatus] = useState(initial?.paymentStatus ?? "UNPAID");
  const [workflowStatus, setWorkflowStatus] = useState<string>(initial?.status ?? "DRAFT");
  const [shippingFee, setShippingFee] = useState<number | "">(initial?.shippingFee ?? 0);
  const [otherCharges, setOtherCharges] = useState<number | "">(initial?.otherCharges ?? 0);
  const [poNumber, setPoNumber] = useState(initial?.poNumber ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [items, setItems] = useState<OrderItemInput[]>(
    initial?.items?.length ? initial.items : [{ ...DEFAULT_ITEM }],
  );
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usePromotion, setUsePromotion] = useState(initial?.usePromotion ?? false);
  const [promotionAmount, setPromotionAmount] = useState<number | "">(
    initial?.promotionAmount ?? "",
  );
  const [promotionAvailable, setPromotionAvailable] = useState<number | null>(null);
  const [promotionLoading, setPromotionLoading] = useState(false);
  const [orderDiscount, setOrderDiscount] = useState<number | "">(initial?.orderDiscount ?? 0);
  const [rejectReason, setRejectReason] = useState<string>(initial?.rejectReason ?? "");
  const [cancelReason, setCancelReason] = useState<string>(initial?.cancelReason ?? "");
  const [autoPromotion, setAutoPromotion] = useState(false);

  const totals = useMemo(
    () =>
      computeTotals(
        items,
        Number(vatRate || 0),
        Number(shippingFee || 0),
        Number(otherCharges || 0),
      ),
    [items, vatRate, shippingFee, otherCharges],
  );
  const netGrandTotal = useMemo(() => {
    const od = Number(orderDiscount || 0);
    const net = Math.max(0, (totals?.grandTotal ?? 0) - (isNaN(od) ? 0 : od));
    return net;
  }, [totals, orderDiscount]);

  const allowedStatusOptions = STATUS_OPTIONS;

  const needRejectReason = mode === "edit" && workflowStatus === "REJECTED";
  const needCancelReason = mode === "edit" && workflowStatus === "CANCELLED";

  const handleFillRandom = () =>
    fillOrderFormRandom({
      customerOptions,
      employeeOptions,
      productOptions,
      setCustomerId,
      setBillAddressLine,
      setBillProvince,
      setBillDistrict,
      setBillSubdistrict,
      setBillPostalCode,
      setShipAddressLine,
      setShipProvince,
      setShipDistrict,
      setShipSubdistrict,
      setShipPostalCode,
      setSalespersonId,
      setOrderDate,
      setShippingDate,
      setPaymentCondition,
      setCreditTermDays,
      setDueDate,
      setCurrency,
      setVatIncluded,
      setVatRate,
      setPoNumber,
      setNote,
      setItems,
      setShippingFee,
      setOtherCharges,
      setOrderDiscount,
      setWorkflowStatus,
      setStatus,
      setPaymentStatus,
      setUsePromotion,
      setAutoPromotion,
    });

  useEffect(() => {
    if (!customerId) {
      setPromotionAvailable(null);
      return;
    }
    let cancelled = false;
    setPromotionLoading(true);
    fetch(`/api/customers/${customerId}/promotion-budget`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setPromotionAvailable(Number(d?.promotionBudget ?? 0));
      })
      .catch(() => {
        if (!cancelled) setPromotionAvailable(0);
      })
      .finally(() => {
        if (!cancelled) setPromotionLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  useEffect(() => {
    if (!autoPromotion || !usePromotion) return;
    if (promotionAvailable === null) return;
    const cap = Math.max(0, Math.floor((netGrandTotal || 0) * 0.1));
    const amt = Math.min(promotionAvailable ?? 0, cap);
    setPromotionAmount(amt > 0 ? amt : "");
    setAutoPromotion(false);
  }, [autoPromotion, usePromotion, promotionAvailable, netGrandTotal]);

  // Auto-calculate due date when credit days are filled
  useEffect(() => {
    if (paymentCondition !== "POSTPAID") return;
    if (creditTermDays === "") return;
    const days = Number(creditTermDays);
    if (!Number.isFinite(days) || days <= 0) return;
    const base = orderDate ? new Date(orderDate) : new Date();
    const computed = new Date(base);
    computed.setDate(computed.getDate() + days);
    const iso = computed.toISOString().slice(0, 10);
    setDueDate(iso);
  }, [creditTermDays, orderDate, paymentCondition]);

  const applyWorkflowMapping = (wf: string) => {
    setWorkflowStatus(wf);
    switch (wf) {
      case "DRAFT":
        setStatus("DRAFT");
        setPaymentStatus("UNPAID");
        break;
      case "PENDING_APPROVAL":
        setStatus("CONFIRMED");
        break;
      case "APPROVED":
        setStatus("APPROVED");
        break;
      case "REJECTED":
        setStatus("CANCELLED");
        break;
      case "AWAITING_STOCK":
        setStatus("CONFIRMED");
        break;
      case "READY_TO_SHIP":
        setStatus("APPROVED");
        break;
      case "IN_TRANSIT":
        setStatus("SHIPPED");
        break;
      case "COMPLETED":
        setStatus("SHIPPED");
        setPaymentStatus("PAID");
        break;
      case "CANCELLED":
        setStatus("CANCELLED");
        break;
      default:
        break;
    }
  };

  const canSubmit =
    customerId &&
    items.length > 0 &&
    items.every((i) => {
      if (!i.productId || i.qty <= 0) return false;
      const p = productOptions.find((x) => x.id === i.productId);
      if (!p) return false;
      return i.qty <= (p.stockOnHand ?? 0) || true;
    }) &&
    (!usePromotion ||
      (promotionAmount !== "" &&
        Number(promotionAmount) > 0 &&
        (promotionAvailable === null || Number(promotionAmount) <= Number(promotionAvailable)))) &&
    (!needRejectReason || (rejectReason || "").trim().length > 0) &&
    (!needCancelReason || (cancelReason || "").trim().length > 0);

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const buildAddress = (
        line: string,
        province?: string,
        district?: string,
        subdistrict?: string,
        postalCode?: string,
      ) => {
        const parts: string[] = [];
        if (line && line.trim()) parts.push(line.trim());
        const geo: string[] = [];
        if (subdistrict) geo.push(`ต.${subdistrict}`);
        if (district) geo.push(`อ.${district}`);
        if (province) geo.push(`จ.${province}`);
        if (geo.length) parts.push(geo.join(" "));
        if (postalCode) parts.push(String(postalCode));
        return parts.join(" ");
      };

      const statusForSubmit = mode === "create" ? "CONFIRMED" : status;
      const payload: any = {
        customerId,
        salespersonId: salespersonId || undefined,
        orderDate: orderDate ? new Date(orderDate).toISOString() : undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        shippingDate: shippingDate ? new Date(shippingDate).toISOString() : undefined,
        creditTermDays: creditTermDays === "" ? undefined : Number(creditTermDays),
        paymentCondition,
        currency,
        vatIncluded,
        vatRate: Number(vatRate || 0),
        billTo:
          buildAddress(
            billAddressLine,
            billProvince,
            billDistrict,
            billSubdistrict,
            billPostalCode,
          ) || undefined,
        shipTo:
          buildAddress(
            shipAddressLine,
            shipProvince,
            shipDistrict,
            shipSubdistrict,
            shipPostalCode,
          ) || undefined,
        status: statusForSubmit,
        paymentStatus,
        shippingFee: Number(shippingFee || 0),
        otherCharges: Number(otherCharges || 0),
        orderDiscount: orderDiscount === "" ? 0 : Number(orderDiscount || 0),
        usePromotion,
        promotionAmount: promotionAmount === "" ? undefined : Number(promotionAmount),
        poNumber: poNumber || undefined,
        note: note || undefined,
        rejectReason: needRejectReason ? (rejectReason || "").trim() : undefined,
        cancelReason: needCancelReason ? (cancelReason || "").trim() : undefined,
        items: items.map((it) => ({
          productId: it.productId,
          productCodeSnapshot: it.productCodeSnapshot,
          nameSnapshot: it.nameSnapshot,
          unit: it.unit || undefined,
          qty: Number(it.qty || 0),
          unitPrice: Number(it.unitPrice || 0),
          discountPercent: Number(it.discountPercent || 0),
          discountAmount: Number(it.discountAmount || 0),
        })),
      };

      await onSubmit(payload);
    } catch (err: any) {
      setError(err?.message || "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack spacing={2} sx={{ maxWidth: 1200, mx: "auto", p: { xs: 1.5, md: 2 }, bgcolor: "#fff" }}>
      {showFillRandom && <FillRandomButton onClick={handleFillRandom} />}

      <Stack direction="row" alignItems="center" justifyContent="center">
        <Typography variant="h4" fontWeight={960} m={2}>
          {title + " ( Sales note )"}
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ข้อมูลลูกค้า/พนักงานขาย */}
      <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
        <Typography variant="h6" fontWeight={960}>
          ข้อมูลลูกค้า/พนักงานขาย
        </Typography>
      </Box>
      <Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Autocomplete
            options={customerOptions}
            getOptionLabel={(option) => option.label}
            value={customerOptions.find((c) => c.id === customerId) || null}
            onChange={(_, newValue) => {
              setCustomerId(newValue ? newValue.id : "");
              if (newValue) {
                setBillAddressLine(newValue.address ?? "");
                setBillProvince(newValue.province ?? undefined);
                setBillDistrict(newValue.district ?? undefined);
                setBillSubdistrict(newValue.subdistrict ?? undefined);
                setBillPostalCode(newValue.postalCode ?? undefined);
              }
            }}
            fullWidth
            renderInput={(params) => <TextField {...params} label="ลูกค้า" required />}
          />
          <Autocomplete
            options={employeeOptions}
            getOptionLabel={(option) => option.label}
            value={employeeOptions.find((e) => e.id === salespersonId) || null}
            onChange={(_, newValue) => {
              setSalespersonId(newValue ? newValue.id : "");
            }}
            fullWidth
            renderInput={(params) => <TextField {...params} label="พนักงานขาย" />}
          />
        </Stack>
      </Box>

      {/* วงเงินส่งเสริมการขาย */}
      <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
        <Typography variant="h6" fontWeight={960}>
          วงเงินส่งเสริมการขาย
        </Typography>
      </Box>
      <Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
          <FormControlLabel
            control={
              <Checkbox
                checked={usePromotion}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setUsePromotion(checked);
                  if (!checked) {
                    setPromotionAmount("");
                    setAutoPromotion(false);
                  }
                }}
              />
            }
            label="ใช้วงเงินส่งเสริมการขาย"
          />
          <Box sx={{ color: "text.secondary", fontSize: 14, minWidth: 200 }}>
            คงเหลือ:{" "}
            {promotionLoading
              ? "..."
              : (promotionAvailable ?? 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
            บาท
          </Box>
          <TextField
            label="ใช้วงเงิน (บาท)"
            type="number"
            value={promotionAmount}
            onChange={(e) =>
              setPromotionAmount(e.target.value === "" ? "" : Number(e.target.value))
            }
            disabled={!usePromotion}
            error={
              usePromotion &&
              typeof promotionAmount === "number" &&
              promotionAvailable !== null &&
              Number(promotionAmount) > Number(promotionAvailable)
            }
            helperText={
              usePromotion &&
              typeof promotionAmount === "number" &&
              promotionAvailable !== null &&
              Number(promotionAmount) > Number(promotionAvailable)
                ? "เกินวงเงินคงเหลือ"
                : undefined
            }
            sx={{ flex: 1 }}
          />
        </Stack>
      </Box>

      {/* การชำระเงิน */}
      <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
        <Typography variant="h6" fontWeight={960}>
          การชำระเงิน
        </Typography>
      </Box>
      <Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label="เงื่อนไขการชำระเงิน"
            value={paymentCondition}
            onChange={(e) => {
              const val = e.target.value as "PREPAID" | "POSTPAID";
              setPaymentCondition(val);
              if (val === "PREPAID") {
                setCreditTermDays("");
                setDueDate(null);
              }
            }}
            fullWidth
          >
            <MenuItem value="PREPAID">โอนเงินก่อนแล้วค่อยส่งของ</MenuItem>
            <MenuItem value="POSTPAID">ส่งของก่อนแล้วค่อยโอนเงิน</MenuItem>
          </TextField>
          <TextField
            label="เครดิต (วัน)"
            type="number"
            value={creditTermDays}
            onChange={(e) => setCreditTermDays(e.target.value === "" ? "" : Number(e.target.value))}
            fullWidth
            disabled={paymentCondition !== "POSTPAID"}
          />
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
            <DatePicker
              label="ครบกำหนดชำระ"
              value={dueDate ? new Date(dueDate) : null}
              views={["year", "month", "day"]}
              onChange={(v) => setDueDate(v ? v.toISOString().slice(0, 10) : null)}
              slotProps={{ textField: { fullWidth: true } }}
              disabled={paymentCondition !== "POSTPAID"}
            />
          </LocalizationProvider>
          <TextField
            select
            label="สถานะชำระเงิน"
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            fullWidth
          >
            {PAYMENT_STATUS_OPTIONS.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Box>

      {/* กำหนดการ */}
      <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
        <Typography variant="h6" fontWeight={960}>
          กำหนดการ
        </Typography>
      </Box>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
        <Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <DatePicker
              label="วันที่สั่งซื้อ"
              value={orderDate ? new Date(orderDate) : null}
              views={["year", "month", "day"]}
              onChange={(v) => setOrderDate(v ? v.toISOString().slice(0, 10) : null)}
              slotProps={{ textField: { fullWidth: true } }}
            />
            <DatePicker
              label="วันที่จัดส่ง"
              value={shippingDate ? new Date(shippingDate) : null}
              views={["year", "month", "day"]}
              onChange={(v) => setShippingDate(v ? v.toISOString().slice(0, 10) : null)}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Stack>
        </Box>
      </LocalizationProvider>

      {/* ที่อยู่วางบิล */}
      <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
        <Typography variant="h6" fontWeight={960}>
          ที่อยู่วางบิล
        </Typography>
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <TextField
          label="ที่อยู่ (บ้านเลขที่, หมู่, ซอย, ถนน)"
          value={billAddressLine}
          onChange={(e) => setBillAddressLine(e.target.value)}
          fullWidth
          placeholder="บ้านเลขที่ หมู่ ซอย ถนน"
        />
        <ThaiAddressPicker
          value={{
            province: billProvince,
            district: billDistrict,
            subdistrict: billSubdistrict,
            postalCode: billPostalCode,
          }}
          onChange={(next) => {
            setBillProvince(next.province);
            setBillDistrict(next.district);
            setBillSubdistrict(next.subdistrict);
            setBillPostalCode(next.postalCode ?? billPostalCode);
          }}
        />
      </Box>

      {/* ที่อยู่จัดส่ง */}
      <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
        <Typography variant="h6" fontWeight={960}>
          ที่อยู่จัดส่ง
        </Typography>
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "end", justifyContent: "flex-end" }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setShipAddressLine(billAddressLine);
              setShipProvince(billProvince);
              setShipDistrict(billDistrict);
              setShipSubdistrict(billSubdistrict);
              setShipPostalCode(billPostalCode);
            }}
          >
            คัดลอกจากที่อยู่วางบิล
          </Button>
        </Box>
        <TextField
          label="ที่อยู่ (บ้านเลขที่, หมู่, ซอย, ถนน)"
          value={shipAddressLine}
          onChange={(e) => setShipAddressLine(e.target.value)}
          fullWidth
          placeholder="บ้านเลขที่ หมู่ ซอย ถนน"
        />
        <ThaiAddressPicker
          value={{
            province: shipProvince,
            district: shipDistrict,
            subdistrict: shipSubdistrict,
            postalCode: shipPostalCode,
          }}
          onChange={(next) => {
            setShipProvince(next.province);
            setShipDistrict(next.district);
            setShipSubdistrict(next.subdistrict);
            setShipPostalCode(next.postalCode ?? shipPostalCode);
          }}
        />
      </Box>

      {/* สถานะเอกสาร */}
      <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
        <Typography variant="h6" fontWeight={960}>
          สถานะ
        </Typography>
      </Box>
      <Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label="สถานะ"
            value={mode === "create" ? "PENDING_APPROVAL" : (workflowStatus as any)}
            onChange={(e) => applyWorkflowMapping(e.target.value)}
            fullWidth
            disabled
          >
            {allowedStatusOptions.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Box>

      {needRejectReason && (
        <TextField
          label="เหตุผลการปฏิเสธ"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          fullWidth
          multiline
          minRows={2}
          required
          error={(rejectReason || "").trim().length === 0}
          helperText={(rejectReason || "").trim().length === 0 ? "กรอกเหตุผลการปฏิเสธ" : undefined}
        />
      )}
      {needCancelReason && (
        <TextField
          label="เหตุผลการยกเลิก"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          fullWidth
          multiline
          minRows={2}
          required
          error={(cancelReason || "").trim().length === 0}
          helperText={(cancelReason || "").trim().length === 0 ? "กรอกเหตุผลการยกเลิก" : undefined}
        />
      )}

      {/* รายการสินค้า */}
      <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
        <Typography variant="h6" fontWeight={960}>
          รายการสินค้า
        </Typography>
      </Box>

      <Stack spacing={1.5}>
        {items.map((it, idx) => (
          <Paper key={idx} variant="outlined" sx={{ p: 1.5 }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={{ xs: 1.5, md: 2 }}
              alignItems={{ xs: "stretch", md: "center" }}
              justifyContent="space-between"
              flexWrap="wrap"
            >
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={{ xs: 1.5, md: 1.5 }}
                alignItems={{ xs: "stretch", md: "center" }}
                sx={{ flex: 1, minWidth: 0 }}
              >
                <Autocomplete
                  options={productOptions}
                  getOptionLabel={(o) => `${o.productCode} - ${o.nameTH}`}
                  filterOptions={(opts, state) =>
                    opts.filter((o) =>
                      `${o.productCode} ${o.nameTH}`
                        .toLowerCase()
                        .includes((state.inputValue || "").toLowerCase()),
                    )
                  }
                  value={productOptions.find((p) => p.id === it.productId) || null}
                  onChange={(_, val) => {
                    const next = [...items];
                    if (val) {
                      next[idx] = {
                        ...next[idx],
                        productId: val.id,
                        productCodeSnapshot: val.productCode,
                        nameSnapshot: val.nameTH,
                        unit: val.unit || undefined,
                        unitPrice: typeof val.price === "number" ? val.price : 0,
                      };
                    } else {
                      next[idx] = { ...next[idx], productId: undefined };
                    }
                    setItems(next);
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="สินค้า" required fullWidth />
                  )}
                  sx={{ flex: 1, minWidth: 260 }}
                />
                <TextField
                  label="ราคาต่อหน่วย"
                  type="number"
                  value={it.unitPrice}
                  onChange={(e) => {
                    const v = Number(e.target.value || 0);
                    const next = [...items];
                    next[idx] = { ...next[idx], unitPrice: v };
                    setItems(next);
                  }}
                  sx={{ width: { xs: "100%", md: 130 } }}
                  required
                  disabled
                />
                <TextField
                  label="จำนวน"
                  type="number"
                  value={it.qty}
                  onChange={(e) => {
                    const val = e.target.value.replace(/^0+(?=\d)/, "");
                    const next = [...items];
                    next[idx] = {
                      ...next[idx],
                      qty: val === "" ? ("" as unknown as number) : Number(val),
                    };
                    setItems(next);
                  }}
                  onBlur={(e) => {
                    if (e.target.value === "") {
                      const next = [...items];
                      next[idx] = { ...next[idx], qty: 0 };
                      setItems(next);
                    }
                  }}
                  sx={{ width: { xs: "100%", md: 110 } }}
                  required
                  error={
                    Boolean(it.productId) &&
                    it.qty > (productOptions.find((p) => p.id === it.productId)?.stockOnHand ?? 0)
                  }
                  helperText={
                    Boolean(it.productId) &&
                    it.qty > (productOptions.find((p) => p.id === it.productId)?.stockOnHand ?? 0)
                      ? "จำนวนมากกว่าคงเหลือ"
                      : undefined
                  }
                />
                <TextField
                  label="ส่วนลด (บาท)"
                  type="number"
                  value={it.discountAmount ?? 0}
                  onChange={(e) => {
                    const v = Number(e.target.value || 0);
                    const next = [...items];
                    next[idx] = { ...next[idx], discountAmount: v };
                    setItems(next);
                  }}
                  sx={{ width: { xs: "100%", md: 130 } }}
                />
              </Stack>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                justifyContent={{ xs: "flex-end", md: "flex-end" }}
                sx={{ mt: { xs: 1, md: 0 }, width: { xs: "100%", md: "auto" } }}
              >
                {it.productId && (
                  <Box
                    sx={{ minWidth: 50, color: "text.secondary", fontSize: 12, textAlign: "right" }}
                  >
                    คงเหลือ: {productOptions.find((p) => p.id === it.productId)?.stockOnHand ?? 0}
                  </Box>
                )}
                <IconButton
                  color="error"
                  aria-label="remove"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </Stack>
            </Stack>
          </Paper>
        ))}
        <Button
          startIcon={<AddIcon />}
          onClick={() => setItems((prev) => [...prev, { ...DEFAULT_ITEM }])}
        >
          เพิ่มรายการสินค้า
        </Button>
      </Stack>

      {/* สรุปค่าใช้จ่าย */}
      <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
        <Typography variant="h6" fontWeight={960}>
          สรุปค่าใช้จ่าย
        </Typography>
      </Box>
      <Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="ค่าขนส่ง"
            type="number"
            value={shippingFee}
            onChange={(e) => {
              const val = e.target.value.replace(/^0+(?=\d)/, "");
              setShippingFee(val === "" ? "" : Number(val));
            }}
            fullWidth
          />
          <TextField
            label="ค่าใช้จ่ายอื่น"
            type="number"
            value={otherCharges}
            onChange={(e) => {
              const val = e.target.value.replace(/^0+(?=\d)/, "");
              setOtherCharges(val === "" ? "" : Number(val));
            }}
            fullWidth
          />
          <TextField
            label="ส่วนลดทั้งออเดอร์ (บาท)"
            type="number"
            value={orderDiscount}
            onChange={(e) => {
              const val = e.target.value.replace(/^0+(?=\d)/, "");
              setOrderDiscount(val === "" ? "" : Math.max(0, Number(val)));
            }}
            fullWidth
          />
        </Stack>
      </Box>

      {/* หมายเหตุ */}
      <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
        <Typography variant="h6" fontWeight={960}>
          หมายเหตุ
        </Typography>
      </Box>
      <Box>
        <TextField
          label="หมายเหตุ"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          fullWidth
        />
      </Box>
      <Divider sx={{ my: 1 }} />

      {/* สรุปยอด */}
      <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
        <Typography variant="h6" fontWeight={960}>
          สรุปยอด
        </Typography>
      </Box>
      <Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="ยอดก่อนภาษี"
            value={totals.subTotal.toFixed(2)}
            InputProps={{ readOnly: true }}
            fullWidth
          />
          <TextField
            label="ภาษีมูลค่าเพิ่ม"
            value={totals.taxAmount.toFixed(2)}
            InputProps={{ readOnly: true }}
            fullWidth
          />
          <TextField
            label="ยอดรวมสุทธิ"
            value={netGrandTotal.toFixed(2)}
            InputProps={{ readOnly: true }}
            fullWidth
          />
        </Stack>
      </Box>

      <SaveBackButtons
        onSave={handleSubmit}
        backHref="/dashboard/sales/orders"
        isSaving={isSubmitting}
        disabled={!canSubmit || isSubmitting}
        saveLabel={submitLabel}
        saveButtonProps={{ sx: { fontWeight: 800, px: 3 } }}
        backButtonProps={{ sx: { fontWeight: 800, px: 3 } }}
        justify="center"
      />
      {isSubmitting && <Loader fullscreen />}
    </Stack>
  );
}
