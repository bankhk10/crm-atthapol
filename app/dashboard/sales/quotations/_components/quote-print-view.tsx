"use client";

import { Box, Divider, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Paper } from "@mui/material";

type Party = {
  name?: string;
  companyName?: string;
  taxId?: string;
  address?: string;
  phone?: string;
};

type QuoteViewModel = {
  quoteNumber?: string;
  quoteDate?: string; // ISO
  validUntil?: string | null; // ISO
  salespersonName?: string;
  customer?: Party;
  company?: Party;
  currency?: string;
  vatIncluded?: boolean;
  vatRate?: number;
  shippingMethod?: string;
  note?: string;
  items: Array<{
    productCode?: string;
    name: string;
    unit?: string | null;
    qty: number;
    unitPrice: number;
    discountAmount?: number;
    amount: number; // computed
  }>;
  subTotal: number;
  taxAmount: number;
  shippingFee: number;
  otherCharges: number;
  orderDiscount: number;
  grandTotal: number;
};

export default function QuotePrintView({ data }: { data: QuoteViewModel }) {
  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-container { box-shadow: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 12mm; }
        }
      `}</style>

      <Paper className="print-container" sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }}>
          <Stack spacing={0.5}>
            <Typography variant="h5" fontWeight={900}>{data.company?.companyName || "บริษัทของคุณ"}</Typography>
            {data.company?.address && <Typography color="text.secondary">{data.company.address}</Typography>}
            {data.company?.phone && <Typography color="text.secondary">โทร: {data.company.phone}</Typography>}
            {data.company?.taxId && <Typography color="text.secondary">เลขผู้เสียภาษี: {data.company.taxId}</Typography>}
          </Stack>
          <Stack spacing={0.5} sx={{ minWidth: 260 }}>
            <Typography variant="h4" fontWeight={900} align="right">ใบเสนอราคา</Typography>
            <Divider />
            <Typography align="right">เลขที่: {data.quoteNumber || "-"}</Typography>
            <Typography align="right">วันที่: {data.quoteDate ? new Date(data.quoteDate).toLocaleDateString("th-TH") : "-"}</Typography>
            <Typography align="right">ผู้เสนอราคา: {data.salespersonName || "-"}</Typography>
            <Typography align="right">วันหมดอายุ: {data.validUntil ? new Date(data.validUntil).toLocaleDateString("th-TH") : "-"}</Typography>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Customer */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={4}>
          <Stack spacing={0.5} sx={{ minWidth: 280, flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={800}>ลูกค้า</Typography>
            <Typography>{data.customer?.name || data.customer?.companyName || "-"}</Typography>
            {data.customer?.address && <Typography color="text.secondary">{data.customer.address}</Typography>}
            {data.customer?.taxId && <Typography color="text.secondary">เลขผู้เสียภาษี: {data.customer.taxId}</Typography>}
            {data.customer?.phone && <Typography color="text.secondary">โทร: {data.customer.phone}</Typography>}
          </Stack>
          <Stack spacing={0.5} sx={{ minWidth: 240 }}>
            <Typography variant="subtitle1" fontWeight={800}>เงื่อนไข</Typography>
            <Typography color="text.secondary">การจัดส่ง: {data.shippingMethod || "-"}</Typography>
            <Typography color="text.secondary">สกุลเงิน: {data.currency || "THB"}</Typography>
            <Typography color="text.secondary">VAT: {data.vatRate ?? 7}% ({data.vatIncluded ? "รวมภาษี" : "ไม่รวมภาษี"})</Typography>
          </Stack>
        </Stack>

        {/* Items */}
        <TableContainer component={Box} sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#f2f2f2" }}>
                <TableCell sx={{ fontWeight: 800, width: 120 }}>รหัส</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>รายการ</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 80 }}>หน่วย</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 80 }} align="right">จำนวน</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 120 }} align="right">ราคา</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 120 }} align="right">ส่วนลด</TableCell>
                <TableCell sx={{ fontWeight: 800, width: 140 }} align="right">รวม</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((it, idx) => (
                <TableRow key={idx}>
                  <TableCell>{it.productCode || "-"}</TableCell>
                  <TableCell>{it.name}</TableCell>
                  <TableCell>{it.unit || "-"}</TableCell>
                  <TableCell align="right">{it.qty}</TableCell>
                  <TableCell align="right">{it.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell align="right">{(it.discountAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell align="right">{it.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Summary */}
        <Stack spacing={1} sx={{ mt: 2, ml: "auto", width: { xs: "100%", sm: 380 } }}>
          <Row label="ยอดก่อนภาษี" value={data.subTotal} />
          <Row label="ค่าขนส่ง" value={data.shippingFee} />
          <Row label="ค่าใช้จ่ายอื่น" value={data.otherCharges} />
          <Row label="ส่วนลดทั้งบิล" value={data.orderDiscount} />
          <Row label="ภาษีมูลค่าเพิ่ม" value={data.taxAmount} />
          <Divider />
          <Row label="ยอดรวมสุทธิ" value={data.grandTotal} strong />
        </Stack>

        {/* Footer */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={4} sx={{ mt: 4 }}>
          <Stack spacing={1} sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={800}>หมายเหตุ</Typography>
            <Typography color="text.secondary">{data.note || "-"}</Typography>
          </Stack>
          <Stack spacing={3} sx={{ minWidth: 280 }}>
            <Box sx={{ height: 64, borderBottom: "1px solid #bbb" }} />
            <Typography align="center" color="text.secondary">ผู้มีอำนาจลงนาม</Typography>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}

function Row({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography color="text.secondary">{label}</Typography>
      <Typography fontWeight={strong ? 900 : 600}>{value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
    </Stack>
  );
}

