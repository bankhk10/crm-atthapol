import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
// Note: No image resizing; store original bytes as uploaded

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

    // Filter only common web image types
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
        // Keep original size and extension
        const mimeToExt: Record<string, string> = {
          "image/jpeg": ".jpg",
          "image/jpg": ".jpg",
          "image/png": ".png",
          "image/webp": ".webp",
          "image/gif": ".gif",
          "image/avif": ".avif",
          "image/svg+xml": ".svg",
        };
        const origName = file.name || "image";
        const extFromName = path.extname(origName).toLowerCase();
        const baseFromName = path.basename(origName, extFromName);
        const fallbackExt = mimeToExt[file.type as string] || (extFromName || ".img");
        const ext = extFromName || fallbackExt;
        const safeBase = baseFromName
          .toLowerCase()
          .replace(/[^a-z0-9_.-]+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^[-_.]+|[-_.]+$/g, "");
        const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBase || "file"}${ext}`;
        const filePath = path.join(uploadDir, name);
        await fs.writeFile(filePath, buffer);
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

