import { RolesClient } from "./_components/roles-client";
import { getPermissionLibrary, getRoleList } from "./data";

export default async function RolesPage() {
  const [roles, permissionLibrary] = await Promise.all([
    getRoleList(),
    getPermissionLibrary(),
  ]);

  return <RolesClient roles={roles} permissionLibrary={permissionLibrary} />;
}