import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

export async function requirePermission(resource: string, action: "view" | "create" | "edit" | "delete" | "approve" | "reject" = "view") {
  const session = await getServerSession(authOptions);
  const perms = session?.user?.permissions ?? [];
  if (!hasPermission(perms, resource, action)) {
    redirect("/forbidden");
  }
}

