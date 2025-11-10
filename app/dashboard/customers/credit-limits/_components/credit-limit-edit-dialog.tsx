"use client";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { useState } from "react";
import type { CustomerWithDetails } from "../types";

type CreditLimitEditDialogProps = {
  customer: CustomerWithDetails;
  onClose: () => void;
  onSaved?: () => void;
};

export function CreditLimitEditDialog({ customer, onClose, onSaved }: CreditLimitEditDialogProps) {
  const [creditLimit, setCreditLimit] = useState<string>(
    customer.dealerDetail?.creditLimit?.toString() || ""
  );
  const [temporaryCreditLimit, setTemporaryCreditLimit] = useState<string>(
    customer.dealerDetail?.temporaryCreditLimit?.toString() || ""
  );
  const [temporaryCreditExpiry, setTemporaryCreditExpiry] = useState<string>(
    customer.dealerDetail?.temporaryCreditExpiry
      ? new Date(customer.dealerDetail.temporaryCreditExpiry).toISOString().split('T')[0]
      : ""
  );
  const [promotionBudgetLimit, setPromotionBudgetLimit] = useState<string>(
    customer.dealerDetail?.promotionBudgetLimit?.toString() || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/customers/${customer.id}/credit-limit`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creditLimit: creditLimit ? parseFloat(creditLimit) : null,
          temporaryCreditLimit: temporaryCreditLimit ? parseFloat(temporaryCreditLimit) : null,
          temporaryCreditExpiry: temporaryCreditExpiry ? new Date(temporaryCreditExpiry) : null,
          promotionBudgetLimit: promotionBudgetLimit ? parseFloat(promotionBudgetLimit) : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update credit limit");
      }

      // notify parent that we saved successfully so it can reload and show a saved banner
      onClose();
      // call optional onSaved callback
      try {
        (onSaved as any)?.();
      } catch (_) {
        // ignore
      }
    } catch (error) {
      console.error("Error updating credit limit:", error);
      // TODO: Show error message
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>แก้ไขวงเงิน - {customer.companyName}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <TextField
            autoFocus
            margin="dense"
            label="วงเงินเครดิต"
            type="number"
            fullWidth
            value={creditLimit}
            onChange={(e) => setCreditLimit(e.target.value)}
            InputProps={{
              inputProps: { min: 0 }
            }}
          />
          <TextField
            margin="dense"
            label="วงเงินเครดิตชั่วคราว"
            type="number"
            fullWidth
            value={temporaryCreditLimit}
            onChange={(e) => setTemporaryCreditLimit(e.target.value)}
            InputProps={{
              inputProps: { min: 0 }
            }}
          />
          <TextField
            margin="dense"
            label="วันหมดอายุวงเงินเครดิตชั่วคราว"
            type="date"
            fullWidth
            value={temporaryCreditExpiry}
            onChange={(e) => setTemporaryCreditExpiry(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
          />
          <TextField
            margin="dense"
            label="วงเงินส่งเสริมการขาย"
            type="number"
            fullWidth
            value={promotionBudgetLimit}
            onChange={(e) => setPromotionBudgetLimit(e.target.value)}
            InputProps={{
              inputProps: { min: 0 }
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>ยกเลิก</Button>
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          variant="contained"
        >
          บันทึก
        </Button>
      </DialogActions>
    </Dialog>
  );
}