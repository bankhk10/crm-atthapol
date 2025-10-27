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
  Checkbox, // เพิ่ม
  FormControlLabel, // เพิ่ม
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import AddIcon from "@mui/icons-material/Add"; // เพิ่ม
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { th } from "date-fns/locale";
import ThaiAddressPicker from "@/components/ThaiAddressPicker";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/permissions";

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
  orderId: string; // คงไว้
  onClose: () => void;
  customerOptions: Option[];
  employeeOptions: Option[];
  productOptions: ProductOption[];
  onUpdated?: () => void; // คงไว้
};

// ใช้ Item type จาก create-order-dialog
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

// ใช้ DEFAULT_ITEM จาก create-order-dialog
const DEFAULT_ITEM: Item = {
  nameSnapshot: "",
  unit: "",
  qty: 1,
  unitPrice: "",
  discountPercent: 0,
  discountAmount: "",
};

// Workflow status options (UI layer) same as create-order
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

// เพิ่ม PAYMENT_STATUS_OPTIONS
const PAYMENT_STATUS_OPTIONS = [
  { value: "UNPAID", label: "ยังไม่ชำระ" },
  { value: "PARTIAL", label: "บางส่วน" },
  { value: "PAID", label: "ชำระแล้ว" },
  { value: "OVERDUE", label: "เกินกำหนด" },
];

