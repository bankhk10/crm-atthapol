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
import MenuItem from "@mui/material/MenuItem";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { th } from "date-fns/locale";
import { createLot, deleteLot, updateLot, updateProductPrice } from "../actions";
import { useRouter } from "next/navigation";
import { SaveBackButtons } from "@/components/SaveBackButtons";

// --- Types (ไม่เปลี่ยนแปลง) ---
type ProductInfo = {
  id: string;
  nameTH: string;
  productCode: string;
  price?: number;
  unit?: string;
};

// Row type from DB
type LotRowDb = {
  id: string;
  lotNumber: string;
  qtyOnHand: number;
  importedAt: string;
  expDate: string;
  warehouse?: string;
  storageLocation?: string;
  warehouseId?: string;
  locationId?: string;
  note?: string;
};

// UI state type (keep qty as string to allow blank and input formatting)
type LotRow = {
  id: string;
  lotNumber: string;
  qtyOnHand: string;
  importedAt: string;
  expDate: string;
  warehouse?: string;
  storageLocation?: string;
  warehouseId?: string;
  locationId?: string;
  note?: string;
  isNew?: boolean;
};

type WarehouseOption = { id: string; name: string };
type LocationOption = { id: string; name: string; warehouseId: string };

export default function InventoryClient({
  product,
  lots,
  warehouses,
  locations,
}: {
  product: ProductInfo;
  lots: LotRowDb[];
  warehouses: WarehouseOption[];
  locations: LocationOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [price, setPrice] = useState<string>(product.price != null ? String(product.price) : "");
  const [rows, setRows] = useState<LotRow[]>(() =>
    (lots || []).map((r) => ({
      id: r.id,
      lotNumber: r.lotNumber,
      qtyOnHand: r.qtyOnHand != null ? String(r.qtyOnHand) : "",
      importedAt: r.importedAt,
      expDate: r.expDate,
      warehouse: r.warehouse ?? "",
      storageLocation: r.storageLocation ?? "",
      warehouseId: r.warehouseId,
      locationId: r.locationId,
      note: r.note ?? "",
    })),
  );
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Sync incoming lots from server after refresh
  useEffect(() => {
    setRows(
      (lots || []).map((r) => ({
        id: r.id,
        lotNumber: r.lotNumber,
        qtyOnHand: r.qtyOnHand != null ? String(r.qtyOnHand) : "",
        importedAt: r.importedAt,
        expDate: r.expDate,
        warehouse: r.warehouse ?? "",
        storageLocation: r.storageLocation ?? "",
        warehouseId: r.warehouseId,
        locationId: r.locationId,
        note: r.note ?? "",
      })),
    );
  }, [lots]);

  const totals = useMemo(() => {
    const onHand = rows.reduce((acc, r) => {
      const n = r.qtyOnHand === "" ? 0 : Number(r.qtyOnHand);
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);
    return { onHand, available: onHand };
  }, [rows]);

  // ค้นหา Draft ล่าสุดตามลำดับที่ถูกเพิ่มใน state
  const latestDraftId = useMemo(() => {
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i]?.isNew) return rows[i].id;
    }
    return null as string | null;
  }, [rows]);

  // เรียงลำดับเลขล็อตตามตัวเลขน้อย -> มาก สำหรับการแสดงผล
  const displayRows = useMemo(() => {
    const parseNum = (s: string) => {
      const m = /^.*?(\d+)$/.exec(String(s).trim());
      return m ? parseInt(m[1], 10) : Number.POSITIVE_INFINITY;
    };
    return [...rows].sort((a, b) => {
      const an = parseNum(a.lotNumber);
      const bn = parseNum(b.lotNumber);
      if (an !== bn) return an - bn;
      return String(a.lotNumber).localeCompare(String(b.lotNumber), "th");
    });
  }, [rows]);

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
            qtyOnHand: r.qtyOnHand === "" ? 0 : Number(r.qtyOnHand),
            importedAt: r.importedAt,
            expDate: r.expDate,
            warehouseId: r.warehouseId,
            locationId: r.locationId,
            note: r.note,
          }),
        );

      const lotCreatePromises = rows
        .filter((r) => r.isNew) // ล็อตใหม่
        .map((d) =>
          createLot(product.id, {
            lotNumber: d.lotNumber,
            qtyOnHand: d.qtyOnHand === "" ? 0 : Number(d.qtyOnHand),
            importedAt: d.importedAt,
            expDate: d.expDate,
            warehouseId: d.warehouseId,
            locationId: d.locationId,
            note: d.note,
          }),
        );

      // รอทุกอย่างพร้อมกัน
      await Promise.all([priceUpdatePromise, ...lotUpdatePromises, ...lotCreatePromises]);

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
      qtyOnHand: "",
      importedAt: "", // ใช้ "" (string เปล่า) ดีกว่า null/undefined สำหรับ input
      expDate: "",
      warehouse: "",
      storageLocation: "",
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
              sx={{ minWidth: 240, width: { xs: "100%", sm: 240 } }}
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
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                เพิ่มล็อต
              </Button>
            }
          />
          {/* [ปรับปรุง] - ลบ padding ของ CardContent เพื่อให้ตารางชิดขอบ */}
          <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
            {isMobile ? (
              <Stack spacing={1.25} sx={{ p: 1.5 }}>
                {displayRows.map((r) => (
                  <Card key={r.id} variant="outlined" sx={{ p: 1.25 }}>
                    <Stack spacing={1.25}>
                      <TextField label="เลขล็อต" value={r.lotNumber} size="small" InputProps={{ readOnly: true }} fullWidth />
                      <TextField
                        label="จำนวน"
                        value={r.qtyOnHand}
                        onChange={(e) => {
                          const raw = e.target.value ?? "";
                          const digits = String(raw).replace(/[^0-9]/g, "");
                          const normalized = digits.replace(/^0+(?=\d)/, "");
                          setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, qtyOnHand: normalized } : x)));
                        }}
                        size="small"
                        type="number"
                        inputProps={{ min: 0, step: 1 }}
                        fullWidth
                      />
                      <DatePicker
                        label="วันที่นำเข้า"
                        value={r.importedAt ? new Date(r.importedAt) : null}
                        onChange={(newValue) => {
                          setRows((prev) =>
                            prev.map((x) =>
                              x.id === r.id
                                ? { ...x, importedAt: newValue ? newValue.toISOString().slice(0, 10) : "" }
                                : x,
                            ),
                          );
                        }}
                        slotProps={{ textField: { size: "small", fullWidth: true } }}
                      />
                      <DatePicker
                        label="วันหมดอายุ"
                        value={r.expDate ? new Date(r.expDate) : null}
                        onChange={(newValue) => {
                          setRows((prev) =>
                            prev.map((x) =>
                              x.id === r.id
                                ? { ...x, expDate: newValue ? newValue.toISOString().slice(0, 10) : "" }
                                : x,
                            ),
                          );
                        }}
                        slotProps={{ textField: { size: "small", fullWidth: true } }}
                      />
                      <TextField
                        select
                        label="คลังสินค้า"
                        value={r.warehouseId ?? ""}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x) =>
                              x.id === r.id
                                ? { ...x, warehouseId: e.target.value || undefined, locationId: undefined }
                                : x,
                            ),
                          )
                        }
                        size="small"
                        fullWidth
                      >
                        <MenuItem value="">- ไม่ระบุ -</MenuItem>
                        {warehouses.map((w) => (
                          <MenuItem key={w.id} value={w.id}>
                            {w.name}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        select
                        label="สถานที่เก็บ"
                        value={r.locationId ?? ""}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x) =>
                              x.id === r.id ? { ...x, locationId: e.target.value || undefined } : x,
                            ),
                          )
                        }
                        size="small"
                        fullWidth
                        disabled={!r.warehouseId}
                      >
                        <MenuItem value="">- ไม่ระบุ -</MenuItem>
                        {locations
                          .filter((loc) => loc.warehouseId === (r.warehouseId ?? ""))
                          .map((loc) => (
                            <MenuItem key={loc.id} value={loc.id}>
                              {loc.name}
                            </MenuItem>
                          ))}
                      </TextField>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TextField
                          label="หมายเหตุ"
                          value={r.note || ""}
                          onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, note: e.target.value } : x)))}
                          size="small"
                          fullWidth
                        />
                        {r.isNew && latestDraftId === r.id && (
                          <IconButton size="small" color="error" onClick={() => handleDeleteRow(r)} disabled={isPending} title="ลบล็อตใหม่ล่าสุด">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    </Stack>
                  </Card>
                ))}
                {/* Totals mobile */}
                <Card variant="outlined" sx={{ p: 1.25 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2" fontWeight={700}>รวม</Typography>
                    <Chip label={String(totals.onHand)} color="default" variant="outlined" />
                  </Stack>
                </Card>
              </Stack>
            ) : (
              <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "grey.50" }}>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>
                    เลขล็อต
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>
                    จำนวน
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>
                    วันที่นำเข้า
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>
                    วันหมดอายุ
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>
                    คลังสินค้า
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>
                    สถานที่เก็บ
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>
                    หมายเหตุ
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayRows.map((r) => (
                  <TableRow
                    key={r.id}
                    hover
                    sx={{
                      backgroundColor: r.isNew ? "rgba(25,118,210,0.06)" : undefined,
                    }}
                  >
                    <TableCell sx={{ minWidth: 80 }}>
                      <TextField
                        value={r.lotNumber}
                        size="small"
                        InputProps={{ readOnly: true }}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 80 }}>
                      <TextField
                        value={r.qtyOnHand}
                        onChange={(e) => {
                          const raw = e.target.value ?? "";
                          const digits = String(raw).replace(/[^0-9]/g, "");
                          const normalized = digits.replace(/^0+(?=\d)/, "");
                          setRows((prev) =>
                            prev.map((x) => (x.id === r.id ? { ...x, qtyOnHand: normalized } : x)),
                          );
                        }}
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
                            prev.map((x) =>
                              x.id === r.id
                                ? {
                                    ...x,
                                    importedAt: newValue ? newValue.toISOString().slice(0, 10) : "",
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
                    <TableCell sx={{ minWidth: 180 }}>
                      <DatePicker
                        label={undefined}
                        value={r.expDate ? new Date(r.expDate) : null}
                        onChange={(newValue) => {
                          setRows((prev) =>
                            prev.map((x) =>
                              x.id === r.id
                                ? {
                                    ...x,
                                    expDate: newValue ? newValue.toISOString().slice(0, 10) : "",
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
                    <TableCell sx={{ minWidth: 160 }}>
                      <TextField
                        select
                        value={r.warehouseId ?? ""}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x) =>
                              x.id === r.id
                                ? { ...x, warehouseId: e.target.value || undefined, locationId: undefined }
                                : x,
                            ),
                          )
                        }
                        size="small"
                        fullWidth
                      >
                        <MenuItem value="">- ไม่ระบุ -</MenuItem>
                        {warehouses.map((w) => (
                          <MenuItem key={w.id} value={w.id}>
                            {w.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell sx={{ minWidth: 160 }}>
                      <TextField
                        select
                        value={r.locationId ?? ""}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x) =>
                              x.id === r.id ? { ...x, locationId: e.target.value || undefined } : x,
                            ),
                          )
                        }
                        size="small"
                        fullWidth
                        disabled={!r.warehouseId}
                      >
                        <MenuItem value="">- ไม่ระบุ -</MenuItem>
                        {locations
                          .filter((loc) => loc.warehouseId === (r.warehouseId ?? ""))
                          .map((loc) => (
                            <MenuItem key={loc.id} value={loc.id}>
                              {loc.name}
                            </MenuItem>
                          ))}
                      </TextField>
                    </TableCell>
                    <TableCell sx={{ minWidth: 300 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TextField
                          value={r.note || ""}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((x) => (x.id === r.id ? { ...x, note: e.target.value } : x)),
                            )
                          }
                          size="small"
                          fullWidth
                        />
                        {r.isNew && latestDraftId === r.id && (
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

                {/* Totals */}
                <TableRow sx={{ backgroundColor: "grey.100" }}>
                  <TableCell align="center">
                    {/* ใช้ Typography และกำหนด variant ที่ต้องการ */}
                    <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                      รวม
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                      {totals.onHand}
                    </Typography>
                  </TableCell>
                  <TableCell colSpan={5}></TableCell>
                </TableRow>
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>

        {/* ปุ่มย้อนกลับ + บันทึก แบบใช้งานซ้ำได้ */}
        <SaveBackButtons onSave={saveAll} backHref="/dashboard/products" isSaving={isPending} />
      </Stack>
    </LocalizationProvider>
  );
}
