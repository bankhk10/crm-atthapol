export type AuditLogListItem = {
  id: string;
  model: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT" | string;
  recordId?: string | null;
  performedAt: string; // ISO string
  performedById?: string | null;
  performedByName?: string | null;
  performedByEmail?: string | null;
};
