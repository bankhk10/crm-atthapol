"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type DragEvent } from "react";
import {
  Autocomplete,
  Paper,
  Stack,
  TextField,
  Typography,
  MenuItem,
  Button,
  Divider,
  Box,
  IconButton,
  Chip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
// Date pickers removed from product form; manage dates in inventory page
import type { ProductFormValues } from "../validation";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { FillRandomButton } from "@/components/FillRandomButton";
import { makeRandomProductValues } from "@/lib/random-fill/product";

type Plant = {
  id: string;
  name: string;
};

type Props = {
  initialValues: ProductFormValues;
  onSubmit?: (values: ProductFormValues) => Promise<void> | void;
  title?: string;
  existingImages?: { id: string; url: string }[];
  plants: Plant[];
  mode?: "create" | "edit";
};

const CATEGORY_OPTIONS = ["กลุ่ม A", "กลุ่ม B", "กลุ่ม C"] as const;
const BRAND_OPTIONS = ["แบรนด์ A", "แบรนด์ B", "แบรนด์ C"] as const;
const UNIT_OPTIONS = ["อัน", "ชิ้น", "ถุง"] as const;
const STATUS_OPTIONS = ["ACTIVE", "INACTIVE"] as const;
const STATUS_LABELS: Record<(typeof STATUS_OPTIONS)[number], string> = {
  ACTIVE: "ใช้งานอยู่",
  INACTIVE: "ไม่ใช้งาน",
};

type ImageItem = { id: string; url: string; file?: File };

export function ProductForm({
  initialValues,
  onSubmit,
  title,
  existingImages,
  plants,
  mode = "edit",
}: Props) {
  const [values, setValues] = useState<ProductFormValues>(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<ImageItem[]>(
    existingImages?.map((i) => ({ id: i.id, url: i.url })) ?? [],
  );
  const [imageError, setImageError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => setValues(initialValues), [initialValues]);
  useEffect(() => {
    setImages(existingImages?.map((i) => ({ id: i.id, url: i.url })) ?? []);
  }, [existingImages]);

  const handleChange =
    <K extends keyof ProductFormValues>(key: K) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      setError(null);
      setValues((prev) => ({ ...prev, [key]: e.target.value as any }));
    };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    try {
      setSubmitting(true);
      let firstUrl: string | undefined;
      let finalUrls: string[] | undefined;

      if (images.length > 0) {
        const fileItems = images.filter(
          (i): i is Required<ImageItem> => !!i.file,
        ) as Required<ImageItem>[];
        let uploaded: string[] = [];
        if (fileItems.length > 0) {
          const fd = new FormData();
          fileItems.forEach((img) => fd.append("images", img.file));
          const res = await fetch("/api/uploads/products", {
            method: "POST",
            body: fd,
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data?.error ?? "อัปโหลดรูปภาพไม่สำเร็จ");
          }
          const data = (await res.json()) as { urls?: string[] };
          uploaded = data.urls ?? [];
        }
        const map = new Map<string, string>();
        for (let i = 0; i < fileItems.length; i++) {
          map.set(fileItems[i].id, uploaded[i] ?? "");
        }
        finalUrls = images
          .map((img) => (img.file ? (map.get(img.id) ?? "") : img.url))
          .filter((u) => !!u);
        firstUrl = finalUrls[0] ?? values.imageUrl;
      } else {
        finalUrls = [];
      }

      const payload = {
        ...values,
        imageUrl: images.length === 0 ? "" : (firstUrl ?? values.imageUrl),
        imageUrls: finalUrls,
      } as ProductFormValues & { imageUrls?: string[] };
      await onSubmit?.(payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "บันทึกไม่สำเร็จ";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFillRandom = () => {
    setError(null);
    const rnd = makeRandomProductValues({ plants });
    setValues((prev) => ({ ...prev, ...rnd }));
  };

  // Handle image file selection and preview
  const handleSelectImages = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setImageError(null);

    // Filter only images
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));

    // Deduplicate by name + size + lastModified
    const existing = new Set(images.map((im) => im.id));
    const newItems: ImageItem[] = [];
    for (const f of imageFiles) {
      const id = `${f.name}-${f.size}-${f.lastModified}`;
      if (existing.has(id)) continue;
      newItems.push({ id, file: f, url: URL.createObjectURL(f) });
    }

    const total = images.length + newItems.length;
    if (total > 10) {
      // Only take up to 10 total
      const allowed = 10 - images.length;
      const slice = newItems.slice(0, Math.max(0, allowed));
      if (slice.length < newItems.length) {
        setImageError("เลือกรูปได้สูงสุด 10 รูป");
        // Revoke those we won't use
        for (let i = slice.length; i < newItems.length; i++) {
          URL.revokeObjectURL(newItems[i].url);
        }
      }
      setImages((prev) => [...prev, ...slice]);
    } else {
      setImages((prev) => [...prev, ...newItems]);
    }

    // Reset the input so selecting the same files again will trigger onChange
    e.target.value = "";
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.file) URL.revokeObjectURL(target.url);
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleMoveImage = (index: number, dir: -1 | 1) => {
    setImages((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      const tmp = next[index];
      next[index] = next[j];
      next[j] = tmp;
      return next;
    });
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, id: string) => {
    setDraggingId(id);
    try {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
    } catch {}
  };
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      e.dataTransfer.dropEffect = "move";
    } catch {}
  };
  const handleDrop = (_e: DragEvent<HTMLDivElement>, targetId: string) => {
    setImages((prev) => {
      if (!draggingId || draggingId === targetId) return prev;
      const from = prev.findIndex((i) => i.id === draggingId);
      const to = prev.findIndex((i) => i.id === targetId);
      if (from < 0 || to < 0 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDraggingId(null);
  };
  const handleDragEnd = () => setDraggingId(null);

  useEffect(() => {
    // Cleanup object URLs on unmount
    return () => {
      images.forEach((i) => {
        if (i.file) URL.revokeObjectURL(i.url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Include current values in select options when not part of defaults
  const categoryOpts = useMemo(() => {
    const base = [...CATEGORY_OPTIONS];
    const current = values.category ?? "";
    if (current && !base.includes(current as any)) base.unshift(current as any);
    return base;
  }, [values.category]);
  const brandOpts = useMemo(() => {
    const base = [...BRAND_OPTIONS];
    const current = values.brand ?? "";
    if (current && !base.includes(current as any)) base.unshift(current as any);
    return base;
  }, [values.brand]);

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      sx={{
        p: { xs: 2, sm: 3 },
        maxWidth: 900,
        mx: "auto", // จัดให้อยู่กลางแนวนอนของหน้า
      }}
    >
      {/* หัวข้อฟอร์ม */}
      <Typography variant="h4" fontWeight={800} align="center" sx={{ mt: 1, mb: 4 }}>
        {title ?? "เพิ่มข้อมูลสินค้าใหม่"}
      </Typography>
      <Divider sx={{ mt: 1, mb: 4 }} />

      {/* ปุ่มกรอกแบบสุ่ม แสดงเฉพาะตอนเพิ่มใหม่ */}
      {mode === "create" && (
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
          <FillRandomButton onClick={handleFillRandom} disabled={submitting} />
        </Stack>
      )}

      <Stack spacing={2}>
        {error && <Typography color="error.main">{error}</Typography>}

        {/* รหัส + ชื่อสินค้า */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="รหัสสินค้า"
            required
            value={values.productCode}
            onChange={handleChange("productCode")}
            fullWidth
          />
          <TextField
            label="ชื่อสินค้า"
            required
            value={values.nameTH}
            onChange={handleChange("nameTH")}
            fullWidth
          />
        </Stack>

        {/* ลบช่อง ราคา/จำนวนสินค้า: จัดการผ่านหน้าสต็อก/ล็อต */}

        {/* กลุ่มสินค้า + แบรนด์ */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label="กลุ่มสินค้า"
            value={values.category}
            onChange={handleChange("category")}
            fullWidth
          >
            <MenuItem value="">
              <em>-</em>
            </MenuItem>
            {categoryOpts.map((o) => (
              <MenuItem key={o} value={o}>
                {o}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="แบรนด์"
            value={values.brand}
            onChange={handleChange("brand")}
            fullWidth
          >
            <MenuItem value="">
              <em>-</em>
            </MenuItem>
            {brandOpts.map((o) => (
              <MenuItem key={o} value={o}>
                {o}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {/* ชื่อสามัญ + ขนาดบรรจุ */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="ชื่อสามัญ"
            value={values.nameEN ?? ""}
            onChange={handleChange("nameEN")}
            fullWidth
          />

          <TextField
            label="ขนาดบรรจุต่อลัง"
            value={values.packagingSize ?? ""}
            onChange={handleChange("packagingSize")}
            fullWidth
          />
        </Stack>
        {/* หน่วยนับ + สถานะ */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label="หน่วยนับ"
            value={values.unit}
            onChange={handleChange("unit")}
            fullWidth
          >
            {UNIT_OPTIONS.map((o) => (
              <MenuItem key={o} value={o}>
                {o}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="สถานะ"
            value={values.status}
            onChange={handleChange("status")}
            fullWidth
          >
            {STATUS_OPTIONS.map((o) => (
              <MenuItem key={o} value={o}>
                {STATUS_LABELS[o]}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {/* ใช้กับพืช */}
        <Autocomplete
          multiple
          id="plant-select"
          options={plants ?? []}
          getOptionLabel={(option) => option.name}
          value={plants?.filter((p) => values.plantIds?.includes(p.id)) ?? []}
          onChange={(_, newValue) => {
            setValues((prev) => ({
              ...prev,
              plantIds: newValue.map((v) => v.id),
            }));
          }}
          renderInput={(params) => (
            <TextField {...params} label="ใช้กับพืช" placeholder="เลือกพืช" />
          )}
        />
        {/* จุดขายสินค้า */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="จุดขายสินค้า"
            value={values.features ?? ""}
            onChange={handleChange("features")}
            fullWidth
            multiline
            minRows={3}
          />
        </Stack>

        {/* รูปภาพสินค้า */}
        <Stack spacing={1}>
          <Typography variant="subtitle1" fontWeight={700}>
            รูปภาพสินค้า
          </Typography>

          {/* ปุ่มอัปโหลด + แสดงจำนวนรูป */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUploadIcon />} // 👈 เพิ่มไอคอนตรงนี้
              sx={{
                fontFamily: "Prompt, sans-serif",
                fontWeight: 500,
              }}
            >
              เลือกรูปภาพ
              <input hidden type="file" accept="image/*" multiple onChange={handleSelectImages} />
            </Button>
            <Chip label={`${images.length}/10 รูป`} size="small" />
          </Stack>

          {imageError && (
            <Typography color="error.main" variant="body2">
              {imageError}
            </Typography>
          )}

          {/* Previews */}
          {images.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 1 }}>
              {images.map((img, idx) => (
                <Box
                  key={img.id}
                  sx={{
                    position: "relative",
                    width: 112,
                    height: 112,
                    borderRadius: 1.5,
                    overflow: "hidden",
                    border: "1px solid",
                    borderColor: "divider",
                    backgroundColor: "background.default",
                    cursor: "grab",
                    outline: draggingId === img.id ? "2px solid #1976d2" : "none",
                  }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, img.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, img.id)}
                  onDragEnd={handleDragEnd}
                >
                  <img
                    src={img.url}
                    alt={img.file ? img.file.name : "image"}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                  <IconButton
                    size="small"
                    aria-label="remove"
                    onClick={() => handleRemoveImage(img.id)}
                    sx={{
                      position: "absolute",
                      top: 2,
                      right: 2,
                      bgcolor: "rgba(255,255,255,0.85)",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.95)" },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{
                      position: "absolute",
                      bottom: 2,
                      left: 2,
                      bgcolor: "rgba(255,255,255,0.85)",
                      borderRadius: 1,
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={() => handleMoveImage(idx, -1)}
                      disabled={idx === 0}
                    >
                      <ArrowBackIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleMoveImage(idx, +1)}
                      disabled={idx === images.length - 1}
                    >
                      <ArrowForwardIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              ))}
            </Box>
          )}
        </Stack>
      </Stack>
      {/* ปุ่มบันทึก */}
      <Stack
        justifyContent="center"
        alignItems="center"
        sx={{ mt: 4 }} // 👈 เพิ่มระยะห่างด้านบน 32px
      >
        <Button
          type="submit"
          variant="contained"
          sx={{
            bgcolor: "#3797f0ff",
            color: "#fcf9f9ff",
            "&:hover": { bgcolor: "#4a8aebff" },
          }}
        >
          {submitting ? "กำลังบันทึก..." : "บันทึกสินค้า"}
        </Button>
      </Stack>
    </Paper>
  );
}
