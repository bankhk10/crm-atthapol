import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

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

    // Filter only images
    files = files.filter((f) => f && f.type?.startsWith("image/"));

    if (files.length === 0) {
      return NextResponse.json({ error: "ไม่พบไฟล์รูปภาพ" }, { status: 400 });
    }

    if (files.length > 10) {
      return NextResponse.json({ error: "อัปโหลดได้สูงสุด 10 ไฟล์" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
    await fs.mkdir(uploadDir, { recursive: true });

    const urls: string[] = [];
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const safeName = (file.name || "image").toLowerCase().replace(/[^a-z0-9_.-]+/g, "-").replace(/-+/g, "-");
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
      const filePath = path.join(uploadDir, name);
      await fs.writeFile(filePath, buffer);
      urls.push(`/uploads/products/${name}`);
    }

    return NextResponse.json({ urls });
  } catch (err) {
    console.error("Upload error", err);
    return NextResponse.json({ error: "อัปโหลดไม่สำเร็จ" }, { status: 500 });
  }
}

