export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "INACTIVE";

export type EmployeeRole = "ADMIN" | "MANAGER" | "USER";

export type PermissionGroup = {
  category: string;
  items: string[];
};

export type EmployeeFormValues = {
  name: string;
  email: string;
  password: string;
  position: string;
  department: string;
  phone: string;
  startDate: string;
  status: EmployeeStatus;
  role: EmployeeRole;
  roleDefinitionId: string | null;
};

export type EmployeeListItem = {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  position: string;
  department: string;
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
