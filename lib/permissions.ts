export const PERMISSION_ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "reject",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export type PermissionKey = `${string}:${PermissionAction}`;

export const ACTION_LABELS: Record<PermissionAction, string> = {
  view: "ดูข้อมูล",
  create: "สร้างข้อมูล",
  edit: "แก้ไขข้อมูล",
  delete: "ลบข้อมูล",
  approve: "อนุมัติข้อมูล",
  reject: "ปฏิเสธข้อมูล",
};

export function buildPermissionKey(
  resource: string,
  action: PermissionAction,
): PermissionKey {
  return `${resource}:${action}` as PermissionKey;
}

export function hasPermission(
  permissions: readonly string[] | undefined,
  resource: string,
  action: PermissionAction,
) {
  if (!permissions || permissions.length === 0) {
    return false;
  }

  const key = buildPermissionKey(resource, action);
  return permissions.includes(key);
}

export function getAccessibleResources(permissions: readonly string[] | undefined) {
  if (!permissions || permissions.length === 0) {
    return new Set<string>();
  }

  return permissions.reduce((set, key) => {
    const [resource] = key.split(":");
    if (resource) {
      set.add(resource);
    }
    return set;
  }, new Set<string>());
}
