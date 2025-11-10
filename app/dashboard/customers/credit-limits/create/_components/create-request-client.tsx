"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { th } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SaveBackButtons } from "@/components/SaveBackButtons";

type CustomerOption = {
  id: string;
  label: string;
  companyName: string | null;
};

type Props = {
  customerOptions: CustomerOption[];
};

export function CreateRequestClient({ customerOptions }: Props) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!customerId || !amount || !expiryDate) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/temp-credit-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          expiryDate: new Date(expiryDate).toISOString(),
          reason: reason.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "บันทึกไม่สำเร็จ");
      }

      router.push("/dashboard/customers/credit-limits?saved=1");
    } catch (err) {
      alert(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h4" fontWeight={700} align="center">
        ขอวงเงินเครดิตชั่วคราว
      </Typography>

      <Box sx={{ my: 4 }}>
        <Card component={Paper}>
          <CardContent>
            <Stack spacing={3}>
              <FormControl fullWidth>
                <InputLabel>ร้านค้า</InputLabel>
                <Select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  label="ร้านค้า"
                >
                  {customerOptions.map((opt) => (
                    <MenuItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="จำนวนเงินที่ขอ"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                InputProps={{
                  inputProps: { min: 0 },
                }}
              />

              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
                <DatePicker
                  label="วันที่หมดอายุ"
                  value={expiryDate ? new Date(expiryDate) : null}
                  onChange={(newValue) => {
                    setExpiryDate(newValue ? newValue.toISOString().slice(0, 10) : "");
                  }}
                  slotProps={{ textField: { fullWidth: true } }}
                  minDate={new Date()}
                />
              </LocalizationProvider>

              <TextField
                label="หมายเหตุ"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                fullWidth
                multiline
                minRows={2}
                placeholder="ระบุเหตุผลที่ขอวงเงินเครดิตชั่วคราว"
              />
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <SaveBackButtons
        isSaving={isSaving}
        onSave={handleSubmit}
        backHref="/dashboard/customers/credit-limits"
      />
    </Stack>
  );
}