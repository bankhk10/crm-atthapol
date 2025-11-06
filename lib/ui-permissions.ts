/**
 * Determine if the current user can see and use the "Fill Random" convenience button.
 *
 * Checks in order:
 * - Global flag: `ui:random_fill`
 * - Resource-specific flag: `${resource}_ui:random_fill`
 *
 * No fallback to create/edit permissions. Must have explicit permission.
 */
export function canShowRandomFill(
  permissions: readonly string[] | undefined,
  resource?: string,
  mode?: "create" | "edit",
): boolean {
  const perms = permissions ?? [];
  if (perms.includes("ui:random_fill")) return true;
  if (resource && perms.includes(`${resource}_ui:random_fill`)) return true;
  return false;
}
