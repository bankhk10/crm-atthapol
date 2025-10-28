import type { EmployeeFormValues } from "@/app/dashboard/employees/types";
import type { EmployeeRoleOption, RoleDefinitionOption } from "@/app/dashboard/employees/types";
import { choice, randInt, randomCode } from "@/lib/random";

const COMPANY_OPTIONS = [
  "บริษัท อินเตอร์ คร็อพ จำกัด",
  "บริษัท แอ็กโฟรีแพ็กซ์ อินดัสตรีส์ จำกัด",
  "บริษัท ยูนิพรีมา จำกัด",
  "บริษัท เอแม็กซ์ อินเตอร์ จำกัด",
  "บริษัท บีแฟค อินเตอร์ จำกัด",
  "บริษัท ซีเพซ อินเตอร์ จำกัด",
  "บริษัท คร็อพ ซายน์ จำกัด",
];

const AREAS = ["ภาคเหนือ", "ภาคตะวันออกเฉียงเหนือ", "ภาคตะวันตก", "ภาคกลาง", "ภาคใต้"];
const PREFIXES = ["นาย", "นาง", "นางสาว"] as const;
const POSITIONS = ["พนักงานขาย", "หัวหน้างาน", "ผู้จัดการ", "เจ้าหน้าที่", "ผู้ช่วยผู้จัดการ"];
const FIRST_NAMES = [
  "สมชาย",
  "วิชัย",
  "กิตติ",
  "อรทัย",
  "วาสนา",
  "ชลธิชา",
  "ปิยพงษ์",
  "สุรีย์พร",
  "นพดล",
  "ชุติมา",
];
const LAST_NAMES = [
  "ใจดี",
  "มีสุข",
  "วงศ์ไทย",
  "เกษมสุข",
  "ทวีทรัพย์",
  "สวัสดิ์",
  "ศรีทอง",
  "สุขสันต์",
  "รุ่งโรจน์",
  "รุ่งเรือง",
];

function asciiId(len: number) {
  return Array.from({ length: len }, () => String.fromCharCode(97 + randInt(0, 25))).join("");
}

export function makeRandomEmployeeValues(opts: {
  roleOptions: EmployeeRoleOption[];
  roleDefinitions?: RoleDefinitionOption[];
}): Partial<EmployeeFormValues> {
  const prefix = choice(PREFIXES) as any;
  const firstName = choice(FIRST_NAMES);
  const lastName = choice(LAST_NAMES);
  const employeeCode = randomCode("EMP-", 4);
  const phone = `0${String(randInt(600000000, 999999999))}`;
  const email = `${asciiId(6)}.${asciiId(4)}@example.com`;
  const position = choice(POSITIONS);
  const company = choice(COMPANY_OPTIONS);
  const responsibilityArea = choice(AREAS);
  const address = `เลขที่ ${randInt(1, 199)}/ ${randInt(1, 20)} ซอยสุขุมวิท ถนนเพชรเกษม`;
  const province = "กรุงเทพมหานคร";
  const district = "บางกะปิ";
  const subdistrict = "หัวหมาก";
  const postalCode = "10240";
  const startDate = new Date().toISOString().slice(0, 10);
  const status: EmployeeFormValues["status"] = choice(["ACTIVE", "ON_LEAVE", "INACTIVE"]);
  const role = (opts.roleOptions[0]?.value ?? "USER") as EmployeeFormValues["role"];
  const roleDefinitionId = (opts.roleDefinitions && opts.roleDefinitions.length
    ? choice(opts.roleDefinitions).id
    : null) as EmployeeFormValues["roleDefinitionId"];

  return {
    prefix,
    firstName,
    lastName,
    employeeCode,
    phone,
    email,
    password: "P@ssw0rd123",
    position,
    department: "การตลาด",
    company,
    responsibilityArea,
    address,
    province,
    district,
    subdistrict,
    postalCode,
    startDate,
    status,
    role,
    roleDefinitionId,
  };
}
