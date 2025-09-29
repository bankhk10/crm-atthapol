import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardShell } from "./_components/dashboard-shell";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return <DashboardShell displayName={session.user?.name}>{children}</DashboardShell>;
}
