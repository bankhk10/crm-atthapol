"use client";

import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Tooltip } from "@mui/material";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";

type Props = {
  orderId: string;
  status: string;
  canApprove: boolean;
  canReject: boolean;
};

export function ActionsBar({ orderId, status, canApprove, canReject }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [openReject, setOpenReject] = useState(false);
  const [reason, setReason] = useState("");

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
        {showReject && (
          <Tooltip title="ปฏิเสธเอกสาร" arrow>
            <span>
              <Button variant="outlined" color="warning" disabled={busy === "reject"} onClick={() => setOpenReject(true)}>
                ปฏิเสธ
              </Button>
            </span>
          </Tooltip>
        )}
        {busy && <Loader size={20} />}
      </Stack>

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

