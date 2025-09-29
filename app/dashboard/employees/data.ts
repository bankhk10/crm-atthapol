export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "INACTIVE";

export type Employee = {
  id: string;
  employeeCode: string;
  name: string;
  position: string;
  department: string;
  email: string;
  phone: string;
  startDate: string;
  status: EmployeeStatus;
};

export const EMPLOYEES: Employee[] = [
  {
    id: "emp-001",
    employeeCode: "EMP-001",
    name: "สมชาย ใจดี",
    position: "หัวหน้าทีมพัฒนาซอฟต์แวร์",
    department: "วิศวกรรม",
    email: "somchai@example.com",
    phone: "081-111-2233",
    startDate: "2021-02-15",
    status: "ACTIVE",
  },
  {
    id: "emp-002",
    employeeCode: "EMP-002",
    name: "สุดารัตน์ มงคล",
    position: "นักวิเคราะห์ระบบ",
    department: "วิเคราะห์ธุรกิจ",
    email: "sudarat@example.com",
    phone: "086-555-8899",
    startDate: "2020-07-01",
    status: "ON_LEAVE",
  },
  {
    id: "emp-003",
    employeeCode: "EMP-003",
    name: "อนุชา สายชล",
    position: "นักออกแบบ UX/UI",
    department: "ประสบการณ์ผู้ใช้",
    email: "anucha@example.com",
    phone: "089-333-4556",
    startDate: "2019-10-20",
    status: "ACTIVE",
  },
  {
    id: "emp-004",
    employeeCode: "EMP-004",
    name: "พิมพ์ลดา ศรีทอง",
    position: "ผู้จัดการฝ่ายการตลาด",
    department: "การตลาด",
    email: "pimlada@example.com",
    phone: "082-999-4422",
    startDate: "2018-05-30",
    status: "ACTIVE",
  },
  {
    id: "emp-005",
    employeeCode: "EMP-005",
    name: "ชยพล เกียรติชัย",
    position: "เจ้าหน้าที่บุคคล",
    department: "ทรัพยากรบุคคล",
    email: "chayapon@example.com",
    phone: "087-777-1122",
    startDate: "2022-01-10",
    status: "ACTIVE",
  },
  {
    id: "emp-006",
    employeeCode: "EMP-006",
    name: "สุนิสา จิตสกุล",
    position: "นักบัญชีอาวุโส",
    department: "การเงิน",
    email: "sunisa@example.com",
    phone: "080-212-9876",
    startDate: "2017-11-05",
    status: "INACTIVE",
  },
];

export function getEmployeeById(id: string): Employee | undefined {
  return EMPLOYEES.find((employee) => employee.id === id);
}
