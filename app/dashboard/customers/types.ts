export type CustomerType = "DEALER" | "SUBDEALER" | "FARMER";

export type CustomerProfile = {
  // Dealer fields
  companyName?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  creditLimit?: number | string;

  // SubDealer fields
  parentDealer?: string;
  subDealerCode?: string;

  // Farmer fields
  farmName?: string;
  farmSize?: number | string; // ไร่
  cropType?: string;
};

export type CustomerFormValues = {
  type: CustomerType;
  // แสดงผล/บันทึกเป็น name โดยคำนวณจาก companyName หรือ (prefix + first + last)
  name?: string;
  code?: string; // รหัสร้านค้า (สร้างอัตโนมัติเมื่อบันทึก)
  prefix: string;
  firstName: string;
  lastName: string;
  gender: "MALE" | "FEMALE" | "OTHER";
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
  profile?: CustomerProfile;
};
