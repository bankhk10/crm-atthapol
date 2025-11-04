"use client";

import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Tooltip } from "@mui/material";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";

type Props = {
  orderId: string;
  status: string;
  paymentCondition?: string;
  canApprove: boolean;
  canReject: boolean;
};

export function ActionsBar({ orderId, status, paymentCondition, canApprove, canReject }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [openReject, setOpenReject] = useState(false);
  const [reason, setReason] = useState("");
  const [openCredit, setOpenCredit] = useState(false);
  const [requestedIncrease, setRequestedIncrease] = useState<string>("");
  const [creditNote, setCreditNote] = useState<string>("");

  const doApprove = async () => {
    setBusy("approve");
    try {
      const res = await fetch(`/api/sales/orders/${orderId}/approve`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "อนุมัติไม่สำเร็จ");
      }
      router.refresh();
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e instanceof Error ? e.message : "อนุมัติไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  };

  const doReject = async () => {
    setBusy("reject");
    try {
      const payload = reason.trim() ? { reason: reason.trim() } : undefined;
      const res = await fetch(`/api/sales/orders/${orderId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload ? JSON.stringify(payload) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "ปฏิเสธไม่สำเร็จ");
      }
      setOpenReject(false);
      setReason("");
      router.refresh();
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e instanceof Error ? e.message : "ปฏิเสธไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  };

  const showApprove = canApprove && (status === "CONFIRMED" || status === "DRAFT");
  const showReject = canReject && (status === "CONFIRMED" || status === "DRAFT");
  const showCreditReq = (paymentCondition === 'POSTPAID') && (status === 'CONFIRMED');

  if (!showApprove && !showReject) return null;

  return (
    <>
      <Stack direction="row" spacing={1} alignItems="center">
        {showApprove && (
          <Tooltip title="อนุมัติเอกสาร" arrow>
            <span>
              <Button variant="contained" color="primary" disabled={busy === "approve"} onClick={doApprove}>
                อนุมัติ
              </Button>
            </span>
          </Tooltip>
        )}
        {showCreditReq && (
          <Tooltip title="ขอเพิ่มวงเงินเครดิต" arrow>
            <span>
              <Button variant="outlined" color="secondary" disabled={busy === "credit"} onClick={() => setOpenCredit(true)}>
                ขอเพิ่มวงเงินเครดิต
              </Button>
            </span>
          </Tooltip>
        )}
        {showReject && (
          <Tooltip title="ปฏิเสธเอกสาร" arrow>
            <span>
              <Button variant="outlined" color="warning" disabled={busy === "reject"} onClick={() => setOpenReject(true)}>
                ปฏิเสธ
              </Button>
            </span>
          </Tooltip>
        )}
      </Stack>

      {busy && <Loader fullscreen />}

      <Dialog open={openCredit} onClose={() => setOpenCredit(false)}>
        <DialogTitle>ขอเพิ่มวงเงินเครดิต</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 1 }}>
            <TextField
              label="จำนวนที่ต้องการเพิ่ม (บาท)"
              value={requestedIncrease}
              onChange={(e) => setRequestedIncrease(e.target.value)}
              type="number"
              inputProps={{ min: 0 }}
              fullWidth
            />
            <TextField
              label="หมายเหตุ"
              value={creditNote}
              onChange={(e) => setCreditNote(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCredit(false)} color="inherit">ปิด</Button>
          <Button
            onClick={async () => {
              setBusy('credit');
              try {
                const payload: any = { requestedIncrease: Number(requestedIncrease || 0) };
                if (creditNote.trim()) payload.note = creditNote.trim();
                const res = await fetch(`/api/sales/orders/${orderId}/credit-requests`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                });
                if (!res.ok) {
                  const data = await res.json().catch(() => ({}));
                  throw new Error(data?.error || 'บันทึกคำขอไม่สำเร็จ');
                }
                setOpenCredit(false);
                setRequestedIncrease('');
                setCreditNote('');
                router.refresh();
              } catch (e) {
                alert(e instanceof Error ? e.message : 'บันทึกคำขอไม่สำเร็จ');
              } finally {
                setBusy(null);
              }
            }}
            variant="contained" color="secondary" disabled={busy === 'credit'}
          >
            ส่งคำขอ
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openReject} onClose={() => setOpenReject(false)}>
        <DialogTitle>ปฏิเสธเอกสาร</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="เหตุผลในการปฏิเสธ"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReject(false)} color="inherit">
            ปิด
          </Button>
          <Button onClick={doReject} variant="contained" color="warning" disabled={busy === "reject"}>
            ยืนยันปฏิเสธ
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

