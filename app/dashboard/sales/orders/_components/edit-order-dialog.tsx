"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { th } from "date-fns/locale";

export type Option = { id: string; label: string };
export type ProductOption = { id: string; productCode: string; nameTH: string; unit?: string | null; price?: number | null; stockOnHand: number };

type Props = {
  open: boolean;
  orderId: string;
  onClose: () => void;
  customerOptions: Option[];
  employeeOptions: Option[];
  productOptions: ProductOption[];
  onUpdated?: () => void;
};

type Item = {
  productId?: string;
  productCodeSnapshot?: string;
  nameSnapshot: string;
  unit?: string;
  qty: number;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
};

const DEFAULT_ITEM: Item = { nameSnapshot: "", unit: "", qty: 1, unitPrice: 0, discountPercent: 0, discountAmount: 0 };

function computeTotals(items: Item[], vatRate: number, shippingFee: number, otherCharges: number) {
  let subTotal = 0; let discountTotal = 0; let taxAmount = 0;
  for (const it of items) {
    const base = it.qty * it.unitPrice;
    const discA = Math.max(0, it.discountAmount ?? 0);
    const discP = Math.max(0, Math.min(100, it.discountPercent ?? 0));
    const discFromPct = base * (discP / 100);
    const disc = Math.min(base, discA + discFromPct);
    const taxable = Math.max(0, base - disc);
    subTotal += taxable; discountTotal += disc; taxAmount += taxable * (vatRate / 100);
  }
  return { subTotal, discountTotal, taxAmount, grandTotal: subTotal + taxAmount + (shippingFee || 0) + (otherCharges || 0) };
}

