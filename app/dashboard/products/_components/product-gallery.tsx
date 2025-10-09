"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  const imgs =
    images && images.length > 0
      ? images
      : [{ id: "placeholder", url: "/images/logo.png", alt: name }];

  const scrollRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const handleThumbClick = (idx: number) => {
    setActive(idx);
    const thumbEl = thumbRefs.current[idx];
    if (thumbEl) {
      thumbEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  };

  const checkForScrollPosition = useCallback(() => {
    const { current } = scrollRef;
    if (current) {
      const { scrollLeft, scrollWidth, clientWidth } = current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft !== scrollWidth - clientWidth);
    }
  }, []);

  useEffect(() => {
    const { current } = scrollRef;
    if (current) {
      checkForScrollPosition();
      current.addEventListener("scroll", checkForScrollPosition);
    }
    return () => {
      if (current) {
        current.removeEventListener("scroll", checkForScrollPosition);
      }
    };
  }, [imgs, checkForScrollPosition]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -250 : 250;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <Stack spacing={1.25}>
      {/* Main image */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: { xs: 320, md: 420 },
          borderRadius: 2,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "grey.50",
          cursor: "zoom-in",
        }}
        onClick={() => setOpen(true)}
      >
        {productCode && (
          <Chip
            size="small"
            label={`รหัสสินค้า: ${productCode}`}
            sx={{ position: "absolute", top: 10, left: 10, zIndex: 2 }}
          />
        )}
        <Image
          src={imgs[active]?.url}
          alt={imgs[active]?.alt || name || "image"}
          fill
          style={{ objectFit: "cover" }}
        />
      </Box>

      {/* Thumbnails Container */}
      <Box sx={{ position: "relative", display: "flex", alignItems: "center" }}>
        {canScrollLeft && (
          <IconButton
            onClick={() => scroll("left")}
            size="small"
            sx={{
              position: "absolute",
              left: 2,
              zIndex: 1,
              bgcolor: "rgba(255,255,255,0.7)",
              "&:hover": { bgcolor: "white" },
            }}
          >
            <ArrowBackIosNewIcon fontSize="inherit" />
          </IconButton>
        )}

        <Box
          ref={scrollRef}
          sx={{
            display: "flex",
            gap: 1,
            overflowX: "auto",
            justifyContent: "flex-start",
            px: 0.5,
            scrollBehavior: "smooth",
            "::-webkit-scrollbar": { display: "none" },
            msOverflowStyle: "none",
            scrollbarWidth: "none",
          }}
        >
          {imgs.map((img, idx) => (
            <Box
              key={img.id}
              ref={(el) => (thumbRefs.current[idx] = el)}
              onClick={() => handleThumbClick(idx)}
              sx={{
                position: "relative",
                width: 72,
                height: 72,
                flex: "0 0 auto",
                border: "2px solid",
                borderColor: idx === active ? "primary.main" : "transparent",
                borderRadius: 1,
                cursor: "pointer",
                bgcolor: "white",
              }}
            >
              <Image
                src={img.url}
                alt={img.alt || "thumb"}
                fill
                style={{ objectFit: "cover" }}
              />
            </Box>
          ))}
        </Box>

        {canScrollRight && (
          <IconButton
            onClick={() => scroll("right")}
            size="small"
            sx={{
              position: "absolute",
              right: 2,
              zIndex: 1,
              bgcolor: "rgba(255,255,255,0.7)",
              "&:hover": { bgcolor: "white" },
            }}
          >
            <ArrowForwardIosIcon fontSize="inherit" />
          </IconButton>
        )}
      </Box>

      {/* Lightbox (No changes needed here) */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="lg"
        PaperProps={{
          sx: { backgroundColor: "transparent", boxShadow: "none" },
        }}
      >
        <Box
          sx={{
            position: "relative",
            p: 0,
            width: { xs: 320, sm: 560, md: 820 },
            height: { xs: 320, sm: 560, md: 560 },
          }}
        >
          <IconButton
            onClick={() => setOpen(false)}
            sx={{
              position: "absolute",
              top: 6,
              right: 6,
              zIndex: 2,
              color: "white",
              bgcolor: "error.main",
              "&:hover": { bgcolor: "error.dark" },
            }}
          >
            <CloseIcon />
          </IconButton>
          {imgs.length > 1 && (
            <>
              <IconButton
                aria-label="Prev"
                onClick={() =>
                  setActive((i) => (i - 1 + imgs.length) % imgs.length)
                }
                sx={{
                  position: "absolute",
                  left: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 2,
                  bgcolor: "rgba(255,255,255,0.8)",
                }}
              >
                <ArrowBackIosNewIcon />
              </IconButton>
              <IconButton
                aria-label="Next"
                onClick={() => setActive((i) => (i + 1) % imgs.length)}
                sx={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 2,
                  bgcolor: "rgba(255,255,255,0.8)",
                }}
              >
                <ArrowForwardIosIcon />
              </IconButton>
            </>
          )}
          <Image
            src={imgs[active].url}
            alt={imgs[active].alt || "image"}
            fill
            style={{ objectFit: "contain" }}
          />
        </Box>
      </Dialog>
    </Stack>
  );
}