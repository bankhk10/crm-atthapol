"use client";

import { useMemo, useState, useTransition } from "react";
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
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import { createLot, deleteLot, updateLot, updateProductPrice } from "../actions";

type ProductInfo = {
  id: string;
  nameTH: string;
  productCode: string;
  price?: number;
};

type LotRow = {
  id: string;
  lotNumber: string;
  qtyOnHand: number;
  importedAt: string;
  expDate: string;
  note?: string;
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

  const totals = useMemo(() => {
    const onHand = rows.reduce((acc, r) => acc + (r.qtyOnHand || 0), 0);
    return { onHand, available: onHand };
  }, [rows]);

  const [newLot, setNewLot] = useState<{
    lotNumber: string;
    qtyOnHand: string;
    importedAt: string;
    expDate: string;
    note: string;
  }>({ lotNumber: "", qtyOnHand: "", importedAt: "", expDate: "", note: "" });

  const savePrice = () => {
    const payload = { price: price === "" ? undefined : Number(price) };
    startTransition(async () => {
      await updateProductPrice(product.id, payload);
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
    const payload = {
      lotNumber: newLot.lotNumber,
      qtyOnHand: Number(newLot.qtyOnHand || 0),
      importedAt: newLot.importedAt,
      expDate: newLot.expDate,
      note: newLot.note,
    } as const;
    startTransition(async () => {
      await createLot(product.id, payload);
      setNewLot({ lotNumber: "", qtyOnHand: "", importedAt: "", expDate: "", note: "" });
    });
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
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={savePrice}
              disabled={isPending}
            >
              บันทึกราคา
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle1" fontWeight={700}>
            ล็อตสินค้า
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>เลขล็อต</TableCell>
                <TableCell align="center">จำนวน</TableCell>
                <TableCell>วันที่นำเข้า</TableCell>
                <TableCell>วันหมดอายุ</TableCell>
                <TableCell>หมายเหตุ</TableCell>
                <TableCell align="center">บันทึก</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, idx) => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ minWidth: 150 }}>
                    <TextField
                      value={r.lotNumber}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, lotNumber: e.target.value } : x)),
                        )
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ width: 150 }}>
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
                  <TableCell sx={{ width: 170 }}>
                    <TextField
                      value={r.importedAt}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, importedAt: e.target.value } : x,
                          ),
                        )
                      }
                      size="small"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                    />
                  </TableCell>
                  <TableCell sx={{ width: 170 }}>
                    <TextField
                      value={r.expDate}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, expDate: e.target.value } : x)),
                        )
                      }
                      size="small"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                    />
                  </TableCell>
                  <TableCell sx={{ minWidth: 160 }}>
                    <TextField
                      value={r.note || ""}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, note: e.target.value } : x)),
                        )
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center" sx={{ width: 150 }}>
                    <IconButton
                      color="primary"
                      onClick={() => saveRow(r)}
                      disabled={isPending}
                      title="บันทึก"
                    >
                      <SaveIcon />
                    </IconButton>
                    {/* <IconButton
                      color="error"
                      onClick={() => removeRow(r)}
                      disabled={isPending}
                      title="ลบล็อต"
                    >
                      <DeleteIcon />
                    </IconButton> */}
                  </TableCell>
                </TableRow>
              ))}

              {/* Add new lot */}
              <TableRow>
                <TableCell>
                  <TextField
                    placeholder="เลขล็อตใหม่"
                    value={newLot.lotNumber}
                    onChange={(e) => setNewLot((v) => ({ ...v, lotNumber: e.target.value }))}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <TextField
                    placeholder="0"
                    value={newLot.qtyOnHand}
                    onChange={(e) => setNewLot((v) => ({ ...v, qtyOnHand: e.target.value }))}
                    size="small"
                    type="number"
                    inputProps={{ min: 0, step: 1 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="date"
                    value={newLot.importedAt}
                    onChange={(e) => setNewLot((v) => ({ ...v, importedAt: e.target.value }))}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="date"
                    value={newLot.expDate}
                    onChange={(e) => setNewLot((v) => ({ ...v, expDate: e.target.value }))}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    placeholder="หมายเหตุ"
                    value={newLot.note}
                    onChange={(e) => setNewLot((v) => ({ ...v, note: e.target.value }))}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={addNewLot}
                    disabled={isPending || newLot.lotNumber.trim().length === 0}
                  >
                    เพิ่มล็อต
                  </Button>
                </TableCell>
              </TableRow>

              {/* Totals */}
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>รวม</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {totals.onHand}
                </TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell align="center"></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Stack>
      </Paper>
    </Stack>
  );
}
