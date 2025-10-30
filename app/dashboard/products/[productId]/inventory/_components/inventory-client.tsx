"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Box,
  Button,
  IconButton,
  Paper, // ยังเก็บไว้เผื่อใช้ แต่ตัวอย่างนี้จะใช้ Card
  Stack,
  TextField,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Divider,
  Chip,
  Card, // เพิ่ม
  CardHeader, // เพิ่ม
  CardContent, // เพิ่ม
  CircularProgress, // เพิ่ม
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { th } from "date-fns/locale";
import { createLot, deleteLot, updateLot, updateProductPrice } from "../actions";
import { useRouter } from "next/navigation";

// --- Types (ไม่เปลี่ยนแปลง) ---
type ProductInfo = {
  id: string;
  nameTH: string;
  productCode: string;
  price?: number;
  unit?: string;
};

type LotRow = {
  id: string;
  lotNumber: string;
  qtyOnHand: number;
  importedAt: string;
  expDate: string;
  note?: string;
  isNew?: boolean;
};

export default function InventoryClient({
  product,
  lots,
}: {
  product: ProductInfo;
  lots: LotRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const [price, setPrice] = useState<string>(
    product.price != null ? String(product.price) : ""
  );
  const [rows, setRows] = useState<LotRow[]>(() => lots);
  const router = useRouter();

  // Sync incoming lots from server after refresh
  useEffect(() => {
    setRows(lots);
  }, [lots]);

  const totals = useMemo(() => {
    const onHand = rows.reduce((acc, r) => acc + (r.qtyOnHand || 0), 0);
    return { onHand, available: onHand };
  }, [rows]);

  // ให้ลบได้เฉพาะล็อตใหม่ล่าสุด (Draft ตัวท้ายสุดเท่านั้น)
  const lastDraftIndex = useMemo(() => {
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i]?.isNew) return i;
    }
    return -1;
  }, [rows]);

  // ลบ useMemo lastDraftIndex (ไม่จำเป็นแล้ว)

  // Auto-generate next lot number like "Lot.1", "Lot.2"
  const nextLotNumber = useMemo(() => {
    let maxN = 0;
    for (const r of rows) {
      const m = /^Lot\.(\d+)$/.exec(r.lotNumber.trim());
      if (m) {
        const n = parseInt(m[1], 10);
        if (!Number.isNaN(n)) maxN = Math.max(maxN, n);
      }
    }
    return `Lot.${maxN + 1}`;
  }, [rows]);

  // [ปรับปรุง] - ใช้ Promise.all เพื่อให้บันทึกพร้อมกัน
  const saveAll = () => {
    startTransition(async () => {
      const priceUpdatePromise = updateProductPrice(product.id, {
        price: price === "" ? undefined : Number(price),
      });

      const lotUpdatePromises = rows
        .filter((r) => !r.isNew) // ล็อตเดิม
        .map((r) =>
          updateLot(product.id, r.id, {
            lotNumber: r.lotNumber,
            qtyOnHand: r.qtyOnHand,
            importedAt: r.importedAt,
            expDate: r.expDate,
            note: r.note,
          })
        );

      const lotCreatePromises = rows
        .filter((r) => r.isNew) // ล็อตใหม่
        .map((d) =>
          createLot(product.id, {
            lotNumber: d.lotNumber,
            qtyOnHand: d.qtyOnHand,
            importedAt: d.importedAt,
            expDate: d.expDate,
            note: d.note,
          })
        );

      // รอทุกอย่างพร้อมกัน
      await Promise.all([
        priceUpdatePromise,
        ...lotUpdatePromises,
        ...lotCreatePromises,
      ]);

      router.push(`/dashboard/products`);
    });
  };

  // ลบ saveRow (ไม่ได้ใช้)

  // [ปรับปรุง] - ฟังก์ชันเดียวสำหรับจัดการการลบ
  const handleDeleteRow = (rowToDelete: LotRow) => {
    if (rowToDelete.isNew) {
      // 1. ถ้าเป็นแถวใหม่ (Draft) - ลบออกจาก state เลย
      setRows((prev) => prev.filter((r) => r.id !== rowToDelete.id));
    } else {
      // 2. ถ้าเป็นแถวเก่า (จาก DB) - เรียก Server Action
      startTransition(async () => {
        await deleteLot(product.id, rowToDelete.id);
        // เมื่อสำเร็จ ค่อยลบออกจาก state
        setRows((prev) => prev.filter((r) => r.id !== rowToDelete.id));
      });
    }
  };

  const addNewLot = () => {
    const draft: LotRow = {
      id: `tmp-${Math.random().toString(36).slice(2)}`,
      lotNumber: nextLotNumber,
      qtyOnHand: 0,
      importedAt: "", // ใช้ "" (string เปล่า) ดีกว่า null/undefined สำหรับ input
      expDate: "",
      note: "",
      isNew: true,
    };
    setRows((prev) => [...prev, draft]);
  };

  // [ปรับปรุง] - หุ้มทุกอย่างด้วย LocalizationProvider
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
      <Stack spacing={3}>
        {/* --- การ์ดข้อมูลสินค้าและปุ่มบันทึก --- */}
        <Card variant="outlined">
          <CardHeader
            title={
              <Typography variant="h6" fontWeight={700}>
                {product.nameTH}
              </Typography>
            }
            subheader={`รหัสสินค้า: ${product.productCode}`}
          />
          <CardContent>
            <TextField
              label="ราคา"
              // size="small"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              sx={{ minWidth: 240 }}
              inputProps={{ min: 0, step: 1 }}
            />
          </CardContent>
        </Card>

        {/* --- การ์ดจัดการล็อต --- */}
        <Card variant="outlined">
          <CardHeader
            title={
              <Typography variant="subtitle1" fontWeight={700}>
                ล็อตสินค้า
              </Typography>
            }
            action={
              // [ปรับปรุง] - ย้ายปุ่ม "เพิ่มล็อต" มาไว้ที่นี่
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddCircleOutlineIcon />}
                onClick={addNewLot}
                disabled={isPending}
              >
                เพิ่มล็อต
              </Button>
            }
          />
          {/* [ปรับปรุง] - ลบ padding ของ CardContent เพื่อให้ตารางชิดขอบ */}
          <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "grey.50" }}>
                  <TableCell sx={{ fontWeight: 700 }}>เลขล็อต</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>
                    จำนวน
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>วันที่นำเข้า</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>วันหมดอายุ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>หมายเหตุ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r, idx) => (
                  <TableRow
                    key={r.id}
                    hover
                    sx={{
                      backgroundColor: r.isNew
                        ? "rgba(25,118,210,0.06)"
                        : undefined,
                    }}
                  >
                    <TableCell sx={{ minWidth: 180 }}>
                      <TextField
                        value={r.lotNumber}
                        size="small"
                        InputProps={{ readOnly: true }}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 120 }}>
                      <TextField
                        value={r.qtyOnHand}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, qtyOnHand: Number(e.target.value || 0) }
                                : x
                            )
                          )
                        }
                        size="small"
                        type="number"
                        inputProps={{ min: 0, step: 1 }}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 180 }}>
                      <DatePicker
                        label={undefined}
                        value={r.importedAt ? new Date(r.importedAt) : null}
                        onChange={(newValue) => {
                          setRows((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? {
                                    ...x,
                                    importedAt: newValue
                                      ? newValue.toISOString().slice(0, 10)
                                      : "",
                                  }
                                : x
                            )
                          );
                        }}
                        slotProps={{
                          textField: { size: "small", fullWidth: true },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 180 }}>
                      <DatePicker
                        label={undefined}
                        value={r.expDate ? new Date(r.expDate) : null}
                        onChange={(newValue) => {
                          setRows((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? {
                                    ...x,
                                    expDate: newValue
                                      ? newValue.toISOString().slice(0, 10)
                                      : "",
                                  }
                                : x
                            )
                          );
                        }}
                        slotProps={{
                          textField: { size: "small", fullWidth: true },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 200 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TextField
                          value={r.note || ""}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((x, i) =>
                                i === idx ? { ...x, note: e.target.value } : x,
                              ),
                            )
                          }
                          size="small"
                          fullWidth
                        />
                        {r.isNew && idx === lastDraftIndex && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteRow(r)}
                            disabled={isPending}
                            title="ลบล็อตใหม่ล่าสุด"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    </TableCell>
                    {/* คอลัมน์จัดการถูกลบออกตามคำขอ */}
                  </TableRow>
                ))}
                {/* End rows */}

                {/* --- ลบปุ่ม "เพิ่มล็อต" ออกจากตรงนี้ --- */}

                {/* Totals */}
                <TableRow sx={{ backgroundColor: "grey.100" }}>
                  <TableCell sx={{ fontWeight: 700 }}>รวม</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>
                    {totals.onHand}
                  </TableCell>
                  {/* ปรับ ColSpan ให้ตรงกับจำนวนคอลัมน์ปัจจุบัน */}
                  <TableCell colSpan={3}></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
          {/* --- ลบปุ่ม "บันทึก" ออกจากตรงนี้ --- */}
        </Card>

        {/* ปุ่มบันทึก ล่างสุด */}
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="center">
          <Button
            variant="contained"
            color="success"
            onClick={saveAll}
            disabled={isPending}
            startIcon={
              isPending ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />
            }
            sx={{ minWidth: 140 }}
          >
            {isPending ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </Stack>
      </Stack>
    </LocalizationProvider>
  );
}
