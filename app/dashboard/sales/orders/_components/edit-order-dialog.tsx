"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import Autocomplete from "@mui/material/Autocomplete";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { th } from "date-fns/locale";
import ThaiAddressPicker from "@/components/ThaiAddressPicker";

export type Option = {
  id: string;
  label: string;
  address?: string | null;
  province?: string | null;
  district?: string | null;
  subdistrict?: string | null;
  postalCode?: string | null;
};
export type ProductOption = {
  id: string;
  productCode: string;
  nameTH: string;
  unit?: string | null;
  price?: number | null;
  stockOnHand: number;
};

type Props = {
  open: boolean;
  orderId: string;
  onClose: () => void;
  customerOptions: Option[];
  employeeOptions: Option[];
  productOptions: ProductOption[];
  onUpdated?: (order: any) => void;
};

type Item = {
  productId?: string;
  productCodeSnapshot?: string;
  nameSnapshot: string;
  unit?: string;
  qty: number;
  unitPrice: number | "";
  discountPercent?: number;
  discountAmount?: number | "";
};

const DEFAULT_ITEM: Item = {
  nameSnapshot: "",
  unit: "",
  qty: 1,
  unitPrice: "",
  discountPercent: 0,
  discountAmount: "",
};

// Workflow status options requested for the create order page (UI layer)
// These map to existing backend enums on change/submit.
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

