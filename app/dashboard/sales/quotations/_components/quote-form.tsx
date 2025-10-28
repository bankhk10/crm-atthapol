"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { th } from "date-fns/locale";
import Link from "next/link";
import { blue, red } from "@mui/material/colors";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { FillRandomButton } from "@/components/FillRandomButton";
import Loader from "@/components/Loader";
import ThaiAddressPicker from "@/components/ThaiAddressPicker";
import type { Option, ProductOption } from "../../orders/types";
import type { QuoteFormInitial, QuoteItemInput } from "../types";
import { fillQuoteFormRandom } from "@/lib/random-fill/quote";

const DEFAULT_ITEM: QuoteItemInput = {
  nameSnapshot: "",
  unit: "",
  qty: 1,
  unitPrice: "",
  discountPercent: 0,
  discountAmount: "",
};

function computeTotals(
  items: QuoteItemInput[],
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

export type QuoteFormProps = {
  title: string;
  submitLabel: string;
  customerOptions: Option[];
  employeeOptions: Option[];
  productOptions: ProductOption[];
  initial?: Partial<QuoteFormInitial>;
  onSubmit: (payload: any) => Promise<void> | void;
  showFillRandom?: boolean;
};

export function QuoteForm({
  title,
  submitLabel,
  customerOptions,
  employeeOptions,
  productOptions,
  initial,
  onSubmit,
  showFillRandom = true,
}: QuoteFormProps) {
  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");
  const [salespersonId, setSalespersonId] = useState(initial?.salespersonId ?? "");
  const [quoteDate, setQuoteDate] = useState<string | null>(
    initial?.quoteDate ?? new Date().toISOString().slice(0, 10),
  );
  const [validUntil, setValidUntil] = useState<string | null>(initial?.validUntil ?? null);
  const [paymentCondition, setPaymentCondition] = useState<"PREPAID" | "POSTPAID">(
    initial?.paymentCondition ?? "PREPAID",
  );
  const [creditTermDays, setCreditTermDays] = useState<number | "">(initial?.creditTermDays ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? "THB");
  const [vatIncluded, setVatIncluded] = useState(initial?.vatIncluded ?? true);
  const [vatRate, setVatRate] = useState<number>(initial?.vatRate ?? 7);
  const [shippingMethod, setShippingMethod] = useState(initial?.shippingMethod ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [items, setItems] = useState<QuoteItemInput[]>(
    initial?.items?.length ? initial.items : [{ ...DEFAULT_ITEM }],
  );
  const [shippingFee, setShippingFee] = useState<number | "">(initial?.shippingFee ?? 0);
  const [otherCharges, setOtherCharges] = useState<number | "">(initial?.otherCharges ?? 0);
  const [orderDiscount, setOrderDiscount] = useState<number | "">(initial?.orderDiscount ?? 0);
  const [status, setStatus] = useState<QuoteFormInitial["status"]>(initial?.status ?? "DRAFT");
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Customer address (editable via ThaiAddressPicker)
  const [addressLine, setAddressLine] = useState<string>("");
  const [province, setProvince] = useState<string | undefined>(undefined);
  const [district, setDistrict] = useState<string | undefined>(undefined);
  const [subdistrict, setSubdistrict] = useState<string | undefined>(undefined);
  const [postalCode, setPostalCode] = useState<string | undefined>(undefined);

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

  const canSubmit = customerId && items.length > 0 && items.every((i) => i.productId && i.qty > 0);

  const selectedCustomer = useMemo(() => {
    return customerOptions.find((c) => c.id === customerId) || null;
  }, [customerOptions, customerId]);

  const customerAddressDisplay = useMemo(() => {
    if (!selectedCustomer) return "";
    const parts: string[] = [];
    if (selectedCustomer.address) parts.push(String(selectedCustomer.address));
    const geo: string[] = [];
    if (selectedCustomer.subdistrict) geo.push(`ต.${selectedCustomer.subdistrict}`);
    if (selectedCustomer.district) geo.push(`อ.${selectedCustomer.district}`);
    if (selectedCustomer.province) geo.push(`จ.${selectedCustomer.province}`);
    if (geo.length) parts.push(geo.join(" "));
    if (selectedCustomer.postalCode) parts.push(String(selectedCustomer.postalCode));
    return parts.join(" ");
  }, [selectedCustomer]);

  // Prefill editable address from selected customer
  useEffect(() => {
    if (!selectedCustomer) {
      setAddressLine("");
      setProvince(undefined);
      setDistrict(undefined);
      setSubdistrict(undefined);
      setPostalCode(undefined);
      return;
    }
    setAddressLine(selectedCustomer.address ?? "");
    setProvince(selectedCustomer.province ?? undefined);
    setDistrict(selectedCustomer.district ?? undefined);
    setSubdistrict(selectedCustomer.subdistrict ?? undefined);
    setPostalCode(selectedCustomer.postalCode ?? undefined);
  }, [selectedCustomer]);

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: any = {
        customerId,
        salespersonId: salespersonId || undefined,
        quoteDate: quoteDate ? new Date(quoteDate).toISOString() : undefined,
        validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
        paymentCondition,
        creditTermDays: creditTermDays === "" ? undefined : Number(creditTermDays),
        currency,
        vatIncluded,
        vatRate: Number(vatRate || 0),
        shippingMethod: shippingMethod || undefined,
        note: note || undefined,
        status,
        shippingFee: Number(shippingFee || 0),
        otherCharges: Number(otherCharges || 0),
        orderDiscount: orderDiscount === "" ? 0 : Number(orderDiscount || 0),
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
    } catch (e: any) {
      setError(e?.message || "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack spacing={2} sx={{ maxWidth: 1200, mx: "auto", p: { xs: 1.5, md: 2 }, bgcolor: "#fff" }}>
      {showFillRandom && (
        <FillRandomButton
          onClick={() =>
            fillQuoteFormRandom({
              customerOptions,
              employeeOptions,
              productOptions,
              setCustomerId,
              setSalespersonId,
              setQuoteDate,
              setValidUntil,
              setPaymentCondition,
              setCreditTermDays,
              setCurrency,
              setVatIncluded,
              setVatRate,
              setShippingMethod,
              setNote,
              setItems,
              setShippingFee,
              setOtherCharges,
              setOrderDiscount,
              setStatus,
            })
          }
        />
      )}

      <Stack direction="row" alignItems="center" justifyContent="center">
        <Typography variant="h4" fontWeight={960} m={2}>
          {title}
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ลูกค้า/ผู้เสนอราคา */}
      <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
        <Typography variant="h6" fontWeight={960}>
          ข้อมูลลูกค้า/ผู้เสนอราคา
        </Typography>
      </Box>
      <Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Autocomplete
            options={customerOptions}
            getOptionLabel={(option) => option.label}
            value={customerOptions.find((c) => c.id === customerId) || null}
            onChange={(_, newValue) => setCustomerId(newValue ? newValue.id : "")}
            fullWidth
            renderInput={(params) => <TextField {...params} label="ลูกค้า" required />}
          />
          <Autocomplete
            options={employeeOptions}
            getOptionLabel={(option) => option.label}
            value={employeeOptions.find((e) => e.id === salespersonId) || null}
            onChange={(_, newValue) => setSalespersonId(newValue ? newValue.id : "")}
            fullWidth
            renderInput={(params) => <TextField {...params} label="ผู้เสนอราคา" />}
          />
        </Stack>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <TextField
            label="ที่อยู่ (บ้านเลขที่, หมู่, ซอย, ถนน)"
            value={addressLine}
            onChange={(e) => setAddressLine(e.target.value)}
            fullWidth
            placeholder="บ้านเลขที่ หมู่ ซอย ถนน"
            sx={{ mt: 2 }}
          />
          <ThaiAddressPicker
            value={{ province, district, subdistrict, postalCode }}
            onChange={(next) => {
              setProvince(next.province);
              setDistrict(next.district);
              setSubdistrict(next.subdistrict);
              setPostalCode(next.postalCode ?? postalCode);
            }}
          />
        </Box>
      </Box>

      {/* วันที่/วันหมดอายุ */}
      <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
        <Typography variant="h6" fontWeight={960}>
          วันที่และวันหมดอายุ
        </Typography>
      </Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
          <DatePicker
            label="วันที่เสนอราคา"
            value={quoteDate ? new Date(quoteDate) : null}
            onChange={(newValue) =>
              setQuoteDate(newValue ? newValue.toISOString().slice(0, 10) : null)
            }
            slotProps={{ textField: { fullWidth: true } }}
          />
        </LocalizationProvider>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
          <DatePicker
            label="วันหมดอายุ"
            value={validUntil ? new Date(validUntil) : null}
            onChange={(newValue) =>
              setValidUntil(newValue ? newValue.toISOString().slice(0, 10) : null)
            }
            slotProps={{ textField: { fullWidth: true } }}
          />
        </LocalizationProvider>
      </Stack>

      {/* เงื่อนไข/การชำระเงิน */}
      <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
        <Typography variant="h6" fontWeight={960}>
          เงื่อนไขและการชำระเงิน
        </Typography>
      </Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          select
          label="เงื่อนไขการชำระ"
          value={paymentCondition}
          onChange={(e) => setPaymentCondition(e.target.value as any)}
          fullWidth
        >
          <MenuItem value="PREPAID">ชำระก่อนส่ง</MenuItem>
          <MenuItem value="POSTPAID">เครดิตเทอม</MenuItem>
        </TextField>
        <TextField
          label="เครดิตเทอม (วัน)"
          type="number"
          value={creditTermDays}
          onChange={(e) => setCreditTermDays(e.target.value === "" ? "" : Number(e.target.value))}
          fullWidth
          disabled={paymentCondition !== "POSTPAID"}
        />
        <TextField
          label="วิธีจัดส่ง"
          value={shippingMethod}
          onChange={(e) => setShippingMethod(e.target.value)}
          fullWidth
        />
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          select
          label="สกุลเงิน"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          fullWidth
        >
          <MenuItem value="THB">THB</MenuItem>
        </TextField>
        <FormControlLabel
          control={
            <Checkbox checked={vatIncluded} onChange={(e) => setVatIncluded(e.target.checked)} />
          }
          label="ราคารวมภาษี"
        />
        <TextField
          label="VAT (%)"
          type="number"
          value={vatRate}
          onChange={(e) => setVatRate(Number(e.target.value || 0))}
          sx={{ width: { xs: "100%", md: 140 } }}
        />
      </Stack>

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
                  next[idx] = { ...next[idx], qty: val === "" ? 0 : Math.max(0, Number(val)) };
                  setItems(next);
                }}
                sx={{ width: { xs: "100%", md: 120 } }}
                required
              />
              <TextField
                label="ส่วนลด (บาท)"
                type="number"
                value={it.discountAmount}
                onChange={(e) => {
                  const val = e.target.value.replace(/^0+(?=\d)/, "");
                  const next = [...items];
                  next[idx] = {
                    ...next[idx],
                    discountAmount: val === "" ? "" : Math.max(0, Number(val)),
                  };
                  setItems(next);
                }}
                sx={{ width: { xs: "100%", md: 160 } }}
              />
              <Button
                color="error"
                onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
              >
                ลบ
              </Button>
            </Stack>
          </Paper>
        ))}
        <Button onClick={() => setItems((prev) => [...prev, { ...DEFAULT_ITEM }])}>
          เพิ่มรายการสินค้า
        </Button>
      </Stack>

      {/* ค่าใช้จ่ายและหมายเหตุ */}
      <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
        <Typography variant="h6" fontWeight={960}>
          ค่าใช้จ่ายและหมายเหตุ
        </Typography>
      </Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label="ค่าขนส่ง"
          type="number"
          value={shippingFee}
          onChange={(e) => setShippingFee(e.target.value === "" ? "" : Number(e.target.value))}
          fullWidth
        />
        <TextField
          label="ค่าใช้จ่ายอื่น"
          type="number"
          value={otherCharges}
          onChange={(e) => setOtherCharges(e.target.value === "" ? "" : Number(e.target.value))}
          fullWidth
        />
        <TextField
          label="ส่วนลดทั้งบิล (บาท)"
          type="number"
          value={orderDiscount}
          onChange={(e) =>
            setOrderDiscount(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))
          }
          fullWidth
        />
      </Stack>
      <TextField
        label="หมายเหตุ"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        fullWidth
      />

      {/* สรุปยอด */}
      <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
        <Typography variant="h6" fontWeight={960}>
          สรุปยอด
        </Typography>
      </Box>
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

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        justifyContent="center"
        alignItems="center"
      >
        <Button
          component={Link}
          href="/dashboard/sales/quotes"
          variant="contained"
          startIcon={<CloseIcon />}
          sx={{
            bgcolor: red[600],
            color: "white",
            "&:hover": { bgcolor: red[700] },
            fontWeight: 800,
            px: 3,
          }}
        >
          ยกเลิก
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!canSubmit || isSubmitting}
          startIcon={<CheckIcon />}
          sx={{
            bgcolor: blue[600],
            color: "white",
            "&:hover": { bgcolor: blue[700] },
            fontWeight: 800,
            px: 3,
          }}
        >
          {submitLabel}
        </Button>
        {isSubmitting && <Loader fullscreen />}
      </Stack>
    </Stack>
  );
}

export default QuoteForm;
