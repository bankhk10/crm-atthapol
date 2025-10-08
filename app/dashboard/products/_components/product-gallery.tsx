"use client";

import { useState } from "react";
import { Box, Chip, Dialog, IconButton, Stack } from "@mui/material";
import Image from "next/image";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";

type Img = { id: string; url: string; alt?: string };

type Props = {
  images: Img[];
  productCode?: string;
  name?: string;
};

export default function ProductGallery({ images, productCode, name }: Props) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const imgs = images && images.length > 0 ? images : [{ id: "placeholder", url: "/images/logo.png", alt: name }];

  return (
    <Stack spacing={1.25}>
      {/* Main image */}
      <Box sx={{ position: "relative", width: "100%", height: { xs: 320, md: 420 }, borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider", bgcolor: "grey.50", cursor: "zoom-in" }} onClick={() => setOpen(true)}>
        {productCode && (
          <Chip size="small" label={`รหัสสินค้า: ${productCode}`} sx={{ position: "absolute", top: 10, left: 10, zIndex: 2 }} />
        )}
        <Image src={imgs[active]?.url} alt={imgs[active]?.alt || name || "image"} fill style={{ objectFit: "cover" }} />
      </Box>

      {/* Thumbnails */}
      <Box sx={{ display: "flex", gap: 1, overflowX: "auto" }}>
        {imgs.map((img, idx) => (
          <Box key={img.id} onClick={() => setActive(idx)} sx={{ position: "relative", width: 72, height: 72, flex: "0 0 auto", border: "2px solid", borderColor: idx === active ? "primary.main" : "transparent", borderRadius: 1, cursor: "pointer", bgcolor: "white" }}>
            <Image src={img.url} alt={img.alt || "thumb"} fill style={{ objectFit: "cover" }} />
          </Box>
        ))}
      </Box>

      {/* Lightbox */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="lg">
        <Box sx={{ position: "relative", bgcolor: "black", p: 0, width: { xs: 320, sm: 560, md: 820 }, height: { xs: 320, sm: 560, md: 560 } }}>
          <IconButton onClick={() => setOpen(false)} sx={{ position: "absolute", top: 6, right: 6, zIndex: 2, bgcolor: "rgba(255,255,255,0.8)" }}>
            <CloseIcon />
          </IconButton>
          {imgs.length > 1 && (
            <>
              <IconButton aria-label="Prev" onClick={() => setActive((i) => (i - 1 + imgs.length) % imgs.length)} sx={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", zIndex: 2, bgcolor: "rgba(255,255,255,0.8)" }}>
                <ArrowBackIosNewIcon />
              </IconButton>
              <IconButton aria-label="Next" onClick={() => setActive((i) => (i + 1) % imgs.length)} sx={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", zIndex: 2, bgcolor: "rgba(255,255,255,0.8)" }}>
                <ArrowForwardIosIcon />
              </IconButton>
            </>
          )}
          <Image src={imgs[active].url} alt={imgs[active].alt || "image"} fill style={{ objectFit: "contain" }} />
        </Box>
      </Dialog>
    </Stack>
  );
}

