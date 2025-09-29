import { EmployeeCreateClient } from "../_components/employee-create-client";
import { ActionButtons } from "../../_components/action-buttons";
import { employeeRoleOptions, getRoleDefinitionOptions } from "../data";

export default async function EmployeeCreatePage() {
  const roleDefinitions = await getRoleDefinitionOptions();

  return (
    <>
      <ActionButtons resource="employees" />
      <EmployeeCreateClient
        roleOptions={employeeRoleOptions}
        roleDefinitions={roleDefinitions}
      />
    </>
  );
}
