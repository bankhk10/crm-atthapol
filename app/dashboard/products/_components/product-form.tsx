"use client";

import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import DeleteIcon from "@mui/icons-material/Close";
// Date pickers removed from product form; manage dates in inventory page
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
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
import { createFilterOptions } from "@mui/material/Autocomplete";
import { useSession } from "next-auth/react";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type DragEvent,
} from "react";

import { FillRandomButton } from "@/components/FillRandomButton";
import { SaveBackButtons } from "@/components/SaveBackButtons";
import { makeRandomProductValues } from "@/lib/random-fill/product";
import { canShowRandomFill } from "@/lib/ui-permissions";

import { ensurePlantsByNames } from "../actions";

import type { ProductFormValues } from "../validation";

type Plant = {
  id: string;
  name: string;
};
type PlantCreatable = Plant | { inputValue?: string; name: string; create?: boolean } | string;

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
  const { data: session } = useSession();
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

      // Create missing plants (from freeSolo selections) before submit
      const pendingNewNames = customPlantNames;
      let extraPlantIds: string[] = [];
      if (pendingNewNames.length > 0) {
        const created = await ensurePlantsByNames(pendingNewNames);
        extraPlantIds = created.map((r) => r.id);
      }

      const payload = {
        ...values,
        plantIds: Array.from(new Set([...(values.plantIds ?? []), ...extraPlantIds])),
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

    // Filter by type/extension and size
    const MAX_BYTES = 5 * 1024 * 1024; // 5MB
    const ALLOWED_MIME = new Set([
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/avif",
      "image/svg+xml",
      "image/gif",
    ]);
    const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "avif", "svg", "gif"]);
    const invalidNames: string[] = [];
    const imageFiles = files.filter((f) => {
      const name = f.name || "(ไม่มีชื่อไฟล์)";
      const ext = (name.split(".").pop() || "").toLowerCase();
      const mimeOk = f.type ? ALLOWED_MIME.has(f.type) || f.type.startsWith("image/") : false;
      const extOk = ext ? ALLOWED_EXT.has(ext) : false;
      if (!(mimeOk || extOk)) {
        invalidNames.push(name);
        return false;
      }
      if (typeof f.size === "number" && f.size > MAX_BYTES) {
        setImageError("ขนาดไฟล์ต้องไม่เกิน 5MB ต่อไฟล์");
        return false;
      }
      return true;
    });

    if (invalidNames.length > 0) {
      const msg = `ไฟล์ไม่รองรับ: ${invalidNames.join(", ")} (รองรับ: JPG, PNG, WebP, AVIF, SVG, GIF)`;
      setImageError(msg);
      try {
        alert(msg);
      } catch {}
    }

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

  // ---------- Creatable Autocomplete (plants) ----------
  const filter = createFilterOptions<PlantCreatable>();
  const [customPlantNames, setCustomPlantNames] = useState<string[]>([]);
  const currentPlantValues: PlantCreatable[] = useMemo(() => {
    const existing = plants?.filter((p) => (values.plantIds ?? []).includes(p.id)) ?? [];
    const customs = customPlantNames.map((name) => ({ name }));
    return [...existing, ...customs];
  }, [plants, values.plantIds, customPlantNames]);

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

      {/* ปุ่มกรอกแบบสุ่ม: แสดงเฉพาะตอนเพิ่มใหม่ และมีสิทธิ์ */}
      {mode === "create" &&
        canShowRandomFill(session?.user?.permissions ?? [], "products", "create") && (
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
            label="ชื่อการค้า"
            required
            value={values.nameTH}
            onChange={handleChange("nameTH")}
            fullWidth
          />
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="ชื่อสามัญ"
            value={values.nameEN ?? ""}
            onChange={handleChange("nameEN")}
            fullWidth
          />
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
        </Stack>

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

        {/* ขนาดบรรจุต่อลัง (ตัวเลขเท่านั้น) */}
        {/* ชื่อสามัญ + ขนาดบรรจุ (เช่น 500ml) */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="ขนาดบรรจุ"
            value={values.packagingSize ?? ""}
            onChange={handleChange("packagingSize")}
            fullWidth
          />
          <TextField
            label="ขนาดบรรจุต่อลัง"
            type="number"
            inputProps={{ min: 1 }}
            value={values.packagingPerCarton ?? ""}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                packagingPerCarton:
                  e.target.value === "" ? undefined : Number((e.target as HTMLInputElement).value),
              }))
            }
            fullWidth
          />
        </Stack>

        {/* หน่วยนับ + สถานะ */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
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

        {/* ใช้กับพืช (รองรับเพิ่มตัวเลือกใหม่) */}
        <Autocomplete
          multiple
          freeSolo
          id="plant-select"
          options={(plants ?? []) as PlantCreatable[]}
          filterOptions={(options, params) => {
            const filtered = filter(options, params);
            const { inputValue } = params;
            const exists = (plants ?? []).some(
              (p) => p.name.toLowerCase() === String(inputValue).toLowerCase(),
            );
            const alreadyCustom = customPlantNames.some(
              (n) => n.toLowerCase() === String(inputValue).toLowerCase(),
            );
            if (inputValue && String(inputValue).trim().length > 0 && !exists && !alreadyCustom) {
              const createOption = { name: String(inputValue).trim(), inputValue, create: true };
              return [createOption as PlantCreatable, ...filtered];
            }
            return filtered;
          }}
          getOptionLabel={(option) => {
            if (typeof option === "string") return option;
            if ((option as any).inputValue) return (option as any).name;
            return (option as Plant).name;
          }}
          renderOption={(props, option) => {
            const key =
              typeof option === "string" ? option : ((option as any).id ?? (option as any).name);
            const label = typeof option === "string" ? option : (option as any).name;
            const isCreate = typeof option !== "string" && Boolean((option as any).create);
            return (
              <li {...props} key={key}>
                {isCreate ? (
                  <Box
                    component="span"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 1,
                      color: "success.main",
                      fontWeight: 700,
                    }}
                  >
                    <AddIcon fontSize="small" color="success" />
                    <span>{`เพิ่มพืชใหม่: ${label}`}</span>
                  </Box>
                ) : (
                  label
                )}
              </li>
            );
          }}
          isOptionEqualToValue={(opt, val) => {
            const on = typeof opt === "string" ? opt : (opt as any).name;
            const vn = typeof val === "string" ? val : (val as any).name;
            const oi = (opt as any).id;
            const vi = (val as any).id;
            if (oi && vi) return oi === vi;
            return on?.toLowerCase() === vn?.toLowerCase();
          }}
          value={currentPlantValues}
          onChange={(_e, newValue) => {
            // Split into existing IDs and custom names
            const nextIds: string[] = [];
            const nextCustoms: string[] = [];
            for (const v of newValue as PlantCreatable[]) {
              if (!v) continue;
              if (typeof v === "string") {
                nextCustoms.push(v);
              } else if ((v as any).id) {
                nextIds.push((v as any).id);
              } else if ((v as any).name) {
                nextCustoms.push((v as any).name);
              }
            }
            setValues((prev) => ({ ...prev, plantIds: Array.from(new Set(nextIds)) }));
            setCustomPlantNames(Array.from(new Set(nextCustoms)));
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="ใช้กับพืช"
              placeholder="เลือกพืชหรือพิมพ์เพื่อเพิ่มใหม่"
            />
          )}
        />

        {/* จุดขายสินค้า */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="จุดขายสินค้า"
            value={values.description ?? ""}
            onChange={handleChange("description")}
            fullWidth
            multiline
            minRows={3}
          />
        </Stack>

        {/* คุณสมบัติ */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="คุณสมบัติ"
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
              <input
                hidden
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.avif,.svg,.gif,image/*"
                multiple
                onChange={handleSelectImages}
              />
            </Button>
            <Chip label={`${images.length}/10 รูป`} size="small" />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            อนุญาตเฉพาะไฟล์: JPG, PNG, WebP, AVIF, SVG ขนาดไม่เกิน 5 MB/ไฟล์
          </Typography>

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
      {/* ปุ่มย้อนกลับ + บันทึก แบบใช้ซ้ำ */}
      <SaveBackButtons
        backHref="/dashboard/products"
        isSaving={submitting}
        disabled={submitting}
        saveLabel="บันทึกสินค้า"
        saveButtonProps={{ type: "submit" as any }}
        justify="center"
        stackSx={{ mt: 4 }}
      />
    </Paper>
  );
}
