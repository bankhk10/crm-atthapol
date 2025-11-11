"use client";

import { useEffect, useState } from "react";
import { Button, Dialog, DialogTitle, DialogContent, CircularProgress } from "@mui/material";
import { CreditLimitsTable } from "./credit-limits-table";
import type { CustomerWithDetails } from "../types";

export function ManageCreditLimitsButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<CustomerWithDetails[]>([]);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        // Load a reasonably large page of dealers so user can manage most customers from the dialog
        const params = new URLSearchParams({ page: "1", pageSize: "1000" });
        const res = await fetch(`/api/customers/dealers?${params.toString()}`);
        const data = await res.json();
        if (!mounted) return;
        setCustomers(data.items || []);
      } catch (err) {
        console.error("Failed to load dealers", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [open]);

  return (
    <>
      <Button variant="outlined" color="primary" onClick={() => setOpen(true)}>
        จัดการวงเงิน
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>จัดการวงเงินทั้งหมด</DialogTitle>
        <DialogContent>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <CircularProgress />
            </div>
          ) : (
            <CreditLimitsTable customers={customers} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
