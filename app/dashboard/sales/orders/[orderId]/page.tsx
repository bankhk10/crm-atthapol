import { prisma } from "@/lib/prisma";
import { Box, Chip, Divider, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Button } from "@mui/material";
import Link from "next/link";

// UI workflow status options and helper mapping from backend enums
const WORKFLOW_STATUS_OPTIONS = [
  { value: "DRAFT", label: "ร่าง" },
  { value: "PENDING_APPROVAL", label: "รออนุมัติ" },
  { value: "APPROVED", label: "อนุมัติ" },
  { value: "REJECTED", label: "ปฏิเสธ" },
  { value: "AWAITING_PAYMENT", label: "รอชำระเงิน" },
  { value: "PAID", label: "ชำระเงินแล้ว" },
  { value: "AWAITING_STOCK", label: "รอสินค้า" },
  { value: "READY_TO_SHIP", label: "รอจัดส่ง" },
  { value: "IN_TRANSIT", label: "อยู่ระหว่างจัดส่ง" },
  { value: "COMPLETED", label: "สำเร็จ" },
  { value: "CANCELLED", label: "ยกเลิก" },
];

function workflowFromBackend(status: string, paymentStatus: string): string {
  if (status === "DRAFT") return "DRAFT";
  if (status === "CANCELLED") return "CANCELLED"; // could represent REJECTED too
  if (status === "INVOICED") return "READY_TO_SHIP"; // move payment-related labels to payment status
  if (status === "SHIPPED") return paymentStatus === "PAID" ? "COMPLETED" : "IN_TRANSIT";
  if (status === "APPROVED") return "APPROVED"; // or READY_TO_SHIP
  if (status === "CONFIRMED") return "PENDING_APPROVAL"; // or AWAITING_STOCK
  return status || "DRAFT";
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: "ยังไม่ชำระ",
  PARTIAL: "บางส่วน",
  PAID: "ชำระแล้ว",
  OVERDUE: "เกินกำหนด",
};

