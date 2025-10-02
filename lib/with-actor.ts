import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runWithRequestContext } from "@/lib/request-context";

export async function withActor<T>(fn: () => Promise<T> | T): Promise<T> {
  const session = await getServerSession(authOptions);
  return runWithRequestContext({ userId: session?.user?.id }, fn) as Promise<T>;
}

