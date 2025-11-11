"use client";

import { useEffect, useState } from "react";
import { Button, Dialog, DialogTitle, DialogContent, CircularProgress, Box } from "@mui/material";
import { CreditLimitEditDialog } from "../../credit-limits/_components/credit-limit-edit-dialog";
import type { CustomerWithDetails } from "../../credit-limits/types";

type ManageSingleCreditLimitButtonProps = {
  customerId: string;
};

export function ManageSingleCreditLimitButton({ customerId }: ManageSingleCreditLimitButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<CustomerWithDetails | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/customers/${customerId}`);
        const data = await res.json();
        if (!mounted) return;
        setCustomer(data);
      } catch (err) {
        console.error("Failed to load customer", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [customerId, open]);

  const handleEditClick = () => {
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
  };

  const handleEditSaved = () => {
    // Reload customer data after save
    setEditDialogOpen(false);
    setOpen(false);
  };

  return (
    <>
      <Button variant="outlined" color="primary" onClick={() => setOpen(true)}>
        จัดการวงเงิน
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>จัดการวงเงิน</DialogTitle>
        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
              <CircularProgress />
            </Box>
          ) : customer ? (
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                color="primary" 
                fullWidth
                onClick={handleEditClick}
              >
                แก้ไขวงเงิน
              </Button>
            </Box>
          ) : null}
        </DialogContent>
      </Dialog>

      {customer && editDialogOpen && (
        <CreditLimitEditDialog
          customer={customer}
          onClose={handleEditClose}
          onSaved={handleEditSaved}
        />
      )}
    </>
  );
}
