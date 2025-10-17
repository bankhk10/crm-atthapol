import { RolesClient } from "./_components/roles-client";
import { ActionButtons } from "../_components/action-buttons";
import { getPermissionLibrary, getRoleList } from "./data";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const [roles, permissionLibrary] = await Promise.all([
    getRoleList(),
    getPermissionLibrary(),
  ]);

  return (
    <>
      <ActionButtons resource="roles" />
      <RolesClient roles={roles} permissionLibrary={permissionLibrary} />
    </>
  );
}
