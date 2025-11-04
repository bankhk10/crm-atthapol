"use client";

import { useRouter } from "next/navigation";
import { Button, Stack, Tooltip } from "@mui/material";

type Props = {
  orderId: string;
  items: any[];
  canApprove: boolean;
};

export default function CreditRequestsList({ orderId, items, canApprove }: Props) {
  const router = useRouter();

  const approve = async (id: string, defaultIncrease: number) => {
    try {
      const s = window.prompt("จำนวนที่อนุมัติให้เพิ่ม (บาท)", String(defaultIncrease ?? 0));
      const approveIncrease = Number(s ?? 0) || 0;
      const res = await fetch(`/api/sales/orders/${orderId}/credit-requests/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approveIncrease }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'อนุมัติไม่สำเร็จ');
      }
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'อนุมัติไม่สำเร็จ');
    }
  };

  const reject = async (id: string) => {
    try {
      const s = window.prompt("เหตุผลในการปฏิเสธ", "");
      const body = s && s.trim() ? { reason: s.trim() } : undefined;
      const res = await fetch(`/api/sales/orders/${orderId}/credit-requests/${id}/reject`, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'ปฏิเสธไม่สำเร็จ');
      }
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'ปฏิเสธไม่สำเร็จ');
    }
  };

  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <Stack spacing={1}>
      {items.map((cr) => (
        <Stack key={cr.id} direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
          {canApprove && String(cr.status) === 'REQUESTED' && (
            <>
              <Tooltip title="อนุมัติคำขอ" arrow>
                <span>
                  <Button size="small" variant="contained" color="success" onClick={() => approve(cr.id, Number(cr.requestedIncrease || 0))}>อนุมัติ</Button>
                </span>
              </Tooltip>
              <Tooltip title="ปฏิเสธคำขอ" arrow>
                <span>
                  <Button size="small" variant="outlined" color="warning" onClick={() => reject(cr.id)}>ปฏิเสธ</Button>
                </span>
              </Tooltip>
            </>
          )}
        </Stack>
      ))}
    </Stack>
  );
}

