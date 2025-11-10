"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack } from "@mui/material";

type Props = {
  open: boolean;
  customerId: string;
  onClose: (saved?: boolean) => void;
};

export function CreditRequestDialog({ open, customerId, onClose }: Props) {
  const [amount, setAmount] = useState<string>("");
  const [expiry, setExpiry] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/credit-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, amount: parseFloat(amount), expiryDate: expiry || null, reason }),
      });
      if (!res.ok) throw new Error("failed");
      // refresh server props (approver list and dealers table)
      try { router.refresh(); } catch {}
      onClose(true);
    } catch (err) {
      console.error(err);
      onClose(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle>ขอวงเงินเครดิตชั่วคราว</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField label="จำนวน (THB)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} fullWidth />
          <TextField label="วันหมดอายุ" type="date" InputLabelProps={{ shrink: true }} value={expiry} onChange={(e) => setExpiry(e.target.value)} fullWidth />
          <TextField label="เหตุผล" multiline minRows={3} value={reason} onChange={(e) => setReason(e.target.value)} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>ยกเลิก</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading || !amount}>ส่งคำขอ</Button>
      </DialogActions>
    </Dialog>
  );
}
