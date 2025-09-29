export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "INACTIVE";

export type EmployeeFormValues = {
  name: string;
  email: string;
  password: string;
  position: string;
  department: string;
  phone: string;
  startDate: string;
  status: EmployeeStatus;
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
};
