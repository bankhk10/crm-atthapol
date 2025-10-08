import { z } from "zod";

// ฟิลด์ตามคำขอ สำหรับ table product + table stock
export const productFormSchema = z.object({
  productCode: z.string().min(1, "กรุณากรอกรหัสสินค้า"),
  lotNumber: z.string().optional(),
  nameTH: z.string().min(1, "กรุณากรอกชื่อสินค้า (ไทย)"),
  nameEN: z.string().optional(),
  // อนุญาตค่าว่างเป็นค่าเริ่มต้นในหน้าเพิ่มสินค้าใหม่
  category: z.enum(["AA1", "BB2", "CC3"]).or(z.literal("")).default(""),
  brand: z.enum(["A", "B", "C"]).or(z.literal("")).default(""),
  unit: z.enum(["อัน", "ชิ้น", "ถุง"]).default("ชิ้น"),
  price: z.preprocess((v) => (v === "" || v === undefined || v === null ? undefined : Number(v)), z.number().nonnegative().optional()),
  mfgDate: z.string().optional(),
  expDate: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "EXPIRED"]).default("ACTIVE"),
  imageUrl: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
  description: z.string().optional(),

  qtyOnHand: z.preprocess((v) => (v === "" || v === undefined || v === null ? 0 : Number(v)), z.number().int().nonnegative()).default(0),
  qtyReserved: z.preprocess((v) => (v === "" || v === undefined || v === null ? 0 : Number(v)), z.number().int().nonnegative()).default(0),
  qtyVirtual: z.preprocess((v) => (v === "" || v === undefined || v === null ? 0 : Number(v)), z.number().int().nonnegative()).default(0),
  stockNote: z.string().optional(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

