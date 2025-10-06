"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import SessionExpiryWatcher from "@/components/SessionExpiryWatcher";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <SessionExpiryWatcher />
    </SessionProvider>
  );
}
