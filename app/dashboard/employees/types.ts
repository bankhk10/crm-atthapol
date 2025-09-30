export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "INACTIVE";

export type EmployeeRole = "ADMIN" | "MANAGER" | "USER";

export type PermissionGroup = {
  category: string;
  items: string[];
};

export type EmployeeFormValues = {
  prefix?: string;
  firstName?: string;
  lastName?: string;
  // legacy single field (kept for compatibility, prefer firstName/lastName)
  name?: string;
  email: string;
  password: string;
  employeeCode: string;
  position: string;
  department: string;
  company?: string;
  responsibilityArea?: string;
  province?: string;
  district?: string;
  subdistrict?: string;
  postalCode?: string;
  birthDate?: string;
  age?: number | null;
  gender?: "MALE" | "FEMALE" | "OTHER" | null;
  phone: string;
  startDate: string;
  status: EmployeeStatus;
  role: EmployeeRole;
  roleDefinitionId: string | null;
};

export type EmployeeListItem = {
  id: string;
  employeeCode: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email: string;
  position: string;
  department: string;
  company?: string | null;
  responsibilityArea?: string | null;
  status: EmployeeStatus;
  startDate: string;
  role?: EmployeeRole;
  roleDefinitionName?: string | null;
};

export type EmployeeRoleOption = {
  value: EmployeeRole;
  label: string;
  description?: string;
};

export type RoleDefinitionOption = {
  id: string;
  name: string;
  description: string | null;
  permissions: PermissionGroup[];
};
