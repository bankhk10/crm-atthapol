"use client";

import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Button,
  IconButton,
  Stack,
  TextField,
  Typography,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Card,
  CardHeader,
  CardContent,
  MenuItem,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { th } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { SaveBackButtons } from "@/components/SaveBackButtons";

import { createLot, deleteLot, updateLot, updateProductPrice } from "../actions";

// --- Types (ไม่เปลี่ยนแปลง) ---
type ProductInfo = {
  id: string;
  nameTH: string;
  productCode: string;
  price?: number;
  unit?: string;
  freebies?: string | null;
  promotionBudget?: number | null;
  otherPromotion?: string | null;
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
  warehouseId?: string | null;
  locationId?: string | null;
  note?: string;
  isNew?: boolean;
};
type LocationOption = { id: string; name: string; warehouseId: string };

export default function InventoryClient({
  product,
  lots,
  locations,
}: {
  product: ProductInfo;
  lots: LotRowDb[];
  locations: LocationOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [price, setPrice] = useState<string>(product.price != null ? String(product.price) : "");
  const [promotionBudget, setPromotionBudget] = useState<string>(
    product.promotionBudget != null ? String(product.promotionBudget) : "",
  );
  const [otherPromotion, setOtherPromotion] = useState<string>(product.otherPromotion ?? "");
  type FreebieRow = { id: string; buyQty: string; freeQty: string; netPrice: string; note: string };
  const parseInitialFreebies = (): FreebieRow[] => {
    const raw = product.freebies ?? "";
    try {
      if (raw && (raw.trim().startsWith("[") || raw.trim().startsWith("{"))) {
        const data = JSON.parse(raw);
        const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        return items
          .map((it: any, idx: number) => {
            // New shape { buyQty, freeQty, netPrice }
            if (typeof it?.buyQty !== "undefined" || typeof it?.freeQty !== "undefined") {
              return {
                id: `fb-${idx}-${Math.random().toString(36).slice(2)}`,
                buyQty: String(Number(it?.buyQty ?? 0) || ""),
                freeQty: String(Number(it?.freeQty ?? 0) || ""),
                netPrice: it?.netPrice != null ? String(it.netPrice) : "",
                note: String(it?.note ?? ""),
              } as FreebieRow;
            }
            // Legacy shape { quantity: "30+1", netPrice }
            const q = String(it?.quantity ?? "");
            let buy = "";
            let free = "";
            if (q) {
              const parts = q
                .split("+")
                .map((s) => s.trim())
                .filter(Boolean);
              if (parts.length >= 1) buy = String(Number(parts[0]) || "");
              if (parts.length >= 2) free = String(Number(parts[1]) || "");
            }
            return {
              id: `fb-${idx}-${Math.random().toString(36).slice(2)}`,
              buyQty: buy,
              freeQty: free,
              netPrice: it?.netPrice != null ? String(it.netPrice) : "",
              note: String(it?.description ?? ""),
            } as FreebieRow;
          })
          .filter(
            (x: FreebieRow) =>
              String(x.buyQty).trim() !== "" ||
              String(x.freeQty).trim() !== "" ||
              String(x.netPrice).trim() !== "" ||
              String(x.note).trim() !== "",
          );
      }
    } catch {}
    // fallback: plain string -> single row
    if (raw.trim() !== "") {
      const q = raw.trim();
      const parts = q
        .split("+")
        .map((s) => s.trim())
        .filter(Boolean);
      const buy = parts[0] ? String(Number(parts[0]) || "") : "";
      const free = parts[1] ? String(Number(parts[1]) || "") : "";
      return [
        {
          id: `fb-0-${Math.random().toString(36).slice(2)}`,
          buyQty: buy,
          freeQty: free,
          netPrice: "",
          note: "",
        },
      ];
    }
    return [];
  };
  const [freebieRows, setFreebieRows] = useState<FreebieRow[]>(parseInitialFreebies);

  // Other promotion items (ชื่อสินค้า, จำนวนคงเหลือ, ราคา, หมายเหตุ)
  type PromoRow = { id: string; name: string; qtyOnHand: string; price: string; note: string };
  const parseInitialPromotions = (): PromoRow[] => {
    const raw = product.otherPromotion ?? "";
    try {
      if (raw && (raw.trim().startsWith("[") || raw.trim().startsWith("{"))) {
        const data = JSON.parse(raw);
        const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        return items
          .map((it: any, idx: number) => ({
            id: `op-${idx}-${Math.random().toString(36).slice(2)}`,
            name: String(it?.name ?? ""),
            qtyOnHand: it?.qtyOnHand != null ? String(it.qtyOnHand) : "",
            price: it?.price != null ? String(it.price) : "",
            note: String(it?.note ?? ""),
          }))
          .filter(
            (x: PromoRow) =>
              x.name.trim() !== "" || x.qtyOnHand.trim() !== "" || x.price.trim() !== "" || x.note.trim() !== "",
          );
      }
    } catch {}
    if (raw.trim() !== "") {
      return [
        { id: `op-0-${Math.random().toString(36).slice(2)}`, name: raw.trim(), qtyOnHand: "", price: "", note: "" },
      ];
    }
    return [];
  };
  const [promoRows, setPromoRows] = useState<PromoRow[]>(parseInitialPromotions);
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
      const freebiesList = freebieRows
        .map((r) => ({
          buyQty: r.buyQty === "" ? 0 : Number(r.buyQty),
          freeQty: r.freeQty === "" ? 0 : Number(r.freeQty),
          netPrice: r.netPrice === "" ? 0 : Number(r.netPrice),
          note: r.note?.trim() || undefined,
        }))
        .filter(
          (it) =>
            (Number.isFinite(it.buyQty) && it.buyQty > 0) ||
            (Number.isFinite(it.freeQty) && it.freeQty > 0),
        );

      const priceUpdatePromise = updateProductPrice(product.id, {
        price: price === "" ? undefined : Number(price),
        freebiesList,
        promotionBudget: promotionBudget === "" ? undefined : Number(promotionBudget),
        // Keep legacy string only if no new list is provided
        otherPromotion: otherPromotion ?? undefined,
        otherPromotionList: promoRows
          .map((r) => ({
            name: r.name.trim(),
            qtyOnHand: r.qtyOnHand === "" ? 0 : Number(r.qtyOnHand),
            price: r.price === "" ? 0 : Number(r.price),
            note: r.note?.trim() || undefined,
          }))
          .filter((it) => it.name !== "" || (Number.isFinite(it.qtyOnHand) && it.qtyOnHand > 0) || (Number.isFinite(it.price) && it.price > 0)),
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
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} useFlexGap flexWrap="wrap">
              <TextField
                label="ราคา"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                sx={{ minWidth: 240, width: { xs: "100%", sm: 240 } }}
                inputProps={{ min: 0, step: 1 }}
                InputProps={{
                  startAdornment: (
                    <Typography
                      sx={{
                        mr: 1,
                        fontWeight: 600,
                        fontSize: 18,
                      }}
                    >
                      ฿
                    </Typography>
                  ),
                }}
              />
              <TextField
                label="งบส่งเสริมการขาย"
                type="number"
                value={promotionBudget}
                onChange={(e) => setPromotionBudget(e.target.value)}
                sx={{ minWidth: 240, width: { xs: "100%", sm: 260 } }}
                inputProps={{ min: 0, step: 1 }}
                InputProps={{
                  startAdornment: (
                    <Typography sx={{ mr: 1, fontWeight: 600, fontSize: 18 }}>฿</Typography>
                  ),
                }}
              />
            </Stack>
          </CardContent>
        </Card>

        {/* --- การ์ดรายการของแถม --- */}
        <Card variant="outlined">
          <CardHeader
            title={
              <Typography variant="subtitle1" fontWeight={700}>
                รายการของแถม
              </Typography>
            }
            action={
              <Stack direction="row" spacing={1} alignItems="center">
                {(() => {
                  const summary = freebieRows.reduce(
                    (acc, r) => {
                      const countable =
                        (r.buyQty?.trim() || r.freeQty?.trim() || r.netPrice?.trim()) !== "";
                      if (countable) acc.count += 1;
                      const np = Number(r.netPrice);
                      if (Number.isFinite(np)) acc.sum += np;
                      return acc;
                    },
                    { count: 0, sum: 0 },
                  );
                  return (
                    <>
                    </>
                  );
                })()}
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={() =>
                    setFreebieRows((prev) => [
                      ...prev,
                      {
                        id: `fb-${Math.random().toString(36).slice(2)}`,
                        buyQty: "",
                        freeQty: "",
                        netPrice: "",
                        note: "",
                      },
                    ])
                  }
                  disabled={isPending}
                  sx={{ width: { xs: "100%", sm: "auto" } }}
                >
                  เพิ่มรายการ
                </Button>
              </Stack>
            }
          />
          <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
            {isMobile ? (
              <Stack spacing={1.25} sx={{ p: 1.5 }}>
                {freebieRows.map((r) => (
                  <Card key={r.id} variant="outlined" sx={{ p: 1.25 }}>
                    <Stack spacing={1.25}>
                      <TextField
                        label="จำนวนที่ซื้อ"
                        type="number"
                        value={r.buyQty}
                        onChange={(e) => {
                          const raw = e.target.value ?? "";
                          const digits = raw.replace(/[^0-9]/g, "");
                          setFreebieRows((prev) =>
                            prev.map((x) => (x.id === r.id ? { ...x, buyQty: digits } : x)),
                          );
                        }}
                        size="small"
                        inputProps={{ min: 0, step: 1 }}
                        fullWidth
                      />
                      <TextField
                        label="จำนวนที่แถม"
                        type="number"
                        value={r.freeQty}
                        onChange={(e) => {
                          const raw = e.target.value ?? "";
                          const digits = raw.replace(/[^0-9]/g, "");
                          setFreebieRows((prev) =>
                            prev.map((x) => (x.id === r.id ? { ...x, freeQty: digits } : x)),
                          );
                        }}
                        size="small"
                        inputProps={{ min: 0, step: 1 }}
                        fullWidth
                      />
                      <TextField
                        label="ราคาสุทธิ"
                        type="number"
                        value={r.netPrice}
                        onChange={(e) => {
                          const v = e.target.value ?? "";
                          setFreebieRows((prev) =>
                            prev.map((x) => (x.id === r.id ? { ...x, netPrice: v } : x)),
                          );
                        }}
                        size="small"
                        inputProps={{ min: 0, step: 1 }}
                        fullWidth
                      />
                      <TextField
                        label="หมายเหตุ"
                        value={r.note}
                        onChange={(e) => {
                          const v = e.target.value ?? "";
                          setFreebieRows((prev) =>
                            prev.map((x) => (x.id === r.id ? { ...x, note: v } : x)),
                          );
                        }}
                        size="small"
                        fullWidth
                      />
                      <Stack direction="row" justifyContent="flex-end">
                        <Button
                          color="error"
                          variant="outlined"
                          onClick={() =>
                            setFreebieRows((prev) => prev.filter((x) => x.id !== r.id))
                          }
                        >
                          ลบ
                        </Button>
                      </Stack>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell align="center" sx={{ width: 150 }}>
                        จำนวนที่ซื้อ
                      </TableCell>
                      <TableCell align="center" sx={{ width: 150 }}>
                        จำนวนที่แถม
                      </TableCell>
                      <TableCell align="center" sx={{ width: 180 }}>
                        ราคาสุทธิ
                      </TableCell>
                      <TableCell align="center">หมายเหตุ</TableCell>
                      <TableCell align="center" sx={{ width: 120 }}>
                        ลบ
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {freebieRows.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            value={r.buyQty}
                            onChange={(e) => {
                              const raw = e.target.value ?? "";
                              const digits = raw.replace(/[^0-9]/g, "");
                              setFreebieRows((prev) =>
                                prev.map((x) => (x.id === r.id ? { ...x, buyQty: digits } : x)),
                              );
                            }}
                            size="small"
                            inputProps={{ min: 0, step: 1 }}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            value={r.freeQty}
                            onChange={(e) => {
                              const raw = e.target.value ?? "";
                              const sanitized = raw.replace(/[^0-9]/g, "");
                              setFreebieRows((prev) =>
                                prev.map((x) => (x.id === r.id ? { ...x, freeQty: sanitized } : x)),
                              );
                            }}
                            size="small"
                            inputProps={{ min: 0, step: 1 }}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            value={r.netPrice}
                            onChange={(e) => {
                              const v = e.target.value ?? "";
                              setFreebieRows((prev) =>
                                prev.map((x) => (x.id === r.id ? { ...x, netPrice: v } : x)),
                              );
                            }}
                            size="small"
                            inputProps={{ min: 0, step: 1 }}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            value={r.note}
                            onChange={(e) => {
                              const v = e.target.value ?? "";
                              setFreebieRows((prev) =>
                                prev.map((x) => (x.id === r.id ? { ...x, note: v } : x)),
                              );
                            }}
                            size="small"
                            placeholder="หมายเหตุ"
                            fullWidth
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <IconButton
                              color="error"
                              onClick={() =>
                                setFreebieRows((prev) => prev.filter((x) => x.id !== r.id))
                              }
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* --- การ์ดรายการส่งเสริมการขายอื่น --- */}
        <Card variant="outlined">
          <CardHeader
            title={<Typography variant="subtitle1" fontWeight={700}>รายการส่งเสริมการขายอื่น</Typography>}
            action={
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddCircleOutlineIcon />}
                onClick={() =>
                  setPromoRows((prev) => [
                    ...prev,
                    { id: `op-${Math.random().toString(36).slice(2)}`, name: "", qtyOnHand: "", price: "", note: "" },
                  ])
                }
                disabled={isPending}
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                เพิ่มรายการ
              </Button>
            }
          />
          <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
            {isMobile ? (
              <Stack spacing={1.25} sx={{ p: 1.5 }}>
                {promoRows.map((r) => (
                  <Card key={r.id} variant="outlined" sx={{ p: 1.25 }}>
                    <Stack spacing={1.25}>
                      <TextField
                        label="ชื่อสินค้า"
                        value={r.name}
                        onChange={(e) => {
                          const v = e.target.value ?? "";
                          setPromoRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, name: v } : x)));
                        }}
                        size="small"
                        fullWidth
                      />
                      <TextField
                        label="จำนวนคงเหลือ"
                        type="number"
                        value={r.qtyOnHand}
                        onChange={(e) => {
                          const digits = (e.target.value ?? "").replace(/[^0-9]/g, "");
                          setPromoRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, qtyOnHand: digits } : x)));
                        }}
                        size="small"
                        inputProps={{ min: 0, step: 1 }}
                        fullWidth
                      />
                      <TextField
                        label="ราคา"
                        type="number"
                        value={r.price}
                        onChange={(e) => {
                          const v = e.target.value ?? "";
                          setPromoRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, price: v } : x)));
                        }}
                        size="small"
                        inputProps={{ min: 0, step: 1 }}
                        fullWidth
                      />
                      <TextField
                        label="หมายเหตุ"
                        value={r.note}
                        onChange={(e) => {
                          const v = e.target.value ?? "";
                          setPromoRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, note: v } : x)));
                        }}
                        size="small"
                        fullWidth
                      />
                      <Stack direction="row" justifyContent="flex-end">
                        <Button color="error" variant="outlined" onClick={() => setPromoRows((prev) => prev.filter((x) => x.id !== r.id))}>
                          ลบ
                        </Button>
                      </Stack>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 240 }} align="center">ชื่อสินค้า</TableCell>
                      <TableCell sx={{ width: 160 }} align="center">จำนวนคงเหลือ</TableCell>
                      <TableCell sx={{ width: 160 }} align="center">ราคา</TableCell>
                      <TableCell align="center">หมายเหตุ</TableCell>
                      <TableCell sx={{ width: 120 }} align="center">ลบ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {promoRows.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell align="center">
                          <TextField
                            value={r.name}
                            onChange={(e) => {
                              const v = e.target.value ?? "";
                              setPromoRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, name: v } : x)));
                            }}
                            size="small"
                            placeholder="ชื่อสินค้า"
                            fullWidth
                          />
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            value={r.qtyOnHand}
                            onChange={(e) => {
                              const digits = (e.target.value ?? "").replace(/[^0-9]/g, "");
                              setPromoRows((prev) =>
                                prev.map((x) => (x.id === r.id ? { ...x, qtyOnHand: digits } : x)),
                              );
                            }}
                            size="small"
                            inputProps={{ min: 0, step: 1 }}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            value={r.price}
                            onChange={(e) => {
                              const v = e.target.value ?? "";
                              setPromoRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, price: v } : x)));
                            }}
                            size="small"
                            inputProps={{ min: 0, step: 1 }}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            value={r.note}
                            onChange={(e) => {
                              const v = e.target.value ?? "";
                              setPromoRows((prev) =>
                                prev.map((x) => (x.id === r.id ? { ...x, note: v } : x)),
                              );
                            }}
                            size="small"
                            placeholder="หมายเหตุ"
                            fullWidth
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton color="error" onClick={() => setPromoRows((prev) => prev.filter((x) => x.id !== r.id))}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
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
                      <TextField
                        label="เลขล็อต"
                        value={r.lotNumber}
                        size="small"
                        InputProps={{ readOnly: true }}
                        fullWidth
                      />
                      <TextField
                        label="จำนวน"
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
                      <DatePicker
                        label="วันที่นำเข้า"
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
                        slotProps={{ textField: { size: "small", fullWidth: true } }}
                      />
                      <DatePicker
                        label="วันหมดอายุ"
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
                        slotProps={{ textField: { size: "small", fullWidth: true } }}
                      />

                      <TextField
                        select
                        label="สถานที่จัดเก็บ"
                        value={r.locationId ?? ""}
                        onChange={(e) => {
                          const locId = (e.target.value as string) || null;
                          const whId = locId
                            ? (locations.find((l) => l.id === locId)?.warehouseId ?? null)
                            : null;
                          setRows((prev) =>
                            prev.map((x) =>
                              x.id === r.id ? { ...x, locationId: locId, warehouseId: whId } : x,
                            ),
                          );
                        }}
                        size="small"
                        fullWidth
                      >
                        <MenuItem value="">- ไม่ระบุ -</MenuItem>
                        {locations.map((loc) => (
                          <MenuItem key={loc.id} value={loc.id}>
                            {loc.name}
                          </MenuItem>
                        ))}
                      </TextField>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TextField
                          label="หมายเหตุ"
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
                    </Stack>
                  </Card>
                ))}
                {/* Totals mobile */}
                <Card variant="outlined" sx={{ p: 1.25 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2" fontWeight={700}>
                      รวม
                    </Typography>
                    <Chip label={String(totals.onHand)} color="default" variant="outlined" />
                  </Stack>
                </Card>
              </Stack>
            ) : (
              <TableContainer sx={{ width: "100%", overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 900 }}>
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
                        สถานที่จัดเก็บ
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
                                prev.map((x) =>
                                  x.id === r.id ? { ...x, qtyOnHand: normalized } : x,
                                ),
                              );
                            }}
                            size="small"
                            type="number"
                            inputProps={{ min: 0, step: 1 }}
                            fullWidth
                          />
                        </TableCell>

                        {/* 1 */}

                        <TableCell sx={{ minWidth: 160, width: 180 }}>
                          <DatePicker
                            label={undefined}
                            value={r.importedAt ? new Date(r.importedAt) : null}
                            onChange={(newValue) => {
                              setRows((prev) =>
                                prev.map((x) =>
                                  x.id === r.id
                                    ? {
                                        ...x,
                                        importedAt: newValue
                                          ? newValue.toISOString().slice(0, 10)
                                          : "",
                                      }
                                    : x,
                                ),
                              );
                            }}
                            slotProps={{
                              textField: {
                                size: "small",
                                fullWidth: true,
                                sx: {
                                  width: { xs: "100%", sm: 140, md: 150 },
                                  minWidth: 140,
                                },
                                inputProps: { style: { fontSize: 14 } },
                              },
                            }}
                          />
                        </TableCell>

                        <TableCell sx={{ minWidth: 160, width: 180 }}>
                          <DatePicker
                            label={undefined}
                            value={r.expDate ? new Date(r.expDate) : null}
                            onChange={(newValue) => {
                              setRows((prev) =>
                                prev.map((x) =>
                                  x.id === r.id
                                    ? {
                                        ...x,
                                        expDate: newValue
                                          ? newValue.toISOString().slice(0, 10)
                                          : "",
                                      }
                                    : x,
                                ),
                              );
                            }}
                            slotProps={{
                              textField: {
                                size: "small",
                                fullWidth: true,
                                sx: {
                                  width: { xs: "100%", sm: 140, md: 150 },
                                  minWidth: 140,
                                },
                                inputProps: { style: { fontSize: 14 } },
                              },
                            }}
                          />
                        </TableCell>

                        {/* 1 */}
                        <TableCell sx={{ minWidth: 140 }}>
                          <TextField
                            select
                            value={r.locationId ?? ""}
                            onChange={(e) => {
                              const locId = (e.target.value as string) || null;
                              const whId = locId
                                ? (locations.find((l) => l.id === locId)?.warehouseId ?? null)
                                : null;
                              setRows((prev) =>
                                prev.map((x) =>
                                  x.id === r.id
                                    ? { ...x, locationId: locId, warehouseId: whId }
                                    : x,
                                ),
                              );
                            }}
                            size="small"
                            fullWidth
                          >
                            <MenuItem value="">- เลือกตำแหน่ง -</MenuItem>
                            {locations.map((loc) => (
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
                                  prev.map((x) =>
                                    x.id === r.id ? { ...x, note: e.target.value } : x,
                                  ),
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
                      <TableCell colSpan={4}></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* ปุ่มย้อนกลับ + บันทึก แบบใช้งานซ้ำได้ */}
        <SaveBackButtons onSave={saveAll} backHref="/dashboard/products" isSaving={isPending} />
      </Stack>
    </LocalizationProvider>
  );
}
