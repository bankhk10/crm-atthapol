"use client";

import { useState } from "react";
import { Box, Dialog, IconButton, Stack } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import Image from "next/image";

type Img = { id: string; url: string; alt?: string };

export default function ProductImagesViewer({ images }: { images: Img[] }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<number>(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchDeltaX, setTouchDeltaX] = useState<number>(0);
  if (!images || images.length === 0) return <Box sx={{ color: 'text.secondary' }}>ไม่มีรูปภาพ</Box>;

  return (
    <>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        {images.map((img, idx) => (
          <Box key={img.id}
            onClick={() => { setActive(idx); setOpen(true); }}
            sx={{ position: 'relative', width: 140, height: 140, borderRadius: 1.5, overflow: 'hidden', border: '1px solid', borderColor: 'divider', cursor: 'pointer' }}>
            <Image src={img.url} alt={img.alt || 'image'} fill style={{ objectFit: 'cover' }} />
          </Box>
        ))}
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="lg">
        <Box
          sx={{ position: 'relative', bgcolor: 'black', p: 0, width: { xs: 320, sm: 560, md: 820 }, height: { xs: 320, sm: 560, md: 560 } }}
          onTouchStart={(e) => {
            if (e.touches && e.touches.length > 0) setTouchStartX(e.touches[0].clientX);
            setTouchDeltaX(0);
          }}
          onTouchMove={(e) => {
            if (touchStartX != null && e.touches && e.touches.length > 0) {
              const dx = e.touches[0].clientX - touchStartX;
              setTouchDeltaX(dx);
            }
          }}
          onTouchEnd={() => {
            const threshold = 40; // px
            if (touchDeltaX > threshold) {
              // swipe right -> prev
              setActive((i) => (i - 1 + images.length) % images.length);
            } else if (touchDeltaX < -threshold) {
              // swipe left -> next
              setActive((i) => (i + 1) % images.length);
            }
            setTouchStartX(null);
            setTouchDeltaX(0);
          }}
        >
          <IconButton onClick={() => setOpen(false)} sx={{ position: 'absolute', top: 6, right: 6, zIndex: 2, bgcolor: 'rgba(255,255,255,0.8)' }}>
            <CloseIcon />
          </IconButton>
          {/* Prev / Next */}
          {images.length > 1 && (
            <>
              <IconButton
                aria-label="Previous image"
                onClick={() => setActive((i) => (i - 1 + images.length) % images.length)}
                sx={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 2, bgcolor: 'rgba(255,255,255,0.8)' }}
              >
                <ArrowBackIosNewIcon />
              </IconButton>
              <IconButton
                aria-label="Next image"
                onClick={() => setActive((i) => (i + 1) % images.length)}
                sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 2, bgcolor: 'rgba(255,255,255,0.8)' }}
              >
                <ArrowForwardIosIcon />
              </IconButton>
            </>
          )}

          <Image src={images[active].url} alt={images[active].alt || 'image'} fill style={{ objectFit: 'contain' }} draggable={false} />
          {/* Thumbnails */}
          {images.length > 1 && (
            <Stack direction="row" spacing={1} sx={{ position: 'absolute', left: 8, right: 8, bottom: 8, justifyContent: 'center' }}>
              {images.map((img, idx) => (
                <Box key={img.id}
                  onClick={() => setActive(idx)}
                  sx={{ position: 'relative', width: 54, height: 54, border: '2px solid', borderColor: idx === active ? 'primary.main' : 'transparent', cursor: 'pointer', bgcolor: 'white', borderRadius: 0.5 }}>
                  <Image src={img.url} alt={img.alt || 'thumb'} fill style={{ objectFit: 'cover' }} />
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Dialog>
    </>
  );
}
