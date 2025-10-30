import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import sharp from "sharp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();

    // Collect File objects from common keys or any file entries
    let files: File[] = [];
    const candidates: (FormDataEntryValue | null)[] = [
      ...form.getAll("images"),
      ...form.getAll("files"),
      form.get("image"),
      form.get("file"),
    ];
    for (const c of candidates) {
      if (c && typeof c !== "string") files.push(c);
    }
    if (files.length === 0) {
      // Fallback: scan through all entries and pick File instances
      for (const [, v] of form.entries()) {
        if (typeof v !== "string") files.push(v);
      }
    }

    // Filter only images that we can reasonably process on the server
    const SUPPORTED_TYPES = new Set([
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
      "image/svg+xml",
    ]);
    files = files.filter((f) => f && f.type?.startsWith("image/") && SUPPORTED_TYPES.has(f.type));

    if (files.length === 0) {
      return NextResponse.json({ error: "ไฟล์รูปภาพไม่รองรับ กรุณาใช้ JPEG/PNG/WebP/AVIF/SVG" }, { status: 415 });
    }

    if (files.length > 10) {
      return NextResponse.json({ error: "อัปโหลดได้สูงสุด 10 ไฟล์" }, { status: 400 });
    }

    // Constraints
    const MAX_BYTES = 5 * 1024 * 1024; // 5MB per file

    const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
    await fs.mkdir(uploadDir, { recursive: true });

    const urls: string[] = [];
    let failed = 0;
    for (const file of files) {
      try {
        if (typeof file.size === "number" && file.size > MAX_BYTES) {
          failed++;
          continue;
        }
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        // Resize to 400x400 (cover) and convert to JPEG for consistency
        const out = await sharp(buffer)
          .rotate()
          .resize(400, 400, { fit: "cover" })
          .jpeg({ quality: 85 })
          .toBuffer();

        const base = (file.name || "image.jpg").replace(/\.[^.]+$/, "");
        const safeName = base
          .toLowerCase()
          .replace(/[^a-z0-9_.-]+/g, "-")
          .replace(/-+/g, "-");
        const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}.jpg`;
        const filePath = path.join(uploadDir, name);
        await fs.writeFile(filePath, out);
        urls.push(`/uploads/products/${name}`);
      } catch (e) {
        // Skip problematic file but continue others
        failed++;
      }
    }

    if (urls.length === 0) {
      const message = failed > 0 ? "ไม่สามารถประมวลผลรูปที่อัปโหลดได้ (รูปแบบไม่รองรับ)" : "ไม่พบไฟล์รูปภาพ";
      return NextResponse.json({ error: message }, { status: 415 });
    }
    return NextResponse.json({ urls, failed });
  } catch (err) {
    console.error("Upload error", err);
    return NextResponse.json({ error: "อัปโหลดไม่สำเร็จ" }, { status: 500 });
  }
}

