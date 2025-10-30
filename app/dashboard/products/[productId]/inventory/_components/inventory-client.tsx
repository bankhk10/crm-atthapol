"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Box,
  Button,
  IconButton,
  Paper,
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
  const [price, setPrice] = useState<string>(product.price != null ? String(product.price) : "");
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

  // The index of the most recently added draft lot (isNew)
  const lastDraftIndex = useMemo(() => {
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i]?.isNew) return i;
    }
    return -1;
  }, [rows]);

  // no inline newLot row; we add draft rows directly into `rows` with isNew=true

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

  const saveAll = () => {
    const pricePayload = { price: price === "" ? undefined : Number(price) };
    const existing = rows.filter((r) => !r.isNew);
    const drafts = rows.filter((r) => r.isNew);
    const updates = existing.map((r) =>
      updateLot(product.id, r.id, {
        lotNumber: r.lotNumber,
        qtyOnHand: r.qtyOnHand,
        importedAt: r.importedAt,
        expDate: r.expDate,
        note: r.note,
      }),
    );

    startTransition(async () => {
      await updateProductPrice(product.id, pricePayload);
      for (const p of updates) await p;
      for (const d of drafts) {
        await createLot(product.id, {
          lotNumber: d.lotNumber,
          qtyOnHand: d.qtyOnHand,
          importedAt: d.importedAt,
          expDate: d.expDate,
          note: d.note,
        });
      }
      router.push(`/dashboard/products`);
    });
  };

  const saveRow = (r: LotRow) => {
    startTransition(async () => {
      await updateLot(product.id, r.id, {
        lotNumber: r.lotNumber,
        qtyOnHand: r.qtyOnHand,
        importedAt: r.importedAt,
        expDate: r.expDate,
        note: r.note,
      });
    });
  };

  const removeRow = (r: LotRow) => {
    startTransition(async () => {
      await deleteLot(product.id, r.id);
      setRows((prev) => prev.filter((x) => x.id !== r.id));
    });
  };

  const addNewLot = () => {
    const draft: LotRow = {
      id: `tmp-${Math.random().toString(36).slice(2)}`,
      lotNumber: nextLotNumber,
      qtyOnHand: 0,
      importedAt: "",
      expDate: "",
      note: "",
      isNew: true,
    };
    setRows((prev) => [...prev, draft]);
  };

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", sm: "center" }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              {product.nameTH}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              รหัสสินค้า: {product.productCode}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              label="ราคา"
              size="small"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              sx={{ minWidth: 140 }}
              inputProps={{ min: 0, step: 1 }}
            />
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle1" fontWeight={700}>
            ล็อตสินค้า
          </Typography>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
            <Table size="small">
              <TableHead>
                <TableRow>
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
                      backgroundColor: r.isNew ? "rgba(25,118,210,0.06)" : undefined,
                    }}
                  >
                    <TableCell>
                      <TextField value={r.lotNumber} size="small" InputProps={{ readOnly: true }} />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={r.qtyOnHand}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, qtyOnHand: Number(e.target.value || 0) } : x,
                            ),
                          )
                        }
                        size="small"
                        type="number"
                        inputProps={{ min: 0, step: 1 }}
                      />
                    </TableCell>
                    <TableCell sx={{ width: 100 }}>
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
                                      ? new Date(newValue).toISOString().slice(0, 10)
                                      : "",
                                  }
                                : x,
                            ),
                          );
                        }}
                        slotProps={{
                          textField: { size: "small", fullWidth: true },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ width: 100 }}>
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
                                      ? new Date(newValue).toISOString().slice(0, 10)
                                      : "",
                                  }
                                : x,
                            ),
                          );
                        }}
                        slotProps={{
                          textField: { size: "small", fullWidth: true },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 300 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TextField
                          value={r.note || ""}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, note: e.target.value } : x)),
                            )
                          }
                          size="small"
                          fullWidth
                        />
                        {r.isNew && idx === lastDraftIndex && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setRows((prev) => prev.filter((x) => x.id !== r.id))}
                            title="ลบล็อตใหม่ล่าสุด"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {/* End rows */}

                {/* *** ปุ่ม "เพิ่มล็อต" ถูกย้ายมาไว้ตรงนี้ *** */}
                <TableRow>
                  <TableCell colSpan={5} sx={{ borderBottom: "none", py: 1.5 }}>
                    <Stack direction="row" spacing={2} justifyContent="center">
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddCircleOutlineIcon />}
                        onClick={addNewLot}
                        disabled={isPending}
                      >
                        เพิ่มล็อต
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>

                {/* Totals */}
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>รวม</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>
                    {totals.onHand}
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </LocalizationProvider>

          {/* *** โค้ดปุ่มที่ถูกย้ายออกไปแล้ว ***
           */}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
            <Button
              variant="contained"
              color="success"
              startIcon={<SaveIcon />}
              onClick={saveAll}
              disabled={isPending}
            >
              บันทึก
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
