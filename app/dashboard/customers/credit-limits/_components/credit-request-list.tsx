"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, List, ListItem, ListItemText, Stack, Typography } from "@mui/material";
import { formatNumber } from "@/lib/format";

type Req = {
  id: string;
  customerId: string;
  amount: number;
  expiryDate: string | null;
  reason: string | null;
  status: string;
  requestedByUserId: string | null;
  processedByUserId: string | null;
  processedAt: string | null;
  createdAt: string;
};

export function CreditRequestList() {
  const [items, setItems] = useState<Req[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/credit-requests?status=PENDING");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/credit-requests/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve" }) });
      if (!res.ok) throw new Error("approve failed");
      // refresh server props (dealers) so the table shows updated temporary credit
      router.refresh();
      fetchList();
    } catch (err) {
      console.error(err);
      fetchList();
    }
  };

  const handleReject = async (id: string) => {
    try {
      const res = await fetch(`/api/credit-requests/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reject" }) });
      if (!res.ok) throw new Error("reject failed");
      router.refresh();
      fetchList();
    } catch (err) {
      console.error(err);
      fetchList();
    }
  };

  if (loading) return <Typography>กำลังโหลด...</Typography>;

  return (
    <Box>
      <Stack spacing={1}>
        {items.length === 0 ? (
          <Typography>ไม่มีคำขอวงเงินชั่วคราวที่รออนุมัติ</Typography>
        ) : (
          <List>
            {items.map((it) => (
              <ListItem key={it.id} secondaryAction={
                <Stack direction="row" spacing={1}>
                  <Button color="success" variant="contained" onClick={() => handleApprove(it.id)}>อนุมัติ</Button>
                  <Button color="error" variant="outlined" onClick={() => handleReject(it.id)}>ปฏิเสธ</Button>
                </Stack>
              }>
                <ListItemText primary={`${it.customerId} — ${formatNumber(it.amount)}`} secondary={`${it.reason ?? "-"} • ขอเมื่อ ${new Date(it.createdAt).toLocaleString('th-TH')}`} />
              </ListItem>
            ))}
          </List>
        )}
      </Stack>
    </Box>
  );
}
