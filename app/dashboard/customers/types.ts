export type CustomerType = "DEALER" | "SUBDEALER" | "FARMER";

export type CustomerFormValues = {
  type: CustomerType;
  // แสดงผล/บันทึกเป็น name โดยคำนวณจาก companyName หรือ (prefix + first + last)
  name?: string;
  code?: string; // รหัสร้านค้า (สร้างอัตโนมัติเมื่อบันทึก)
  prefix: string;
  firstName: string;
  lastName: string;
  gender: "MALE" | "FEMALE";
  birthDate: string; // YYYY-MM-DD
  age?: number | null;
  email?: string;
  phone: string;
  taxId?: string;
  address?: string;
  province?: string;
  district?: string;
  subdistrict?: string;
  postalCode?: string;
  latitude?: number | string;
  longitude?: number | string;
  responsibleEmployeeId?: string | null;
  // เดิมอยู่ใน profile JSON → ย้ายมาเป็นฟิลด์จริง
  companyName?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  creditLimit?: number | string;
  parentDealer?: string;
  subDealerCode?: string;
  // สำหรับ SubDealer
  dealerId?: string;
  competitor?: string;
  cropsInArea?: string;
  averageMonthlyPurchase?: number | string;
  mainProducts?: string;
  brandsSold?: string;
  areaType?: string;
  relationshipScore?: number;
  businessNotes?: string;
  farmName?: string;
  farmSize?: number | string;
  cropType?: string;
};