export function EditOrderDialog({ open, orderId, onClose, customerOptions, employeeOptions, productOptions, onUpdated }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [salespersonId, setSalespersonId] = useState("");
  const [orderDate, setOrderDate] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [creditTermDays, setCreditTermDays] = useState<number | "">("");
  const [currency, setCurrency] = useState("THB");
  const [vatIncluded, setVatIncluded] = useState(true);
  const [vatRate, setVatRate] = useState<number>(7);
  const [billTo, setBillTo] = useState("");
  const [shipTo, setShipTo] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");
  const [shippingFee, setShippingFee] = useState<number | "">(0);
  const [otherCharges, setOtherCharges] = useState<number | "">(0);
  const [poNumber, setPoNumber] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<Item[]>([{ ...DEFAULT_ITEM }]);

  const totals = useMemo(() => computeTotals(items, Number(vatRate || 0), Number(shippingFee || 0), Number(otherCharges || 0)), [items, vatRate, shippingFee, otherCharges]);

  useEffect(() => {
    if (!open || !orderId) return;
    (async () => {
      setLoading(true); setError(null);
      try {
        const res = await fetch(`/api/sales/orders/${orderId}`);
        if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
        const so = await res.json();
        setCustomerId(so.customerId);
        setSalespersonId(so.salespersonId || "");
        setOrderDate(so.orderDate ? new Date(so.orderDate).toISOString().slice(0,10) : null);
        setDueDate(so.dueDate ? new Date(so.dueDate).toISOString().slice(0,10) : null);
        setCreditTermDays(typeof so.creditTermDays === 'number' ? so.creditTermDays : "");
        setCurrency(so.currency || "THB");
        setVatIncluded(Boolean(so.vatIncluded));
        setVatRate(Number(so.vatRate || 0));
        setBillTo(so.billTo || "");
        setShipTo(so.shipTo || "");
        setStatus(so.status || "DRAFT");
        setPaymentStatus(so.paymentStatus || "UNPAID");
        setShippingFee(Number(so.shippingFee || 0));
        setOtherCharges(Number(so.otherCharges || 0));
        setPoNumber(so.poNumber || "");
        setNote(so.note || "");
        const mapped: Item[] = (so.items || []).map((it: any) => ({
          productId: it.productId || undefined,
          productCodeSnapshot: it.productCodeSnapshot || undefined,
          nameSnapshot: it.nameSnapshot || "",
          unit: it.unit || "",
          qty: Number(it.qty || 0),
          unitPrice: Number(it.unitPrice || 0),
          discountPercent: typeof it.discountPercent === 'number' ? it.discountPercent : 0,
          discountAmount: typeof it.discountAmount === 'number' ? it.discountAmount : 0,
        }));
        setItems(mapped.length ? mapped : [{ ...DEFAULT_ITEM }]);
      } catch (e: any) { setError(e?.message || "โหลดข้อมูลไม่สำเร็จ"); }
      finally { setLoading(false); }
    })();
  }, [open, orderId]);

  const canSubmit = customerId && items.length > 0 && items.every((i) => i.productId && i.qty > 0);

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setSubmitting(true); setError(null);
    try {
      const payload: any = {
        customerId,
        salespersonId: salespersonId || undefined,
        orderDate: orderDate ? new Date(orderDate).toISOString() : undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        creditTermDays: creditTermDays === "" ? undefined : Number(creditTermDays),
        currency,
        vatIncluded,
        vatRate: Number(vatRate || 0),
        billTo: billTo || undefined,
        shipTo: shipTo || undefined,
        status,
        paymentStatus,
        shippingFee: Number(shippingFee || 0),
        otherCharges: Number(otherCharges || 0),
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
      const res = await fetch(`/api/sales/orders/${orderId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data?.error || 'บันทึกไม่สำเร็จ'); }
      onUpdated?.(); onClose();
    } catch (e: any) { setError(e?.message || 'บันทึกไม่สำเร็จ'); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>แก้ไขใบสั่งขาย</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField select label="ลูกค้า" value={customerId} onChange={(e) => setCustomerId(e.target.value)} fullWidth required>
              {customerOptions.map((c) => (<MenuItem key={c.id} value={c.id}>{c.label}</MenuItem>))}
            </TextField>
            <TextField select label="พนักงานขาย" value={salespersonId} onChange={(e) => setSalespersonId(e.target.value)} fullWidth>
              <MenuItem value="">ไม่ระบุ</MenuItem>
              {employeeOptions.map((e) => (<MenuItem key={e.id} value={e.id}>{e.label}</MenuItem>))}
            </TextField>
          </Stack>

          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <DatePicker label="วันที่สั่งซื้อ" value={orderDate ? new Date(orderDate) : null} onChange={(v) => setOrderDate(v ? v.toISOString().slice(0, 10) : null)} slotProps={{ textField: { fullWidth: true } }} />
              <DatePicker label="ครบกำหนดชำระ" value={dueDate ? new Date(dueDate) : null} onChange={(v) => setDueDate(v ? v.toISOString().slice(0, 10) : null)} slotProps={{ textField: { fullWidth: true } }} />
            </Stack>
          </LocalizationProvider>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField label="เครดิต (วัน)" type="number" value={creditTermDays} onChange={(e) => setCreditTermDays(e.target.value === "" ? "" : Number(e.target.value))} fullWidth />
            <TextField label="สกุลเงิน" value={currency} onChange={(e) => setCurrency(e.target.value)} fullWidth />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField select label="รวม VAT" value={vatIncluded ? "1" : "0"} onChange={(e) => setVatIncluded(e.target.value === "1")} fullWidth>
              <MenuItem value="1">รวม</MenuItem>
              <MenuItem value="0">ไม่รวม</MenuItem>
            </TextField>
            <TextField label="VAT (%)" type="number" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value || 0))} fullWidth />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField label="ที่อยู่วางบิล (Bill To)" value={billTo} onChange={(e) => setBillTo(e.target.value)} fullWidth />
            <TextField label="ที่อยู่จัดส่ง (Ship To)" value={shipTo} onChange={(e) => setShipTo(e.target.value)} fullWidth />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField select label="สถานะเอกสาร" value={status} onChange={(e) => setStatus(e.target.value)} fullWidth>
              {["DRAFT","CONFIRMED","APPROVED","SHIPPED","INVOICED","CANCELLED"].map((s) => (<MenuItem key={s} value={s}>{s}</MenuItem>))}
            </TextField>
            <TextField select label="สถานะชำระเงิน" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} fullWidth>
              {["UNPAID","PARTIAL","PAID","OVERDUE"].map((s) => (<MenuItem key={s} value={s}>{s}</MenuItem>))}
            </TextField>
          </Stack>

          <Box>
            <Typography fontWeight={700} mb={1}>รายการสินค้า</Typography>
            <Stack spacing={1.5}>
              {items.map((it, idx) => (
                <Paper key={idx} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center">
                    <Autocomplete
                      options={productOptions}
                      getOptionLabel={(o) => `${o.productCode} - ${o.nameTH}`}
                      filterOptions={(opts, state) => opts.filter(o => `${o.productCode} ${o.nameTH}`.toLowerCase().includes((state.inputValue||"").toLowerCase()))}
                      value={productOptions.find(p => p.id === it.productId) || null}
                      onChange={(_, val) => {
                        const next = [...items];
                        if (val) {
                          next[idx] = { ...next[idx], productId: val.id, productCodeSnapshot: val.productCode, nameSnapshot: val.nameTH, unit: val.unit || undefined, unitPrice: typeof val.price === 'number' ? val.price : 0 };
                        } else {
                          next[idx] = { ...next[idx], productId: undefined };
                        }
                        setItems(next);
                      }}
                      renderInput={(params) => (<TextField {...params} label="สินค้า" required fullWidth />)}
                      sx={{ minWidth: 300, flex: 1 }}
                    />
                    <TextField label="หน่วย" value={it.unit || ""} onChange={(e) => { const v = e.target.value; const next = [...items]; next[idx] = { ...next[idx], unit: v }; setItems(next); }} sx={{ width: { xs: "100%", sm: 120 } }} />
                    <TextField label="จำนวน" type="number" value={it.qty} onChange={(e) => { const v = Number(e.target.value || 0); const next = [...items]; next[idx] = { ...next[idx], qty: v }; setItems(next); }} sx={{ width: { xs: "100%", sm: 120 } }} required />
                    <TextField label="ราคาต่อหน่วย" type="number" value={it.unitPrice} onChange={(e) => { const v = Number(e.target.value || 0); const next = [...items]; next[idx] = { ...next[idx], unitPrice: v }; setItems(next); }} sx={{ width: { xs: "100%", sm: 160 } }} required />
                    <TextField label="ส่วนลด %" type="number" value={it.discountPercent ?? 0} onChange={(e) => { const v = Number(e.target.value || 0); const next = [...items]; next[idx] = { ...next[idx], discountPercent: v }; setItems(next); }} sx={{ width: { xs: "100%", sm: 120 } }} />
                    <TextField label="ส่วนลด (บาท)" type="number" value={it.discountAmount ?? 0} onChange={(e) => { const v = Number(e.target.value || 0); const next = [...items]; next[idx] = { ...next[idx], discountAmount: v }; setItems(next); }} sx={{ width: { xs: "100%", sm: 140 } }} />
                    <IconButton color="error" aria-label="remove" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}><DeleteOutlineIcon /></IconButton>
                  </Stack>
                </Paper>
              ))}
              <Button onClick={() => setItems((prev) => [...prev, { ...DEFAULT_ITEM }])}>เพิ่มรายการสินค้า</Button>
            </Stack>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField label="ค่าขนส่ง" type="number" value={shippingFee} onChange={(e) => setShippingFee(e.target.value === "" ? "" : Number(e.target.value))} fullWidth />
            <TextField label="ค่าใช้จ่ายอื่น" type="number" value={otherCharges} onChange={(e) => setOtherCharges(e.target.value === "" ? "" : Number(e.target.value))} fullWidth />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField label="เลขที่ PO ลูกค้า" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} fullWidth />
            <TextField label="หมายเหตุ" value={note} onChange={(e) => setNote(e.target.value)} fullWidth />
          </Stack>

          <Divider />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField label="ยอดก่อนภาษี" value={totals.subTotal.toFixed(2)} InputProps={{ readOnly: true }} fullWidth />
            <TextField label="ภาษีมูลค่าเพิ่ม" value={totals.taxAmount.toFixed(2)} InputProps={{ readOnly: true }} fullWidth />
            <TextField label="ยอดรวมสุทธิ" value={totals.grandTotal.toFixed(2)} InputProps={{ readOnly: true }} fullWidth />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">ปิด</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!canSubmit || isSubmitting}>บันทึกการแก้ไข</Button>
      </DialogActions>
    </Dialog>
  );
}

