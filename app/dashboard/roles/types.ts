export type PermissionItem = {
  name: string;
};

export type PermissionGroup = {
  category: string;
  items: string[];
};

export type PermissionLibraryGroup = {
  category: string;
  items: string[];
};

export type RoleListItem = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  assignedUsers: number;
  permissions: PermissionGroup[];
  createdAt: string;
};

export type RoleFormValues = {
  key: string;
  name: string;
  description: string;
  permissions: PermissionGroup[];
};