function computeTotals(items: Item[], vatRate: number, shippingFee: number, otherCharges: number) {
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

export function EditOrderDialog({
  open,
  orderId,
  onClose,
  customerOptions,
  employeeOptions,
  productOptions,
  onUpdated,
}: Props) {
  void orderId;
  const [customerId, setCustomerId] = useState("");
  const [salespersonId, setSalespersonId] = useState("");
  const [orderDate, setOrderDate] = useState<string | null>(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [shippingDate, setShippingDate] = useState<string | null>(null);
  const [creditTermDays, setCreditTermDays] = useState<number | "">("");
  const [paymentCondition, setPaymentCondition] = useState<"PREPAID" | "POSTPAID">("PREPAID");
  const [currency, setCurrency] = useState("THB");
  const [vatIncluded, setVatIncluded] = useState(true);
  const [vatRate, setVatRate] = useState<number>(7);
  const [billTo, setBillTo] = useState("");
  const [shipTo, setShipTo] = useState("");
  // Billing address structured fields
  const [billAddressLine, setBillAddressLine] = useState("");
  const [billProvince, setBillProvince] = useState<string | undefined>(undefined);
  const [billDistrict, setBillDistrict] = useState<string | undefined>(undefined);
  const [billSubdistrict, setBillSubdistrict] = useState<string | undefined>(undefined);
  const [billPostalCode, setBillPostalCode] = useState<string | undefined>(undefined);
  // Shipping address structured fields
  const [shipAddressLine, setShipAddressLine] = useState("");
  const [shipProvince, setShipProvince] = useState<string | undefined>(undefined);
  const [shipDistrict, setShipDistrict] = useState<string | undefined>(undefined);
  const [shipSubdistrict, setShipSubdistrict] = useState<string | undefined>(undefined);
  const [shipPostalCode, setShipPostalCode] = useState<string | undefined>(undefined);
  // Internal fields persisted to backend
  const [status, setStatus] = useState("DRAFT");
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");
  // UI workflow status (maps to internal status + paymentStatus)
  const [workflowStatus, setWorkflowStatus] = useState<string>("DRAFT");
  const [shippingFee, setShippingFee] = useState<number | "">(0);
  const [otherCharges, setOtherCharges] = useState<number | "">(0);
  const [poNumber, setPoNumber] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<Item[]>([{ ...DEFAULT_ITEM }]);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usePromotion, setUsePromotion] = useState(false);
  const [promotionAmount, setPromotionAmount] = useState<number | "">("");
  const [promotionAvailable, setPromotionAvailable] = useState<number | null>(null);
  const [promotionLoading, setPromotionLoading] = useState(false);
  const [orderDiscount, setOrderDiscount] = useState<number | "">(0);

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

  const reset = () => {
    setCustomerId("");
    setSalespersonId("");
    setOrderDate(new Date().toISOString().slice(0, 10));
    setDueDate(null);
    setShippingDate(null);
    setCreditTermDays("");
    setCurrency("THB");
    setVatIncluded(true);
    setVatRate(7);
    setBillTo("");
    setShipTo("");
    setBillAddressLine("");
    setBillProvince(undefined);
    setBillDistrict(undefined);
    setBillSubdistrict(undefined);
    setBillPostalCode(undefined);
    setShipAddressLine("");
    setShipProvince(undefined);
    setShipDistrict(undefined);
    setShipSubdistrict(undefined);
    setShipPostalCode(undefined);
    setWorkflowStatus("DRAFT");
    setStatus("DRAFT");
    setPaymentStatus("UNPAID");
    setPaymentCondition("PREPAID");
    setShippingFee(0);
    setOtherCharges(0);
    setOrderDiscount(0);
    setPoNumber("");
    setNote("");
    setItems([{ ...DEFAULT_ITEM }]);
    setError(null);
    setUsePromotion(false);
    setPromotionAmount("");
    setPromotionAvailable(null);
    setPromotionLoading(false);
  };

  // Map UI workflow status to backend status/paymentStatus
  const applyWorkflowMapping = (wf: string) => {
    setWorkflowStatus(wf);
    switch (wf) {
      case "DRAFT":
        setStatus("DRAFT");
        // keep payment as chosen or default
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

  // Load promotion budget when customer changes
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

  const canSubmit =
    customerId &&
    items.length > 0 &&
    items.every((i) => {
      if (!i.productId || i.qty <= 0) return false;
      const p = productOptions.find((x) => x.id === i.productId);
      if (!p) return false;
      // allow oversell? If not, enforce qty <= stockOnHand
      return i.qty <= (p.stockOnHand ?? 0) || true; // keep always true for now; UI highlights if exceeded
    }) &&
    (!usePromotion ||
      (promotionAmount !== "" &&
        Number(promotionAmount) > 0 &&
        (promotionAvailable === null || Number(promotionAmount) <= Number(promotionAvailable))));

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setSubmitting(true);
    setError(null);
    try {
      // Build formatted addresses
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
          ) ||
          billTo ||
          undefined,
        shipTo:
          buildAddress(
            shipAddressLine,
            shipProvince,
            shipDistrict,
            shipSubdistrict,
            shipPostalCode,
          ) ||
          shipTo ||
          undefined,
        status,
        paymentStatus,
        shippingFee: Number(shippingFee || 0),
        otherCharges: Number(otherCharges || 0),
        orderDiscount: orderDiscount === "" ? 0 : Number(orderDiscount || 0),
        usePromotion,
        promotionAmount: promotionAmount === "" ? undefined : Number(promotionAmount),
        poNumber: poNumber || undefined,
        note: note || undefined,
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
      const res = await fetch("/api/sales/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "บันทึกใบสั่งขายไม่สำเร็จ");
      }
      const created = await res.json();
      onUpdated?.(created);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>สร้างใบสั่งขาย</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

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

          {/* Promotion usage controls (above payment condition) */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
            <FormControlLabel
              control={
                <Checkbox
                  checked={usePromotion}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setUsePromotion(checked);
                    if (!checked) setPromotionAmount("");
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
              onChange={(e) =>
                setCreditTermDays(e.target.value === "" ? "" : Number(e.target.value))
              }
              fullWidth
              disabled={paymentCondition !== "POSTPAID"}
            />
          </Stack>

          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <DatePicker
                label="วันที่สั่งซื้อ"
                value={orderDate ? new Date(orderDate) : null}
                views={["year", "month", "day"]}
                onChange={(v) => setOrderDate(v ? v.toISOString().slice(0, 10) : null)}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <DatePicker
                label="ครบกำหนดชำระ"
                value={dueDate ? new Date(dueDate) : null}
                views={["year", "month", "day"]}
                onChange={(v) => setDueDate(v ? v.toISOString().slice(0, 10) : null)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="เลขที่ PO ลูกค้า"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                fullWidth
              />
              <DatePicker
                label="วันที่จัดส่ง"
                value={shippingDate ? new Date(shippingDate) : null}
                views={["year", "month", "day"]}
                onChange={(v) => setShippingDate(v ? v.toISOString().slice(0, 10) : null)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Stack>
          </LocalizationProvider>

          {/* Billing Address */}
          <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
            <Typography variant="h6" fontWeight={960}>
              ที่อยู่วางบิล
            </Typography>
          </Box>
          <TextField
            label="ที่อยู่ (บ้านเลขที่, หมู่, ซอย, ถนน)"
            value={billAddressLine}
            onChange={(e) => setBillAddressLine(e.target.value)}
            fullWidth
            placeholder="เลขที่ หมู่ ซอย ถนน"
          />
          <Box>
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

          {/* Shipping Address */}
          <Box
            sx={{
              backgroundColor: "#d9d9dbff",
              borderRadius: 2,
              px: 2,
              py: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="h6" fontWeight={960}>
              ที่อยู่จัดส่ง
            </Typography>
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
            placeholder="เลขที่ หมู่ ซอย ถนน"
          />
          <Box>
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

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              select
              label="สถานะเอกสาร"
              value={workflowStatus}
              onChange={(e) => applyWorkflowMapping(e.target.value)}
              fullWidth
            >
              {STATUS_OPTIONS.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>
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

          <Box
            sx={{
              backgroundColor: "#d9d9dbff",
              borderRadius: 2,
              px: 2,
              py: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="h6" fontWeight={960}>
              รายการสินค้า
            </Typography>
          </Box>

          <Box>
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
                    {/* ฝั่งซ้าย (สินค้า + ราคา + จำนวน + ส่วนลด) */}
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
                        onFocus={(e) => {
                          if (Number(e.target.value) === 0) {
                            const next = [...items];
                            next[idx] = { ...next[idx], qty: "" as unknown as number };
                            setItems(next);
                          }
                        }}
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
                          it.qty >
                            (productOptions.find((p) => p.id === it.productId)?.stockOnHand ?? 0)
                        }
                        helperText={
                          Boolean(it.productId) &&
                          it.qty >
                            (productOptions.find((p) => p.id === it.productId)?.stockOnHand ?? 0)
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

                    {/* ฝั่งขวา (คงเหลือ + ลบ) */}
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      justifyContent={{ xs: "flex-end", md: "flex-end" }}
                      sx={{
                        mt: { xs: 1, md: 0 },
                        width: { xs: "100%", md: "auto" },
                      }}
                    >
                      {it.productId && (
                        <Box
                          sx={{
                            minWidth: 50,
                            color: "text.secondary",
                            fontSize: 12,
                            textAlign: "right",
                          }}
                        >
                          คงเหลือ:{" "}
                          {productOptions.find((p) => p.id === it.productId)?.stockOnHand ?? 0}
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
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="ค่าขนส่ง"
              type="number"
              value={shippingFee}
              onFocus={(e) => {
                if (Number(e.target.value) === 0) setShippingFee("");
              }}
              onChange={(e) => {
                const val = e.target.value.replace(/^0+(?=\d)/, ""); // ตัด 0 นำหน้าออก
                setShippingFee(val === "" ? "" : Number(val));
              }}
              onBlur={(e) => {
                if (e.target.value === "") setShippingFee(0); // ถ้าไม่กรอกอะไรเลย ให้กลับเป็น 0
              }}
              fullWidth
            />

            <TextField
              label="ค่าใช้จ่ายอื่น"
              type="number"
              value={otherCharges}
              onFocus={(e) => {
                if (Number(e.target.value) === 0) setOtherCharges("");
              }}
              onChange={(e) => {
                const val = e.target.value.replace(/^0+(?=\d)/, ""); // ลบ 0 นำหน้า
                setOtherCharges(val === "" ? "" : Number(val));
              }}
              onBlur={(e) => {
                if (e.target.value === "") setOtherCharges(0);
              }}
              fullWidth
            />

            <TextField
              label="ส่วนลดทั้งออเดอร์ (บาท)"
              type="number"
              value={orderDiscount}
              onFocus={(e) => {
                if (Number(e.target.value) === 0) setOrderDiscount("");
              }}
              onChange={(e) => {
                const val = e.target.value.replace(/^0+(?=\d)/, "");
                setOrderDiscount(val === "" ? "" : Math.max(0, Number(val)));
              }}
              onBlur={(e) => {
                if (e.target.value === "") setOrderDiscount(0);
              }}
              fullWidth
            />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="หมายเหตุ"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              fullWidth
            />
          </Stack>
          <Divider />

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
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          ปิด
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!canSubmit || isSubmitting}>
          บันทึกใบสั่งขาย
        </Button>
      </DialogActions>
    </Dialog>
  );
}
