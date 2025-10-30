import type { ProductFormValues } from "@/app/dashboard/products/validation";
import { choice, pick, randFloat, randInt, randomCode } from "@/lib/random";

type Plant = { id: string; name: string };

const CATEGORY_OPTIONS = ["กลุ่ม A", "กลุ่ม B", "กลุ่ม C"] as const;
const BRAND_OPTIONS = ["แบรนด์ A", "แบรนด์ B", "แบรนด์ C"] as const;
const UNIT_OPTIONS = ["อัน", "ชิ้น", "ถุง"] as const;

const NAME_PREFIXES = [
  "ปุ๋ย",
  "สารกำจัดแมลง",
  "สารกำจัดวัชพืช",
  "ฮอร์โมนพืช",
  "สารป้องกันเชื้อรา",
] as const;

const PACKAGING_SIZES = [
  "12x1L",
  "24x500ml",
  "6x5L",
  "1kg",
  "25kg",
  "10kg",
] as const;

export function makeRandomProductValues(opts: { plants: Plant[] }): Partial<ProductFormValues> {
  const productCode = randomCode("PRD-");
  const lotNumber = randomCode("LOT-", 5);

  const prefix = choice(NAME_PREFIXES);
  const formula = `${randInt(10, 30)}-${randInt(5, 25)}-${randInt(5, 25)}`;
  const nameTH = `${prefix} สูตร ${formula}`;
  const nameEN = `Agri-${randInt(100, 999)}`;

  const category = choice(CATEGORY_OPTIONS) as ProductFormValues["category"];
  const brand = choice(BRAND_OPTIONS) as ProductFormValues["brand"];
  const unit = choice(UNIT_OPTIONS) as ProductFormValues["unit"];

  const price = randFloat(59, 1999, 2);
  const status: ProductFormValues["status"] = Math.random() < 0.85 ? "ACTIVE" : "INACTIVE";
  const packagingSize = choice(PACKAGING_SIZES);

  const chosenPlants = pick(opts.plants ?? [], randInt(1, Math.min(3, (opts.plants ?? []).length || 1)));
  const plantIds = chosenPlants.map((p) => p.id);

  const features = "เพิ่มผลผลิต เห็นผลไว ใช้งานสะดวก";
  const description = "ข้อมูลทดสอบที่กรอกอัตโนมัติ เพื่อใช้ทดสอบการเพิ่มสินค้าใหม่ในระบบ.";

  return {
    productCode,
    lotNumber,
    nameTH,
    nameEN,
    category,
    brand,
    unit,
    status,
    packagingSize,
    plantIds,
    features,
    description,
  };
}