function fmtCurrency(n: number | null | undefined) {
  if (typeof n !== "number") return "-";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function displayCustomerName(c: any) {
  if (!c) return "-";
  if (c.companyName && c.companyName.trim().length > 0) return c.companyName;
  const parts = [c.prefix, c.firstName, c.lastName].filter(Boolean);
  return parts.length ? parts.join(" ") : c.id;
}

export default async function SalesOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId: id } = await params;
  const so = await (prisma as any).saleOrder.findUnique({
    where: { id },
    include: {
      items: true,
      customer: true,
      salesperson: { include: { user: true } },
      reservations: { include: { stock: true } },
    },
  });

  if (!so || so.deletedAt) {
    return (
      <Stack spacing={2}>
        <Typography variant="h5" fontWeight={700}>ไม่พบใบสั่งขาย</Typography>
        <Button component={Link as any} href="/dashboard/sales/orders" variant="outlined">กลับรายการขาย</Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }}>
        <Typography variant="h4" fontWeight={700}>ใบสั่งขาย #{so.soNumber}</Typography>
        <Stack direction="row" spacing={1}>
          {(() => {
            const wf = workflowFromBackend(String(so.status || ""), String(so.paymentStatus || ""));
            const label = WORKFLOW_STATUS_OPTIONS.find((x) => x.value === wf)?.label || String(so.status);
            const isCancelled = wf === "CANCELLED" || wf === "REJECTED";
            return <Chip label={label} color={isCancelled ? "default" : "primary"} variant={isCancelled ? "outlined" : "filled"} />;
          })()}
          <Chip label={`ชำระเงิน: ${PAYMENT_STATUS_LABEL[String(so.paymentStatus || "")] || String(so.paymentStatus)}`} variant="outlined" />
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Box flex={1}>
            <Typography fontWeight={700} mb={1}>ข้อมูลเอกสาร</Typography>
            <Stack spacing={0.5}>
              <div>เลขที่เอกสาร: {so.soNumber}</div>
              <div>วันที่สั่งซื้อ: {new Date(so.orderDate).toLocaleDateString()}</div>
              <div>ครบกำหนด: {so.dueDate ? new Date(so.dueDate).toLocaleDateString() : '-'}</div>
              <div>สกุลเงิน: {so.currency} | VAT: {so.vatRate}% ({so.vatIncluded ? 'รวม' : 'ไม่รวม'})</div>
            </Stack>
          </Box>
          <Box flex={1}>
            <Typography fontWeight={700} mb={1}>ลูกค้า</Typography>
            <Stack spacing={0.5}>
              <div>ชื่อลูกค้า: {displayCustomerName(so.customer)}</div>
              <div>ที่อยู่วางบิล: {so.billTo || '-'}</div>
              <div>ที่อยู่จัดส่ง: {so.shipTo || '-'}</div>
              <div>เลขที่ PO: {so.poNumber || '-'}</div>
            </Stack>
          </Box>
          <Box flex={1}>
            <Typography fontWeight={700} mb={1}>พนักงานขาย</Typography>
            <Stack spacing={0.5}>
              <div>
                {(so as any).salesperson
                  ? ([so.salesperson.prefix, so.salesperson.firstName, so.salesperson.lastName].filter(Boolean).join(' ') || so.salesperson.user?.name || so.salesperson.user?.email || so.salesperson.id)
                  : '-'}
              </div>
              <div>สร้างเมื่อ: {new Date(so.createdAt).toLocaleString()}</div>
              <div>แก้ไขล่าสุด: {new Date(so.updatedAt).toLocaleString()}</div>
            </Stack>
          </Box>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography fontWeight={700} mb={1}>รายการสินค้า</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>รหัส</TableCell>
                <TableCell>ชื่อสินค้า</TableCell>
                <TableCell>หน่วย</TableCell>
                <TableCell align="right">จำนวน</TableCell>
                <TableCell align="right">ราคา/หน่วย</TableCell>
                <TableCell align="right">ส่วนลด</TableCell>
                <TableCell align="right">ยอดก่อนภาษี</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {so.items.map((it: any) => (
                <TableRow key={it.id}>
                  <TableCell>{it.productCodeSnapshot || '-'}</TableCell>
                  <TableCell>{it.nameSnapshot || '-'}</TableCell>
                  <TableCell>{it.unit || '-'}</TableCell>
                  <TableCell align="right">{it.qty}</TableCell>
                  <TableCell align="right">{fmtCurrency(it.unitPrice)}</TableCell>
                  <TableCell align="right">{(it.discountPercent || 0) > 0 ? `${it.discountPercent}%` : fmtCurrency(it.discountAmount || 0)}</TableCell>
                  <TableCell align="right">{fmtCurrency(it.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Box flex={1}>
            <Typography fontWeight={700} mb={1}>สรุปยอด</Typography>
            <Stack spacing={0.5}>
              <div>ยอดก่อนภาษี: {fmtCurrency(so.subTotal)}</div>
              <div>ภาษีมูลค่าเพิ่ม: {fmtCurrency(so.taxAmount)}</div>
              <div>ค่าขนส่ง: {fmtCurrency(so.shippingFee)}</div>
              <div>ค่าใช้จ่ายอื่น: {fmtCurrency(so.otherCharges)}</div>
              <Divider sx={{ my: 1 }} />
              <div><strong>ยอดสุทธิ: {fmtCurrency(so.grandTotal)}</strong></div>
            </Stack>
          </Box>
          <Box flex={1}>
            <Typography fontWeight={700} mb={1}>การจองสต็อก</Typography>
            {so.reservations.length === 0 ? (
              <Typography color="text.secondary">ไม่มีรายการจอง</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ล็อต</TableCell>
                      <TableCell align="right">จำนวนที่จอง</TableCell>
                      <TableCell>คืนแล้วเมื่อ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {so.reservations.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.stock?.lotNumber || '-'}</TableCell>
                        <TableCell align="right">{r.qty}</TableCell>
                        <TableCell>{r.releasedAt ? new Date(r.releasedAt).toLocaleString() : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Stack>
      </Paper>

      <Stack direction="row" spacing={1}>
        <Button component={Link as any} href="/dashboard/sales/orders" variant="outlined">กลับรายการขาย</Button>
      </Stack>
    </Stack>
  );
}
