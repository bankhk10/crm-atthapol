import { EmployeeCreateClient } from "../_components/employee-create-client";
import { employeeRoleOptions, getRoleDefinitionOptions } from "../data";

export default async function EmployeeCreatePage() {
  const roleDefinitions = await getRoleDefinitionOptions();

  return (
    <EmployeeCreateClient
      roleOptions={employeeRoleOptions}
      roleDefinitions={roleDefinitions}
    />
  );
}
