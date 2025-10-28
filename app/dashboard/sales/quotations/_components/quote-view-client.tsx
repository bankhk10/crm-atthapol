"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import EditIcon from "@mui/icons-material/Edit";
import SendIcon from "@mui/icons-material/Send";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import Link from "next/link";
import Loader from "@/components/Loader";
import QuotePrintView from "./quote-print-view";

type ViewData = Parameters<typeof QuotePrintView>[0]["data"];

export function QuoteViewClient({ quoteId }: { quoteId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ViewData | null>(null);
  const [busy, setBusy] = useState<null | "send" | "convert">(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/sales/quotations/${quoteId}`);
        if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
        const q = await res.json();
        const vm: ViewData = {
          quoteNumber: q.quoteNumber,
          quoteDate: q.quoteDate,
          validUntil: q.validUntil,
          // @ts-ignore (optional status for UI decisions)
          status: q.status,
          salespersonName: q.salesperson ? [q.salesperson.prefix, q.salesperson.firstName, q.salesperson.lastName].filter(Boolean).join(" ") : "",
          customer: {
            companyName: q.customer?.companyName ?? [q.customer?.prefix, q.customer?.firstName, q.customer?.lastName].filter(Boolean).join(" ") ?? "",
            taxId: q.customer?.taxId ?? undefined,
            address: q.customer?.address ?? undefined,
            phone: q.customer?.phone ?? undefined,
          },
          company: { companyName: "บริษัทของคุณ" },
          currency: q.currency,
          vatIncluded: q.vatIncluded,
          vatRate: q.vatRate,
          shippingMethod: q.shippingMethod ?? undefined,
          note: q.note ?? undefined,
          items: (q.items || []).map((it: any) => ({
            productCode: it.productCodeSnapshot ?? undefined,
            name: it.nameSnapshot ?? "",
            unit: it.unit ?? undefined,
            qty: Number(it.qty || 0),
            unitPrice: Number(it.unitPrice || 0),
            discountAmount: Number(it.discountAmount || 0),
            amount: Number(it.amount || 0),
          })),
          subTotal: Number(q.subTotal || 0),
          orderDiscount: Number(q.orderDiscount || 0),
          shippingFee: Number(q.shippingFee || 0),
          otherCharges: Number(q.otherCharges || 0),
          taxAmount: Number(q.taxAmount || 0),
          grandTotal: Number(q.grandTotal || 0),
        };
        setData(vm);
      } catch (e: any) {
        setError(e?.message || "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    })();
  }, [quoteId]);

  async function sendQuote() {
    try {
      setBusy("send");
      const res = await fetch(`/api/sales/quotations/${quoteId}/send`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "ส่งใบเสนอราคาไม่สำเร็จ");
      }
      // Optional: refresh view
      const updated = await res.json().catch(() => null);
      setData((prev) => (prev ? { ...prev, // @ts-ignore
        status: updated?.status || prev?.status } : prev));
    } finally {
      setBusy(null);
    }
  }

  async function convertToOrder() {
    try {
      setBusy("convert");
      const res = await fetch(`/api/sales/quotations/${quoteId}/convert-to-order`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "แปลงเป็นใบสั่งขายไม่สำเร็จ");
      }
      const so = await res.json();
      location.href = `/dashboard/sales/orders/${so.id}`;
    } finally {
      setBusy(null);
    }
  }

  const content = useMemo(() => {
    if (error) return <Typography color="error">{error}</Typography>;
    if (!data) return null;
    return (
      <>
        <Stack className="no-print" direction="row" spacing={1} sx={{ mb: 1 }}>
          <Button variant="contained" color="primary" startIcon={<SendIcon />} disabled={busy === "send"} onClick={sendQuote}>
            ส่งใบเสนอราคา
          </Button>
          <Button variant="contained" color="success" startIcon={<ShoppingCartIcon />} disabled={busy === "convert"} onClick={convertToOrder}>
            แปลงเป็น SO
          </Button>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>
            พิมพ์ / PDF
          </Button>
          <Button component={Link} href={`/dashboard/sales/quotations/${quoteId}/edit`} variant="contained" startIcon={<EditIcon />}>แก้ไข</Button>
        </Stack>
        <QuotePrintView data={data} />
      </>
    );
  }, [data, error, quoteId, busy]);

  return (
    <Box sx={{ minHeight: "60vh" }}>
      {content}
      {(loading || busy) && <Loader fullscreen />}
    </Box>
  );
}

export default QuoteViewClient;
