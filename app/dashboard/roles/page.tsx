import { RolesClient } from "./_components/roles-client";
import { ActionButtons } from "../_components/action-buttons";
import { getPermissionLibrary, getRoleList } from "./data";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const session = await getServerSession(authOptions);
  const perms = session?.user?.permissions ?? [];
  if (!hasPermission(perms, "roles", "view")) {
    redirect("/forbidden");
  }

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
