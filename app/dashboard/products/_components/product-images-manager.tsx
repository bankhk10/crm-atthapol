"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Button,
  IconButton,
  Chip,
} from "@mui/material";
import Image from "next/image";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import { replaceProductImages } from "../actions";

type Img = { id: string; url: string };

type Props = {
  productId: string;
  initialImages: Img[];
};

export default function ProductImagesManager({ productId, initialImages }: Props) {
  const [images, setImages] = useState<Img[]>(initialImages ?? []);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const move = (index: number, dir: -1 | 1) => {
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

  const removeAt = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setError(null);
    const allowed = Math.max(0, 10 - images.length);
    if (allowed <= 0) {
      setError("รูปครบ 10 รูปแล้ว");
      return;
    }
    const picked = files.filter((f) => f.type.startsWith("image/"));
    const slice = picked.slice(0, allowed);
    if (slice.length < picked.length) setError("เลือกรูปได้สูงสุด 10 รูป");
    const fd = new FormData();
    slice.forEach((f) => fd.append("images", f));
    const res = await fetch("/api/uploads/products", { method: "POST", body: fd });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "อัปโหลดรูปภาพไม่สำเร็จ");
      return;
    }
    const data = (await res.json()) as { urls?: string[] };
    const urls = data.urls ?? [];
    setImages((prev) => {
      const appended = urls.map((u, i) => ({ id: `new-${Date.now()}-${i}`, url: u }));
      return [...prev, ...appended];
    });
  };

  const handleSave = async () => {
    setError(null);
    startTransition(async () => {
      try {
        await replaceProductImages(productId, images.map((i) => i.url));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "บันทึกรูปไม่สำเร็จ";
        setError(msg);
      }
    });
  };

  const handleReset = () => setImages(initialImages ?? []);

  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" fontWeight={700}>จัดการรูปภาพ</Typography>
          <Chip label={`${images.length}/10 รูป`} size="small" />
        </Stack>
        {error && <Typography color="error.main" variant="body2">{error}</Typography>}

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          {images.map((img, idx) => (
            <Box key={img.id} sx={{ position: "relative", width: 140, height: 140, borderRadius: 1.5, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
              <Image src={img.url} alt={`image-${idx}`} fill style={{ objectFit: "cover" }} />
              <Stack direction="row" spacing={0.5} sx={{ position: "absolute", bottom: 4, left: 4, bgcolor: "rgba(255,255,255,0.85)", borderRadius: 1 }}>
                <IconButton size="small" onClick={() => move(idx, -1)} disabled={idx === 0}>
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => move(idx, +1)} disabled={idx === images.length - 1}>
                  <ArrowForwardIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => removeAt(idx)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Box>
          ))}
        </Box>

        <Stack direction="row" spacing={1}>
          <Button variant="outlined" component="label" startIcon={<AddPhotoAlternateIcon />}>
            เพิ่มรูป
            <input hidden type="file" accept="image/*" multiple onChange={handleAddFiles} />
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={pending}>บันทึกรูป</Button>
          <Button variant="text" onClick={handleReset} disabled={pending}>รีเซ็ต</Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