// ใช้ computeTotals จาก create-order-dialog
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
  // คงชื่อฟังก์ชันและ Props
  open,
  orderId,
  onClose,
  customerOptions,
  employeeOptions,
  productOptions,
  onUpdated,
}: Props) {
  const { data: session } = useSession();
  const canApprove = hasPermission(session?.user?.permissions, "sales", "approve");
  const canReject = hasPermission(session?.user?.permissions, "sales", "reject");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [salespersonId, setSalespersonId] = useState("");
  const [orderDate, setOrderDate] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [shippingDate, setShippingDate] = useState<string | null>(null);
  const [creditTermDays, setCreditTermDays] = useState<number | "">("");
  const [paymentCondition, setPaymentCondition] = useState<"PREPAID" | "POSTPAID">("PREPAID");
  const [currency, setCurrency] = useState("THB");
  const [vatIncluded, setVatIncluded] = useState(true);
  const [vatRate, setVatRate] = useState<number>(7);
  const [billTo, setBillTo] = useState("");
  const [shipTo, setShipTo] = useState("");
  // Structured address fields for UI
  const [billAddressLine, setBillAddressLine] = useState("");
  const [billProvince, setBillProvince] = useState<string | undefined>(undefined);
  const [billDistrict, setBillDistrict] = useState<string | undefined>(undefined);
  const [billSubdistrict, setBillSubdistrict] = useState<string | undefined>(undefined);
  const [billPostalCode, setBillPostalCode] = useState<string | undefined>(undefined);
  const [shipAddressLine, setShipAddressLine] = useState("");
  const [shipProvince, setShipProvince] = useState<string | undefined>(undefined);
  const [shipDistrict, setShipDistrict] = useState<string | undefined>(undefined);
  const [shipSubdistrict, setShipSubdistrict] = useState<string | undefined>(undefined);
  const [shipPostalCode, setShipPostalCode] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState("DRAFT");
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");
  // UI workflow status, mapped to backend fields
  const [workflowStatus, setWorkflowStatus] = useState<string>("DRAFT");
  // เก็บสถานะเริ่มต้นจากเซิร์ฟเวอร์ เพื่อใช้ล็อกเฉพาะกรณีเอกสารถูกส่งของแล้วจริง
  const [initialServerStatus, setInitialServerStatus] = useState<string>("DRAFT");
  const [shippingFee, setShippingFee] = useState<number | "">(0);
  const [otherCharges, setOtherCharges] = useState<number | "">(0);
  const [poNumber, setPoNumber] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<Item[]>([{ ...DEFAULT_ITEM }]);

  // เพิ่ม State จาก create-order-dialog
  const [usePromotion, setUsePromotion] = useState(false);
  const [promotionAmount, setPromotionAmount] = useState<number | "">("");
  const [promotionAvailable, setPromotionAvailable] = useState<number | null>(null);
  const [promotionLoading, setPromotionLoading] = useState(false);
  const [orderDiscount, setOrderDiscount] = useState<number | "">(0);
  // เหตุผลการปฏิเสธ (บังคับกรอกเมื่อเลือกสถานะปฏิเสธ)
  const [rejectReason, setRejectReason] = useState<string>("");
  // เหตุผลการยกเลิก (แสดงผล)
  const [cancelReason, setCancelReason] = useState<string>("");
  // เก็บยอดที่เอกสารนี้ใช้จริงตอนโหลด เพื่อใช้ตรวจสอบส่วนต่างกับวงเงินคงเหลือลูกค้า
  const [initialPromotionSpent, setInitialPromotionSpent] = useState<number>(0);
  const [initialCustomerId, setInitialCustomerId] = useState<string>("");

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

  // เพิ่ม netGrandTotal useMemo
  const netGrandTotal = useMemo(() => {
    const od = Number(orderDiscount || 0);
    const net = Math.max(0, (totals?.grandTotal ?? 0) - (isNaN(od) ? 0 : od));
    return net;
  }, [totals, orderDiscount]);

  // ล็อกเมื่อสถานะเดิมคือ SHIPPED หรือ อนุมัติแล้วแต่ผู้ใช้ไม่มีสิทธิ์อนุมัติ
  const isLocked = initialServerStatus === "SHIPPED" || (initialServerStatus === "APPROVED" && !canApprove);

  // คงไว้: useEffect สำหรับโหลดข้อมูล (ไม่ reset form ตอนเปิด)
  useEffect(() => {
    if (!open || !orderId) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/sales/orders/${orderId}`);
        if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
        const so = await res.json();
        setCustomerId(so.customerId);
        setInitialCustomerId(so.customerId);
        setSalespersonId(so.salespersonId || "");
        setOrderDate(so.orderDate ? new Date(so.orderDate).toISOString().slice(0, 10) : null);
        setDueDate(so.dueDate ? new Date(so.dueDate).toISOString().slice(0, 10) : null);
        setShippingDate(
          so.shippingDate ? new Date(so.shippingDate).toISOString().slice(0, 10) : null,
        );
        setCreditTermDays(typeof so.creditTermDays === "number" ? so.creditTermDays : "");
        setPaymentCondition((so.paymentCondition as any) === "POSTPAID" ? "POSTPAID" : "PREPAID");
        setCurrency(so.currency || "THB");
        setVatIncluded(Boolean(so.vatIncluded));
        setVatRate(Number(so.vatRate || 0));
        setBillTo(so.billTo || "");
        setShipTo(so.shipTo || "");

        type ParsedAddress = {
          street: string;
          province?: string;
          district?: string;
          subdistrict?: string;
          postalCode?: string;
        };
        const parseAddress = (txt: string | null | undefined): ParsedAddress => {
          const s = String(txt ?? "").trim();
          if (!s) return { street: "" };
          const out: ParsedAddress = { street: s };
          try {
            // Postal code: last 5 consecutive digits in the string
            const mZip = s.match(/(\d{5})(?!.*\d)/);
            if (mZip) out.postalCode = mZip[1];

            // Support multiple Thai labels: ต./ตำบล/แขวง, อ./อำเภอ/เขต, จ./จังหวัด
            const subMatch =
              s.match(/(?:ต\.|ตำบล|แขวง)\s*([^\s,\d]+)/) ||
              s.match(/(?:ต\.|ตำบล|แขวง)\s*([^,]+)/);
            if (subMatch) out.subdistrict = (subMatch[1] || "").trim();

            const distMatch =
              s.match(/(?:อ\.|อำเภอ|เขต)\s*([^\s,\d]+)/) ||
              s.match(/(?:อ\.|อำเภอ|เขต)\s*([^,]+)/);
            if (distMatch) out.district = (distMatch[1] || "").trim();

            let provMatch =
              s.match(/(?:จ\.|จังหวัด)\s*([^\s,\d]+)/) ||
              s.match(/(?:จ\.|จังหวัด)\s*([^,]+)/);
            // Special cases for Bangkok
            if (!provMatch) {
              const bkk = s.match(/กรุงเทพมหานคร|กรุงเทพฯ|กทม\.?/);
              if (bkk) out.province = "กรุงเทพมหานคร";
            }
            if (provMatch) out.province = (provMatch[1] || "").trim();

            // Cut street part before the first geo token
            const tokenIdx = (() => {
              const tokens = [
                "ต.",
                "ตำบล",
                "แขวง",
                "อ.",
                "อำเภอ",
                "เขต",
                "จ.",
                "จังหวัด",
                "กรุงเทพมหานคร",
                "กรุงเทพฯ",
                "กทม",
              ];
              const idxs = tokens
                .map((t) => s.indexOf(t))
                .filter((i) => i >= 0) as number[];
              return idxs.length ? Math.min(...idxs) : -1;
            })();
            if (tokenIdx > 0) out.street = s.slice(0, tokenIdx).trim();
          } catch {}
          return out;
        };
        const b = parseAddress(so.billTo);
        setBillAddressLine(b.street || "");
        setBillProvince(b.province);
        setBillDistrict(b.district);
        setBillSubdistrict(b.subdistrict);
        setBillPostalCode(b.postalCode);
        const sh = parseAddress(so.shipTo);
        setShipAddressLine(sh.street || "");
        setShipProvince(sh.province);
        setShipDistrict(sh.district);
        setShipSubdistrict(sh.subdistrict);
        setShipPostalCode(sh.postalCode);

        // Fallback: if structured fields missing, try populate from selected customer profile
        const cust = customerOptions.find((c) => c.id === so.customerId);
        const noBillStruct = !b.province && !b.district && !b.subdistrict && !b.postalCode;
        if (cust && noBillStruct) {
          if (!b.street && (cust.address || "").trim()) setBillAddressLine(cust.address || "");
          setBillProvince(cust.province ?? undefined);
          setBillDistrict(cust.district ?? undefined);
          setBillSubdistrict(cust.subdistrict ?? undefined);
          setBillPostalCode(cust.postalCode ?? undefined);
        }
        const noShipStruct = !sh.province && !sh.district && !sh.subdistrict && !sh.postalCode;
        if (cust && noShipStruct) {
          const useAddr = sh.street || cust.address || b.street || "";
          setShipAddressLine(useAddr);
          setShipProvince(cust.province ?? b.province ?? undefined);
          setShipDistrict(cust.district ?? b.district ?? undefined);
          setShipSubdistrict(cust.subdistrict ?? b.subdistrict ?? undefined);
          setShipPostalCode(cust.postalCode ?? b.postalCode ?? undefined);
        }
        setStatus(so.status || "DRAFT");
        setInitialServerStatus(so.status || "DRAFT");
        setPaymentStatus(so.paymentStatus || "UNPAID");
        setWorkflowStatus(
          (() => {
            const st = (so.status || "DRAFT") as string;
            const ps = (so.paymentStatus || "UNPAID") as string;
            if (st === "DRAFT") return "DRAFT";
            if (st === "CANCELLED") return "CANCELLED";
            if (st === "INVOICED") return "READY_TO_SHIP";
            if (st === "SHIPPED") return ps === "PAID" ? "COMPLETED" : "IN_TRANSIT";
            if (st === "APPROVED") return "APPROVED";
            if (st === "CONFIRMED") return "PENDING_APPROVAL";
            return "DRAFT";
          })(),
        );
        setShippingFee(Number(so.shippingFee || 0));
        setOtherCharges(Number(so.otherCharges || 0));
        setPoNumber(so.poNumber || "");
        setNote(so.note || "");
        setCancelReason((so as any).cancelReason || "");
        setRejectReason((so as any).rejectReason || "");

        // อัปเดตการโหลด state เพิ่มเติม
        setOrderDiscount(Number(so.orderDiscount || 0));
        // ฝั่ง backend เก็บยอดใช้โปรโมชันไว้ในฟิลด์ promotionSpent ของใบสั่งขาย
        const promoSpent = Number(so.promotionSpent ?? 0);
        setInitialPromotionSpent(isNaN(promoSpent) ? 0 : promoSpent);
        setUsePromotion(promoSpent > 0);
        setPromotionAmount(promoSpent > 0 ? promoSpent : "");

        // อัปเดตการ map items ให้ตรงกับ Item type ใหม่
        const mapped: Item[] = (so.items || []).map((it: any) => ({
          productId: it.productId || undefined,
          productCodeSnapshot: it.productCodeSnapshot || undefined,
          nameSnapshot: it.nameSnapshot || "",
          unit: it.unit || "",
          qty: Number(it.qty || 0),
          unitPrice:
            it.unitPrice === null || it.unitPrice === undefined ? "" : Number(it.unitPrice),
          discountPercent: Number(it.discountPercent || 0),
          discountAmount:
            it.discountAmount === null || it.discountAmount === undefined
              ? ""
              : Number(it.discountAmount),
        }));
        setItems(mapped.length ? mapped : [{ ...DEFAULT_ITEM }]);
      } catch (e: any) {
        setError(e?.message || "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, orderId]);

  // เพิ่ม: useEffect สำหรับโหลด Promotion Budget
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

  // อัปเดต canSubmit ให้รวม logic promotion
  // ตรวจสอบการใช้วงเงินส่งเสริมการขาย: ให้เทียบเฉพาะ "ส่วนต่าง" กับวงเงินคงเหลือ
  const requestedPromo = usePromotion ? Number(promotionAmount || 0) : 0;
  const baseSpentForDelta =
    customerId === initialCustomerId ? Number(initialPromotionSpent || 0) : 0;
  const promoDelta = requestedPromo - baseSpentForDelta;
  const promotionOk =
    !usePromotion ||
    (requestedPromo > 0 &&
      (promoDelta <= 0 || promotionAvailable === null || promoDelta <= Number(promotionAvailable)));

  // ต้องกรอกเหตุผลเมื่อเลือกปฏิเสธ
  const rejectOk = workflowStatus !== "REJECTED" || (rejectReason || "").trim().length > 0;

  const canSubmit =
    customerId &&
    items.length > 0 &&
    items.every((i) => {
      if (!i.productId || i.qty <= 0) return false;
      const p = productOptions.find((x) => x.id === i.productId);
      if (!p) return false;
      return i.qty <= (p.stockOnHand ?? 0) || true;
    }) &&
    promotionOk &&
    rejectOk;

  // คงไว้: handleSubmit (แต่ส่ง PUT และ payload ที่อัปเดต)
  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setSubmitting(true);
    setError(null);
    try {
      // helper: refresh promotion budget after save to reflect new remaining immediately
      const refreshPromotionBudget = async () => {
        try {
          if (!customerId) return;
          const r = await fetch(`/api/customers/${customerId}/promotion-budget`);
          const d = await r.json().catch(() => ({}));
          if (r.ok && typeof d?.promotionBudget !== "undefined") {
            setPromotionAvailable(Number(d.promotionBudget ?? 0));
          }
        } catch {}
      };
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

      // อัปเดต payload ให้ตรงกับ create
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
        usePromotion, // เพิ่ม
        promotionAmount: promotionAmount === "" ? undefined : Number(promotionAmount), // เพิ่ม
        poNumber: poNumber || undefined,
        note: note || undefined,
        rejectReason:
          workflowStatus === "REJECTED" && (rejectReason || "").trim()
            ? (rejectReason || "").trim()
            : undefined,
        cancelReason:
          (workflowStatus === "CANCELLED" && (cancelReason || "").trim()) || (cancelReason || "").trim()
            ? (cancelReason || "").trim()
            : undefined,
        items: items.map((it) => ({
          // อัปเดตการ map items
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
      // คงไว้: ส่ง PUT ไปยัง orderId
      const res = await fetch(`/api/sales/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "บันทึกไม่สำเร็จ");
      }
      // refresh remaining promotion budget so UI shows new value immediately
      await refreshPromotionBudget();
      onUpdated?.(); // คงไว้
      onClose();
    } catch (e: any) {
      setError(e?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  // คงไว้: applyWorkflowMapping
  const applyWorkflowMapping = (wf: string) => {
    setWorkflowStatus(wf);
    switch (wf) {
      case "DRAFT":
        setStatus("DRAFT");
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

  // === เริ่มส่วน JSX ที่ปรับปรุง ===
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>แก้ไขใบสั่งขาย</DialogTitle> {/* คงข้อความ "แก้ไข" */}
      <DialogContent dividers>
        {isLocked && ( // คงไว้: Alert isLocked
          <Alert severity="info" sx={{ mb: 2 }}>
            เอกสารถูกทำเครื่องหมายว่า "สำเร็จ" จึงไม่สามารถแก้ไขได้
          </Alert>
        )}
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
          {/* แสดงเหตุผลการยกเลิก ถ้ามี หรือเมื่อเลือกสถานะยกเลิก */}
          {(workflowStatus === "CANCELLED" || (cancelReason || "").trim().length > 0) && (
            <TextField
              label="เหตุผลการยกเลิก"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              fullWidth
              multiline
              minRows={2}
              InputProps={{ readOnly: workflowStatus !== "CANCELLED" }}
            />
          )}

          {/* เพิ่ม: Promotion usage controls (เหมือน create) */}
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
              {usePromotion && typeof promotionAmount === "number" && (
                <>
                  {" "}
                  | ใช้ในเอกสารนี้:{" "}
                  {requestedPromo.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  บาท
                </>
              )}
              {usePromotion &&
                typeof promotionAmount === "number" &&
                (promoDelta > 0 ? (
                  <>
                    {" "}
                    | ใช้เพิ่ม:{" "}
                    {promoDelta.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    บาท
                  </>
                ) : promoDelta < 0 ? (
                  <>
                    {" "}
                    | จะคืน:{" "}
                    {Math.abs(promoDelta).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    บาท
                  </>
                ) : null)}
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
                promoDelta > Number(promotionAvailable)
              }
              helperText={
                usePromotion &&
                typeof promotionAmount === "number" &&
                promotionAvailable !== null &&
                promoDelta > Number(promotionAvailable)
                  ? "ต้องใช้เพิ่มเกินวงเงินคงเหลือ"
                  : undefined
              }
              sx={{ flex: 1 }}
            />
          </Stack>

          {/* เปลี่ยน: Layout Payment Condition / Credit Term (เหมือน create) */}
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

          {/* เปลี่ยน: Layout Date Pickers (เหมือน create) */}
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

          {/* คงไว้: Billing Address */}
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

          {/* คงไว้: Shipping Address */}
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

          {/* เปลี่ยน: Status/Payment Status (ใช้ options array) */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              select
              label="สถานะเอกสาร"
              value={workflowStatus}
              onChange={(e) => applyWorkflowMapping(e.target.value)}
              disabled={initialServerStatus === "APPROVED" && !canApprove}
              fullWidth
            >
              {STATUS_OPTIONS.filter((s) => {
                if (canApprove) return true;
                if (s.value === "DRAFT" || s.value === "PENDING_APPROVAL") return true;
                if (s.value === "CANCELLED") return Boolean(canReject);
                return false;
              }).map((s) => (
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
          {/* แสดงเหตุผลการปฏิเสธเสมอเมื่อมีค่า และบังคับกรอกเมื่อเลือกปฏิเสธ */}
          {(workflowStatus === "REJECTED" || (rejectReason || "").trim().length > 0) && (
            <TextField
              label="เหตุผลการปฏิเสธ"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required={workflowStatus === "REJECTED"}
              error={workflowStatus === "REJECTED" && (rejectReason || "").trim().length === 0}
              helperText={
                workflowStatus === "REJECTED" && (rejectReason || "").trim().length === 0
                  ? "กรุณากรอกเหตุผลในการปฏิเสธ"
                  : undefined
              }
              fullWidth
              multiline
              minRows={2}
              InputProps={{ readOnly: workflowStatus !== "REJECTED" }}
            />
          )}

          {/* คงไว้: Header รายการสินค้า */}
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

          {/* เปลี่ยน: Layout รายการสินค้า (เหมือน create) */}
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
                          const v = e.target.value === "" ? "" : Number(e.target.value);
                          const next = [...items];
                          next[idx] = { ...next[idx], unitPrice: v };
                          setItems(next);
                        }}
                        sx={{ width: { xs: "100%", md: 130 } }}
                        required
                        disabled // เหมือน create
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
                        value={it.discountAmount} // ใช้ discountAmount (ที่รับ "" ได้)
                        onChange={(e) => {
                          const v = e.target.value === "" ? "" : Number(e.target.value);
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

          {/* เปลี่ยน: Stack ค่าขนส่ง/อื่นๆ (เพิ่ม handlers onFocus/Blur) */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="ค่าขนส่ง"
              type="number"
              value={shippingFee}
              onFocus={(e) => {
                if (Number(e.target.value) === 0) setShippingFee("");
              }}
              onChange={(e) => {
                const val = e.target.value.replace(/^0+(?=\d)/, "");
                setShippingFee(val === "" ? "" : Number(val));
              }}
              onBlur={(e) => {
                if (e.target.value === "") setShippingFee(0);
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
                const val = e.target.value.replace(/^0+(?=\d)/, "");
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

          {/* เปลี่ยน: Stack หมายเหตุ (แยกจาก PO) */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="หมายเหตุ"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              fullWidth
            />
          </Stack>
          <Divider />

          {/* เปลี่ยน: Stack Totals (ใช้ netGrandTotal) */}
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
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isLocked || !canSubmit || isSubmitting} // คง isLocked
        >
          บันทึกการแก้ไข {/* คงข้อความ "บันทึกการแก้ไข" */}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
